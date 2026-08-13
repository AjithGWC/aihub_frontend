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
  bg: "#f5f7fb",
  panelBg: "#ffffff",
  panelBorder: "rgba(37,99,235,.16)",
  hairline: "rgba(15,23,42,.08)",

  neutral100: "#0f172a",
  neutral200: "#1e293b",
  neutral300: "#475569",
  neutral400: "#64748b",
  neutral500: "#94a3b8",
  neutral600: "#cbd5e1",

  accent300: "#93C5FD",
  accent400: "#60A5FA",
  accent500: "#2563EB",
  accent600: "#1D4ED8",

  accent2_300: "#93C5FD",
  accent2_400: "#60A5FA",
  accent2_500: "#3B82F6",
  accent2_600: "#2563EB",
} as const;

/** Distinct colour per hub sector — ring/border, near-white fill, icon ink, connector trace. */
export const SECTOR_COLOR = {
  blue: { ring: "#3B82F6", bg: "#ffffff", ink: "#2563EB", trace: "#60A5FA" },
  cyan: { ring: "#06B6D4", bg: "#ffffff", ink: "#0891B2", trace: "#22D3EE" },
  orange: { ring: "#F97316", bg: "#ffffff", ink: "#EA580C", trace: "#FB923C" },
  amber: { ring: "#F59E0B", bg: "#ffffff", ink: "#D97706", trace: "#FBBF24" },
  violet: { ring: "#8B5CF6", bg: "#ffffff", ink: "#7C3AED", trace: "#A78BFA" },
  green: { ring: "#22C55E", bg: "#ffffff", ink: "#16A34A", trace: "#4ADE80" },
} as const;

export type SectorTone = keyof typeof SECTOR_COLOR;

export const FONT_HEADING = "'Alfa Slab One', cursive";
export const FONT_BODY = "'Figtree', sans-serif";
