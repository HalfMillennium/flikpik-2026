/**
 * flikpik design system tokens (base44-derived, cinematic palette).
 * Single source of truth for colors, type scale, and motion.
 * These are mirrored as CSS custom properties in globals.css.
 */

export const colors = {
  ink: "#1A1216",
  inkSoft: "#6B5A62",
  paper: "#F5F0EB",
  paperRaised: "#FDFAF7",
  paperTint: "#EDE5DC",
  line: "#DCD2C8",
  red: "#E63220",
  redDeep: "#B8200F",
  redTint: "#FDDCD8",
  inkPanel: "#151015",
  paperOnDark: "#F0E8DD",
  scrim: "rgba(21,16,21,0.50)",
  // Semantic voting colors (not brand accents).
  yay: "#2ECC71",
  nay: "#E63220",
} as const;

export const typography = {
  hero: {
    size: "clamp(46px, 7.5vw, 96px)",
    weight: 700,
    tracking: "-0.035em",
    leading: "0.96",
  },
  display: {
    size: "clamp(32px, 4.5vw, 58px)",
    weight: 700,
    tracking: "-0.025em",
    leading: "1.02",
  },
  title: {
    size: "23px",
    weight: 650,
    tracking: "-0.015em",
    leading: "1.15",
  },
  body: {
    size: "16px",
    weight: 400,
    tracking: "0",
    leading: "1.55",
  },
} as const;

export const radius = {
  sm: "8px",
  md: "12px",
  lg: "18px",
  pill: "999px",
} as const;

export const shadow = {
  card: "0 1px 2px rgba(26,18,22,0.06), 0 8px 24px rgba(26,18,22,0.08)",
  raised: "0 2px 4px rgba(26,18,22,0.08), 0 18px 48px rgba(26,18,22,0.14)",
  sticker: "0 2px 0 rgba(184,32,15,0.35)",
} as const;

export type ColorToken = keyof typeof colors;

export const tokens = { colors, typography, radius, shadow };
export default tokens;
