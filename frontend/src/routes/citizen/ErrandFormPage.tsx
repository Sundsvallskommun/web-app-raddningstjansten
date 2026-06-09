import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  Divider,
  FormControlLabel,
  FormGroup,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { AddCircleOutline, DeleteOutline, InfoOutlined, UploadFileOutlined } from '@mui/icons-material';
import { apiService, type SotningsobjektInput } from '@/api/api-service';
import { useEngagements, useSubmitApplication } from '@/api/queries';
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

/** One of the two required, typed attachment slots (BSK / utbildningsintyg). */
function AttachmentSlot({
  title,
  description,
  file,
  onPick,
  onClear,
}: {
  title: string;
  description: string;
  file: File | null;
  onPick: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
}) {
  return (
    <Card variant="outlined" sx={{ flex: 1 }}>
      <CardContent>
        <Typography variant="subtitle1" gutterBottom>
          {title} *
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: { sm: 40 } }}>
          {description}
        </Typography>
        <Button
          component="label"
          variant={file ? 'outlined' : 'contained'}
          startIcon={<UploadFileOutlined />}
          fullWidth
        >
          {file ? 'Byt fil' : 'Välj fil'}
          <input hidden type="file" accept=".pdf,.jpg,.jpeg,.doc,.docx" onChange={onPick} />
        </Button>
        {file && (
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mt: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1, px: 1.5, py: 0.5 }}
          >
            <Typography variant="body2" noWrap sx={{ mr: 1 }}>
              {file.name} ({Math.round(file.size / 1024)} kB)
            </Typography>
            <IconButton size="small" aria-label="Ta bort fil" onClick={onClear}>
              <DeleteOutline fontSize="small" />
            </IconButton>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

export function ErrandFormPage() {
  const navigate = useNavigate();
  const { user, clear } = useAuth();

  const { data: engagements = [] } = useEngagements();
  const submit = useSubmitApplication();

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
  // Ägandedeklaration (påverkar verifiering/manuell granskning hos rtj).
  const [ownsProperty, setOwnsProperty] = useState(true);
  const [appliesForOtherProperty, setAppliesForOtherProperty] = useState(false);
  const [ownershipMotivation, setOwnershipMotivation] = useState('');
  const [objekt, setObjekt] = useState<ObjektRow[]>([emptyObjekt()]);
  const [ovrigt, setOvrigt] = useState('');

  // Bilagor: två obligatoriska, typade dokument
  const [brandskyddskontroll, setBrandskyddskontroll] = useState<File | null>(null);
  const [utbildningsintyg, setUtbildningsintyg] = useState<File | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [objektInfoOpen, setObjektInfoOpen] = useState(false);

  const updateObjekt = (idx: number, field: keyof ObjektRow, value: string) =>
    setObjekt(prev => prev.map((o, i) => (i === idx ? { ...o, [field]: value } : o)));
  const setTypChoice = (idx: number, choice: string) =>
    setObjekt(prev =>
      prev.map((o, i) => (i === idx ? { ...o, typChoice: choice, typ: choice === 'ANNAT' ? '' : choice } : o)),
    );
  const addObjekt = () => setObjekt(prev => [...prev, emptyObjekt()]);
  const removeObjekt = (idx: number) => setObjekt(prev => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  const pickFile = (setter: (f: File | null) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.files?.[0] ?? null);
    e.target.value = '';
  };

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
    if (!brandskyddskontroll || !utbildningsintyg) {
      setError('Du måste bifoga både brandskyddskontroll och utbildningsintyg.');
      return;
    }

    const sotningsobjekt: SotningsobjektInput[] = objekt.map(o => ({
      typ: o.typ,
      fabrikat: o.fabrikat || undefined,
      tillverkningsar: o.tillverkningsar ? Number(o.tillverkningsar) : undefined,
      bransleslag: o.bransleslag || undefined,
      branslemangd: o.branslemangd || undefined,
      sotningsintervallVeckor: o.sotningsintervallVeckor ? Number(o.sotningsintervallVeckor) : undefined,
    }));

    try {
      await submit.mutateAsync({
        application: {
          applicantEmail: email,
          fastighetsbeteckning,
          propertyAddress: address || undefined,
          ownsProperty,
          appliesForOtherProperty,
          ownershipMotivation: ownershipMotivation || undefined,
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
        attachments: { brandskyddskontroll, utbildningsintyg },
      });
      navigate('/errands', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte skicka ansökan.');
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

                <FormGroup>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={ownsProperty}
                        onChange={e => setOwnsProperty(e.target.checked)}
                      />
                    }
                    label="Jag äger fastigheten"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={appliesForOtherProperty}
                        onChange={e => setAppliesForOtherProperty(e.target.checked)}
                      />
                    }
                    label="Ansökan avser någon annans fastighet"
                  />
                </FormGroup>
                {(!ownsProperty || appliesForOtherProperty) && (
                  <TextField
                    label="Koppling till fastigheten"
                    helperText="Beskriv din koppling till fastigheten, t.ex. delägare eller fullmakt."
                    value={ownershipMotivation}
                    onChange={e => setOwnershipMotivation(e.target.value)}
                    multiline
                    rows={2}
                    fullWidth
                  />
                )}

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
                  Två dokument krävs för en egensotningsansökan. Tillåtna filtyper: pdf, jpg, jpeg,
                  doc, docx.
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <AttachmentSlot
                    title="Brandskyddskontroll (BSK)"
                    description="Senaste protokoll från brandskyddskontroll av anläggningen."
                    file={brandskyddskontroll}
                    onPick={pickFile(setBrandskyddskontroll)}
                    onClear={() => setBrandskyddskontroll(null)}
                  />
                  <AttachmentSlot
                    title="Utbildningsintyg"
                    description="Intyg eller kursbevis för genomförd egensotningsutbildning."
                    file={utbildningsintyg}
                    onPick={pickFile(setUtbildningsintyg)}
                    onClear={() => setUtbildningsintyg(null)}
                  />
                </Stack>

                <Box>
                  <Button type="submit" variant="contained" size="large" disabled={submit.isPending}>
                    {submit.isPending ? <CircularProgress size={24} /> : 'Skicka ansökan'}
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
