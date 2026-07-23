import { NextResponse } from "next/server";
import { requireUser, badRequest, serverError } from "@/lib/api";
import { upsertMovieByTmdbId } from "@/lib/movies";

/** Fetch a movie from TMDB by id and upsert it into the local DB. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ tmdbId: string }> },
) {
  const guard = await requireUser("tmdb");
  if (guard.error) return guard.error;

  const { tmdbId } = await params;
  const id = Number(tmdbId);
  if (!Number.isInteger(id) || id <= 0) {
    return badRequest("Invalid TMDB id");
  }

  try {
    const movie = await upsertMovieByTmdbId(id);
    return NextResponse.json({ movie });
  } catch (err) {
    console.error("upsert movie error", err);
    return serverError("Could not fetch that movie");
  }
}
