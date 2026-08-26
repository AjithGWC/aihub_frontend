/* ------------------------------------------------------------------ */
/*  Shared design tokens for the Atlas hub UI (HexagonHub, TeamDashboard, */
/*  Login, Chatbot). Kept in their own module so components can share    */
/*  them without a circular import.                                     */
/*                                                                      */
/*  Palette: light, white-panelled, blue-accented — matching the        */
/*  RYTAIL light mockup (white hub, per-sector colour coding) instead   */
/*  of the earlier dark indigo look.                                    */
/* ------------------------------------------------------------------ */

export const COLOR = {
  bg: "var(--background)",
  panelBg: "var(--card)",
  panelBorder: "var(--border)",
  hairline: "var(--border)",

  neutral100: "var(--foreground)",
  neutral200: "var(--text)",
  neutral300: "var(--muted)",
  neutral400: "var(--muted-foreground)",
  neutral500: "var(--muted)",
  neutral600: "var(--border)",

  accent300: "var(--primary-soft)",
  accent400: "var(--primary-soft)",
  accent500: "var(--primary)",
  accent600: "var(--primary-hover)",

  accent2_300: "var(--primary-soft)",
  accent2_400: "var(--primary-soft)",
  accent2_500: "var(--primary)",
  accent2_600: "var(--primary-hover)",
} as const;

/** Distinct colour per hub sector — ring/border, theme-adaptive fill, icon ink, connector trace. */
export const SECTOR_COLOR = {
  blue: { ring: "#3B82F6", bg: "var(--card)", ink: "#2563EB", trace: "#60A5FA" },
  cyan: { ring: "#06B6D4", bg: "var(--card)", ink: "#0891B2", trace: "#22D3EE" },
  orange: { ring: "#F97316", bg: "var(--card)", ink: "#EA580C", trace: "#FB923C" },
  amber: { ring: "#F59E0B", bg: "var(--card)", ink: "#D97706", trace: "#FBBF24" },
  violet: { ring: "#8B5CF6", bg: "var(--card)", ink: "#7C3AED", trace: "#A78BFA" },
  green: { ring: "#22C55E", bg: "var(--card)", ink: "#16A34A", trace: "#4ADE80" },
} as const;

export type SectorTone = keyof typeof SECTOR_COLOR;

export const FONT_HEADING = "'Alfa Slab One', cursive";
export const FONT_BODY = "'Figtree', sans-serif";
