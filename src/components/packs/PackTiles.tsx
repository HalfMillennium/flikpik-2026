import { getLaunchablePacks } from "@/lib/packs";
import { ImportListCTA } from "@/components/blog/ImportListCTA";

/**
 * In-app launch tiles: tap a pre-built/trending pack to jump straight into a
 * room seeded with it (guest or account). Renders nothing if no packs exist
 * yet (e.g. before the first cron refresh). Server component.
 */
export async function PackTiles({ heading }: { heading?: string }) {
  const packs = await getLaunchablePacks().catch(() => []);
  if (packs.length === 0) return null;

  return (
    <section className="mt-12 w-full text-left">
      <h2 className="mb-4 text-center text-sm font-semibold uppercase tracking-widest text-[var(--color-ink-soft)]">
        {heading ?? "Or start from a pack"}
      </h2>
      <div
        className={
          packs.length === 1
            ? "mx-auto grid max-w-sm gap-4"
            : "grid gap-4 sm:grid-cols-2"
        }
      >
        {packs.map((p) => (
          <div
            key={p.slug}
            className="flex flex-col rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper-raised)] p-5 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="type-title">{p.title}</h3>
              <span className="shrink-0 rounded-full bg-[var(--color-red-tint)] px-2.5 py-0.5 text-xs font-semibold text-[var(--color-red-deep)]">
                {p.itemCount}
              </span>
            </div>
            {!p.degraded && p.newCount > 0 && (
              <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-[var(--color-red)]">
                <span
                  className="pulse-dot inline-block h-2 w-2 rounded-full"
                  style={{ background: "var(--color-red)" }}
                />
                {p.newCount} new this week
              </p>
            )}
            <div className="mt-4">
              <ImportListCTA
                tmdbIds={p.tmdbIds}
                count={p.itemCount}
                variant="inline"
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
