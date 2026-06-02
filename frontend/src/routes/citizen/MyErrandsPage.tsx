import { useEffect, useState } from 'react';
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
import { apiService, fetchMyErrands, type Errand } from '@/api/api-service';
import { useAuth } from '@/auth/AuthContext';
import { Wrapper } from '@/components/Wrapper';
import { ErrandStatusChip } from '@/components/ErrandStatusChip';

const fmtDate = (s?: string) => (s ? new Date(s).toLocaleDateString('sv-SE') : '—');

export function MyErrandsPage() {
  const navigate = useNavigate();
  const { user, clear } = useAuth();
  const [errands, setErrands] = useState<Errand[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyErrands()
      .then(setErrands)
      .catch(() => setErrands([]))
      .finally(() => setLoading(false));
  }, []);

  async function logout() {
    await apiService.post('/citizen/logout');
    clear();
    navigate('/', { replace: true });
  }

  return (
    <Wrapper
      title="Räddningstjänsten Medelpad - Mina ärenden"
      logout={logout}
      color="primary"
      user={user}
      showNav
      navType="citizen"
    >
      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h4">Mina ärenden</Typography>
          <Button variant="contained" onClick={() => navigate('/errand/new')}>
            Ny ansökan
          </Button>
        </Stack>

        <Paper sx={{ p: 2 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : errands.length === 0 ? (
            <Typography color="text.secondary" sx={{ p: 2 }}>
              Du har inga inskickade ärenden ännu.
            </Typography>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Ärende</TableCell>
                  <TableCell>Titel</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Inskickat</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {errands.map(e => (
                  <TableRow key={e.id}>
                    <TableCell>{e.errandNumber ?? e.id?.slice(0, 8)}</TableCell>
                    <TableCell>{e.title}</TableCell>
                    <TableCell>
                      <ErrandStatusChip status={e.status} />
                    </TableCell>
                    <TableCell>{fmtDate(e.created)}</TableCell>
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
