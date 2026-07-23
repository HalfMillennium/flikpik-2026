"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

function Star({ filled, size }: { filled: boolean; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden>
      <path
        d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.79L10 14.77l-5.2 2.73.99-5.79-4.21-4.1 5.82-.85L10 1.5z"
        fill={filled ? "var(--color-red)" : "none"}
        stroke="var(--color-red)"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Interactive rating input (for reviews). */
export function StarRatingInput({
  value,
  onChange,
  size = 30,
}: {
  value: number;
  onChange: (v: number) => void;
  size?: number;
}) {
  const [hover, setHover] = useState(0);
  const display = hover || value;

  return (
    <div
      className="inline-flex gap-1"
      role="radiogroup"
      aria-label="Star rating"
      onMouseLeave={() => setHover(0)}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n)}
          className="rounded transition-transform hover:scale-110"
        >
          <Star filled={n <= display} size={size} />
        </button>
      ))}
    </div>
  );
}

/** Read-only rating display. */
export function StarRating({
  value,
  size = 16,
  showValue = false,
  className,
}: {
  value: number | null | undefined;
  size?: number;
  showValue?: boolean;
  className?: string;
}) {
  const v = value ?? 0;
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span className="inline-flex gap-0.5" aria-hidden>
        {[1, 2, 3, 4, 5].map((n) => (
          <Star key={n} filled={n <= Math.round(v)} size={size} />
        ))}
      </span>
      {showValue && v > 0 && (
        <span className="text-sm font-semibold text-[var(--color-ink-soft)]">
          {v.toFixed(1)}
        </span>
      )}
      <span className="sr-only">{v.toFixed(1)} out of 5 stars</span>
    </span>
  );
}
