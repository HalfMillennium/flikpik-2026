import "server-only";
import { and, eq, inArray, desc, asc, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  decisionSessions,
  groups,
  groupMembers,
  users,
  movies,
  watchListEntries,
  sessionMovies,
  sessionVotes,
  sessionMembers,
} from "@/db/schema";
import type { MpaaRating } from "@/lib/utils";

export type SessionState = {
  id: string;
  status: "lobby" | "voting" | "decided" | "no_consensus";
  voteThreshold: number;
  isLeader: boolean;
  mpaaFilters: string[];
  members: {
    id: string;
    name: string;
    isReady: boolean;
    isDoneVoting: boolean;
  }[];
  movies: {
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
  }[];
  winner: {
    id: string;
    title: string;
    posterPath: string | null;
  } | null;
  myVotedMovieIds: string[];
};

async function getMembership(userId: string, groupId: string) {
  const [m] = await db
    .select({ id: groupMembers.id })
    .from(groupMembers)
    .where(
      and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)),
    )
    .limit(1);
  return m;
}

async function getActiveSession(groupId: string) {
  const [s] = await db
    .select()
    .from(decisionSessions)
    .where(
      and(
        eq(decisionSessions.groupId, groupId),
        inArray(decisionSessions.status, ["lobby", "voting"]),
      ),
    )
    .orderBy(desc(decisionSessions.createdAt))
    .limit(1);
  return s;
}

/**
 * Start a new decision session. Builds the movie pool from all members'
 * "want to watch" lists, excluding anything any member has already watched,
 * filtered by MPAA rating.
 */
export async function startSession(
  userId: string,
  groupId: string,
  mpaaFilters: MpaaRating[],
) {
  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);
  if (!group) return { error: "Group not found" as const };
  if (group.leaderId !== userId) {
    return { error: "Only the group leader can start a session" as const };
  }

  const existing = await getActiveSession(groupId);
  if (existing) return { session: existing };

  const members = await db
    .select({ userId: groupMembers.userId })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, groupId));
  const memberIds = members.map((m) => m.userId);
  if (memberIds.length === 0) return { error: "Group has no members" as const };

  // Movies any member has already watched → excluded.
  const watched = await db
    .select({ movieId: watchListEntries.movieId })
    .from(watchListEntries)
    .where(
      and(
        inArray(watchListEntries.userId, memberIds),
        eq(watchListEntries.status, "watched"),
      ),
    );
  const watchedSet = new Set(watched.map((w) => w.movieId));

  // Candidate pool: distinct movies on any member's want-to-watch list,
  // matching the MPAA filters, not already watched.
  const candidates = await db
    .selectDistinct({ movieId: watchListEntries.movieId })
    .from(watchListEntries)
    .innerJoin(movies, eq(movies.id, watchListEntries.movieId))
    .where(
      and(
        inArray(watchListEntries.userId, memberIds),
        eq(watchListEntries.status, "want_to_watch"),
        inArray(movies.mpaaRating, mpaaFilters),
      ),
    );

  const poolIds = candidates
    .map((c) => c.movieId)
    .filter((id) => !watchedSet.has(id));

  if (poolIds.length < 2) {
    return {
      error:
        "Not enough movies in the pool. Add more movies to your lists (at least 2 that match the rating filters) and try again." as const,
    };
  }

  const voteThreshold = Math.floor(memberIds.length / 2) + 1;

  const [session] = await db
    .insert(decisionSessions)
    .values({
      groupId,
      status: "lobby",
      mpaaFilters,
      voteThreshold,
    })
    .returning();

  await db
    .insert(sessionMovies)
    .values(poolIds.map((movieId) => ({ sessionId: session.id, movieId })));

  await db
    .insert(sessionMembers)
    .values(memberIds.map((mId) => ({ sessionId: session.id, userId: mId })));

  return { session };
}

export async function setReady(userId: string, sessionId: string) {
  await db
    .update(sessionMembers)
    .set({ isReady: true })
    .where(
      and(
        eq(sessionMembers.sessionId, sessionId),
        eq(sessionMembers.userId, userId),
      ),
    );
  await maybeAdvanceToVoting(sessionId);
}

