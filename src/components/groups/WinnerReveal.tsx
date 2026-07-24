"use client";

import { useEffect, type ReactNode } from "react";
import Image from "next/image";
import confetti from "canvas-confetti";
import { posterUrl } from "@/lib/images";
import { ButtonLink } from "@/components/ui/Button";

export function WinnerReveal({
  title,
  posterPath,
  groupId,
  eyebrow = "Your group picked",
  actions,
}: {
  title: string;
  posterPath: string | null;
  /** When provided, renders the default group buttons. */
  groupId?: string;
  eyebrow?: string;
  /** Custom footer actions (overrides the default group buttons). */
  actions?: ReactNode;
}) {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const end = Date.now() + 1400;
    const colors = ["#E63220", "#B8200F", "#F5F0EB", "#2ECC71"];
    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);

  return (
    <div className="relative flex flex-col items-center px-6 py-10 text-center">
      {/* theatrical spotlight radial */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 40%, rgba(230,50,32,0.18), transparent 60%)",
        }}
        aria-hidden
      />
      <p className="relative mb-1 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-red)]">
        {eyebrow}
      </p>
      <div className="pop-in relative my-4 aspect-[2/3] w-52 overflow-hidden rounded-2xl shadow-[var(--shadow-raised)]">
        <Image
          src={posterUrl(posterPath, "w500")}
          alt={`${title} poster`}
          fill
          sizes="208px"
          className="object-cover"
        />
      </div>
      <h1 className="type-display relative max-w-md">{title}!</h1>
      <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
        {actions ?? (
          <>
            <ButtonLink href={`/groups/${groupId}`} variant="primary">
              Back to group
            </ButtonLink>
            <ButtonLink href="/watchlist?tab=watched" variant="secondary">
              Watch it now
            </ButtonLink>
          </>
        )}
      </div>
    </div>
  );
}
