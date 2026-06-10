import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Badge,
  Box,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from '@mui/material';
import { useAuth } from '@/auth/AuthContext';
import { useAdminErrands } from '@/api/queries';
import { Wrapper } from '@/components/Wrapper';
import { ErrandStatusChip } from '@/components/ErrandStatusChip';
import { ErrandFilters } from '@/components/ErrandFilters';
import { ServiceError } from '@/components/ServiceError';
import { emptyErrandFilters, hasActiveFilters, toErrandQueryParams } from '@/utils/errandFilter';
import { useDebouncedValue } from '@/utils/useDebouncedValue';
import { moduleBySlug } from '@/utils/modules';
import { baselineSeen, isUpdated } from '@/utils/seenErrands';

const fmtDate = (s?: string) => (s ? new Date(s).toLocaleDateString('sv-SE') : '—');

// rtj does the filtering (title/status/applicant/date); we fetch the matching set
// and paginate it on the client. Generous size — fine at POC scale; switch to
// server paging if the dataset grows large.
const FETCH_SIZE = 200;

export function AdminErrandsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [searchParams] = useSearchParams();
  const activeModule = moduleBySlug(searchParams.get('module'));

  const [filters, setFilters] = useState(emptyErrandFilters);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  // Debounced filter bar + selected module → BFF query params (server-side filter).
  const debouncedFilters = useDebouncedValue(filters, 300);
  const queryParams = useMemo(
    () => ({ ...toErrandQueryParams(debouncedFilters, 'admin'), typeSlug: activeModule?.typeSlug }),
    [debouncedFilters, activeModule],
  );
  const { data, isLoading: loading, isError, error, refetch, isFetching } = useAdminErrands(0, FETCH_SIZE, queryParams);
  const filtered = data?.errands ?? [];
  const pageRows = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const filtersActive = hasActiveFilters(filters) || !!activeModule;

  // Reset to the first page whenever the filter or module changes.
  useEffect(() => {
    setPage(0);
  }, [filters, activeModule?.slug]);

  useEffect(() => {
    baselineSeen(filtered);
  }, [filtered]);

  function logout() {
    window.location.href = '/api/saml/logout';
  }

  return (
    <Wrapper
      title="Räddningstjänsten Medelpad - Ärenden"
      logout={logout}
      color="secondary"
      user={user}
      showNav
      navType="admin"
    >
      <Box>
        <Typography variant="h4" gutterBottom>
          Inkomna ärenden{activeModule ? ` · ${activeModule.label}` : ''}
        </Typography>

        {loading ? (
          <Paper>
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          </Paper>
        ) : isError ? (
          <Paper>
            <ServiceError error={error} onRetry={() => refetch()} isRetrying={isFetching} />
          </Paper>
        ) : (
          <>
            <Paper sx={{ p: 2, mb: 2 }}>
              <ErrandFilters value={filters} onChange={setFilters} audience="admin" />
            </Paper>
            <Paper>
              {filtered.length === 0 ? (
                <Typography color="text.secondary" sx={{ p: 3 }}>
                  {filtersActive ? 'Inga ärenden matchar filtret.' : 'Inga ärenden ännu.'}
                </Typography>
              ) : (
                <>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Ärende</TableCell>
                        <TableCell>Titel</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Sökande (e-post)</TableCell>
                        <TableCell>Inskickat</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pageRows.map(e => (
                        <TableRow
                          key={e.id}
                          hover
                          sx={{ cursor: 'pointer' }}
                          onClick={() => navigate(`/admin/errands/${e.id}`)}
                        >
                          <TableCell>
                            <Badge color="error" variant="dot" invisible={!isUpdated(e.id, e.modified)}>
                              <span>{e.errandNumber ?? e.id?.slice(0, 8)}</span>
                            </Badge>
                          </TableCell>
                          <TableCell>{e.title}</TableCell>
                          <TableCell>
                            <ErrandStatusChip status={e.status} assigned={!!e.assignedUserId} />
                          </TableCell>
                          <TableCell>{e.applicantEmail ?? '—'}</TableCell>
                          <TableCell>{fmtDate(e.created)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <TablePagination
                    component="div"
                    count={filtered.length}
                    page={page}
                    onPageChange={(_, p) => setPage(p)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={e => {
                      setRowsPerPage(parseInt(e.target.value, 10));
                      setPage(0);
                    }}
                    rowsPerPageOptions={[10, 20, 50]}
                    labelRowsPerPage="Rader per sida"
                  />
                </>
              )}
            </Paper>
          </>
        )}
      </Box>
    </Wrapper>
  );
}
