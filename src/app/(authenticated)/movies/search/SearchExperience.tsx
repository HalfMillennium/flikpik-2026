"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { SearchBar } from "@/components/movies/SearchBar";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/providers/ToastProvider";
import { posterUrl } from "@/lib/images";
import { yearOf } from "@/lib/utils";

type Result = {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  releaseDate: string | null;
  tmdbRating: string | null;
};

type RandomMovie = Result & {
  overview: string;
  backdropPath: string | null;
};

export function SearchExperience() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState<Set<number>>(new Set());
  const [random, setRandom] = useState<RandomMovie | null>(null);
  const [randomLoading, setRandomLoading] = useState(false);
  const toast = useToast();

  const runSearch = useCallback(async (q: string, p: number) => {
    if (!q.trim()) {
      setResults([]);
      setTotalPages(0);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/movies/search?q=${encodeURIComponent(q)}&page=${p}`,
      );
      const data = await res.json();
      setTotalPages(data.total_pages ?? 0);
      setResults((prev) => (p === 1 ? data.results : [...prev, ...data.results]));
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search on query change.
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    clearTimeout(debounce.current);
    setPage(1);
    debounce.current = setTimeout(() => runSearch(query, 1), 300);
    return () => clearTimeout(debounce.current);
  }, [query, runSearch]);

  async function addMovie(tmdbId: number) {
    setAdded((s) => new Set(s).add(tmdbId));
    const res = await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tmdbId, action: "add" }),
    });
    if (res.ok) {
      toast("Added to watch list", "success");
    } else {
      setAdded((s) => {
        const next = new Set(s);
        next.delete(tmdbId);
        return next;
      });
      toast("Could not add that movie", "error");
    }
  }

  async function surpriseMe() {
    setRandomLoading(true);
    try {
      const res = await fetch("/api/movies/random");
      if (res.ok) setRandom(await res.json());
      else toast("Couldn't find a movie, try again", "error");
    } finally {
      setRandomLoading(false);
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <SearchBar
            value={query}
            onChange={setQuery}
            loading={loading}
            autoFocus
          />
        </div>
        <Button
          variant="secondary"
          onClick={surpriseMe}
          disabled={randomLoading}
          className="shrink-0"
        >
          {randomLoading ? <Spinner size={16} /> : "🎲"} Surprise me
        </Button>
      </div>

      {random && (
        <FeaturedRandom
          movie={random}
          added={added.has(random.tmdbId)}
          onAdd={() => addMovie(random.tmdbId)}
          onDismiss={() => setRandom(null)}
        />
      )}

      {results.length > 0 && (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {results.map((r) => (
            <SearchResultCard
              key={r.tmdbId}
              result={r}
              added={added.has(r.tmdbId)}
              onAdd={() => addMovie(r.tmdbId)}
            />
          ))}
        </div>
      )}

      {!loading && query.trim() && results.length === 0 && (
        <p className="mt-10 text-center text-[var(--color-ink-soft)]">
          No results for “{query}”.
        </p>
      )}

      {page < totalPages && (
        <div className="mt-8 flex justify-center">
          <Button
            variant="secondary"
            onClick={() => {
              const next = page + 1;
              setPage(next);
              runSearch(query, next);
            }}
            disabled={loading}
          >
            {loading ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}

function SearchResultCard({
  result,
  added,
  onAdd,
}: {
  result: Result;
  added: boolean;
  onAdd: () => void;
}) {
  const router = useRouter();
  const [opening, setOpening] = useState(false);

  async function openDetail() {
    setOpening(true);
    // Ensure the movie exists locally, then navigate to its detail page.
    const res = await fetch(`/api/movies/${result.tmdbId}`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      router.push(`/movies/${data.movie.id}`);
    } else {
      setOpening(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-paper-raised)] shadow-[var(--shadow-card)]">
      <button
        onClick={openDetail}
        className="relative block aspect-[2/3] w-full bg-[var(--color-paper-tint)]"
        aria-label={`Open ${result.title}`}
      >
        <Image
          src={posterUrl(result.posterPath)}
          alt={`${result.title} poster`}
          fill
          sizes="(max-width: 640px) 50vw, 22vw"
          className="object-cover"
        />
        {opening && (
          <span className="absolute inset-0 flex items-center justify-center bg-[var(--color-ink)]/30">
            <Spinner />
          </span>
        )}
      </button>
      <div className="p-3">
        <h3 className="line-clamp-1 text-sm font-semibold">{result.title}</h3>
        <p className="text-xs text-[var(--color-ink-soft)]">
          {yearOf(result.releaseDate) || "—"}
        </p>
        <Button
          size="sm"
          variant={added ? "secondary" : "primary"}
          onClick={onAdd}
          disabled={added}
          className="mt-2 w-full"
        >
          {added ? "✓ Added" : "Add"}
        </Button>
      </div>
    </div>
  );
}

function FeaturedRandom({
  movie,
  added,
  onAdd,
  onDismiss,
}: {
  movie: RandomMovie;
  added: boolean;
  onAdd: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="fade-up mt-6 flex flex-col gap-5 overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper-raised)] p-5 shadow-[var(--shadow-card)] sm:flex-row">
      <div className="relative aspect-[2/3] w-32 shrink-0 self-center overflow-hidden rounded-lg sm:self-start">
        <Image
          src={posterUrl(movie.posterPath, "w342")}
          alt={`${movie.title} poster`}
          fill
          sizes="128px"
          className="object-cover"
        />
      </div>
      <div className="flex-1">
        <div className="flex items-start justify-between">
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-red)]">
            Surprise pick
          </span>
          <button
            onClick={onDismiss}
            aria-label="Dismiss"
            className="text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
          >
            ✕
          </button>
        </div>
        <h3 className="type-title mt-1">
          {movie.title}{" "}
          <span className="text-[var(--color-ink-soft)]">
            {yearOf(movie.releaseDate) && `(${yearOf(movie.releaseDate)})`}
          </span>
        </h3>
        <p className="mt-2 line-clamp-3 text-sm text-[var(--color-ink-soft)]">
          {movie.overview || "No synopsis available."}
        </p>
        <Button
          onClick={onAdd}
          disabled={added}
          variant={added ? "secondary" : "primary"}
          className="mt-4"
        >
          {added ? "✓ On your list" : "Add to list"}
        </Button>
      </div>
    </div>
  );
}
