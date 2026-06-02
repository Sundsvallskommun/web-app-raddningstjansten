import { Chip } from '@mui/material';

type ChipColor = 'default' | 'info' | 'success' | 'warning' | 'error';

interface StatusMeta {
  label: string;
  color: ChipColor;
}

const STATUS: Record<string, StatusMeta> = {
  REGISTERED: { label: 'Inskickad', color: 'info' },
  NEW: { label: 'Ny', color: 'info' },
  UNDER_MANUAL_REVIEW: { label: 'Manuell granskning', color: 'warning' },
  AWAITING_SUPPLEMENTATION: { label: 'Väntar på komplettering', color: 'warning' },
  DECIDED: { label: 'Beslutad', color: 'success' },
  APPROVED: { label: 'Godkänd', color: 'success' },
  REJECTED: { label: 'Avslagen', color: 'error' },
};

export function statusLabel(status?: string): string {
  return status ? (STATUS[status]?.label ?? status) : '—';
}

/** Small status chip for an errand with Swedish labels. */
export function ErrandStatusChip({ status }: { status?: string }) {
  const meta = status ? STATUS[status] : undefined;
  return (
    <Chip
      label={statusLabel(status)}
      size="small"
      color={meta?.color ?? 'default'}
      variant="outlined"
    />
  );
}
