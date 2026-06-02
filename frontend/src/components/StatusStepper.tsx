import { Step, StepLabel, Stepper, Typography } from '@mui/material';
import type { StatusHistoryEntry } from '@/api/api-service';
import { statusLabel } from './ErrandStatusChip';

const fmt = (s?: string) => (s ? new Date(s).toLocaleString('sv-SE') : '');

interface Props {
  statusHistory: StatusHistoryEntry[];
  createdAt?: string;
}

/**
 * Vertical stepper showing the path the errand has taken through the process.
 * Step 1 is "Inskickad" (REGISTERED); each subsequent step is a status
 * transition from status-history with its timestamp (and who, if recorded).
 */
export function StatusStepper({ statusHistory, createdAt }: Props) {
  const sorted = [...statusHistory].sort((a, b) => (a.changedAt ?? '').localeCompare(b.changedAt ?? ''));

  const steps = [
    { status: 'REGISTERED', at: createdAt, by: undefined as string | undefined },
    ...sorted.map(h => ({ status: h.toStatus ?? '', at: h.changedAt, by: h.changedBy })),
  ];

  return (
    <Stepper activeStep={steps.length - 1} orientation="vertical">
      {steps.map((s, i) => (
        <Step key={i} completed>
          <StepLabel>
            <Typography>{statusLabel(s.status)}</Typography>
            {(s.at || s.by) && (
              <Typography variant="caption" color="text.secondary">
                {fmt(s.at)}
                {s.by ? ` · ${s.by}` : ''}
              </Typography>
            )}
          </StepLabel>
        </Step>
      ))}
    </Stepper>
  );
}
