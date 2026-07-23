import { ButtonLink } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Logo />
      <h1 className="type-hero mt-8">404</h1>
      <p className="mt-2 max-w-sm text-[var(--color-ink-soft)]">
        We couldn&apos;t find that page. It may have been moved, or never
        existed.
      </p>
      <ButtonLink href="/" className="mt-6">
        Back home
      </ButtonLink>
    </div>
  );
}
