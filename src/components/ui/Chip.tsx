"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Chip({
  children,
  active = false,
  onClick,
  as = "button",
  className,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  as?: "button" | "span";
  className?: string;
}) {
  const classes = cn(
    "inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
    active
      ? "border-[var(--color-red)] bg-[var(--color-red-tint)] text-[var(--color-red-deep)]"
      : "border-[var(--color-line)] bg-[var(--color-paper-raised)] text-[var(--color-ink-soft)] hover:border-[var(--color-ink-soft)]",
    className,
  );

  if (as === "span") {
    return <span className={classes}>{children}</span>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={classes}
    >
      {children}
    </button>
  );
}
