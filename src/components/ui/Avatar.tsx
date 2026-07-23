import { avatarColor, initials, cn } from "@/lib/utils";

export function Avatar({
  name,
  size = 40,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold text-white ring-2 ring-[var(--color-paper-raised)]",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: avatarColor(name),
        fontSize: size * 0.38,
      }}
      aria-hidden
      title={name}
    >
      {initials(name)}
    </span>
  );
}
