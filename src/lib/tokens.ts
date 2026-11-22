/**
 * Design tokens. Single source for both themes; globals.css mirrors these values
 * as CSS variables, and scripts/check-contrast.ts verifies every text/surface pair
 * against WCAG 2.2 AA.
 */
export const tokens = {
  light: {
    bg: "#F5F2EA",
    surface: "#FBF9F4",
    surface2: "#EFEBE1",
    border: "#E1DACB",
    text: "#14223F", // Midnight Blue
    muted: "#535D74",
    primary: "#2C4777", // Navy
    primaryFg: "#FFFFFF",
    primarySoft: "#E4EAF2",
    accent: "#D99A2B", // Warm Amber (fills only)
    accentFg: "#1A1204",
    accentText: "#8A5A00", // amber used as text on light surfaces
    success: "#1C7347",
    danger: "#B3261E",
    focus: "#3B64A6",
  },
  dark: {
    bg: "#0A1322",
    surface: "#101B2F",
    surface2: "#16233B",
    border: "#22324D",
    text: "#E3E8F1",
    muted: "#9DA9BF",
    primary: "#A7BFE3",
    primaryFg: "#0A1322",
    primarySoft: "#1A2A45",
    accent: "#F0B44C",
    accentFg: "#1A1204",
    accentText: "#F3C26A",
    success: "#5CC48D",
    danger: "#F28B82",
    focus: "#9DB8E6",
  },
} as const;

export type ThemeName = keyof typeof tokens;

/** Pairs that must pass AA (4.5:1 for normal text, 3:1 for UI/large). */
export const contrastPairs: Array<{ fg: keyof typeof tokens.light; bg: keyof typeof tokens.light; min: number }> = [
  { fg: "text", bg: "bg", min: 4.5 },
  { fg: "text", bg: "surface", min: 4.5 },
  { fg: "text", bg: "surface2", min: 4.5 },
  { fg: "muted", bg: "bg", min: 4.5 },
  { fg: "muted", bg: "surface", min: 4.5 },
  { fg: "muted", bg: "surface2", min: 4.5 },
  { fg: "primary", bg: "surface", min: 4.5 },
  { fg: "primary", bg: "bg", min: 4.5 },
  { fg: "primary", bg: "primarySoft", min: 4.5 },
  { fg: "primaryFg", bg: "primary", min: 4.5 },
  { fg: "accentFg", bg: "accent", min: 4.5 },
  { fg: "accentText", bg: "surface", min: 4.5 },
  { fg: "success", bg: "surface", min: 4.5 },
  { fg: "danger", bg: "surface", min: 4.5 },
  { fg: "focus", bg: "surface", min: 3 },
  { fg: "border", bg: "surface", min: 1.3 },
];
