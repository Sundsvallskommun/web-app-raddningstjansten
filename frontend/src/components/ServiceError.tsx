import { Alert, AlertTitle, Box, Button } from '@mui/material';
import { RefreshOutlined } from '@mui/icons-material';
import { isUpstreamUnavailable } from '@/utils/apiError';

interface Props {
  error: unknown;
  onRetry?: () => void;
  isRetrying?: boolean;
}

/**
 * Friendly error panel for failed data loads. Distinguishes a temporary
 * upstream outage (502/503/504/network — "try again shortly") from a real error,
 * and offers a retry button.
 */
export function ServiceError({ error, onRetry, isRetrying }: Props) {
  const upstream = isUpstreamUnavailable(error);
  return (
    <Box sx={{ p: 3 }}>
      <Alert
        severity={upstream ? 'warning' : 'error'}
        action={
          onRetry ? (
            <Button
              color="inherit"
              size="small"
              startIcon={<RefreshOutlined />}
              onClick={onRetry}
              disabled={isRetrying}
            >
              Försök igen
            </Button>
          ) : undefined
        }
      >
        <AlertTitle>
          {upstream ? 'Tjänsten är tillfälligt otillgänglig' : 'Något gick fel'}
        </AlertTitle>
        {upstream
          ? 'Ärendetjänsten svarar inte just nu. Det beror oftast på en tillfällig störning – försök igen om en liten stund.'
          : 'Det gick inte att hämta informationen. Försök igen senare.'}
      </Alert>
    </Box>
  );
}
