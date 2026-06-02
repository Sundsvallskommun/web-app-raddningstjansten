import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { AddCircleOutline, DeleteOutline, InfoOutlined, UploadFileOutlined } from '@mui/icons-material';
import {
  apiService,
  fetchEngagements,
  submitApplication,
  type Engagement,
  type SotningsobjektInput,
} from '@/api/api-service';
import { useAuth } from '@/auth/AuthContext';
import { Wrapper } from '@/components/Wrapper';
import { ObjektInfoDialog } from '@/components/ObjektInfoDialog';

interface ObjektRow {
  typChoice: string; // dropdown selection or 'ANNAT'
  typ: string; // resolved value
  fabrikat: string;
  tillverkningsar: string;
  bransleslag: string;
  branslemangd: string;
  sotningsintervallVeckor: string;
}

const TYP_OPTIONS = ['Braskamin', 'Eldstad', 'Värmepanna'] as const;

const emptyObjekt = (): ObjektRow => ({
  typChoice: '',
  typ: '',
  fabrikat: '',
  tillverkningsar: '',
  bransleslag: '',
  branslemangd: '',
  sotningsintervallVeckor: '',
});

const gridSx = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
  gap: 2,
} as const;

export function ErrandFormPage() {
  const navigate = useNavigate();
  const { user, clear } = useAuth();

  const [engagements, setEngagements] = useState<Engagement[]>([]);

  // Personuppgifter (förifylls från folkbokföringen via Citizen)
  const [firstName, setFirstName] = useState(user?.citizen?.givenname ?? '');
  const [lastName, setLastName] = useState(user?.citizen?.lastname ?? '');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState(user?.citizen?.address ?? '');
  const [zipCode, setZipCode] = useState(user?.citizen?.postalCode ?? '');
  const [city, setCity] = useState(user?.citizen?.city ?? '');

  // Uppgifter om sotningsobjekten
  const [fastighetsbeteckning, setFastighetsbeteckning] = useState(
    user?.citizen?.realEstateDescription ?? '',
  );
  const [objekt, setObjekt] = useState<ObjektRow[]>([emptyObjekt()]);
  const [ovrigt, setOvrigt] = useState('');

  // Bilagor (minst 1 obligatoriskt)
  const [files, setFiles] = useState<File[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [objektInfoOpen, setObjektInfoOpen] = useState(false);

  useEffect(() => {
    fetchEngagements()
      .then(setEngagements)
      .catch(() => setEngagements([]));
  }, []);

  const updateObjekt = (idx: number, field: keyof ObjektRow, value: string) =>
    setObjekt(prev => prev.map((o, i) => (i === idx ? { ...o, [field]: value } : o)));
  const setTypChoice = (idx: number, choice: string) =>
    setObjekt(prev =>
      prev.map((o, i) => (i === idx ? { ...o, typChoice: choice, typ: choice === 'ANNAT' ? '' : choice } : o)),
    );
  const addObjekt = () => setObjekt(prev => [...prev, emptyObjekt()]);
  const removeObjekt = (idx: number) => setObjekt(prev => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  const onFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(prev => [...prev, ...Array.from(e.target.files ?? [])]);
    e.target.value = '';
  };
  const removeFile = (idx: number) => setFiles(prev => prev.filter((_, i) => i !== idx));

  async function logout() {
    await apiService.post('/citizen/logout');
    clear();
    navigate('/', { replace: true });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (objekt.some(o => !o.typ.trim())) {
      setError('Välj eller ange typ för varje sotningsobjekt.');
      return;
    }
    if (files.length === 0) {
      setError('Du måste bifoga minst en fil (t.ex. kursbevis).');
      return;
    }

    setSubmitting(true);
    try {
      const sotningsobjekt: SotningsobjektInput[] = objekt.map(o => ({
        typ: o.typ,
        fabrikat: o.fabrikat || undefined,
        tillverkningsar: o.tillverkningsar ? Number(o.tillverkningsar) : undefined,
        bransleslag: o.bransleslag || undefined,
        branslemangd: o.branslemangd || undefined,
        sotningsintervallVeckor: o.sotningsintervallVeckor ? Number(o.sotningsintervallVeckor) : undefined,
      }));

      await submitApplication(
        {
          applicantEmail: email,
          fastighetsbeteckning,
          propertyAddress: address || undefined,
          applicantFirstName: firstName || undefined,
          applicantLastName: lastName || undefined,
          applicantAddress: address || undefined,
          applicantZipCode: zipCode || undefined,
          applicantCity: city || undefined,
          applicantCountry: 'SE',
          applicantPhone: phone || undefined,
          description: ovrigt || undefined,
          sotningsobjekt,
        },
        files,
      );
      navigate('/errands', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte skicka ansökan.');
    } finally {
      setSubmitting(false);
    }
  }

  const companyEngagements = engagements.filter(e => e.isAuthorizedSignatory || e.isSoleTrader);

  return (
    <Wrapper
      title="Räddningstjänsten Medelpad - Ny ansökan"
      logout={logout}
      color="primary"
      user={user}
      showNav
      navType="citizen"
    >
      <>
        <Box sx={{ maxWidth: 720 }}>
          <Paper sx={{ p: 4 }}>
            <Typography variant="h4" gutterBottom>
              Ansökan om egensotning
            </Typography>
            <Typography color="text.secondary" gutterBottom>
              Fastighetsägare kan få tillstånd att själv sota sin fastighet. Fyll i uppgifterna nedan.
            </Typography>

            {companyEngagements.length > 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Du är firmatecknare/driver eget bolag:{' '}
                {companyEngagements.map(e => e.name).join(', ')}. Den här ansökan görs som privatperson.
              </Alert>
            )}

            {error && (
              <Alert severity="error" sx={{ my: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
              <Stack spacing={2}>
                <Typography variant="h6">Personuppgifter</Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField label="Förnamn" value={firstName} onChange={e => setFirstName(e.target.value)} required fullWidth />
                  <TextField label="Efternamn" value={lastName} onChange={e => setLastName(e.target.value)} required fullWidth />
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField label="E-post" type="email" value={email} onChange={e => setEmail(e.target.value)} required fullWidth />
                  <TextField label="Telefon" value={phone} onChange={e => setPhone(e.target.value)} required fullWidth />
                </Stack>
                <TextField label="Gatuadress" value={address} onChange={e => setAddress(e.target.value)} required fullWidth />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField label="Postnummer" value={zipCode} onChange={e => setZipCode(e.target.value)} fullWidth />
                  <TextField label="Ort" value={city} onChange={e => setCity(e.target.value)} fullWidth />
                </Stack>

                <Divider />

                <Typography variant="h6">Uppgifter om sotningsobjekten</Typography>
                <TextField
                  label="Fastighetsbeteckning"
                  placeholder="t.ex. Sundsvall Stenstaden 1:23"
                  value={fastighetsbeteckning}
                  onChange={e => setFastighetsbeteckning(e.target.value)}
                  required
                  fullWidth
                />

                {objekt.map((o, idx) => (
                  <Card key={idx} variant="outlined">
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                        <Typography variant="subtitle2">Sotningsobjekt {idx + 1}</Typography>
                        {objekt.length > 1 && (
                          <IconButton aria-label="Ta bort objekt" size="small" onClick={() => removeObjekt(idx)}>
                            <DeleteOutline fontSize="small" />
                          </IconButton>
                        )}
                      </Stack>
                      <Box sx={gridSx}>
                        <Box>
                          <Stack direction="row" spacing={0.5} alignItems="flex-start">
                            <TextField
                              select
                              label="Typ"
                              value={o.typChoice}
                              onChange={e => setTypChoice(idx, e.target.value)}
                              required
                              fullWidth
                              size="small"
                            >
                              {TYP_OPTIONS.map(opt => (
                                <MenuItem key={opt} value={opt}>
                                  {opt}
                                </MenuItem>
                              ))}
                              <MenuItem value="ANNAT">Annat…</MenuItem>
                            </TextField>
                            <Tooltip title="Vad är ett objekt?">
                              <IconButton
                                aria-label="Vad är ett objekt?"
                                size="small"
                                sx={{ mt: 0.5 }}
                                onClick={() => setObjektInfoOpen(true)}
                              >
                                <InfoOutlined fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                          {o.typChoice === 'ANNAT' && (
                            <TextField
                              label="Ange typ"
                              value={o.typ}
                              onChange={e => updateObjekt(idx, 'typ', e.target.value)}
                              required
                              fullWidth
                              size="small"
                              sx={{ mt: 1 }}
                              autoFocus
                            />
                          )}
                        </Box>
                        <TextField label="Fabrikat" helperText="t.ex. CTC" value={o.fabrikat} onChange={e => updateObjekt(idx, 'fabrikat', e.target.value)} fullWidth size="small" />
                        <TextField label="Tillverkningsår" type="number" value={o.tillverkningsar} onChange={e => updateObjekt(idx, 'tillverkningsar', e.target.value)} fullWidth size="small" />
                        <TextField label="Bränsleslag" helperText="Ved, pellets, olja…" value={o.bransleslag} onChange={e => updateObjekt(idx, 'bransleslag', e.target.value)} fullWidth size="small" />
                        <TextField label="Bränslemängd/år" helperText="t.ex. 12 m³" value={o.branslemangd} onChange={e => updateObjekt(idx, 'branslemangd', e.target.value)} fullWidth size="small" />
                        <TextField label="Sotningsintervall (veckor)" type="number" value={o.sotningsintervallVeckor} onChange={e => updateObjekt(idx, 'sotningsintervallVeckor', e.target.value)} fullWidth size="small" />
                      </Box>
                    </CardContent>
                  </Card>
                ))}

                <Box>
                  <Button startIcon={<AddCircleOutline />} onClick={addObjekt}>
                    Lägg till sotningsobjekt
                  </Button>
                </Box>

                <TextField
                  label="Övrig information"
                  helperText="Valfritt — t.ex. om du gått egensotningskurs eller annat du vill upplysa om."
                  value={ovrigt}
                  onChange={e => setOvrigt(e.target.value)}
                  multiline
                  rows={3}
                  fullWidth
                />

                <Divider />

                <Typography variant="h6">Bilagor *</Typography>
                <Typography variant="body2" color="text.secondary">
                  Minst en bilaga krävs (t.ex. kopia av kursbevis för genomförd sotningsutbildning).
                  Tillåtna filtyper: pdf, jpg, jpeg, doc, docx.
                </Typography>
                <Box>
                  <Button component="label" variant="outlined" startIcon={<UploadFileOutlined />}>
                    Välj filer
                    <input hidden type="file" multiple accept=".pdf,.jpg,.jpeg,.doc,.docx" onChange={onFilesSelected} />
                  </Button>
                </Box>
                {files.length > 0 && (
                  <Stack spacing={0.5}>
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
                        <IconButton size="small" aria-label="Ta bort fil" onClick={() => removeFile(i)}>
                          <DeleteOutline fontSize="small" />
                        </IconButton>
                      </Stack>
                    ))}
                  </Stack>
                )}

                <Box>
                  <Button type="submit" variant="contained" size="large" disabled={submitting}>
                    {submitting ? <CircularProgress size={24} /> : 'Skicka ansökan'}
                  </Button>
                </Box>
              </Stack>
            </Box>
          </Paper>
        </Box>

        <ObjektInfoDialog open={objektInfoOpen} onClose={() => setObjektInfoOpen(false)} />
      </>
    </Wrapper>
  );
}
