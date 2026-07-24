import Image from "next/image";
import Link from "next/link";
import { posterUrl } from "@/lib/images";
import { yearOf } from "@/lib/utils";

export type MovieCardData = {
  id: string;
  title: string;
  posterPath: string | null;
  releaseDate: string | null;
  userAvgRating: string | null;
  tmdbRating: string | null;
};

export function MovieCard({ movie }: { movie: MovieCardData }) {
  const rating = movie.userAvgRating ?? movie.tmdbRating;

  return (
    <Link
      href={`/movies/${movie.id}`}
      className="group relative block overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-paper-raised)] shadow-[var(--shadow-card)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-raised)]"
    >
      <div className="relative aspect-[2/3] w-full bg-[var(--color-paper-tint)]">
        <Image
          src={posterUrl(movie.posterPath, "w342")}
          alt={`${movie.title} poster`}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 22vw"
          className="object-cover"
        />
        {/* gradient fade to ink */}
        <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[var(--color-ink)]/85 to-transparent" />

        {movie.releaseDate && (
          <span className="absolute right-2 top-2 rounded-full bg-[var(--color-ink-panel)]/80 px-2 py-0.5 text-xs font-semibold text-[var(--color-paper-on-dark)] backdrop-blur-sm">
            {yearOf(movie.releaseDate)}
          </span>
        )}

        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 px-2.5 pb-2.5 pt-6">
          {rating && Number(rating) > 0 && (
            <span className="flex items-center gap-1 text-xs font-bold text-white">
              <svg width="13" height="13" viewBox="0 0 20 20" aria-hidden>
                <path
                  d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.79L10 14.77l-5.2 2.73.99-5.79-4.21-4.1 5.82-.85L10 1.5z"
                  fill="var(--color-red)"
                />
              </svg>
              {Number(rating).toFixed(1)}
            </span>
          )}
          <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-white">
            {movie.title}
          </h3>
        </div>
      </div>
    </Link>
  );
}
