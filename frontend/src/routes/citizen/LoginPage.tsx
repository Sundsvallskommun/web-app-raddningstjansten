import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { apiService } from '@/api/api-service';
import { useAuth } from '@/auth/AuthContext';
import { RaddningstjanstSymbol } from '@/components/RaddningstjanstSymbol';

const POLL_INTERVAL_MS = 1000;
const POLL_TIMEOUT_MS = 30000;

interface PersonOption {
  index: number;
  label: string;
}

const HINT_MESSAGES: Record<string, string> = {
  wrongPassword: 'Fel lösenord.',
  notConfigured: 'Inloggning är inte konfigurerad (lösenord saknas).',
  noPerson: 'Välj en användare.',
};

/**
 * Citizen login. Mocked BankID: choose a test person + password, start an order,
 * then poll /collect until complete. The UI mirrors the real BankID auth/collect
 * flow so migration is a swap of endpoints.
 */
export function CitizenLoginPage() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [open, setOpen] = useState(false);
  const [persons, setPersons] = useState<PersonOption[]>([]);
  const [personIndex, setPersonIndex] = useState<number | null>(null);
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'signing'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    apiService
      .get<{ persons: PersonOption[] }>('/citizen/login/options')
      .then(({ data }) => {
        setPersons(data.persons);
        setPersonIndex(data.persons[0]?.index ?? null);
      })
      .catch(() => setError('Kunde inte hämta användare.'));
  }, [open]);

  function openDialog() {
    setPassword('');
    setStatus('idle');
    setError(null);
    setOpen(true);
  }

  function closeDialog() {
    if (status === 'signing') return; // don't close mid-sign
    setOpen(false);
  }

  async function login() {
    if (personIndex === null) {
      setError('Välj en användare.');
      return;
    }
    setError(null);
    setStatus('loading');
    try {
      const { data: order } = await apiService.post<{ orderRef: string }>('/citizen/login/start', {
        personIndex,
        password,
      });
      setStatus('signing');

      const deadline = Date.now() + POLL_TIMEOUT_MS;
      while (Date.now() < deadline) {
        const { data } = await apiService.post<{ status: string }>('/citizen/login/collect', {
          orderRef: order.orderRef,
        });
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
      setStatus('idle');
      if (axios.isAxiosError(e)) {
        const hint = (e.response?.data as { hintCode?: string } | undefined)?.hintCode;
        setError((hint && HINT_MESSAGES[hint]) || 'Något gick fel vid inloggning.');
      } else {
        setError(e instanceof Error ? e.message : 'Något gick fel vid inloggning.');
      }
    }
  }

  const busy = status === 'loading' || status === 'signing';

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8, px: 2 }}>
      <Card variant="outlined" sx={{ maxWidth: 420, width: '100%' }}>
        <CardContent>
          <Stack spacing={2} alignItems="center">
            <Box sx={{ color: 'primary.main' }}>
              <RaddningstjanstSymbol size={56} />
            </Box>
            <Typography variant="h5">Räddningstjänsten</Typography>
            <Typography color="text.secondary" textAlign="center">
              Logga in som medborgare med BankID.
            </Typography>
            <Button variant="contained" size="large" onClick={openDialog} fullWidth>
              Logga in med BankID
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Dialog open={open} onClose={closeDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Logga in med BankID (mock)</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {status === 'signing' ? (
            <Stack spacing={1} alignItems="center" sx={{ py: 3 }}>
              <CircularProgress />
              <Typography variant="body2" color="text.secondary">
                Öppna BankID-appen… (mock)
              </Typography>
            </Stack>
          ) : (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <FormControl>
                <FormLabel>Välj användare</FormLabel>
                <RadioGroup
                  value={personIndex ?? ''}
                  onChange={e => setPersonIndex(Number(e.target.value))}
                >
                  {persons.map(p => (
                    <FormControlLabel
                      key={p.index}
                      value={p.index}
                      control={<Radio />}
                      label={`${p.label}…`}
                      disabled={busy}
                    />
                  ))}
                </RadioGroup>
              </FormControl>
              <TextField
                label="Lösenord"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={busy}
                fullWidth
                onKeyDown={e => {
                  if (e.key === 'Enter') login();
                }}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeDialog} disabled={status === 'signing'}>
            Avbryt
          </Button>
          <Button variant="contained" onClick={login} disabled={busy || persons.length === 0}>
            {status === 'loading' ? <CircularProgress size={24} /> : 'Logga in'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
