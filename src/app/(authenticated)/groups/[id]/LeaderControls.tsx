"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Chip } from "@/components/ui/Chip";
import { useToast } from "@/components/providers/ToastProvider";
import { MPAA_RATINGS, type MpaaRating } from "@/lib/utils";

export function LeaderControls({ groupId }: { groupId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<Set<MpaaRating>>(
    new Set(MPAA_RATINGS),
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function toggle(r: MpaaRating) {
    setFilters((s) => {
      const next = new Set(s);
      if (next.has(r)) next.delete(r);
      else next.add(r);
      return next;
    });
  }

  async function start() {
    setError("");
    if (filters.size === 0) return setError("Select at least one rating.");
    setBusy(true);
    const res = await fetch(`/api/groups/${groupId}/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "start",
        mpaaFilters: Array.from(filters),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error || "Could not start the session.");
    toast("Session started", "success");
    router.push(`/groups/${groupId}/session`);
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} size="lg" className="w-full sm:w-auto">
        ▶ Start session
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Start a decision session"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={start} disabled={busy}>
              {busy ? "Building pool…" : "Start"}
            </Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-[var(--color-ink-soft)]">
          Which ratings should be in the pool? We&apos;ll combine everyone&apos;s
          watch lists and filter to these.
        </p>
        <div className="flex flex-wrap gap-2">
          {MPAA_RATINGS.map((r) => (
            <Chip key={r} active={filters.has(r)} onClick={() => toggle(r)}>
              {r}
            </Chip>
          ))}
        </div>
        {error && (
          <p role="alert" className="mt-3 text-sm text-[var(--color-red-deep)]">
            {error}
          </p>
        )}
      </Modal>
    </>
  );
}
