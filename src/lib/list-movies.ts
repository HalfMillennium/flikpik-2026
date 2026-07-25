import "server-only";
import { getMovie } from "@/lib/tmdb";
import type { ListMovie } from "@/lib/content";

export type ResolvedListMovie = {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  releaseDate: string | null;
};

/**
 * Enrich a list's curated TMDB ids with poster/release data for the grid and
 * ItemList schema. Titles come from the list file, so this degrades gracefully
 * (titles still render) if TMDB is unavailable.
 */
export async function resolveListMovies(
  movies: ListMovie[],
): Promise<ResolvedListMovie[]> {
  const results = await Promise.allSettled(
    movies.map((m) => getMovie(m.tmdbId)),
  );
  return movies.map((m, i) => {
    const r = results[i];
    const detail = r.status === "fulfilled" ? r.value : null;
    return {
      tmdbId: m.tmdbId,
      title: m.title,
      posterPath: detail?.poster_path ?? null,
      releaseDate: detail?.release_date || null,
    };
  });
}
