"use client";

import { useRouter } from "next/navigation";
import { Chip } from "@/components/ui/Chip";
import { Popover, MenuItem } from "@/components/ui/Popover";
import type { SortKey, WatchStatus } from "@/lib/queries";

const SORT_LABELS: Record<SortKey, string> = {
  recent: "Recently added",
  title: "Title A–Z",
  rating: "Rating high–low",
  release: "Release date",
};

export function WatchlistControls({
  tab,
  sort,
}: {
  tab: WatchStatus;
  sort: SortKey;
}) {
  const router = useRouter();

  const go = (nextTab: WatchStatus, nextSort: SortKey) => {
    const p = new URLSearchParams();
    if (nextTab === "watched") p.set("tab", "watched");
    if (nextSort !== "recent") p.set("sort", nextSort);
    const qs = p.toString();
    router.push(`/watchlist${qs ? `?${qs}` : ""}`);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex gap-2" role="tablist" aria-label="List filter">
        <Chip active={tab === "want_to_watch"} onClick={() => go("want_to_watch", sort)}>
          Want to Watch
        </Chip>
        <Chip active={tab === "watched"} onClick={() => go("watched", sort)}>
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
          (Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
            <MenuItem
              key={key}
              onClick={() => {
                close();
                go(tab, key);
              }}
            >
              {SORT_LABELS[key]}
            </MenuItem>
          ))
        }
      </Popover>
    </div>
  );
}
