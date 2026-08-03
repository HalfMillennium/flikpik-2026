import Link from "next/link";
import { freshness, getPackPreviews, type PackPreview } from "@/lib/packs";
import { posterUrl } from "@/lib/images";

/**
 * Landing-page "Fresh this week" section. Best-effort: renders nothing at all
 * if the packs can't be read or none are populated yet — the homepage never
 * shows a broken or empty shell.
 */
export async function PackShowcase() {
  const packs = await getPackPreviews().catch(() => [] as PackPreview[]);
  if (packs.length === 0) return null;

  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-[var(--color-red)]">
            Fresh this week
          </p>
          <h2 className="type-display mt-2">
            Ready-made packs, refreshed for you.
          </h2>
        </div>
        <Link
          href="/lists"
          className="font-semibold text-[var(--color-red)] underline underline-offset-4"
        >
          See all lists →
        </Link>
      </div>
      <div
        className={
          packs.length === 1
            ? "mx-auto mt-10 grid max-w-md gap-6"
            : "mt-10 grid gap-6 sm:grid-cols-2"
        }
      >
        {packs.map((p) => (
          <Link
            key={p.slug}
            href={`/lists/${p.slug}`}
            className="block rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper-raised)] p-6 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-raised)]"
          >
            <div className="flex items-end pl-2">
              {p.posterPaths.map((path, i) => (
                <div
                  key={path}
                  className="-ml-2 aspect-[2/3] w-16 shrink-0 overflow-hidden rounded-md border border-[var(--color-line)] bg-[var(--color-paper-tint)] shadow-md sm:w-[72px]"
                  style={{ zIndex: p.posterPaths.length - i }}
                >
                  <img
                    src={posterUrl(path, "w185")}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <h3 className="type-title">{p.title}</h3>
              <span className="shrink-0 rounded-full bg-[var(--color-red-tint)] px-2.5 py-0.5 text-xs font-semibold text-[var(--color-red-deep)]">
                {p.itemCount} movies
              </span>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-[var(--color-red)]">
              <span
                className="pulse-dot inline-block h-2 w-2 rounded-full"
                style={{ background: "var(--color-red)" }}
              />
              {freshness(p)}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
