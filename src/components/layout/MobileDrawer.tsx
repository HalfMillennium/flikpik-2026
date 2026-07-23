"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { Logo } from "@/components/ui/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { ButtonLink } from "@/components/ui/Button";

const authedItems = [
  { href: "/watchlist", label: "Watch List" },
  { href: "/watchlist?tab=watched", label: "Watched List" },
  { href: "/groups", label: "Groups" },
  { href: "/profile", label: "Profile" },
];

export function MobileDrawer({
  open,
  onClose,
  authed,
  userName,
}: {
  open: boolean;
  onClose: () => void;
  authed: boolean;
  userName?: string;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 md:hidden"
      style={{ background: "var(--color-scrim, rgba(21,16,21,0.5))" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="fade-up absolute right-0 top-0 flex h-full w-72 flex-col bg-[var(--color-paper-raised)] p-5 shadow-[var(--shadow-raised)]">
        <div className="mb-6 flex items-center justify-between">
          <Logo />
          <button onClick={onClose} aria-label="Close menu" className="p-1.5">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
              <path
                d="M5 5l12 12M17 5L5 17"
                stroke="var(--color-ink)"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {authed && userName && (
          <div className="mb-4 flex items-center gap-3 rounded-xl bg-[var(--color-paper-tint)] p-3">
            <Avatar name={userName} size={40} />
            <span className="font-semibold">{userName}</span>
          </div>
        )}

        <nav className="flex flex-1 flex-col gap-1">
          {authed ? (
            authedItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={onClose}
                className="rounded-lg px-3 py-3 text-[17px] font-medium hover:bg-[var(--color-paper-tint)]"
              >
                {item.label}
              </Link>
            ))
          ) : (
            <>
              <Link
                href="/login"
                onClick={onClose}
                className="rounded-lg px-3 py-3 text-[17px] font-medium hover:bg-[var(--color-paper-tint)]"
              >
                Log in
              </Link>
              <ButtonLink href="/signup" className="mt-2">
                Sign up
              </ButtonLink>
            </>
          )}
        </nav>

        {authed && (
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="mt-auto rounded-lg px-3 py-3 text-left text-[17px] font-medium text-[var(--color-red-deep)] hover:bg-[var(--color-red-tint)]"
          >
            Log out
          </button>
        )}
      </div>
    </div>
  );
}
