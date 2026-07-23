import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { movies, reviews, type Movie } from "@/db/schema";
import {
  getMovie,
  extractMpaaRating,
  type TmdbMovieDetail,
} from "@/lib/tmdb";

/** Fetch a movie from TMDB and upsert it into the local `movies` table. */
export async function upsertMovieByTmdbId(tmdbId: number): Promise<Movie> {
  const detail = await getMovie(tmdbId);
  return upsertMovieFromDetail(detail);
}

/** Upsert an already-fetched TMDB detail payload. */
export async function upsertMovieFromDetail(
  detail: TmdbMovieDetail,
): Promise<Movie> {
  const mpaa = detail.release_dates
    ? extractMpaaRating(detail.release_dates)
    : "NR";

  const values = {
    tmdbId: detail.id,
    title: detail.title,
    overview: detail.overview || null,
    posterPath: detail.poster_path,
    backdropPath: detail.backdrop_path,
    releaseDate: detail.release_date || null,
    runtime: detail.runtime ?? null,
    mpaaRating: mpaa,
    genres: detail.genres ?? [],
    tmdbRating: detail.vote_average ? detail.vote_average.toFixed(1) : null,
    updatedAt: new Date(),
  };

  const [row] = await db
    .insert(movies)
    .values(values)
    .onConflictDoUpdate({
      target: movies.tmdbId,
      set: {
        title: values.title,
        overview: values.overview,
        posterPath: values.posterPath,
        backdropPath: values.backdropPath,
        releaseDate: values.releaseDate,
        runtime: values.runtime,
        mpaaRating: values.mpaaRating,
        genres: values.genres,
        tmdbRating: values.tmdbRating,
        updatedAt: values.updatedAt,
      },
    })
    .returning();

  return row;
}

/** Recompute and persist a movie's user average rating from its reviews. */
export async function recomputeUserAvgRating(movieId: string): Promise<void> {
  const [agg] = await db
    .select({ avg: sql<string | null>`avg(${reviews.rating})` })
    .from(reviews)
    .where(eq(reviews.movieId, movieId));

  const avg = agg?.avg ? Number(agg.avg).toFixed(2) : null;

  await db
    .update(movies)
    .set({ userAvgRating: avg, updatedAt: new Date() })
    .where(eq(movies.id, movieId));
}
