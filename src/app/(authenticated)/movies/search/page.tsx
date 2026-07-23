import { SearchExperience } from "./SearchExperience";

export const metadata = { title: "Search" };

export default function MovieSearchPage() {
  return (
    <div>
      <h1 className="type-display mb-1">Find something to watch</h1>
      <p className="mb-6 text-[var(--color-ink-soft)]">
        Search TMDB and add movies to your list — or let us surprise you.
      </p>
      <SearchExperience />
    </div>
  );
}
