"use client";

import { useId } from "react";

export function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  autoComplete,
  autoCapitalize,
  placeholder,
  error,
  hint,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  autoCapitalize?: string;
  placeholder?: string;
  error?: string;
  hint?: string;
  maxLength?: number;
}) {
  const id = useId();
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-semibold text-[var(--color-ink)]"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        required={required}
        autoComplete={autoComplete}
        autoCapitalize={autoCapitalize}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] px-3.5 py-2.5 text-[15px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-soft)] focus:border-[var(--color-red)] focus:outline-none"
      />
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-xs text-[var(--color-red-deep)]">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-[var(--color-ink-soft)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
