import React, { useMemo } from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider, CssBaseline, useMediaQuery } from "@mui/material";
import { createAppTheme } from "@/theme";
import App from "@/App";

// Bundled web fonts, latin subset only (see theme.ts for the family rationale).
import "@fontsource/source-sans-3/latin-400.css";
import "@fontsource/source-sans-3/latin-600.css";
import "@fontsource/source-sans-3/latin-700.css";
import "@fontsource/noto-serif/latin-400.css";
import "@fontsource/noto-serif/latin-700.css";
import "@fontsource/noto-sans/latin-400.css";
import "@fontsource/noto-sans/latin-700.css";

function Root() {
  // Follow the OS light/dark setting, re-rendering when it changes.
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");
  const theme = useMemo(() => createAppTheme(prefersDark ? "dark" : "light"), [prefersDark]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
