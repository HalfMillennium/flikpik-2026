"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { StarRating, StarRatingInput } from "@/components/ui/StarRating";
import { Avatar } from "@/components/ui/Avatar";
import { useToast } from "@/components/providers/ToastProvider";
import { relativeTime } from "@/lib/utils";

type ReviewItem = {
  id: string;
  rating: number;
  body: string;
  createdAt: string;
  username: string;
  displayName: string;
  isMine: boolean;
};

export function ReviewsSection({
  movieId,
  reviews,
  myReview,
}: {
  movieId: string;
  reviews: ReviewItem[];
  myReview: { id: string; rating: number; body: string } | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(myReview?.rating ?? 0);
  const [body, setBody] = useState(myReview?.body ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError("");
    if (rating < 1) return setError("Pick a star rating.");
    if (body.trim().length < 10)
      return setError("Review must be at least 10 characters.");

    setBusy(true);
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movieId, rating, body: body.trim() }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not save your review.");
      return;
    }
    setOpen(false);
    toast("Review submitted", "success");
    router.refresh();
  }

  async function del() {
    if (!myReview) return;
    setBusy(true);
    const res = await fetch("/api/reviews", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewId: myReview.id }),
    });
    setBusy(false);
    if (res.ok) {
      setOpen(false);
      toast("Review deleted");
      router.refresh();
    }
  }

  return (
    <section className="mt-10 pb-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="type-title">
          Reviews{" "}
          <span className="text-[var(--color-ink-soft)]">({reviews.length})</span>
        </h2>
        <Button size="sm" onClick={() => setOpen(true)}>
          {myReview ? "Edit review" : "Write a review"}
        </Button>
      </div>

      {reviews.length === 0 ? (
        <p className="text-[var(--color-ink-soft)]">
          No reviews yet. Be the first to share your take.
        </p>
      ) : (
        <ul className="space-y-4">
          {reviews.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border border-[var(--color-line)] bg-[var(--color-paper-raised)] p-4"
            >
              <div className="flex items-center gap-3">
                <Avatar name={r.displayName} size={36} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{r.username}</span>
                    {r.isMine && (
                      <span className="text-xs text-[var(--color-red)]">You</span>
                    )}
                  </div>
                  <StarRating value={r.rating} size={14} />
                </div>
                <span className="ml-auto text-xs text-[var(--color-ink-soft)]">
                  {relativeTime(r.createdAt)}
                </span>
              </div>
              <p className="mt-3 text-[var(--color-ink)]">{r.body}</p>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={myReview ? "Edit your review" : "Write a review"}
        footer={
          <>
            {myReview && (
              <Button variant="danger" onClick={del} disabled={busy}>
                Delete
              </Button>
            )}
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={busy}>
              {busy ? "Saving…" : "Submit"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold">Your rating</label>
            <StarRatingInput value={rating} onChange={setRating} />
          </div>
          <div>
            <label
              htmlFor="review-body"
              className="mb-1.5 block text-sm font-semibold"
            >
              Your review
            </label>
            <textarea
              id="review-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              maxLength={2000}
              placeholder="What did you think?"
              className="w-full resize-none rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] px-3.5 py-2.5 text-[15px] focus:border-[var(--color-red)] focus:outline-none"
            />
            <div className="mt-1 text-right text-xs text-[var(--color-ink-soft)]">
              {body.trim().length}/2000
            </div>
          </div>
          {error && (
            <p role="alert" className="text-sm text-[var(--color-red-deep)]">
              {error}
            </p>
          )}
        </div>
      </Modal>
    </section>
  );
}
