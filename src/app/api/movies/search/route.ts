import { NextResponse } from "next/server";
import { searchMovies } from "@/lib/tmdb";
import { limitByUserOrIp, serverError } from "@/lib/api";

// Guests (no account) can search TMDB — rate-limited by IP.
export async function GET(req: Request) {
  const guard = await limitByUserOrIp(req, "tmdb");
  if ("error" in guard) return guard.error;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const page = Number(searchParams.get("page") ?? "1") || 1;

  if (!q) {
    return NextResponse.json({ page: 1, results: [], total_pages: 0 });
  }

  try {
    const data = await searchMovies(q, page);
    // Trim payload to what the client needs.
    const results = (data.results ?? []).map((m) => ({
      tmdbId: m.id,
      title: m.title,
      posterPath: m.poster_path,
      releaseDate: m.release_date || null,
      tmdbRating: m.vote_average ? m.vote_average.toFixed(1) : null,
    }));
    return NextResponse.json({
      page: data.page,
      results,
      total_pages: data.total_pages,
    });
  } catch (err) {
    console.error("search error", err);
    return serverError("Movie search is unavailable right now");
  }
}
