"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useGuest } from "@/components/providers/GuestProvider";

/**
 * Slim banner shown to guests: reminds them their list is device-local and
 * points to sign-up to unlock groups, movie nights, and cross-device sync.
 */
export function GuestBanner() {
  const { status } = useSession();
  const { ready, isGuest } = useGuest();

  if (status === "authenticated") return null;
  if (!ready || !isGuest) return null;

  return (
    <div className="border-b border-[var(--color-line)] bg-[var(--color-red-tint)]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 py-2 text-center text-sm text-[var(--color-red-deep)]">
        <span>
          You&apos;re browsing as a guest — your list is saved on this device
          only.
        </span>
        <Link href="/signup" className="font-semibold underline underline-offset-2">
          Create a free account
        </Link>
        <span className="hidden sm:inline">to run movie nights with friends.</span>
      </div>
    </div>
  );
}
