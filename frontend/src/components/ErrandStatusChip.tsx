import { Chip } from '@mui/material';

const COLOR: Record<string, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
  REGISTERED: 'info',
  NEW: 'info',
  DECIDED: 'success',
  APPROVED: 'success',
  REJECTED: 'error',
  DENIED: 'error',
};

/** Small status chip for an errand. */
export function ErrandStatusChip({ status }: { status?: string }) {
  const s = status ?? '—';
  return <Chip label={s} size="small" color={COLOR[s] ?? 'default'} variant="outlined" />;
}
