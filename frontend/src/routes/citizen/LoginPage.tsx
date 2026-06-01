import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Card, CardContent, Stack, Typography, CircularProgress, Alert } from '@mui/material';
import { apiService } from '@/api/api-service';
import { useAuth } from '@/auth/AuthContext';

const POLL_INTERVAL_MS = 1000;
const POLL_TIMEOUT_MS = 30000;

/**
 * Citizen login. Mocked BankID: start an order, then poll /collect until complete.
 * The UI mirrors the real BankID auth/collect flow so migration is a swap of endpoints.
 */
export function CitizenLoginPage() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [status, setStatus] = useState<'idle' | 'pending' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function startLogin() {
    setError(null);
    setStatus('pending');
    try {
      const { data: order } = await apiService.post<{ orderRef: string }>('/citizen/login/start');
      const orderRef = order.orderRef;

      const deadline = Date.now() + POLL_TIMEOUT_MS;
      // poll until complete
      while (Date.now() < deadline) {
        const { data } = await apiService.post<{ status: string }>('/citizen/login/collect', { orderRef });
        if (data.status === 'complete') {
          await refresh();
          navigate('/dashboard', { replace: true });
          return;
        }
        if (data.status === 'failed') {
          throw new Error('Inloggningen avbröts.');
        }
        await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
      }
      throw new Error('Tidsgränsen för inloggning överskreds.');
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'Något gick fel vid inloggning.');
    }
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8, px: 2 }}>
      <Card variant="outlined" sx={{ maxWidth: 420, width: '100%' }}>
        <CardContent>
          <Stack spacing={2} alignItems="center">
            <Typography variant="h5">Räddningstjänsten</Typography>
            <Typography color="text.secondary" textAlign="center">
              Logga in som medborgare med BankID.
            </Typography>

            {error && <Alert severity="error" sx={{ width: '100%' }}>{error}</Alert>}

            {status === 'pending' ? (
              <Stack spacing={1} alignItems="center">
                <CircularProgress />
                <Typography variant="body2" color="text.secondary">
                  Öppna BankID-appen… (mock)
                </Typography>
              </Stack>
            ) : (
              <Button variant="contained" size="large" onClick={startLogin} fullWidth>
                Logga in med BankID
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
