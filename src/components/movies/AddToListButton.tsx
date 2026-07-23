"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/providers/ToastProvider";

type Status = "none" | "want_to_watch" | "watched";

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
  const [status, setStatus] = useState<Status>(
    initialWatched ? "watched" : initialOnList ? "want_to_watch" : "none",
  );
  const [busy, setBusy] = useState(false);

  async function choose(next: "want_to_watch" | "watched") {
    const prev = status;
    setStatus(next);
    setBusy(true);
    const res = await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movieId, action: "set", status: next }),
    });
    setBusy(false);
    if (!res.ok) {
      setStatus(prev);
      toast("Something went wrong", "error");
      return;
    }
    toast(next === "watched" ? "Marked as watched" : "Added to watch list", "success");
    router.refresh();
  }

  async function removeFromList() {
    const prev = status;
    setStatus("none");
    setBusy(true);
    const res = await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movieId, action: "remove" }),
    });
    setBusy(false);
    if (!res.ok) {
      setStatus(prev);
      toast("Something went wrong", "error");
      return;
    }
    toast("Removed from list");
    router.refresh();
  }

  return (
    <div className="flex flex-col items-center gap-1.5 sm:items-start">
      <div className="flex gap-2">
        <Button
          variant={status === "want_to_watch" ? "primary" : "secondary"}
          onClick={() => choose("want_to_watch")}
          disabled={busy}
        >
          {status === "want_to_watch" ? "✓ " : ""}Want to Watch
        </Button>
        <Button
          variant={status === "watched" ? "primary" : "secondary"}
          onClick={() => choose("watched")}
          disabled={busy}
        >
          {status === "watched" ? "✓ " : ""}Watched
        </Button>
      </div>
      {status !== "none" && (
        <button
          onClick={removeFromList}
          disabled={busy}
          className="text-xs font-medium text-[var(--color-ink-soft)] hover:text-[var(--color-red-deep)]"
        >
          Remove from list
        </button>
      )}
    </div>
  );
}
