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
  Typography,
} from '@mui/material';
import { OpenInNewOutlined, DownloadOutlined } from '@mui/icons-material';
import { apiService, citizenDecisionPdfUrl } from '@/api/api-service';
import { useMyErrands } from '@/api/queries';
import { useAuth } from '@/auth/AuthContext';
import { Wrapper } from '@/components/Wrapper';
import { ErrandStatusChip } from '@/components/ErrandStatusChip';
import { ServiceError } from '@/components/ServiceError';

const fmtDate = (s?: string) => (s ? new Date(s).toLocaleDateString('sv-SE') : '—');
const isDecided = (status?: string) => status === 'DECIDED' || status === 'REJECTED';

export function MyDecisionsPage() {
  const navigate = useNavigate();
  const { user, clear } = useAuth();
  const { data: errands = [], isLoading: loading, isError, error, refetch, isFetching } = useMyErrands();
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
