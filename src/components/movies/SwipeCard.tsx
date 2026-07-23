"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { posterUrl, backdropUrl } from "@/lib/images";
import { yearOf, formatRuntime } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";

export type SwipeMovie = {
  id: string;
  title: string;
  overview: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string | null;
  runtime: number | null;
  mpaaRating: string | null;
  genres: { id: number; name: string }[];
  tmdbRating: string | null;
  userAvgRating: string | null;
};

/**
 * Full decision-session card with touch-swipe (left = nay, right = yay).
 * Rotation follows the finger; card animates off-screen on commit.
 */
export function SwipeCard({
  movie,
  onVote,
}: {
  movie: SwipeMovie;
  onVote: (vote: "yay" | "nay") => void;
}) {
  const [drag, setDrag] = useState({ x: 0, active: false });
  const [leaving, setLeaving] = useState<"yay" | "nay" | null>(null);
  const startX = useRef(0);
  const rating = movie.userAvgRating ?? movie.tmdbRating;
  const backdrop = backdropUrl(movie.backdropPath, "w780");

  function commit(vote: "yay" | "nay") {
    setLeaving(vote);
    setTimeout(() => onVote(vote), 260);
  }

  function onPointerDown(e: React.PointerEvent) {
    if (leaving) return;
    startX.current = e.clientX;
    setDrag({ x: 0, active: true });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.active) return;
    setDrag({ x: e.clientX - startX.current, active: true });
  }
  function onPointerUp() {
    if (!drag.active) return;
    const threshold = 110;
    if (drag.x > threshold) commit("yay");
    else if (drag.x < -threshold) commit("nay");
    setDrag({ x: 0, active: false });
  }

  const rotation = drag.x / 18;
  const transform = leaving
    ? `translateX(${leaving === "yay" ? 140 : -140}%) rotate(${leaving === "yay" ? 22 : -22}deg)`
    : `translateX(${drag.x}px) rotate(${rotation}deg)`;

  return (
    <div
      className="relative select-none touch-none"
      style={{
        transform,
        transition: drag.active ? "none" : "transform 0.26s ease",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* YAY / NAY stamps */}
      <div
        className="pointer-events-none absolute left-4 top-4 z-10 rotate-[-12deg] rounded-lg border-4 px-3 py-1 text-2xl font-black uppercase"
        style={{
          color: "var(--color-yay)",
          borderColor: "var(--color-yay)",
          opacity: Math.min(1, Math.max(0, drag.x / 100)),
        }}
      >
        Yay
      </div>
      <div
        className="pointer-events-none absolute right-4 top-4 z-10 rotate-[12deg] rounded-lg border-4 px-3 py-1 text-2xl font-black uppercase"
        style={{
          color: "var(--color-nay)",
          borderColor: "var(--color-nay)",
          opacity: Math.min(1, Math.max(0, -drag.x / 100)),
        }}
      >
        Nay
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper-raised)] shadow-[var(--shadow-raised)]">
        <div className="relative h-40 w-full bg-[var(--color-ink-panel)]">
          {backdrop && (
            <Image
              src={backdrop}
              alt=""
              fill
              sizes="500px"
              className="object-cover opacity-80"
              draggable={false}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-paper-raised)] to-transparent" />
        </div>

        <div className="-mt-16 px-5 pb-5">
          <div className="flex gap-4">
            <div className="relative aspect-[2/3] w-24 shrink-0 overflow-hidden rounded-lg shadow-lg">
              <Image
                src={posterUrl(movie.posterPath, "w342")}
                alt={`${movie.title} poster`}
                fill
                sizes="96px"
                className="object-cover"
                draggable={false}
              />
            </div>
            <div className="min-w-0 flex-1 pt-16">
              <h2 className="type-title line-clamp-2">{movie.title}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[var(--color-ink-soft)]">
                {movie.releaseDate && <span>{yearOf(movie.releaseDate)}</span>}
                {movie.runtime ? <span>· {formatRuntime(movie.runtime)}</span> : null}
                <Badge tone="line">{movie.mpaaRating || "NR"}</Badge>
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {movie.genres.slice(0, 4).map((g) => (
              <span
                key={g.id}
                className="rounded-full bg-[var(--color-paper-tint)] px-2.5 py-0.5 text-xs text-[var(--color-ink-soft)]"
              >
                {g.name}
              </span>
            ))}
          </div>

          {rating && Number(rating) > 0 && (
            <div className="mt-3 text-sm font-semibold text-[var(--color-ink-soft)]">
              ★ {Number(rating).toFixed(1)}
              {movie.userAvgRating ? " flikpik" : " TMDB"}
            </div>
          )}

          <p className="mt-3 line-clamp-4 text-sm text-[var(--color-ink-soft)]">
            {movie.overview || "No synopsis available."}
          </p>
        </div>
      </div>
    </div>
  );
}
