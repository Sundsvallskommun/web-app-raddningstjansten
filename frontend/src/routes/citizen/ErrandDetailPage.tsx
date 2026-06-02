import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { ArrowBack, DeleteOutline, DownloadOutlined, UploadFileOutlined } from '@mui/icons-material';
import {
  apiService,
  citizenAttachmentDownloadUrl,
  fetchCitizenErrand,
  supplementErrand,
  type ErrandDetail,
} from '@/api/api-service';
import { useAuth } from '@/auth/AuthContext';
import { Wrapper } from '@/components/Wrapper';
import { ErrandStatusChip } from '@/components/ErrandStatusChip';
import { StatusStepper } from '@/components/StatusStepper';
import { markSeen } from '@/utils/seenErrands';
import { outcomeMessage } from '@/utils/egensotning';

const fmt = (s?: string) => (s ? new Date(s).toLocaleString('sv-SE') : '—');

export function CitizenErrandDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, clear } = useAuth();
  const [data, setData] = useState<ErrandDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Komplettering
  const [files, setFiles] = useState<File[]>([]);
  const [supplementing, setSupplementing] = useState(false);
  const [supplementMsg, setSupplementMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const d = await fetchCitizenErrand(id);
      setData(d);
      markSeen(d.errand.id, d.errand.modified);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function logout() {
    await apiService.post('/citizen/logout');
    clear();
    navigate('/', { replace: true });
  }

  const onFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(prev => [...prev, ...Array.from(e.target.files ?? [])]);
    e.target.value = '';
  };

  async function sendSupplement() {
    if (!id || files.length === 0) return;
    setSupplementing(true);
    setSupplementMsg(null);
    try {
      await supplementErrand(id, files);
      setFiles([]);
      setSupplementMsg('Kompletteringen är inskickad. Ärendet granskas på nytt.');
      await load();
    } catch (err) {
      setSupplementMsg(err instanceof Error ? err.message : 'Kunde inte skicka kompletteringen.');
    } finally {
      setSupplementing(false);
    }
  }

  const outcome = data ? outcomeMessage(data.details) : null;
  const needsSupplement = data?.errand.status === 'AWAITING_SUPPLEMENTATION';

  return (
    <Wrapper
      title="Räddningstjänsten Medelpad - Ärende"
      logout={logout}
      color="primary"
      user={user}
      showNav
      navType="citizen"
    >
      <Box>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/errands')} sx={{ mb: 2 }}>
          Mina ärenden
        </Button>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : !data ? (
          <Typography>Ärendet kunde inte hämtas.</Typography>
        ) : (
          <Stack spacing={2}>
            <Paper sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="h5">{data.errand.title}</Typography>
                <ErrandStatusChip status={data.errand.status} />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {data.errand.errandNumber ?? data.errand.id} · inskickad {fmt(data.errand.created)}
              </Typography>
              {outcome && (
                <Alert severity={outcome.severity} sx={{ mt: 2 }}>
                  {outcome.text}
                </Alert>
              )}
            </Paper>

            {needsSupplement && (
              <Paper sx={{ p: 3, borderColor: 'warning.main', borderWidth: 1, borderStyle: 'solid' }}>
                <Typography variant="h6" gutterBottom>
                  Komplettera ärendet
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {data.details?.bilagaPresent === false
                    ? 'En bilaga saknas. Ladda upp efterfrågat dokument (t.ex. kursbevis) nedan.'
                    : 'Ladda upp de dokument som efterfrågats så granskas ärendet på nytt.'}
                </Typography>
                {supplementMsg && (
                  <Alert severity="info" sx={{ my: 1 }}>
                    {supplementMsg}
                  </Alert>
                )}
                <Box sx={{ mt: 1 }}>
                  <Button component="label" variant="outlined" startIcon={<UploadFileOutlined />}>
                    Välj filer
                    <input hidden type="file" multiple accept=".pdf,.jpg,.jpeg,.doc,.docx" onChange={onFilesSelected} />
                  </Button>
                </Box>
                {files.length > 0 && (
                  <Stack spacing={0.5} sx={{ mt: 1 }}>
                    {files.map((f, i) => (
                      <Stack
                        key={`${f.name}-${i}`}
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, px: 1.5, py: 0.5 }}
                      >
                        <Typography variant="body2" noWrap sx={{ mr: 1 }}>
                          {f.name} ({Math.round(f.size / 1024)} kB)
                        </Typography>
                        <IconButton
                          size="small"
                          aria-label="Ta bort fil"
                          onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                        >
                          <DeleteOutline fontSize="small" />
                        </IconButton>
                      </Stack>
                    ))}
                  </Stack>
                )}
                <Box sx={{ mt: 2 }}>
                  <Button variant="contained" disabled={supplementing || files.length === 0} onClick={sendSupplement}>
                    {supplementing ? <CircularProgress size={24} /> : 'Skicka komplettering'}
                  </Button>
                </Box>
              </Paper>
            )}

            <Typography variant="h6">Handläggning</Typography>
            <Paper sx={{ p: 2 }}>
              <StatusStepper statusHistory={data.statusHistory} createdAt={data.errand.created} />
            </Paper>

            <Typography variant="h6">Sotningsobjekt</Typography>
            {data.sotningsobjekt.length === 0 ? (
              <Typography color="text.secondary">Inga objekt registrerade.</Typography>
            ) : (
              data.sotningsobjekt.map(o => (
                <Card key={o.id} variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1">{o.typ}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {[
                        o.fabrikat,
                        o.tillverkningsar,
                        o.bransleslag,
                        o.branslemangd,
                        o.sotningsintervallVeckor ? `var ${o.sotningsintervallVeckor}:e vecka` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Typography>
                  </CardContent>
                </Card>
              ))
            )}

            <Typography variant="h6">Bilagor</Typography>
            {data.attachments.length === 0 ? (
              <Typography color="text.secondary">Inga bilagor.</Typography>
            ) : (
              <Stack spacing={1}>
                {data.attachments.map(a => (
                  <Card key={a.id} variant="outlined">
                    <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, '&:last-child': { pb: 2 } }}>
                      <Typography noWrap>{a.fileName ?? a.id}</Typography>
                      <Button href={citizenAttachmentDownloadUrl(id!, a.id!)} download startIcon={<DownloadOutlined />} sx={{ flexShrink: 0 }}>
                        Ladda ner
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}

            {data.decisions.length > 0 && (
              <>
                <Divider />
                <Typography variant="h6">Beslut</Typography>
                {data.decisions.map(d => (
                  <Card key={d.id} variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1">{d.value ?? d.decisionType}</Typography>
                      {d.description && <Typography variant="body2">{d.description}</Typography>}
                      <Typography variant="caption" color="text.secondary">
                        {fmt(d.created)}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </Stack>
        )}
      </Box>
    </Wrapper>
  );
}
