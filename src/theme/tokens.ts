/**
 * SafeNest design tokens: the same semantic colours as the web app
 * (apps/web/src/app/globals.css), converted from OKLCH to hex because React
 * Native has no OKLCH support. Components use these names, never raw colours.
 */
export type Palette = {
  background: string;
  foreground: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  mutedForeground: string;
  primary: string;
  primaryForeground: string;
  primarySoft: string;
  accent: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
};

export const light: Palette = {
  background: "#F8FBFB",
  foreground: "#1A2730",
  surface: "#FFFFFF",
  surfaceMuted: "#F0F5F5",
  border: "#DEE6E8",
  mutedForeground: "#5B6771",
  primary: "#00777A",
  primaryForeground: "#F6FCFC",
  primarySoft: "#E0F3F3",
  accent: "#F2B23E",
  success: "#1E8A4C",
  successSoft: "#E3F5E8",
  warning: "#B5760B",
  warningSoft: "#FCF1DC",
  danger: "#C4342D",
  dangerSoft: "#FBE9E7",
};

export const dark: Palette = {
  background: "#141B20",
  foreground: "#EEF3F4",
  surface: "#1B242A",
  surfaceMuted: "#222C33",
  border: "#33414A",
  mutedForeground: "#A6B2BA",
  primary: "#3FB8B8",
  primaryForeground: "#0F1F22",
  primarySoft: "#183A3C",
  accent: "#F4BF5A",
  success: "#4CC47A",
  successSoft: "#1A3324",
  warning: "#E8B74F",
  warningSoft: "#3A2F17",
  danger: "#EE7468",
  dangerSoft: "#3E1E1C",
};

export const radius = { sm: 8, md: 10, lg: 12, xl: 16 } as const;
export const space = (n: number) => n * 4;
