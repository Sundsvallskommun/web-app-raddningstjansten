import { createTheme } from '@mui/material/styles';

/**
 * MUI theme for the POC. Kept isolated so it can later be replaced by
 * Sundsvalls Kommuns Shared Components without touching feature code.
 */
export const theme = createTheme({
  palette: {
    primary: { main: '#005595' }, // Sundsvalls kommun-ish blue
    secondary: { main: '#e00034' }, // räddningstjänst red
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: ['system-ui', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'].join(','),
  },
});
