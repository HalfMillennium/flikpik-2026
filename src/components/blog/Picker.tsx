"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { posterUrl } from "@/lib/images";
import { yearOf } from "@/lib/utils";

type PickedMovie = {
  tmdbId: number;
  title: string;
  overview: string;
  posterPath: string | null;
  releaseDate: string | null;
  tmdbRating: string | null;
};

export function Picker() {
  const [movie, setMovie] = useState<PickedMovie | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function spin() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/movies/random");
      if (res.ok) setMovie(await res.json());
      else setError("Couldn't find one — try again.");
    } catch {
      setError("Couldn't find one — try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-8">
      {!movie && (
        <Button size="lg" onClick={spin} disabled={loading}>
          {loading ? <Spinner size={18} /> : "🎲"} Pick a movie
        </Button>
      )}

      {movie && (
        <div className="fade-up mx-auto max-w-md overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper-raised)] p-5 text-left shadow-[var(--shadow-card)]">
          <div className="flex gap-4">
            <Link
              href={`/movies/tmdb/${movie.tmdbId}`}
              className="relative aspect-[2/3] w-28 shrink-0 overflow-hidden rounded-lg"
            >
              <Image
                src={posterUrl(movie.posterPath, "w342")}
                alt={`${movie.title} poster`}
                fill
                sizes="112px"
                className="object-cover"
              />
            </Link>
            <div className="min-w-0">
              <h2 className="type-title leading-tight">{movie.title}</h2>
              <p className="text-sm text-[var(--color-ink-soft)]">
                {yearOf(movie.releaseDate) || "—"}
                {movie.tmdbRating ? ` · ★ ${movie.tmdbRating}` : ""}
              </p>
              <p className="mt-2 line-clamp-4 text-sm text-[var(--color-ink-soft)]">
                {movie.overview || "No synopsis available."}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={spin} disabled={loading}>
              {loading ? <Spinner size={16} /> : "🎲"} Spin again
            </Button>
            <ButtonLink href={`/movies/tmdb/${movie.tmdbId}`} variant="secondary">
              Details
            </ButtonLink>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm text-[var(--color-red-deep)]">
          {error}
        </p>
      )}

      <div className="mt-10 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper-raised)] p-6">
        <p className="type-title">Deciding with other people?</p>
        <p className="mx-auto mt-2 max-w-sm text-[var(--color-ink-soft)]">
          A random pick works solo. For a group, everyone should get a vote —
          start a session and swipe together.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <ButtonLink href="/rooms/new">Start a movie night</ButtonLink>
          <ButtonLink href="/lists" variant="secondary">
            Browse lists
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
