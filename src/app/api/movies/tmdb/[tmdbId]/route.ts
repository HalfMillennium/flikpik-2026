import { NextResponse } from "next/server";
import { getMovie, extractMpaaRating } from "@/lib/tmdb";
import { limitByUserOrIp, badRequest, serverError } from "@/lib/api";

/**
 * Guest-safe movie detail straight from TMDB — no database write. Used by
 * the local-only guest experience, which has no local DB movie ids.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ tmdbId: string }> },
) {
  const guard = await limitByUserOrIp(req, "tmdb");
  if ("error" in guard) return guard.error;

  const { tmdbId } = await params;
  const id = Number(tmdbId);
  if (!Number.isInteger(id) || id <= 0) return badRequest("Invalid TMDB id");

  try {
    const d = await getMovie(id);
    return NextResponse.json({
      movie: {
        tmdbId: d.id,
        title: d.title,
        overview: d.overview || null,
        posterPath: d.poster_path,
        backdropPath: d.backdrop_path,
        releaseDate: d.release_date || null,
        runtime: d.runtime ?? null,
        mpaaRating: d.release_dates ? extractMpaaRating(d.release_dates) : "NR",
        genres: d.genres ?? [],
        tmdbRating: d.vote_average ? d.vote_average.toFixed(1) : null,
      },
    });
  } catch (err) {
    console.error("guest tmdb detail error", err);
    return serverError("Could not load that movie");
  }
}
