import "server-only";

/**
 * TMDB API client — the single source of truth for TMDB communication.
 * The bearer token is server-only and MUST never reach the client.
 * Image URL helpers live in ./images (client-safe) and are re-exported here.
 */

export { posterUrl, backdropUrl } from "./images";

const TMDB_BASE = "https://api.themoviedb.org/3";

function headers() {
  const token = process.env.TMDB_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      "TMDB_ACCESS_TOKEN is not set. Copy .env.example to .env.local.",
    );
  }
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export type TmdbSearchResult = {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count?: number;
};

export type TmdbSearchResponse = {
  page: number;
  results: TmdbSearchResult[];
  total_pages: number;
  total_results: number;
};

export type TmdbMovieDetail = TmdbSearchResult & {
  runtime: number | null;
  genres: { id: number; name: string }[];
  release_dates?: unknown;
};

export async function searchMovies(
  query: string,
  page = 1,
): Promise<TmdbSearchResponse> {
  const res = await fetch(
    `${TMDB_BASE}/search/movie?query=${encodeURIComponent(
      query,
    )}&page=${page}&include_adult=false`,
    { headers: headers(), next: { revalidate: 300 } },
  );
  if (!res.ok) throw new Error(`TMDB search failed: ${res.status}`);
  return res.json();
}

export async function getMovie(tmdbId: number): Promise<TmdbMovieDetail> {
  const res = await fetch(
    `${TMDB_BASE}/movie/${tmdbId}?append_to_response=release_dates`,
    { headers: headers(), next: { revalidate: 86400 } },
  );
  if (!res.ok) throw new Error(`TMDB getMovie failed: ${res.status}`);
  return res.json();
}

export async function discoverRandom(): Promise<TmdbSearchResult | null> {
  const page = Math.floor(Math.random() * 20) + 1;
  const res = await fetch(
    `${TMDB_BASE}/discover/movie?sort_by=popularity.desc&page=${page}&include_adult=false`,
    { headers: headers(), next: { revalidate: 60 } },
  );
  if (!res.ok) throw new Error(`TMDB discover failed: ${res.status}`);
  const data = (await res.json()) as TmdbSearchResponse;
  if (!data.results?.length) return null;
  const idx = Math.floor(Math.random() * data.results.length);
  return data.results[idx];
}

export async function getPopular(page = 1): Promise<TmdbSearchResponse> {
  const res = await fetch(
    `${TMDB_BASE}/movie/popular?page=${page}`,
    { headers: headers(), next: { revalidate: 3600 } },
  );
  if (!res.ok) throw new Error(`TMDB popular failed: ${res.status}`);
  return res.json();
}

export async function getTrending(
  window: "day" | "week" = "week",
  page = 1,
): Promise<TmdbSearchResponse> {
  const res = await fetch(
    `${TMDB_BASE}/trending/movie/${window}?page=${page}`,
    { headers: headers(), next: { revalidate: 3600 } },
  );
  if (!res.ok) throw new Error(`TMDB trending failed: ${res.status}`);
  return res.json();
}

export async function getNowPlaying(page = 1): Promise<TmdbSearchResponse> {
  const res = await fetch(
    `${TMDB_BASE}/movie/now_playing?page=${page}&region=US`,
    { headers: headers(), next: { revalidate: 3600 } },
  );
  if (!res.ok) throw new Error(`TMDB now_playing failed: ${res.status}`);
  return res.json();
}

/** Extract the US MPAA rating from a TMDB release_dates response. */
export function extractMpaaRating(releaseDates: unknown): string {
  const rd = releaseDates as
    | { results?: { iso_3166_1: string; release_dates?: { certification?: string }[] }[] }
    | undefined;
  const us = rd?.results?.find((r) => r.iso_3166_1 === "US");
  if (!us) return "NR";
  const cert = us.release_dates?.find((d) => d.certification);
  return cert?.certification || "NR";
}
