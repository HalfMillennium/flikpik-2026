"use client";

import { useSession } from "next-auth/react";

/**
 * Renders children only for signed-out visitors. Lets static/ISR pages keep
 * guest-oriented copy ("No account needed") without going dynamic — the
 * session check happens client-side after hydration.
 */
export function GuestOnly({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  if (status === "authenticated") return null;
  return <>{children}</>;
}
