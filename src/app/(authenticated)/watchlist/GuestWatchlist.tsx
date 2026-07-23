"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useGuest, type GuestMovie } from "@/components/providers/GuestProvider";
import { Chip } from "@/components/ui/Chip";
import { Popover, MenuItem } from "@/components/ui/Popover";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { posterUrl } from "@/lib/images";
import { yearOf } from "@/lib/utils";

type Tab = "want_to_watch" | "watched";
type Sort = "recent" | "title" | "rating" | "release";

const SORT_LABELS: Record<Sort, string> = {
  recent: "Recently added",
  title: "Title A–Z",
  rating: "Rating high–low",
  release: "Release date",
};

export function GuestWatchlist() {
  const { ready, isGuest, enterGuestMode, list, remove, setStatus } = useGuest();
  const [tab, setTab] = useState<Tab>("want_to_watch");
  const [sort, setSort] = useState<Sort>("recent");

  // A no-account visitor who lands here is a guest.
  useEffect(() => {
    if (ready && !isGuest) enterGuestMode();
  }, [ready, isGuest, enterGuestMode]);

  const movies = useMemo(() => {
    const filtered = list.filter((m) => m.status === tab);
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      switch (sort) {
        case "title":
          return a.title.localeCompare(b.title);
        case "rating":
          return Number(b.tmdbRating ?? 0) - Number(a.tmdbRating ?? 0);
        case "release":
          return (b.releaseDate ?? "").localeCompare(a.releaseDate ?? "");
        default:
          return b.addedAt - a.addedAt;
      }
    });
    return sorted;
  }, [list, tab, sort]);

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner size={28} />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="type-display">
          {tab === "watched" ? "Watched" : "Watch List"}
        </h1>
        <ButtonLink href="/movies/search" size="sm">
          + Add movies
        </ButtonLink>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Chip active={tab === "want_to_watch"} onClick={() => setTab("want_to_watch")}>
            Want to Watch
          </Chip>
          <Chip active={tab === "watched"} onClick={() => setTab("watched")}>
            Watched
          </Chip>
        </div>
        <Popover
          trigger={({ toggle }) => (
            <button
              onClick={toggle}
              className="flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-paper-raised)] px-4 py-1.5 text-sm font-medium hover:border-[var(--color-ink-soft)]"
            >
              Sort: {SORT_LABELS[sort]}
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
              </svg>
            </button>
          )}
        >
          {({ close }) =>
            (Object.keys(SORT_LABELS) as Sort[]).map((key) => (
              <MenuItem
                key={key}
                onClick={() => {
                  close();
                  setSort(key);
                }}
              >
                {SORT_LABELS[key]}
              </MenuItem>
            ))
          }
        </Popover>
      </div>

      {movies.length === 0 ? (
        <EmptyState
          title={tab === "watched" ? "Nothing watched yet" : "Your list is empty"}
          body={
            tab === "watched"
              ? "Mark movies watched from your list and they'll land here."
              : "Search for movies to add. As a guest, your list is saved on this device."
          }
          cta={{ href: "/movies/search", label: "Search for movies" }}
        />
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {movies.map((m) => (
            <GuestCard
              key={m.tmdbId}
              movie={m}
              onRemove={() => remove(m.tmdbId)}
              onToggleWatched={() =>
                setStatus(
                  m.tmdbId,
                  m.status === "watched" ? "want_to_watch" : "watched",
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function GuestCard({
  movie,
  onRemove,
  onToggleWatched,
}: {
  movie: GuestMovie;
  onRemove: () => void;
  onToggleWatched: () => void;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-paper-raised)] shadow-[var(--shadow-card)] transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-raised)]">
      <Link href={`/movies/tmdb/${movie.tmdbId}`} className="block">
        <div className="relative aspect-[2/3] w-full bg-[var(--color-paper-tint)]">
          <Image
            src={posterUrl(movie.posterPath, "w342")}
            alt={`${movie.title} poster`}
            fill
            sizes="(max-width: 640px) 50vw, 22vw"
            className="object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[var(--color-ink)]/85 to-transparent" />
          {movie.releaseDate && (
            <span className="absolute right-2 top-2 rounded-full bg-[var(--color-ink-panel)]/80 px-2 py-0.5 text-xs font-semibold text-[var(--color-paper-on-dark)]">
              {yearOf(movie.releaseDate)}
            </span>
          )}
          <h3 className="absolute inset-x-0 bottom-0 line-clamp-2 px-2.5 pb-2.5 pt-6 text-sm font-semibold leading-tight text-white">
            {movie.title}
          </h3>
        </div>
      </Link>
      <div className="flex items-center justify-between gap-1 border-t border-[var(--color-line)] px-2 py-1.5">
        <button
          onClick={onToggleWatched}
          className="rounded px-1.5 py-1 text-xs font-medium text-[var(--color-ink-soft)] hover:text-[var(--color-red)]"
        >
          {movie.status === "watched" ? "Move to Want to Watch" : "Mark watched"}
        </button>
        <button
          onClick={onRemove}
          aria-label={`Remove ${movie.title}`}
          className="rounded px-1.5 py-1 text-xs font-medium text-[var(--color-ink-soft)] hover:text-[var(--color-red-deep)]"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
