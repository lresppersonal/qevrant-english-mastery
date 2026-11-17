/**
 * Design tokens. Single source for both themes; globals.css mirrors these values
 * as CSS variables, and scripts/check-contrast.ts verifies every text/surface pair
 * against WCAG 2.2 AA.
 */
export const tokens = {
  light: {
    bg: "#F7F8FB",
    surface: "#FFFFFF",
    surface2: "#F0F2F7",
    border: "#D9DFE9",
    text: "#0E1A33", // Midnight Blue
    muted: "#4A5671",
    primary: "#1B3668", // Navy
    primaryFg: "#FFFFFF",
    primarySoft: "#E8EEF8",
    accent: "#D99A2B", // Warm Amber (fills only)
    accentFg: "#1A1204",
    accentText: "#8A5A00", // amber used as text on light surfaces
    success: "#1C7347",
    danger: "#B3261E",
    focus: "#2E62C9",
  },
  dark: {
    bg: "#08101F",
    surface: "#0F1A2E",
    surface2: "#16233D",
    border: "#26385C",
    text: "#E7ECF5",
    muted: "#A2AEC6",
    primary: "#93B4EE",
    primaryFg: "#08101F",
    primarySoft: "#1A2C4E",
    accent: "#F0B44C",
    accentFg: "#1A1204",
    accentText: "#F3C26A",
    success: "#5CC48D",
    danger: "#F28B82",
    focus: "#8FB2FF",
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
