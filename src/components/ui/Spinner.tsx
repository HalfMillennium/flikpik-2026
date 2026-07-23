import { cn } from "@/lib/utils";

export function Spinner({
  size = 18,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn("spin inline-block rounded-full border-2", className)}
      style={{
        width: size,
        height: size,
        borderColor: "var(--color-line)",
        borderTopColor: "var(--color-red)",
      }}
    />
  );
}
