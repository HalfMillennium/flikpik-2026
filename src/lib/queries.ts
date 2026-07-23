import "server-only";
import { and, eq, desc, asc, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  watchListEntries,
  movies,
  reviews,
  users,
} from "@/db/schema";

export type WatchStatus = "want_to_watch" | "watched";
export type SortKey = "recent" | "title" | "rating" | "release";

export async function getWatchList(
  userId: string,
  status: WatchStatus,
  sort: SortKey = "recent",
) {
  const orderBy = {
    recent: desc(watchListEntries.addedAt),
    title: asc(movies.title),
    rating: desc(
      sql`coalesce(${movies.userAvgRating}, ${movies.tmdbRating}, 0)`,
    ),
    release: desc(movies.releaseDate),
  }[sort];

  return db
    .select({
      id: movies.id,
      title: movies.title,
      posterPath: movies.posterPath,
      releaseDate: movies.releaseDate,
      userAvgRating: movies.userAvgRating,
      tmdbRating: movies.tmdbRating,
    })
    .from(watchListEntries)
    .innerJoin(movies, eq(movies.id, watchListEntries.movieId))
    .where(
      and(
        eq(watchListEntries.userId, userId),
        eq(watchListEntries.status, status),
      ),
    )
    .orderBy(orderBy);
}

export async function getMovieDetail(movieId: string, userId: string) {
  const [movie] = await db
    .select()
    .from(movies)
    .where(eq(movies.id, movieId))
    .limit(1);
  if (!movie) return null;

  const [entry] = await db
    .select({ status: watchListEntries.status })
    .from(watchListEntries)
    .where(
      and(
        eq(watchListEntries.userId, userId),
        eq(watchListEntries.movieId, movieId),
      ),
    )
    .limit(1);

  const reviewRows = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      body: reviews.body,
      createdAt: reviews.createdAt,
      userId: reviews.userId,
      username: users.username,
      displayName: users.displayName,
    })
    .from(reviews)
    .innerJoin(users, eq(users.id, reviews.userId))
    .where(eq(reviews.movieId, movieId))
    .orderBy(desc(reviews.createdAt));

  const myReview = reviewRows.find((r) => r.userId === userId) ?? null;

  return {
    movie: {
      ...movie,
      genres: (movie.genres as { id: number; name: string }[]) ?? [],
    },
    onList: !!entry,
    watchStatus: (entry?.status as WatchStatus | undefined) ?? null,
    reviews: reviewRows.map((r) => ({
      id: r.id,
      rating: r.rating,
      body: r.body,
      createdAt: r.createdAt.toISOString(),
      username: r.username,
      displayName: r.displayName,
      isMine: r.userId === userId,
    })),
    myReview: myReview
      ? { id: myReview.id, rating: myReview.rating, body: myReview.body }
      : null,
  };
}

export async function getUserProfile(userId: string) {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      username: users.username,
      displayName: users.displayName,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) return null;

  const [{ watchCount }] = await db
    .select({ watchCount: sql<number>`count(*)::int` })
    .from(watchListEntries)
    .where(
      and(
        eq(watchListEntries.userId, userId),
        eq(watchListEntries.status, "want_to_watch"),
      ),
    );

  const [{ watchedCount }] = await db
    .select({ watchedCount: sql<number>`count(*)::int` })
    .from(watchListEntries)
    .where(
      and(
        eq(watchListEntries.userId, userId),
        eq(watchListEntries.status, "watched"),
      ),
    );

  const [{ reviewCount }] = await db
    .select({ reviewCount: sql<number>`count(*)::int` })
    .from(reviews)
    .where(eq(reviews.userId, userId));

  return {
    ...user,
    createdAt: user.createdAt.toISOString(),
    watchCount,
    watchedCount,
    reviewCount,
  };
}