/** Move lobby → voting when everyone is ready (or on leader force-start). */
export async function maybeAdvanceToVoting(sessionId: string, force = false) {
  const [session] = await db
    .select()
    .from(decisionSessions)
    .where(eq(decisionSessions.id, sessionId))
    .limit(1);
  if (!session || session.status !== "lobby") return;

  if (!force) {
    const members = await db
      .select({ isReady: sessionMembers.isReady })
      .from(sessionMembers)
      .where(eq(sessionMembers.sessionId, sessionId));
    if (!members.every((m) => m.isReady)) return;
  }

  await db
    .update(decisionSessions)
    .set({ status: "voting" })
    .where(eq(decisionSessions.id, sessionId));
}

export async function forceStart(userId: string, groupId: string) {
  const session = await getActiveSession(groupId);
  if (!session) return { error: "No active session" as const };

  const [group] = await db
    .select({ leaderId: groups.leaderId })
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);
  if (group?.leaderId !== userId) {
    return { error: "Only the leader can force-start" as const };
  }

  await maybeAdvanceToVoting(session.id, true);
  return { ok: true };
}

/**
 * Record a vote and re-tally. If a movie crosses the threshold, the session
 * is decided and the winner is moved to every member's watched list.
 */
export async function recordVote(
  userId: string,
  sessionId: string,
  movieId: string,
  vote: "yay" | "nay",
) {
  const [session] = await db
    .select()
    .from(decisionSessions)
    .where(eq(decisionSessions.id, sessionId))
    .limit(1);
  if (!session) return { error: "Session not found" as const };
  if (session.status !== "voting") {
    return { error: "Session is not accepting votes" as const };
  }

  // Idempotent insert — one vote per (session, user, movie).
  const inserted = await db
    .insert(sessionVotes)
    .values({ sessionId, userId, movieId, vote })
    .onConflictDoNothing({
      target: [sessionVotes.sessionId, sessionVotes.userId, sessionVotes.movieId],
    })
    .returning({ id: sessionVotes.id });

  // Only bump the tally if this vote is new and a "yay".
  if (inserted.length && vote === "yay") {
    const [row] = await db
      .update(sessionMovies)
      .set({ voteCount: sql`${sessionMovies.voteCount} + 1` })
      .where(
        and(
          eq(sessionMovies.sessionId, sessionId),
          eq(sessionMovies.movieId, movieId),
        ),
      )
      .returning({ voteCount: sessionMovies.voteCount });

    if (row && row.voteCount >= session.voteThreshold) {
      await decideWinner(session.id, session.groupId, movieId);
      return { ok: true, decided: true };
    }
  }

  // Has this member now voted on every movie? Mark them done.
  await maybeMarkDone(sessionId, userId);
  // If everyone is done and nobody won, resolve to no_consensus.
  await maybeResolveNoConsensus(session.id, session.groupId);

  return { ok: true };
}

async function maybeMarkDone(sessionId: string, userId: string) {
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(sessionMovies)
    .where(eq(sessionMovies.sessionId, sessionId));

  const [{ voted }] = await db
    .select({ voted: sql<number>`count(*)::int` })
    .from(sessionVotes)
    .where(
      and(
        eq(sessionVotes.sessionId, sessionId),
        eq(sessionVotes.userId, userId),
      ),
    );

  if (voted >= total) {
    await db
      .update(sessionMembers)
      .set({ isDoneVoting: true })
      .where(
        and(
          eq(sessionMembers.sessionId, sessionId),
          eq(sessionMembers.userId, userId),
        ),
      );
  }
}

async function maybeResolveNoConsensus(sessionId: string, groupId: string) {
  const [session] = await db
    .select({ status: decisionSessions.status })
    .from(decisionSessions)
    .where(eq(decisionSessions.id, sessionId))
    .limit(1);
  if (!session || session.status !== "voting") return;

  const members = await db
    .select({ isDoneVoting: sessionMembers.isDoneVoting })
    .from(sessionMembers)
    .where(eq(sessionMembers.sessionId, sessionId));

  if (members.length > 0 && members.every((m) => m.isDoneVoting)) {
    await db
      .update(decisionSessions)
      .set({ status: "no_consensus", endedAt: new Date() })
      .where(eq(decisionSessions.id, sessionId));
  }
}

