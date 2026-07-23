"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Logo } from "@/components/ui/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Popover, MenuItem } from "@/components/ui/Popover";
import { MobileDrawer } from "@/components/layout/MobileDrawer";
import { cn } from "@/lib/utils";

const authedLinks = [
  { href: "/watchlist", label: "Watch List" },
  { href: "/groups", label: "Groups" },
];

export function Navbar() {
  const { data: session, status } = useSession();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const user = session?.user;

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-[var(--color-line)] bg-[var(--color-paper)]/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />

          {/* desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {user ? (
              <>
                {authedLinks.map((l) => (
                  <NavLink key={l.href} href={l.href}>
                    {l.label}
                  </NavLink>
                ))}
                <div className="ml-3">
                  <UserMenu name={user.name ?? user.username} username={user.username} />
                </div>
              </>
            ) : status === "loading" ? (
              <div className="h-10 w-40" />
            ) : (
              <>
                <NavLink href="/login">Log in</NavLink>
                <ButtonLink href="/signup" size="sm" className="ml-2">
                  Sign up
                </ButtonLink>
              </>
            )}
          </nav>

          {/* mobile hamburger */}
          <button
            className="rounded-lg p-2 md:hidden"
            aria-label="Open menu"
            onClick={() => setDrawerOpen(true)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="var(--color-ink)"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </header>

      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        authed={!!user}
        userName={user?.name ?? user?.username}
      />
    </>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full px-4 py-2 text-[15px] font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-paper-tint)]",
      )}
    >
      {children}
    </Link>
  );
}

function UserMenu({ name, username }: { name: string; username: string }) {
  return (
    <Popover
      trigger={({ toggle }) => (
        <button
          onClick={toggle}
          className="flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-paper-raised)] py-1 pl-1 pr-3 transition-colors hover:border-[var(--color-ink-soft)]"
          aria-label="Account menu"
        >
          <Avatar name={name} size={32} />
          <span className="text-sm font-medium">{username}</span>
        </button>
      )}
    >
      {({ close }) => (
        <>
          <Link href="/profile" onClick={close}>
            <MenuItem>Profile</MenuItem>
          </Link>
          <Link href="/watchlist?tab=watched" onClick={close}>
            <MenuItem>Watched List</MenuItem>
          </Link>
          <div className="my-1 h-px bg-[var(--color-line)]" />
          <MenuItem danger onClick={() => signOut({ callbackUrl: "/" })}>
            Log out
          </MenuItem>
        </>
      )}
    </Popover>
  );
}
