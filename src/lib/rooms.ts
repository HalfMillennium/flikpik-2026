import "server-only";
import { randomBytes } from "crypto";
import { and, eq, inArray, asc, desc, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  rooms,
  roomParticipants,
  roomMovies,
  roomVotes,
  movies,
  type Room,
} from "@/db/schema";
import { generateInviteCode, type MpaaRating } from "@/lib/utils";
import { upsertMovieByTmdbId } from "@/lib/movies";

// ── tunables ───────────────────────────────────────────────────────────────
export const ROOM_TTL_MS = 6 * 60 * 60 * 1000; // rooms expire 6h after creation
export const MAX_PARTICIPANTS = 12;
export const MAX_POOL = 60;

function newToken(): string {
  return randomBytes(24).toString("base64url"); // 192-bit capability token
}
function ttl(): Date {
  return new Date(Date.now() + ROOM_TTL_MS);
}

// ── state shape (mirrors SessionState so the UI can reuse SwipeCard etc.) ────
export type RoomMovieView = {
  id: string;
  title: string;
  overview: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string | null;
  runtime: number | null;
  mpaaRating: string | null;
  genres: { id: number; name: string }[];
  tmdbRating: string | null;
  userAvgRating: string | null;
  voteCount: number;
};

export type RoomState = {
  code: string;
  status: "lobby" | "voting" | "decided" | "no_consensus";
  isHost: boolean;
  locked: boolean;
  voteThreshold: number;
  mpaaFilters: string[];
  participants: {
    id: string;
    nickname: string;
    isHost: boolean;
    isReady: boolean;
    isDoneVoting: boolean;
  }[];
  movies: RoomMovieView[];
  winner: { id: string; title: string; posterPath: string | null } | null;
  myVotedMovieIds: string[];
  expiresAt: string;
};

// ── lookups ──────────────────────────────────────────────────────────────
/** Fetch a room by code, treating an expired room as gone (and cleaning it up). */
async function getLiveRoom(code: string): Promise<Room | null> {
  const [room] = await db
    .select()
    .from(rooms)
    .where(eq(rooms.joinCode, code.toUpperCase()))
    .limit(1);
  if (!room) return null;
  if (room.expiresAt.getTime() < Date.now()) {
    await db.delete(rooms).where(eq(rooms.id, room.id)).catch(() => {});
    return null;
  }
  return room;
}

async function getParticipant(roomId: string, token: string | undefined) {
  if (!token) return null;
  const [p] = await db
    .select()
    .from(roomParticipants)
    .where(
      and(
        eq(roomParticipants.roomId, roomId),
        eq(roomParticipants.participantToken, token),
      ),
    )
    .limit(1);
  return p ?? null;
}

// ── pool building ──────────────────────────────────────────────────────────
/** Upsert TMDB movies (full detail) into the shared cache and add to the room. */
async function addMoviesToPool(roomId: string, tmdbIds: number[]) {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(roomMovies)
    .where(eq(roomMovies.roomId, roomId));

  // De-dupe, drop invalids, and cap to the remaining pool capacity.
  const room = count;
  const capacity = Math.max(0, MAX_POOL - room);
  const unique = [
    ...new Set(tmdbIds.filter((id) => Number.isInteger(id) && id > 0)),
  ].slice(0, capacity);
  if (unique.length === 0) return;

  // Enrich from TMDB in parallel (each is a separate HTTP request); a single
  // bad/unavailable id shouldn't fail the batch.
  const results = await Promise.allSettled(
    unique.map((id) => upsertMovieByTmdbId(id)),
  );
  const movieIds = results
    .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof upsertMovieByTmdbId>>> => r.status === "fulfilled")
    .map((r) => r.value.id);

  if (movieIds.length) {
    await db
      .insert(roomMovies)
      .values(movieIds.map((movieId) => ({ roomId, movieId })))
      .onConflictDoNothing({
        target: [roomMovies.roomId, roomMovies.movieId],
      });
  }
}

