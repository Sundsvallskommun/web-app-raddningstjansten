import { createTheme, type Theme } from "@mui/material/styles";

/**
 * MUI theme for the POC. Kept isolated so it can later be replaced by
 * Sundsvalls Kommuns Shared Components without touching feature code.
 *
 * Two palettes (light/dark) are exposed via createAppTheme(mode); main.tsx
 * picks the mode from the OS setting (prefers-color-scheme).
 *
 * Fonts are bundled via @fontsource (imported in main.tsx). Note: "Droid Serif"
 * and "Droid Sans" are retired from Google Fonts, and "Source Sans Pro" is now
 * "Source Sans 3" — so the closest maintained equivalents are loaded, with the
 * originally requested names kept first in the fallback chain.
 */

const FONT_BODY =
  '"Source Sans 3", "Source Sans Pro", system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const FONT_SERIF =
  '"Noto Serif", "Droid Serif", Georgia, "Times New Roman", serif';
const FONT_SANS =
  '"Noto Sans", "Droid Sans", system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

/** Max width for centered content and the inner app-bar row. */
export const CONTENT_MAX_WIDTH = 1080;

const lightPalette = {
  mode: "light" as const,
  primary: { main: "#DA344D" },
  secondary: { main: "#F18805" },
  background: { default: "#f4f4f4", paper: "#fff" },
};

const darkPalette = {
  mode: "dark" as const,
  primary: { main: "#b5005e" },
  secondary: { main: "#9514ff" },
  background: { default: "#181818", paper: "#060606" },
};

export const createAppTheme = (mode: "light" | "dark"): Theme =>
  createTheme({
    palette: mode === "dark" ? darkPalette : lightPalette,
    typography: {
      fontFamily: FONT_BODY,
      h1: { fontFamily: FONT_SERIF },
      h2: { fontFamily: FONT_SANS },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 16 },
        },
      },
    },
  });
