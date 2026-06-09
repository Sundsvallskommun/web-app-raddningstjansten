import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { ServiceError } from '@/components/ServiceError';
import { baselineSeen, isUpdated } from '@/utils/seenErrands';

const fmtDate = (s?: string) => (s ? new Date(s).toLocaleDateString('sv-SE') : '—');

export function AdminErrandsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const { data, isLoading: loading, isError, error, refetch, isFetching } = useAdminErrands(page, size);
  const errands = data?.errands ?? [];
  const meta = data?._meta ?? {};

  useEffect(() => {
    baselineSeen(errands);
  }, [errands]);

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
          Inkomna ärenden
        </Typography>
        <Paper>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : isError ? (
            <ServiceError error={error} onRetry={() => refetch()} isRetrying={isFetching} />
          ) : errands.length === 0 ? (
            <Typography color="text.secondary" sx={{ p: 3 }}>
              Inga ärenden ännu.
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
                  {errands.map(e => (
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
                count={meta.totalRecords ?? errands.length}
                page={page}
                onPageChange={(_, p) => setPage(p)}
                rowsPerPage={size}
                onRowsPerPageChange={e => {
                  setSize(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                rowsPerPageOptions={[10, 20, 50]}
                labelRowsPerPage="Rader per sida"
              />
            </>
          )}
        </Paper>
      </Box>
    </Wrapper>
  );
}
