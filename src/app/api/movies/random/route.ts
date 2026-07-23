import { NextResponse } from "next/server";
import { discoverRandom } from "@/lib/tmdb";
import { requireUser, serverError, notFound } from "@/lib/api";

export async function GET() {
  const guard = await requireUser("tmdb");
  if (guard.error) return guard.error;

  try {
    const movie = await discoverRandom();
    if (!movie) return notFound("No movie found, try again");
    return NextResponse.json({
      tmdbId: movie.id,
      title: movie.title,
      overview: movie.overview,
      posterPath: movie.poster_path,
      backdropPath: movie.backdrop_path,
      releaseDate: movie.release_date || null,
      tmdbRating: movie.vote_average ? movie.vote_average.toFixed(1) : null,
    });
  } catch (err) {
    console.error("random error", err);
    return serverError("Could not fetch a movie");
  }
}
