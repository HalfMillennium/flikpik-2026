"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Popover, MenuItem } from "@/components/ui/Popover";
import { useToast } from "@/components/providers/ToastProvider";

export function AddToListButton({
  movieId,
  initialOnList,
  initialWatched,
}: {
  movieId: string;
  initialOnList: boolean;
  initialWatched: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [onList, setOnList] = useState(initialOnList);
  const [watched, setWatched] = useState(initialWatched);
  const [busy, setBusy] = useState(false);

  async function act(action: string, optimistic: () => void, revert: () => void) {
    optimistic();
    setBusy(true);
    const res = await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movieId, action }),
    });
    setBusy(false);
    if (!res.ok) {
      revert();
      toast("Something went wrong", "error");
      return;
    }
    router.refresh();
  }

  if (!onList) {
    return (
      <Button
        disabled={busy}
        onClick={() =>
          act(
            "add",
            () => setOnList(true),
            () => setOnList(false),
          ).then(() => toast("Added to watch list", "success"))
        }
      >
        + Add to watch list
      </Button>
    );
  }

  return (
    <Popover
      trigger={({ toggle }) => (
        <Button variant="secondary" onClick={toggle} disabled={busy}>
          {watched ? "✓ Watched" : "✓ On your list"}
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          </svg>
        </Button>
      )}
    >
      {({ close }) => (
        <>
          {watched ? (
            <MenuItem
              onClick={() => {
                close();
                act("mark_unwatched", () => setWatched(false), () => setWatched(true));
              }}
            >
              Move to Want to Watch
            </MenuItem>
          ) : (
            <MenuItem
              onClick={() => {
                close();
                act("mark_watched", () => setWatched(true), () => setWatched(false));
              }}
            >
              Mark as watched
            </MenuItem>
          )}
          <MenuItem
            danger
            onClick={() => {
              close();
              act(
                "remove",
                () => {
                  setOnList(false);
                  setWatched(false);
                },
                () => setOnList(true),
              ).then(() => toast("Removed from list"));
            }}
          >
            Remove from list
          </MenuItem>
        </>
      )}
    </Popover>
  );
}
