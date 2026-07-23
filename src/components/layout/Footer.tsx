import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

const columns = [
  {
    title: "Product",
    links: [
      { label: "Watch List", href: "/watchlist" },
      { label: "Groups", href: "/groups" },
      { label: "Search", href: "/movies/search" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Sign up", href: "/signup" },
      { label: "Log in", href: "/login" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/" },
      { label: "Terms", href: "/" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-[var(--color-line)] bg-[var(--color-paper-raised)]">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 py-12 sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-1">
          <Logo />
          <p className="mt-3 max-w-[220px] text-sm text-[var(--color-ink-soft)]">
            Stop arguing. Start watching. flikpik ends movie-night debates.
          </p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-ink-soft)]">
              {col.title}
            </h4>
            <ul className="space-y-2">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-sm text-[var(--color-ink)] hover:text-[var(--color-red)]"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-[var(--color-line)] px-6 py-5 text-center text-xs text-[var(--color-ink-soft)]">
        © {new Date().getFullYear()} flikpik. A ground-up rewrite, built for movie night.
      </div>
    </footer>
  );
}
