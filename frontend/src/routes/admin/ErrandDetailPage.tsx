import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { ArrowBack, DownloadOutlined } from '@mui/icons-material';

const gridSx = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr' },
  gap: 2,
} as const;
import {
  attachmentDownloadUrl,
  fetchAttachments,
  fetchErrand,
  fetchStakeholders,
  type Attachment,
  type Errand,
  type Stakeholder,
} from '@/api/api-service';
import { useAuth } from '@/auth/AuthContext';
import { Wrapper } from '@/components/Wrapper';
import { ErrandStatusChip } from '@/components/ErrandStatusChip';

const fmt = (s?: string) => (s ? new Date(s).toLocaleString('sv-SE') : '—');

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography>{value || '—'}</Typography>
    </Box>
  );
}

export function ErrandDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [errand, setErrand] = useState<Errand | null>(null);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetchErrand(id),
      fetchStakeholders(id).catch(() => []),
      fetchAttachments(id).catch(() => []),
    ])
      .then(([e, s, a]) => {
        setErrand(e);
        setStakeholders(s);
        setAttachments(a);
      })
      .catch(() => setErrand(null))
      .finally(() => setLoading(false));
  }, [id]);

  function logout() {
    window.location.href = '/api/saml/logout';
  }

  return (
    <Wrapper
      title="Räddningstjänsten Medelpad - Ärende"
      logout={logout}
      color="secondary"
      user={user}
      showNav
      navType="admin"
    >
      <Box>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/admin/errands')} sx={{ mb: 2 }}>
          Tillbaka
        </Button>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : !errand ? (
          <Typography>Ärendet kunde inte hämtas.</Typography>
        ) : (
          <Stack spacing={2}>
            <Paper sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="h5">{errand.title}</Typography>
                <ErrandStatusChip status={errand.status} />
              </Stack>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {errand.errandNumber ?? errand.id}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Box sx={gridSx}>
                <Field label="Typ" value={errand.typeSlug} />
                <Field label="Prioritet" value={errand.priority} />
                <Field label="Sökandes e-post" value={errand.applicantEmail} />
                <Field label="Rapportör" value={errand.reporterUserId} />
                <Field label="Handläggare" value={errand.assignedUserId} />
                <Field label="Inskickat" value={fmt(errand.created)} />
              </Box>
              <Divider sx={{ my: 2 }} />
              <Field label="Beskrivning" value={errand.description} />
            </Paper>

            <Typography variant="h6">Intressenter</Typography>
            {stakeholders.length === 0 ? (
              <Typography color="text.secondary">Inga intressenter registrerade.</Typography>
            ) : (
              stakeholders.map(s => (
                <Card key={s.id} variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1">
                      {s.organizationName || `${s.firstName ?? ''} ${s.lastName ?? ''}`.trim() || '—'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" gutterBottom>
                      {s.role} · {s.externalIdType}
                    </Typography>
                    <Box sx={{ ...gridSx, mt: 0.5 }}>
                      <Field label="Adress" value={s.address} />
                      <Field label="Postnr" value={s.zipCode} />
                      <Field label="Ort" value={s.city} />
                      {s.contactChannels?.map((c, i) => (
                        <Field key={i} label={c.key ?? 'Kontakt'} value={c.value} />
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              ))
            )}

            <Typography variant="h6">Bilagor</Typography>
            {attachments.length === 0 ? (
              <Typography color="text.secondary">Inga bilagor.</Typography>
            ) : (
              <Stack spacing={1}>
                {attachments.map(a => (
                  <Card key={a.id} variant="outlined">
                    <CardContent
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 2,
                        '&:last-child': { pb: 2 },
                      }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography noWrap>{a.fileName ?? a.id}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {[a.mimeType, a.fileSize ? `${Math.round(a.fileSize / 1024)} kB` : null]
                            .filter(Boolean)
                            .join(' · ')}
                        </Typography>
                      </Box>
                      <Button
                        href={attachmentDownloadUrl(id!, a.id!)}
                        download
                        startIcon={<DownloadOutlined />}
                        sx={{ flexShrink: 0 }}
                      >
                        Ladda ner
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </Stack>
        )}
      </Box>
    </Wrapper>
  );
}
