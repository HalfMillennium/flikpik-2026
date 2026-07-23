import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "red" | "tint" | "ink" | "line";

const tones: Record<Tone, string> = {
  red: "bg-[var(--color-red)] text-white",
  tint: "bg-[var(--color-red-tint)] text-[var(--color-red-deep)]",
  ink: "bg-[var(--color-ink-panel)] text-[var(--color-paper-on-dark)]",
  line: "bg-[var(--color-paper-tint)] text-[var(--color-ink-soft)] border border-[var(--color-line)]",
};

export function Badge({
  children,
  tone = "red",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
