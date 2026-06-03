import { Box, Typography } from '@mui/material';
import { CONTENT_MAX_WIDTH } from '@/theme';
import { RaddningstjanstSymbol } from './RaddningstjanstSymbol';

/**
 * Brand footer (in the spirit of sverigesraddningstjanster.se): deep-maroon bar
 * with a thin red accent line on top, the alert symbol and "Räddningstjänsten".
 * Rendered by Wrapper, so it only appears on logged-in pages.
 */
export function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        mt: 6,
        bgcolor: '#520000',
        color: '#ffffff',
        borderTop: '4px solid',
        borderColor: 'primary.main',
      }}
    >
      <Box
        sx={{
          maxWidth: CONTENT_MAX_WIDTH,
          mx: 'auto',
          px: { xs: 2, sm: 3 },
          py: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <RaddningstjanstSymbol size={44} />
          <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: 0.5 }}>
            Räddningstjänsten
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ opacity: 0.8 }}>
          © {new Date().getFullYear()} Räddningstjänsten Medelpad
        </Typography>
      </Box>
    </Box>
  );
}
