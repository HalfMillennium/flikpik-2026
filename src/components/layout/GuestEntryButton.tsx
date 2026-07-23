"use client";

import { useRouter } from "next/navigation";
import { useGuest } from "@/components/providers/GuestProvider";

/**
 * Landing-page entry into the local-only guest experience — no account.
 */
export function GuestEntryButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const { enterGuestMode } = useGuest();

  return (
    <button
      onClick={() => {
        enterGuestMode();
        router.push("/watchlist");
      }}
      className={`text-[15px] font-semibold text-[var(--color-ink-soft)] underline underline-offset-4 hover:text-[var(--color-red)] ${className}`}
    >
      or browse without an account →
    </button>
  );
}
