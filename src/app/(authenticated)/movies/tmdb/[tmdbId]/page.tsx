"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useGuest } from "@/components/providers/GuestProvider";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Chip } from "@/components/ui/Chip";
import { StarRating } from "@/components/ui/StarRating";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/providers/ToastProvider";
import { posterUrl, backdropUrl } from "@/lib/images";
import { yearOf, formatRuntime } from "@/lib/utils";

type GuestDetail = {
  tmdbId: number;
  title: string;
  overview: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string | null;
  runtime: number | null;
  mpaaRating: string | null;
  genres: { id: number; name: string }[];
  tmdbRating: string | null;
};

export default function GuestMovieDetailPage({
  params,
}: {
  params: Promise<{ tmdbId: string }>;
}) {
  const { tmdbId } = use(params);
  const id = Number(tmdbId);
  const { statusOf, upsert, remove } = useGuest();
  const toast = useToast();
  const [movie, setMovie] = useState<GuestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/movies/tmdb/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => alive && setMovie(d.movie))
      .catch(() => alive && setError(true))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size={30} />
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="py-16 text-center">
        <h1 className="type-title">Couldn&apos;t load that movie</h1>
        <p className="mt-2 text-[var(--color-ink-soft)]">
          Try again, or head back to search.
        </p>
        <div className="mt-6">
          <Link href="/movies/search" className="font-semibold text-[var(--color-red)]">
            ← Back to search
          </Link>
        </div>
      </div>
    );
  }

  const status = statusOf(movie.tmdbId);
  const backdrop = backdropUrl(movie.backdropPath);

  function choose(next: "want_to_watch" | "watched") {
    upsert(
      {
        tmdbId: movie!.tmdbId,
        title: movie!.title,
        posterPath: movie!.posterPath,
        releaseDate: movie!.releaseDate,
        tmdbRating: movie!.tmdbRating,
      },
      next,
    );
    toast(
      next === "watched" ? "Marked as watched" : "Added to watch list",
      "success",
    );
  }

  return (
    <div className="-mx-4 -mt-8 sm:-mx-6">
      <div className="relative h-52 w-full overflow-hidden sm:h-72">
        {backdrop ? (
          <Image src={backdrop} alt="" fill sizes="100vw" className="object-cover" priority />
        ) : (
          <div className="h-full w-full bg-[var(--color-ink-panel)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-paper)] via-[var(--color-paper)]/40 to-[var(--color-ink)]/30" />
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="-mt-24 flex flex-col gap-6 sm:flex-row sm:items-end">
          <div className="relative mx-auto aspect-[2/3] w-44 shrink-0 overflow-hidden rounded-xl shadow-[var(--shadow-raised)] sm:mx-0 sm:w-52">
            <Image
              src={posterUrl(movie.posterPath, "w500")}
              alt={`${movie.title} poster`}
              fill
              sizes="208px"
              className="object-cover"
              priority
            />
          </div>

          <div className="flex-1 text-center sm:text-left">
            <h1 className="type-display">{movie.title}</h1>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-sm text-[var(--color-ink-soft)] sm:justify-start">
              {movie.releaseDate && <span>{yearOf(movie.releaseDate)}</span>}
              {movie.runtime ? (
                <>
                  <span aria-hidden>·</span>
                  <span>{formatRuntime(movie.runtime)}</span>
                </>
              ) : null}
              <Badge tone="line">{movie.mpaaRating || "NR"}</Badge>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              {movie.genres.map((g) => (
                <Chip key={g.id} as="span">
                  {g.name}
                </Chip>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-5 sm:justify-start">
              {movie.tmdbRating && Number(movie.tmdbRating) > 0 && (
                <div>
                  <div className="text-xs uppercase tracking-wide text-[var(--color-ink-soft)]">
                    TMDB rating
                  </div>
                  <StarRating value={Number(movie.tmdbRating) / 2} showValue />
                </div>
              )}
              <div className="ml-auto flex flex-col items-center gap-1.5 sm:ml-0 sm:items-start">
                <div className="flex gap-2">
                  <Button
                    variant={status === "want_to_watch" ? "primary" : "secondary"}
                    onClick={() => choose("want_to_watch")}
                  >
                    {status === "want_to_watch" ? "✓ " : ""}Want to Watch
                  </Button>
                  <Button
                    variant={status === "watched" ? "primary" : "secondary"}
                    onClick={() => choose("watched")}
                  >
                    {status === "watched" ? "✓ " : ""}Watched
                  </Button>
                </div>
                {status && (
                  <button
                    onClick={() => {
                      remove(movie.tmdbId);
                      toast("Removed from list");
                    }}
                    className="text-xs font-medium text-[var(--color-ink-soft)] hover:text-[var(--color-red-deep)]"
                  >
                    Remove from list
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <section className="mt-8">
          <h2 className="type-title mb-2">Synopsis</h2>
          <p className="max-w-3xl text-[var(--color-ink-soft)]">
            {movie.overview || "No synopsis available for this title."}
          </p>
        </section>

        {/* reviews are shared data → account-only */}
        <section className="mt-10 pb-6">
          <div className="rounded-2xl border border-dashed border-[var(--color-line)] bg-[var(--color-paper-raised)] p-6 text-center">
            <h2 className="type-title">Reviews are for members</h2>
            <p className="mx-auto mt-2 max-w-sm text-[var(--color-ink-soft)]">
              Create a free account to read the group&apos;s reviews, write your
              own, and run movie-night sessions with friends.
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <Link href="/signup">
                <Button>Create account</Button>
              </Link>
              <Link href="/login">
                <Button variant="secondary">Log in</Button>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
