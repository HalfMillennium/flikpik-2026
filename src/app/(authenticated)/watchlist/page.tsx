import { auth } from "@/lib/auth";
import { getWatchList, type SortKey, type WatchStatus } from "@/lib/queries";
import { MovieCard } from "@/components/movies/MovieCard";
import { ButtonLink } from "@/components/ui/Button";
import { WatchlistControls } from "./WatchlistControls";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata = { title: "Watch List" };

const SORTS: SortKey[] = ["recent", "title", "rating", "release"];

export default async function WatchlistPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; sort?: string }>;
}) {
  const session = await auth();
  const userId = session!.user.id;

  const params = await searchParams;
  const tab: WatchStatus =
    params.tab === "watched" ? "watched" : "want_to_watch";
  const sort: SortKey = SORTS.includes(params.sort as SortKey)
    ? (params.sort as SortKey)
    : "recent";

  const movies = await getWatchList(userId, tab, sort);

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

      <WatchlistControls tab={tab} sort={sort} />

      {movies.length === 0 ? (
        <EmptyState
          title={
            tab === "watched"
              ? "Nothing watched yet"
              : "Your list is empty"
          }
          body={
            tab === "watched"
              ? "Movies land here after a session picks them, or when you mark them watched."
              : "Search for movies to add — build up a pool for your next movie night."
          }
          cta={{ href: "/movies/search", label: "Search for movies" }}
        />
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {movies.map((m) => (
            <MovieCard key={m.id} movie={m} />
          ))}
        </div>
      )}
    </div>
  );
}
