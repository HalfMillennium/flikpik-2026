/**
 * Shared helpers. Client-safe.
 */

/** Join class names, dropping falsy values. */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

/** Year from an ISO date string ("2010-07-16" → "2010"). */
export function yearOf(date: string | null | undefined): string {
  if (!date) return "";
  return date.slice(0, 4);
}

/** Human runtime ("142" → "2h 22m"). */
export function formatRuntime(minutes: number | null | undefined): string {
  if (!minutes) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Relative time ("3 days ago"). */
export function relativeTime(input: string | Date): string {
  const then = typeof input === "string" ? new Date(input) : input;
  const seconds = Math.round((Date.now() - then.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.round(months / 12);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

/** Initials for an avatar ("Alice Jones" → "AJ"). */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Deterministic warm-tone avatar background from a string seed. */
export function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 40; // keep it in the warm red/orange band
  return `hsl(${hue + 350 - (hue > 20 ? 360 : 0)}, 55%, 42%)`;
}

/** Generate a 6-char uppercase alphanumeric invite code (no ambiguous chars). */
export function generateInviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

export const MPAA_RATINGS = ["G", "PG", "PG-13", "R", "NC-17"] as const;
export type MpaaRating = (typeof MPAA_RATINGS)[number];

export const DECISION_RULES = ["majority", "consensus"] as const;
export type DecisionRule = (typeof DECISION_RULES)[number];

/** Votes a movie needs to win under the given rule, for a fixed roster size. */
export function voteThresholdFor(count: number, rule: DecisionRule): number {
  return rule === "consensus"
    ? Math.max(1, count)
    : Math.max(1, Math.floor(count / 2) + 1);
}
