"use client";

import { Spinner } from "@/components/ui/Spinner";

/**
 * Elevated search input — inherits the base44 prompt-bar shell (raised card,
 * shadow, leading icon). Debounce/fetch is owned by the parent.
 */
export function SearchBar({
  value,
  onChange,
  loading = false,
  placeholder = "Search for a movie…",
  autoFocus = false,
}: {
  value: string;
  onChange: (v: string) => void;
  loading?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper-raised)] px-5 py-3.5 shadow-[var(--shadow-card)] focus-within:border-[var(--color-red)]">
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden
        className="shrink-0 text-[var(--color-ink-soft)]"
      >
        <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="2" />
        <path
          d="M14 14l4 4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <input
        type="search"
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Search for a movie"
        className="w-full bg-transparent text-base text-[var(--color-ink)] placeholder:text-[var(--color-ink-soft)] focus:outline-none"
      />
      {loading && <Spinner size={18} />}
    </div>
  );
}
