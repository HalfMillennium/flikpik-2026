import { notFound } from "next/navigation";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { getMovieDetail } from "@/lib/queries";
import { posterUrl, backdropUrl } from "@/lib/images";
import { Badge } from "@/components/ui/Badge";
import { Chip } from "@/components/ui/Chip";
import { StarRating } from "@/components/ui/StarRating";
import { yearOf, formatRuntime } from "@/lib/utils";
import { AddToListButton } from "@/components/movies/AddToListButton";
import { ReviewsSection } from "@/components/movies/ReviewsSection";

export default async function MovieDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const data = await getMovieDetail(id, userId);
  if (!data) notFound();

  const { movie, onList, watchStatus, reviews, myReview } = data;
  const backdrop = backdropUrl(movie.backdropPath);
  const rating = movie.userAvgRating ?? movie.tmdbRating;

  return (
    <div className="-mx-4 -mt-8 sm:-mx-6">
      {/* Backdrop */}
      <div className="relative h-52 w-full overflow-hidden sm:h-72">
        {backdrop ? (
          <Image
            src={backdrop}
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
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
              {rating && Number(rating) > 0 && (
                <div>
                  <div className="text-xs uppercase tracking-wide text-[var(--color-ink-soft)]">
                    {movie.userAvgRating ? "flikpik rating" : "TMDB rating"}
                  </div>
                  <StarRating
                    value={
                      movie.userAvgRating
                        ? Number(movie.userAvgRating)
                        : Number(movie.tmdbRating) / 2
                    }
                    showValue
                  />
                </div>
              )}
              <div className="ml-auto sm:ml-0">
                <AddToListButton
                  movieId={movie.id}
                  initialOnList={onList}
                  initialWatched={watchStatus === "watched"}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Synopsis */}
        <section className="mt-8">
          <h2 className="type-title mb-2">Synopsis</h2>
          <p className="max-w-3xl text-[var(--color-ink-soft)]">
            {movie.overview || "No synopsis available for this title."}
          </p>
        </section>

        {/* Reviews */}
        <ReviewsSection
          movieId={movie.id}
          reviews={reviews}
          myReview={myReview}
        />
      </div>
    </div>
  );
}
