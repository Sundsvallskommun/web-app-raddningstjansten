import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { OpenInNewOutlined, DownloadOutlined, InfoOutlined } from '@mui/icons-material';
import { apiService, citizenDecisionPdfUrl, type Errand } from '@/api/api-service';
import { useCitizenConfig, useMyErrands } from '@/api/queries';
import { useAuth } from '@/auth/AuthContext';
import { Wrapper } from '@/components/Wrapper';
import { ErrandStatusChip } from '@/components/ErrandStatusChip';
import { ServiceError } from '@/components/ServiceError';

const fmtDate = (s?: string) => (s ? new Date(s).toLocaleDateString('sv-SE') : '—');
const isDecided = (status?: string) => status === 'DECIDED' || status === 'REJECTED';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
/** Whole days until `validUntil` (negative once it has passed); null if unset/invalid. */
function daysUntilExpiry(validUntil?: string): number | null {
  if (!validUntil) return null;
  const d = new Date(validUntil);
  if (Number.isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / MS_PER_DAY);
}

const expiryTooltip = (daysLeft: number): string =>
  daysLeft <= 0
    ? 'Giltighetstiden går ut idag.'
    : `Om ${daysLeft} ${daysLeft === 1 ? 'dag' : 'dagar'} går giltighetstiden ut.`;

/**
 * Validity cell: the from–until range, plus (when the BFF-configured warning
 * window applies) an info icon counting down to expiry, or an "expired" text.
 * Shows nothing extra while expiry is still far off.
 */
function renderValidity(e: Errand, warningDays: number | null) {
  if (e.revokedAt) return `Återkallat ${fmtDate(e.revokedAt)}`;
  if (!e.validFrom && !e.validUntil) return '—';

  const range = `${fmtDate(e.validFrom)} – ${fmtDate(e.validUntil)}`;
  const left = daysUntilExpiry(e.validUntil);
  const expired = left !== null && left < 0;
  const nearExpiry = !expired && left !== null && warningDays !== null && left <= warningDays;

  return (
    <Stack direction='row' spacing={0.5} alignItems='center'>
      <span>{range}</span>
      {expired ? (
        <Typography variant='caption' color='error'>
          Giltighetstiden har gått ut
        </Typography>
      ) : nearExpiry ? (
        <Tooltip title={expiryTooltip(left!)}>
          <InfoOutlined fontSize='small' color='warning' />
        </Tooltip>
      ) : null}
    </Stack>
  );
}

export function MyDecisionsPage() {
  const navigate = useNavigate();
  const { user, clear } = useAuth();
  const { data: errands = [], isLoading: loading, isError, error, refetch, isFetching } = useMyErrands();
  const { data: config } = useCitizenConfig();
  const warningDays = config?.validityWarningDays ?? null;
  const decided = errands.filter(e => isDecided(e.status));

  async function logout() {
    await apiService.post('/citizen/logout');
    clear();
    navigate('/', { replace: true });
  }

  return (
    <Wrapper
      title="Räddningstjänsten Medelpad - Mina beslut"
      logout={logout}
      color="primary"
      user={user}
      showNav
      navType="citizen"
    >
      <Box>
        <Typography variant="h4" sx={{ mb: 2 }}>
          Mina beslut
        </Typography>

        <Paper sx={{ p: 2 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : isError ? (
            <ServiceError error={error} onRetry={() => refetch()} isRetrying={isFetching} />
          ) : decided.length === 0 ? (
            <Typography color="text.secondary" sx={{ p: 2 }}>
              Du har inga beslut ännu.
            </Typography>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Ärende</TableCell>
                  <TableCell>Titel</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Datum</TableCell>
                  <TableCell>Giltighet</TableCell>
                  <TableCell align="right">Beslut</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {decided.map(e => (
                  <TableRow key={e.id} hover>
                    <TableCell>{e.errandNumber ?? e.id?.slice(0, 8)}</TableCell>
                    <TableCell>{e.title}</TableCell>
                    <TableCell>
                      <ErrandStatusChip status={e.status} audience="citizen" />
                    </TableCell>
                    <TableCell>{fmtDate(e.modified ?? e.created)}</TableCell>
                    <TableCell>{renderValidity(e, warningDays)}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button
                          size="small"
                          component="a"
                          href={citizenDecisionPdfUrl(e.id!)}
                          target="_blank"
                          rel="noopener"
                          startIcon={<OpenInNewOutlined />}
                        >
                          Visa
                        </Button>
                        <Button
                          size="small"
                          component="a"
                          href={citizenDecisionPdfUrl(e.id!)}
                          download
                          startIcon={<DownloadOutlined />}
                        >
                          Ladda ner
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>
      </Box>
    </Wrapper>
  );
}
