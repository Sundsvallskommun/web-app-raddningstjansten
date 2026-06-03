import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { DownloadOutlined } from '@mui/icons-material';
import { adminDecisionPdfUrl, citizenDecisionPdfUrl } from '@/api/api-service';

interface Props {
  errandId: string;
  role: 'citizen' | 'admin';
}

/**
 * "Beslut" card with an inline PDF viewer (browser-native via <iframe>) plus a
 * download link. The BFF serves the stored or on-demand-rendered decision PDF.
 */
export function DecisionPdfCard({ errandId, role }: Props) {
  const url = role === 'admin' ? adminDecisionPdfUrl(errandId) : citizenDecisionPdfUrl(errandId);

  return (
    <Paper sx={{ p: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="h6">Beslut</Typography>
        <Button component="a" href={url} download startIcon={<DownloadOutlined />}>
          Ladda ner
        </Button>
      </Stack>
      <Box
        component="iframe"
        title="Beslut (PDF)"
        src={url}
        sx={{ width: '100%', height: '70vh', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
      />
    </Paper>
  );
}
