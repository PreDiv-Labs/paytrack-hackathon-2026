import type { CSSProperties } from "react";

// Single source of truth for CSS, canvas charts, grids, and category styling.
export const colors = {
  app: "#F6F7FB",
  surface: "#FFFFFF",
  primary: "#6D28F5",
  primaryHover: "#5B21D6",
  violetSoft: "#F0E9FF",
  lavender: "#C4A7FF",
  navy: "#192438",
  text: "#111827",
  secondary: "#667085",
  border: "#E3E7F0",
  positive: "#15803D",
  positiveSoft: "#DCFCE7",
  income: "#22C55E",
  negative: "#DC2626",
  negativeStrong: "#B91C1C",
  negativeSoft: "#FEE2E2",
  warning: "#92400E",
  warningSoft: "#FEF3C7",
  info: "#3B82F6",
  infoSoft: "#EAF2FF",
  onPrimary: "#FFFFFF",
  onFeature: "#F8FAFC",
  featureMuted: "#CBD5E1",
  categoryTeal: "#0D9488",
  categoryOrange: "#EA580C",
  categoryPink: "#DB2777",
  categorySlate: "#64748B",
  categoryIndigo: "#4F46E5",
} as const;
export const categoryColors: Record<string, string> = {
  Uncategorized: colors.categorySlate,
  Dining: colors.primary,
  Shopping: colors.lavender,
  Travel: colors.categoryTeal,
  Services: colors.info,
  Software: colors.categoryIndigo,
  "Shared expenses": colors.categoryOrange,
  Other: colors.categoryPink,
};
export function categoryColor(category: string) {
  return categoryColors[category] ?? colors.categorySlate;
}
export const themeVariables = Object.fromEntries(
  Object.entries(colors).map(([key, value]) => [
    `--color-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`,
    value,
  ]),
) as CSSProperties;
