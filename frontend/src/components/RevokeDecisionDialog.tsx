import { useState } from "react";
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import { useRevokeDecision } from "@/api/queries";

/**
 * Admin (editor) revokes a granted egensotning. Requires a free-text reason,
 * which is stored on the errand (revocationReason) and recorded in the log.
 */
export function RevokeDecisionDialog({
  errandId,
  open,
  onClose,
  onRevoked,
}: {
  errandId: string;
  open: boolean;
  onClose: () => void;
  onRevoked?: () => void;
}) {
  const revoke = useRevokeDecision(errandId);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function close() {
    if (revoke.isPending) return;
    setReason("");
    setError(null);
    onClose();
  }

  async function confirm() {
    if (!reason.trim()) {
      setError("Ange en anledning.");
      return;
    }
    setError(null);
    try {
      await revoke.mutateAsync(reason.trim());
      setReason("");
      onRevoked?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunde inte återkalla beslutet.");
    }
  }

  return (
    <Dialog open={open} onClose={close} maxWidth='xs' fullWidth>
      <DialogTitle>Återkalla beslut</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity='error' sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
          Detta återkallar den beviljade egensotningen. Ange en anledning som
          dokumenteras på ärendet.
        </Typography>
        <TextField
          label='Anledning'
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={revoke.isPending}
          fullWidth
          multiline
          rows={3}
          autoFocus
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={close} disabled={revoke.isPending}>
          Avbryt
        </Button>
        <Button
          variant='contained'
          color='error'
          onClick={confirm}
          disabled={revoke.isPending}
        >
          {revoke.isPending ? <CircularProgress size={24} /> : "Återkalla"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
