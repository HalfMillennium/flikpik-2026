"use client";

import { useState } from "react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";

const linkCls =
  "rounded-full px-4 py-2 text-[15px] font-medium hover:bg-[var(--color-paper-tint)]";

/**
 * Landing-page header nav. Full inline links on desktop; on mobile the
 * secondary links collapse into a hamburger menu so the bar doesn't cram,
 * keeping only the primary CTA visible.
 */
export function LandingNav({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      {/* Desktop */}
      <nav className="hidden items-center gap-2 md:flex">
        <Link href="/lists" className={linkCls}>
          Lists
        </Link>
        <Link href="/blog" className={linkCls}>
          Blog
        </Link>
        {signedIn ? (
          <ButtonLink href="/watchlist" size="sm">
            Open app
          </ButtonLink>
        ) : (
          <>
            <Link href="/login" className={linkCls}>
              Log in
            </Link>
            <ButtonLink href="/signup" size="sm">
              Sign up
            </ButtonLink>
          </>
        )}
      </nav>

      {/* Mobile: primary CTA + hamburger */}
      <div className="flex items-center gap-1.5 md:hidden">
        {signedIn ? (
          <ButtonLink href="/watchlist" size="sm">
            Open app
          </ButtonLink>
        ) : (
          <ButtonLink href="/signup" size="sm">
            Sign up
          </ButtonLink>
        )}
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="rounded-lg p-2"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
            {open ? (
              <path
                d="M5 5l14 14M19 5L5 19"
                stroke="var(--color-ink)"
                strokeWidth="2"
                strokeLinecap="round"
              />
            ) : (
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="var(--color-ink)"
                strokeWidth="2"
                strokeLinecap="round"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile dropdown panel */}
      {open && (
        <>
          <button
            aria-hidden
            tabIndex={-1}
            onClick={close}
            className="fixed inset-0 top-16 z-30 cursor-default md:hidden"
            style={{ background: "var(--color-scrim, rgba(21,16,21,0.5))" }}
          />
          <div className="absolute inset-x-0 top-full z-40 border-b border-[var(--color-line)] bg-[var(--color-paper-raised)] shadow-[var(--shadow-card)] md:hidden">
            <div className="mx-auto flex max-w-6xl flex-col px-4 py-2 sm:px-6">
              <Link
                href="/lists"
                onClick={close}
                className="rounded-lg px-3 py-3 text-[17px] font-medium hover:bg-[var(--color-paper-tint)]"
              >
                Lists
              </Link>
              <Link
                href="/blog"
                onClick={close}
                className="rounded-lg px-3 py-3 text-[17px] font-medium hover:bg-[var(--color-paper-tint)]"
              >
                Blog
              </Link>
              <Link
                href="/rooms/new"
                onClick={close}
                className="rounded-lg px-3 py-3 text-[17px] font-medium hover:bg-[var(--color-paper-tint)]"
              >
                Movie night
              </Link>
              {!signedIn && (
                <Link
                  href="/login"
                  onClick={close}
                  className="rounded-lg px-3 py-3 text-[17px] font-medium hover:bg-[var(--color-paper-tint)]"
                >
                  Log in
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
