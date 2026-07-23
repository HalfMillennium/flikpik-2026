import Link from "next/link";

/**
 * flikpik logo — a film-frame / ticket-stub mark: two perforation bars
 * flanking a play triangle, stroked in brand red, with the wordmark.
 */
export function Logo({
  href = "/",
  className = "",
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 ${className}`}
      aria-label="flikpik home"
    >
      <svg
        width="26"
        height="26"
        viewBox="0 0 26 26"
        fill="none"
        aria-hidden
        className="shrink-0"
      >
        <rect
          x="2.5"
          y="3"
          width="3"
          height="20"
          rx="1.5"
          stroke="var(--color-red)"
          strokeWidth="2.4"
        />
        <rect
          x="20.5"
          y="3"
          width="3"
          height="20"
          rx="1.5"
          stroke="var(--color-red)"
          strokeWidth="2.4"
        />
        <path
          d="M10 7.5L18 13L10 18.5V7.5Z"
          stroke="var(--color-red)"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <span
        className="font-display text-[21px] font-extrabold tracking-[-0.03em]"
        style={{ fontFamily: "var(--font-archivo)" }}
      >
        flikpik
      </span>
    </Link>
  );
}