// ── create / join / reconnect ────────────────────────────────────────────
export async function createRoom(
  nickname: string,
  tmdbIds: number[] = [],
  userId?: string,
) {
  const hostToken = newToken();

  let room: Room | undefined;
  for (let attempt = 0; attempt < 7 && !room; attempt++) {
    const code = generateInviteCode();
    // Recycle a code only if the room holding it has already expired.
    await db
      .delete(rooms)
      .where(and(eq(rooms.joinCode, code), lt(rooms.expiresAt, new Date())))
      .catch(() => {});
    try {
      [room] = await db
        .insert(rooms)
        .values({ joinCode: code, hostToken, expiresAt: ttl() })
        .returning();
    } catch (err) {
      if (attempt === 6) throw err;
    }
  }
  if (!room) throw new Error("Could not allocate a room code");

  const participantToken = newToken();
  const [host] = await db
    .insert(roomParticipants)
    .values({
      roomId: room.id,
      participantToken,
      nickname: nickname.slice(0, 40),
      isHost: true,
      userId: userId ?? null,
    })
    .returning({ id: roomParticipants.id });

  if (tmdbIds.length) await addMoviesToPool(room.id, tmdbIds);

  return {
    code: room.joinCode,
    hostToken,
    participantId: host.id,
    participantToken,
    nickname: nickname.slice(0, 40),
  };
}

