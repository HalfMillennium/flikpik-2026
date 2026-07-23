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
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden>
          <rect x="4.5" y="5" width="3" height="16" rx="1.5" stroke="var(--color-red-deep)" strokeWidth="2.2" />
          <rect x="18.5" y="5" width="3" height="16" rx="1.5" stroke="var(--color-red-deep)" strokeWidth="2.2" />
          <path d="M11 8.5L17 13L11 17.5V8.5Z" stroke="var(--color-red-deep)" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
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
