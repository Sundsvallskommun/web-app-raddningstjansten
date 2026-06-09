import { createTheme } from "@mui/material/styles";

/**
 * Theme aligned with the graphical profile of sverigesraddningstjanster.se.
 *
 * Typeface: the brand uses "Protipo" (Adobe Fonts / Typekit). That kit is
 * commercial and domain-locked, so it cannot be bundled here — we keep
 * `protipo` first in the font stack (used automatically if an Adobe Fonts
 * project for this app's domain is added) and bundle Mulish (imported in
 * main.tsx) as a close, free fallback.
 *
 * Single light theme (no OS light/dark switching).
 */

const FONT_FAMILY =
  "'protipo', 'Mulish', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/** Max width for centered content and the inner app-bar row. */
export const CONTENT_MAX_WIDTH = 1080;

// Brand palette extracted from the site's CSS variables.
export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#194c86", contrastText: "#ffffff" }, // brand red (buttons, links, citizen app-bar)
    secondary: { main: "#2d6674", contrastText: "#ffffff" }, // deep maroon (dark sections, admin app-bar)
    background: { default: "#f1ebe5", paper: "#ffffff" }, // warm cream page, white cards
    text: { primary: "#3b3b3b" },
  },
  shape: { borderRadius: 4 },
  typography: {
    fontFamily: FONT_FAMILY,
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 4 },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: { background: "#520000" },
      },
    },
  },
});