export async function joinRoom(
  code: string,
  nickname: string,
  tmdbIds: number[] = [],
  userId?: string,
) {
  const room = await getLiveRoom(code);
  if (!room) return { error: "That room doesn't exist or has expired" as const };
  if (room.locked || room.status !== "lobby") {
    return { error: "This session has already started" as const };
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(roomParticipants)
    .where(eq(roomParticipants.roomId, room.id));
  if (count >= MAX_PARTICIPANTS) {
    return { error: "This room is full" as const };
  }

  const participantToken = newToken();
  const [p] = await db
    .insert(roomParticipants)
    .values({
      roomId: room.id,
      participantToken,
      nickname: nickname.slice(0, 40),
      userId: userId ?? null,
    })
    .returning({ id: roomParticipants.id });

  if (tmdbIds.length) await addMoviesToPool(room.id, tmdbIds);

  return {
    participantId: p.id,
    participantToken,
    nickname: nickname.slice(0, 40),
  };
}

/** Rehydrate a seat on refresh/reconnect. */
export async function reconnect(
  code: string,
  participantId: string,
  token: string,
) {
  const room = await getLiveRoom(code);
  if (!room) return { error: "That room doesn't exist or has expired" as const };
  const p = await getParticipant(room.id, token);
  if (!p || p.id !== participantId) {
    return { error: "Your seat is no longer in this room" as const };
  }
  await db
    .update(roomParticipants)
    .set({ lastSeenAt: new Date() })
    .where(eq(roomParticipants.id, p.id));
  return { ok: true as const };
}

// ── lobby / start ──────────────────────────────────────────────────────────
export async function addToPool(
  code: string,
  token: string,
  tmdbIds: number[],
) {
  const room = await getLiveRoom(code);
  if (!room) return { error: "That room doesn't exist or has expired" as const };
  const p = await getParticipant(room.id, token);
  if (!p) return { error: "You're not in this room" as const };
  if (room.status !== "lobby") {
    return { error: "The pool is locked — voting has started" as const };
  }
  await addMoviesToPool(room.id, tmdbIds);
  return { ok: true as const };
}

export async function setReady(code: string, token: string) {
  const room = await getLiveRoom(code);
  if (!room) return { error: "That room doesn't exist or has expired" as const };
  const p = await getParticipant(room.id, token);
  if (!p) return { error: "You're not in this room" as const };
  await db
    .update(roomParticipants)
    .set({ isReady: true })
    .where(eq(roomParticipants.id, p.id));
  return { ok: true as const };
}

export async function startRoom(
  code: string,
  hostToken: string,
  mpaaFilters: MpaaRating[],
) {
  const room = await getLiveRoom(code);
  if (!room) return { error: "That room doesn't exist or has expired" as const };
  if (room.hostToken !== hostToken) {
    return { error: "Only the host can start the session" as const };
  }
  if (room.status !== "lobby") return { ok: true as const }; // idempotent

  // Drop pool movies that don't match the chosen ratings.
  const poolRows = await db
    .select({ id: roomMovies.id, mpaa: movies.mpaaRating })
    .from(roomMovies)
    .innerJoin(movies, eq(movies.id, roomMovies.movieId))
    .where(eq(roomMovies.roomId, room.id));

  const dropIds = poolRows
    .filter((r) => !mpaaFilters.includes((r.mpaa ?? "NR") as MpaaRating))
    .map((r) => r.id);
  if (dropIds.length) {
    await db.delete(roomMovies).where(inArray(roomMovies.id, dropIds));
  }
  const remaining = poolRows.length - dropIds.length;
  if (remaining < 2) {
    return {
      error:
        "Need at least 2 movies matching those ratings. Add more to the pool." as const,
    };
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(roomParticipants)
    .where(eq(roomParticipants.roomId, room.id));
  const voteThreshold = Math.floor(count / 2) + 1;

  await db
    .update(rooms)
    .set({
      status: "voting",
      locked: true,
      mpaaFilters,
      voteThreshold,
      startedAt: new Date(),
    })
    .where(eq(rooms.id, room.id));

  return { ok: true as const };
}

// ── voting / resolution ──────────────────────────────────────────────────
export async function recordRoomVote(
  code: string,
  token: string,
  movieId: string,
  vote: "yay" | "nay",
) {
  const room = await getLiveRoom(code);
  if (!room) return { error: "That room doesn't exist or has expired" as const };
  const p = await getParticipant(room.id, token);
  if (!p) return { error: "You're not in this room" as const };
  if (room.status !== "voting") {
    return { error: "This session isn't accepting votes" as const };
  }

  const inserted = await db
    .insert(roomVotes)
    .values({ roomId: room.id, participantId: p.id, movieId, vote })
    .onConflictDoNothing({
      target: [roomVotes.roomId, roomVotes.participantId, roomVotes.movieId],
    })
    .returning({ id: roomVotes.id });

  if (inserted.length && vote === "yay") {
    const [row] = await db
      .update(roomMovies)
      .set({ voteCount: sql`${roomMovies.voteCount} + 1` })
      .where(
        and(eq(roomMovies.roomId, room.id), eq(roomMovies.movieId, movieId)),
      )
      .returning({ voteCount: roomMovies.voteCount });

    if (row && row.voteCount >= room.voteThreshold) {
      await decideWinner(room.id, movieId);
      return { ok: true as const, decided: true };
    }
  }

  await maybeMarkDone(room.id, p.id);
  await maybeResolveNoConsensus(room.id);
  return { ok: true as const };
}

async function decideWinner(roomId: string, movieId: string) {
  await db
    .update(rooms)
    .set({ status: "decided", winnerMovieId: movieId, endedAt: new Date() })
    .where(eq(rooms.id, roomId));
}

async function maybeMarkDone(roomId: string, participantId: string) {
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(roomMovies)
    .where(eq(roomMovies.roomId, roomId));
  const [{ voted }] = await db
    .select({ voted: sql<number>`count(*)::int` })
    .from(roomVotes)
    .where(
      and(
        eq(roomVotes.roomId, roomId),
        eq(roomVotes.participantId, participantId),
      ),
    );
  if (voted >= total) {
    await db
      .update(roomParticipants)
      .set({ isDoneVoting: true })
      .where(eq(roomParticipants.id, participantId));
  }
}

async function maybeResolveNoConsensus(roomId: string) {
  const [room] = await db
    .select({ status: rooms.status })
    .from(rooms)
    .where(eq(rooms.id, roomId))
    .limit(1);
  if (!room || room.status !== "voting") return;
  const members = await db
    .select({ done: roomParticipants.isDoneVoting })
    .from(roomParticipants)
    .where(eq(roomParticipants.roomId, roomId));
  if (members.length > 0 && members.every((m) => m.done)) {
    await db
      .update(rooms)
      .set({ status: "no_consensus", endedAt: new Date() })
      .where(eq(rooms.id, roomId));
  }
}

/** Recompute the majority threshold after the roster changes (join/kick). */
async function recomputeThreshold(roomId: string) {
  const [room] = await db
    .select()
    .from(rooms)
    .where(eq(rooms.id, roomId))
    .limit(1);
  if (!room || room.status !== "voting") return;

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(roomParticipants)
    .where(eq(roomParticipants.roomId, roomId));
  const threshold = Math.max(1, Math.floor(count / 2) + 1);
  await db
    .update(rooms)
    .set({ voteThreshold: threshold })
    .where(eq(rooms.id, roomId));

  // A lower threshold might mean a movie already qualifies as the winner.
  const [top] = await db
    .select({ movieId: roomMovies.movieId, voteCount: roomMovies.voteCount })
    .from(roomMovies)
    .where(eq(roomMovies.roomId, roomId))
    .orderBy(desc(roomMovies.voteCount))
    .limit(1);
  if (top && top.voteCount >= threshold) {
    await decideWinner(roomId, top.movieId);
  } else {
    await maybeResolveNoConsensus(roomId);
  }
}

export async function kickParticipant(
  code: string,
  hostToken: string,
  participantId: string,
) {
  const room = await getLiveRoom(code);
  if (!room) return { error: "That room doesn't exist or has expired" as const };
  if (room.hostToken !== hostToken) {
    return { error: "Only the host can remove someone" as const };
  }
  await db
    .delete(roomParticipants)
    .where(
      and(
        eq(roomParticipants.id, participantId),
        eq(roomParticipants.roomId, room.id),
        eq(roomParticipants.isHost, false),
      ),
    );
  await recomputeThreshold(room.id);
  return { ok: true as const };
}

// ── state read ─────────────────────────────────────────────────────────────
export async function getRoomState(
  code: string,
  token?: string,
): Promise<RoomState | null> {
  const room = await getLiveRoom(code);
  if (!room) return null;

  const me = await getParticipant(room.id, token);

  const participants = await db
    .select({
      id: roomParticipants.id,
      nickname: roomParticipants.nickname,
      isHost: roomParticipants.isHost,
      isReady: roomParticipants.isReady,
      isDoneVoting: roomParticipants.isDoneVoting,
    })
    .from(roomParticipants)
    .where(eq(roomParticipants.roomId, room.id))
    .orderBy(asc(roomParticipants.joinedAt));

  const movieRows = await db
    .select({
      id: movies.id,
      title: movies.title,
      overview: movies.overview,
      posterPath: movies.posterPath,
      backdropPath: movies.backdropPath,
      releaseDate: movies.releaseDate,
      runtime: movies.runtime,
      mpaaRating: movies.mpaaRating,
      genres: movies.genres,
      tmdbRating: movies.tmdbRating,
      userAvgRating: movies.userAvgRating,
      voteCount: roomMovies.voteCount,
    })
    .from(roomMovies)
    .innerJoin(movies, eq(movies.id, roomMovies.movieId))
    .where(eq(roomMovies.roomId, room.id))
    .orderBy(asc(roomMovies.id));

  let myVotedMovieIds: string[] = [];
  if (me) {
    const votes = await db
      .select({ movieId: roomVotes.movieId })
      .from(roomVotes)
      .where(
        and(
          eq(roomVotes.roomId, room.id),
          eq(roomVotes.participantId, me.id),
        ),
      );
    myVotedMovieIds = votes.map((v) => v.movieId);
  }

  let winner: RoomState["winner"] = null;
  if (room.winnerMovieId) {
    const [w] = await db
      .select({
        id: movies.id,
        title: movies.title,
        posterPath: movies.posterPath,
      })
      .from(movies)
      .where(eq(movies.id, room.winnerMovieId))
      .limit(1);
    winner = w ?? null;
  }

  return {
    code: room.joinCode,
    status: room.status as RoomState["status"],
    isHost: me?.isHost ?? false,
    locked: room.locked,
    voteThreshold: room.voteThreshold,
    mpaaFilters: (room.mpaaFilters as string[]) ?? [],
    participants,
    movies: movieRows.map((m) => ({
      ...m,
      genres: (m.genres as { id: number; name: string }[]) ?? [],
    })),
    winner,
    myVotedMovieIds,
    expiresAt: room.expiresAt.toISOString(),
  };
}

/** Cheap change key for SSE diffing (mirrors stateFingerprint). */
export function roomFingerprint(state: RoomState): string {
  const people = state.participants
    .map((p) => `${p.id}:${p.isReady ? 1 : 0}:${p.isDoneVoting ? 1 : 0}`)
    .join("|");
  const votes = state.movies.map((m) => `${m.id}:${m.voteCount}`).join("|");
  return `${state.status}#${state.locked ? 1 : 0}#${state.winner?.id ?? "-"}#${people}#${votes}`;
}