async function decideWinner(
  sessionId: string,
  groupId: string,
  movieId: string,
) {
  await db
    .update(decisionSessions)
    .set({ status: "decided", winnerMovieId: movieId, endedAt: new Date() })
    .where(eq(decisionSessions.id, sessionId));

  // Move the winner from every member's watch list to their watched list.
  const memberIds = (
    await db
      .select({ userId: sessionMembers.userId })
      .from(sessionMembers)
      .where(eq(sessionMembers.sessionId, sessionId))
  ).map((m) => m.userId);

  if (memberIds.length) {
    // Mark existing entries watched…
    await db
      .update(watchListEntries)
      .set({ status: "watched" })
      .where(
        and(
          eq(watchListEntries.movieId, movieId),
          inArray(watchListEntries.userId, memberIds),
        ),
      );
    // …and add a watched entry for members who didn't have it listed.
    await db
      .insert(watchListEntries)
      .values(
        memberIds.map((uId) => ({
          userId: uId,
          movieId,
          status: "watched",
        })),
      )
      .onConflictDoNothing({
        target: [watchListEntries.userId, watchListEntries.movieId],
      });
  }
}

/** Full session state for a member (used by the page and SSE stream). */
export async function getSessionState(
  userId: string,
  groupId: string,
  sessionId?: string,
): Promise<SessionState | null> {
  const membership = await getMembership(userId, groupId);
  if (!membership) return null;

  let session;
  if (sessionId) {
    [session] = await db
      .select()
      .from(decisionSessions)
      .where(
        and(
          eq(decisionSessions.id, sessionId),
          eq(decisionSessions.groupId, groupId),
        ),
      )
      .limit(1);
  } else {
    // Prefer an active session; otherwise the most recent one.
    session = await getActiveSession(groupId);
    if (!session) {
      [session] = await db
        .select()
        .from(decisionSessions)
        .where(eq(decisionSessions.groupId, groupId))
        .orderBy(desc(decisionSessions.createdAt))
        .limit(1);
    }
  }
  if (!session) return null;

  const [group] = await db
    .select({ leaderId: groups.leaderId })
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);

  const memberRows = await db
    .select({
      id: sessionMembers.userId,
      name: users.displayName,
      isReady: sessionMembers.isReady,
      isDoneVoting: sessionMembers.isDoneVoting,
    })
    .from(sessionMembers)
    .innerJoin(users, eq(users.id, sessionMembers.userId))
    .where(eq(sessionMembers.sessionId, session.id));

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
      voteCount: sessionMovies.voteCount,
    })
    .from(sessionMovies)
    .innerJoin(movies, eq(movies.id, sessionMovies.movieId))
    .where(eq(sessionMovies.sessionId, session.id))
    .orderBy(asc(sessionMovies.id));

  const myVotes = await db
    .select({ movieId: sessionVotes.movieId })
    .from(sessionVotes)
    .where(
      and(
        eq(sessionVotes.sessionId, session.id),
        eq(sessionVotes.userId, userId),
      ),
    );

  let winner: SessionState["winner"] = null;
  if (session.winnerMovieId) {
    const [w] = await db
      .select({
        id: movies.id,
        title: movies.title,
        posterPath: movies.posterPath,
      })
      .from(movies)
      .where(eq(movies.id, session.winnerMovieId))
      .limit(1);
    winner = w ?? null;
  }

  return {
    id: session.id,
    status: session.status as SessionState["status"],
    voteThreshold: session.voteThreshold,
    isLeader: group?.leaderId === userId,
    mpaaFilters: (session.mpaaFilters as string[]) ?? [],
    members: memberRows.map((m) => ({
      id: m.id,
      name: m.name,
      isReady: m.isReady,
      isDoneVoting: m.isDoneVoting,
    })),
    movies: movieRows.map((m) => ({
      ...m,
      genres: (m.genres as { id: number; name: string }[]) ?? [],
    })),
    winner,
    myVotedMovieIds: myVotes.map((v) => v.movieId),
  };
}

/** Cheap fingerprint for SSE change detection. */
export function stateFingerprint(state: SessionState): string {
  const memberBits = state.members
    .map((m) => `${m.id}:${m.isReady ? 1 : 0}:${m.isDoneVoting ? 1 : 0}`)
    .join("|");
  const voteBits = state.movies.map((m) => `${m.id}:${m.voteCount}`).join("|");
  return `${state.status}#${state.winner?.id ?? "-"}#${memberBits}#${voteBits}`;
}
