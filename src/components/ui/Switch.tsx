"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Toggle switch — a styled alternative to a bare checkbox. The whole row
 * (track + label) is one button with `role="switch"`, so clicks anywhere
 * toggle it, keyboard activation comes free, and the accessible name is the
 * label text.
 */
export function Switch({
  checked,
  onChange,
  children,
  disabled = false,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex items-center gap-3 rounded-lg text-left text-sm text-[var(--color-ink-soft)]",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-red)]",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-150",
          checked
            ? "border-[var(--color-red)] bg-[var(--color-red)]"
            : "border-[var(--color-line)] bg-[var(--color-paper-tint)]",
        )}
      >
        <span
          className={cn(
            "absolute left-0.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 rounded-full bg-white shadow-sm transition-transform duration-150",
            checked && "translate-x-5",
          )}
        />
      </span>
      <span>{children}</span>
    </button>
  );
}
