import { ButtonLink } from "@/components/ui/Button";

export function EmptyState({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="mt-10 flex flex-col items-center rounded-2xl border border-dashed border-[var(--color-line)] bg-[var(--color-paper-raised)] px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-red-tint)]">
        <svg width="28" height="28" viewBox="0 0 240 240" fill="var(--color-red-deep)" aria-hidden>
          <rect x="34" y="48" width="26" height="120" rx="13" />
          <rect x="180" y="72" width="26" height="120" rx="13" />
          <path d="M 100 84 L 152 120 L 100 156 Z" stroke="var(--color-red-deep)" strokeWidth="22" strokeLinejoin="round" />
        </svg>
      </div>
      <h2 className="type-title">{title}</h2>
      <p className="mt-2 max-w-sm text-[var(--color-ink-soft)]">{body}</p>
      {cta && (
        <ButtonLink href={cta.href} className="mt-6">
          {cta.label}
        </ButtonLink>
      )}
    </div>
  );
}
