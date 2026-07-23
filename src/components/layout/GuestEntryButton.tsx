"use client";

import { useRouter } from "next/navigation";
import { useGuest } from "@/components/providers/GuestProvider";
import { cn } from "@/lib/utils";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all select-none";

/**
 * Landing-page entry into the local-only guest experience — no account.
 * `variant="button"` renders a full secondary button; `"link"` a text link.
 */
export function GuestEntryButton({
  variant = "button",
  className = "",
}: {
  variant?: "button" | "link";
  className?: string;
}) {
  const router = useRouter();
  const { enterGuestMode } = useGuest();

  const enter = () => {
    enterGuestMode();
    router.push("/watchlist");
  };

  if (variant === "link") {
    return (
      <button
        onClick={enter}
        className={cn(
          "text-[15px] font-semibold text-[var(--color-ink-soft)] underline underline-offset-4 hover:text-[var(--color-red)]",
          className,
        )}
      >
        or browse without an account →
      </button>
    );
  }

  return (
    <button
      onClick={enter}
      className={cn(
        base,
        "h-13 bg-[var(--color-paper-raised)] px-8 py-3.5 text-base text-[var(--color-ink)] shadow-[var(--shadow-card)] ring-1 ring-inset ring-[var(--color-line)] hover:ring-[var(--color-ink-soft)]",
        className,
      )}
    >
      Try it — no account needed
    </button>
  );
}
