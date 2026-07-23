import Link from "next/link";

/**
 * flikpik logo — an abstract film mark: two staggered perforation bars
 * (implying frames in motion) flanking a rounded play triangle, in marquee
 * red. Wordmark set in Bricolage Grotesque.
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
        width="27"
        height="27"
        viewBox="0 0 240 240"
        role="img"
        aria-hidden="true"
        className="shrink-0"
      >
        <g fill="var(--color-red)">
          {/* left perforation bar (shifted up) */}
          <rect x="34" y="48" width="26" height="120" rx="13" />
          {/* right perforation bar (shifted down) */}
          <rect x="180" y="72" width="26" height="120" rx="13" />
          {/* play triangle, corners rounded via stroke join */}
          <path
            d="M 100 84 L 152 120 L 100 156 Z"
            stroke="var(--color-red)"
            strokeWidth="22"
            strokeLinejoin="round"
          />
        </g>
      </svg>
      <span
        className="text-[22px] font-extrabold tracking-[-0.03em]"
        style={{ fontFamily: "var(--font-logo)" }}
      >
        flikpik
      </span>
    </Link>
  );
}
