import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { watchListEntries, movies } from "@/db/schema";
import { requireUser, badRequest, serverError, notFound } from "@/lib/api";
import { watchlistActionSchema } from "@/lib/validation";
import { upsertMovieByTmdbId } from "@/lib/movies";

export async function POST(req: Request) {
  const guard = await requireUser("watchlist");
  if (guard.error) return guard.error;
  const userId = guard.user.id;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid request body");
  }

  const parsed = watchlistActionSchema.safeParse(body);
  if (!parsed.success) return badRequest("Validation failed");

  const { action, tmdbId } = parsed.data;

  try {
    // Resolve the local movie id. When adding, upsert from TMDB if needed.
    let movieId = parsed.data.movieId ?? null;

    if (!movieId && tmdbId) {
      const existing = await db
        .select({ id: movies.id })
        .from(movies)
        .where(eq(movies.tmdbId, tmdbId))
        .limit(1);
      movieId = existing[0]?.id ?? (await upsertMovieByTmdbId(tmdbId)).id;
    }

    if (!movieId) return badRequest("A movie is required");

    if (action === "add") {
      const [entry] = await db
        .insert(watchListEntries)
        .values({ userId, movieId, status: "want_to_watch" })
        .onConflictDoNothing({
          target: [watchListEntries.userId, watchListEntries.movieId],
        })
        .returning();
      return NextResponse.json({ ok: true, entry: entry ?? null, movieId });
    }

    if (action === "remove") {
      await db
        .delete(watchListEntries)
        .where(
          and(
            eq(watchListEntries.userId, userId),
            eq(watchListEntries.movieId, movieId),
          ),
        );
      return NextResponse.json({ ok: true, movieId });
    }

    // mark_watched / mark_unwatched
    const status = action === "mark_watched" ? "watched" : "want_to_watch";
    const [updated] = await db
      .update(watchListEntries)
      .set({ status })
      .where(
        and(
          eq(watchListEntries.userId, userId),
          eq(watchListEntries.movieId, movieId),
        ),
      )
      .returning();

    if (!updated) return notFound("That movie isn't on your list");
    return NextResponse.json({ ok: true, entry: updated });
  } catch (err) {
    console.error("watchlist error", err);
    return serverError("Could not update your list");
  }
}
