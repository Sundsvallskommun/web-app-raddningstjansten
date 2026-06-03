import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { CheckCircleOutline, CancelOutlined, EditOutlined, RefreshOutlined } from '@mui/icons-material';
import { decisionPreview } from '@/api/api-service';
import { useAdminDecision } from '@/api/queries';

interface Props {
  errandId: string;
  /** true = approve, false = reject, null = closed. */
  approved: boolean | null;
  onClose: () => void;
  onConfirmed?: () => void;
}

/**
 * Confirmation dialog for a manual decision. Shows the rendered decision template
 * (preview), lets the handläggare add/edit a free "Beslutstext", and confirm
 * (Godkänn/Avslå) or cancel. The structure of the document is fixed; only the
 * decision text is editable.
 */
export function DecisionDialog({ errandId, approved, onClose, onConfirmed }: Props) {
  const open = approved !== null;
  const decision = useAdminDecision(errandId);
  const [html, setHtml] = useState('');
  const [decisionText, setDecisionText] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPreview = useCallback(
    async (text: string) => {
      if (approved === null) return;
      setLoadingPreview(true);
      setError(null);
      try {
        const res = await decisionPreview(errandId, approved, text || undefined);
        setHtml(res.html);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Kunde inte rendera beslutsmallen.');
      } finally {
        setLoadingPreview(false);
      }
    },
    [approved, errandId],
  );

  // Reset state and load a fresh preview each time the dialog opens.
  useEffect(() => {
    if (open) {
      setDecisionText('');
      setEditMode(false);
      setHtml('');
      void loadPreview('');
    }
  }, [open, loadPreview]);

  async function confirm() {
    if (approved === null) return;
    setError(null);
    try {
      await decision.mutateAsync({ approved, decisionText: decisionText || undefined });
      onConfirmed?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Beslutet kunde inte registreras.');
    }
  }

  const confirmColor = approved ? 'success' : 'error';
  const confirmLabel = approved ? 'Godkänn' : 'Avslå';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{approved ? 'Godkänn ansökan' : 'Avslå ansökan'} — beslut</DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {editMode && (
          <Stack spacing={1} sx={{ mb: 2 }}>
            <TextField
              label="Beslutstext (valfri motivering)"
              value={decisionText}
              onChange={e => setDecisionText(e.target.value)}
              multiline
              minRows={3}
              fullWidth
            />
            <Box>
              <Button
                startIcon={<RefreshOutlined />}
                onClick={() => loadPreview(decisionText)}
                disabled={loadingPreview}
              >
                Uppdatera förhandsgranskning
              </Button>
            </Box>
          </Stack>
        )}

        <Typography variant="caption" color="text.secondary">
          Förhandsgranskning av beslutet
        </Typography>
        <Box sx={{ position: 'relative', mt: 0.5 }}>
          {loadingPreview && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
              <CircularProgress />
            </Box>
          )}
          {!loadingPreview && (
            <Box
              component="iframe"
              title="Förhandsgranskning av beslut"
              srcDoc={html}
              sandbox=""
              sx={{ width: '100%', height: '60vh', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
            />
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button startIcon={<CancelOutlined />} onClick={onClose} disabled={decision.isPending}>
          Avbryt
        </Button>
        <Box sx={{ flex: 1 }} />
        {!editMode && (
          <Button startIcon={<EditOutlined />} onClick={() => setEditMode(true)} disabled={decision.isPending}>
            Redigera
          </Button>
        )}
        <Button
          variant="contained"
          color={confirmColor}
          startIcon={approved ? <CheckCircleOutline /> : <CancelOutlined />}
          onClick={confirm}
          disabled={decision.isPending || loadingPreview}
        >
          {decision.isPending ? <CircularProgress size={24} /> : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
