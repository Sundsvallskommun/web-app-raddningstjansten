import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Badge,
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
import { apiService } from '@/api/api-service';
import { useMyErrands } from '@/api/queries';
import { useAuth } from '@/auth/AuthContext';
import { Wrapper } from '@/components/Wrapper';
import { ErrandStatusChip } from '@/components/ErrandStatusChip';
import { ErrandFilters } from '@/components/ErrandFilters';
import { ServiceError } from '@/components/ServiceError';
import { emptyErrandFilters, hasActiveFilters, toErrandQueryParams } from '@/utils/errandFilter';
import { useDebouncedValue } from '@/utils/useDebouncedValue';
import { moduleBySlug } from '@/utils/modules';
import { baselineSeen, isUpdated } from '@/utils/seenErrands';

const fmtDate = (s?: string) => (s ? new Date(s).toLocaleDateString('sv-SE') : '—');

export function MyErrandsPage() {
  const navigate = useNavigate();
  const { user, clear } = useAuth();
  const [searchParams] = useSearchParams();
  const activeModule = moduleBySlug(searchParams.get('module'));
  const [filters, setFilters] = useState(emptyErrandFilters);

  // Debounced filter bar + selected module → BFF query params (server-side filter).
  const debouncedFilters = useDebouncedValue(filters, 300);
  const queryParams = useMemo(
    () => ({ ...toErrandQueryParams(debouncedFilters, 'citizen'), typeSlug: activeModule?.typeSlug }),
    [debouncedFilters, activeModule],
  );
  const { data: filtered = [], isLoading: loading, isError, error, refetch, isFetching } = useMyErrands(queryParams);
  const filtersActive = hasActiveFilters(filters) || !!activeModule;

  useEffect(() => {
    baselineSeen(filtered);
  }, [filtered]);

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
          <Typography variant="h4">
            Mina ärenden{activeModule ? ` · ${activeModule.label}` : ''}
          </Typography>
          <Button variant="contained" onClick={() => navigate('/errand/new')}>
            Ny ansökan
          </Button>
        </Stack>

        <Paper sx={{ p: 2 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : isError ? (
            <ServiceError error={error} onRetry={() => refetch()} isRetrying={isFetching} />
          ) : (
            <>
              <Box sx={{ mb: 2 }}>
                <ErrandFilters value={filters} onChange={setFilters} audience="citizen" />
              </Box>
              {filtered.length === 0 ? (
                <Typography color="text.secondary" sx={{ p: 1 }}>
                  {filtersActive ? 'Inga ärenden matchar filtret.' : 'Du har inga inskickade ärenden ännu.'}
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
                    {filtered.map(e => (
                      <TableRow
                        key={e.id}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/errands/${e.id}`)}
                      >
                        <TableCell>
                          <Badge color="error" variant="dot" invisible={!isUpdated(e.id, e.modified)}>
                            <span>{e.errandNumber ?? e.id?.slice(0, 8)}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>{e.title}</TableCell>
                        <TableCell>
                          <ErrandStatusChip status={e.status} audience="citizen" />
                        </TableCell>
                        <TableCell>{fmtDate(e.created)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </>
          )}
        </Paper>
      </Box>
    </Wrapper>
  );
}
