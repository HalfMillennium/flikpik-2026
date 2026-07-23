"use client";

import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all disabled:opacity-50 disabled:pointer-events-none select-none";

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-6 text-[15px]",
  lg: "h-13 px-8 text-base py-3.5",
};

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--color-red)] text-white hover:bg-[var(--color-red-deep)] active:bg-[var(--color-red-deep)] shadow-[var(--shadow-card)]",
  secondary:
    "bg-[var(--color-paper-raised)] text-[var(--color-ink)] border border-[var(--color-line)] hover:border-[var(--color-ink-soft)]",
  ghost:
    "bg-transparent text-[var(--color-ink)] hover:bg-[var(--color-paper-tint)]",
  danger:
    "bg-transparent text-[var(--color-red-deep)] hover:bg-[var(--color-red-tint)]",
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
};

type ButtonAsButton = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

type ButtonAsLink = CommonProps & {
  href: string;
  target?: string;
};

export const Button = forwardRef<HTMLButtonElement, ButtonAsButton>(
  function Button(
    { variant = "primary", size = "md", className, children, ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        className={cn(base, sizes[size], variants[variant], className)}
        {...props}
      >
        {children}
      </button>
    );
  },
);

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  children,
  href,
  target,
}: ButtonAsLink & { variant?: Variant; size?: Size }) {
  return (
    <Link
      href={href}
      target={target}
      className={cn(base, sizes[size], variants[variant], className)}
    >
      {children}
    </Link>
  );
}
