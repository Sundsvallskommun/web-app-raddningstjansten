import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { AddCircleOutline, ArrowBack, DeleteOutline, InfoOutlined } from '@mui/icons-material';
import { apiService, type EgensotningUpdateInput, type SotningsobjektInput } from '@/api/api-service';
import { useCitizenErrand, useUpdateErrand } from '@/api/queries';
import { useAuth } from '@/auth/AuthContext';
import { Wrapper } from '@/components/Wrapper';
import { ServiceError } from '@/components/ServiceError';
import { ObjektInfoDialog } from '@/components/ObjektInfoDialog';
import { isUuid } from '@/utils/uuid';
import { apiErrorMessage } from '@/utils/apiError';

interface ObjektRow {
  id?: string;
  typChoice: string;
  typ: string;
  fabrikat: string;
  tillverkningsar: string;
  bransleslag: string;
  branslemangd: string;
  sotningsintervallVeckor: string;
}

const TYP_OPTIONS = ['Braskamin', 'Eldstad', 'Värmepanna'] as const;

const gridSx = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
  gap: 2,
} as const;

const contactValue = (channels: { key?: string; value?: string }[] | undefined, key: string) =>
  channels?.find(c => c.key?.toLowerCase() === key.toLowerCase())?.value ?? '';

const isTerminal = (status?: string) => status === 'DECIDED' || status === 'REJECTED';

export function EditErrandPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, clear } = useAuth();
  const { data, isLoading, isError, error, refetch, isFetching } = useCitizenErrand(id);
  const update = useUpdateErrand(id ?? '');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [city, setCity] = useState('');
  const [fastighetsbeteckning, setFastighetsbeteckning] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [objekt, setObjekt] = useState<ObjektRow[]>([]);
  const [ovrigt, setOvrigt] = useState('');

  const [formError, setFormError] = useState<string | null>(null);
  const [objektInfoOpen, setObjektInfoOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Populate the form once the errand has loaded.
  useEffect(() => {
    if (!data || loaded) return;
    const applicant = data.stakeholders.find(s => s.role === 'APPLICANT') ?? data.stakeholders[0];
    setFirstName(applicant?.firstName ?? '');
    setLastName(applicant?.lastName ?? '');
    setEmail(contactValue(applicant?.contactChannels, 'Email') || data.errand.applicantEmail || '');
    setPhone(contactValue(applicant?.contactChannels, 'Phone'));
    setAddress(applicant?.address ?? '');
    setZipCode(applicant?.zipCode ?? '');
    setCity(applicant?.city ?? '');
    setFastighetsbeteckning(data.details?.fastighetsbeteckning ?? '');
    setPropertyAddress(data.details?.propertyAddress ?? '');
    setOvrigt(data.errand.description ?? '');
    setObjekt(
      (data.sotningsobjekt.length ? data.sotningsobjekt : [{ typ: '' }]).map(o => ({
        id: o.id,
        typChoice: o.typ && (TYP_OPTIONS as readonly string[]).includes(o.typ) ? o.typ : o.typ ? 'ANNAT' : '',
        typ: o.typ ?? '',
        fabrikat: o.fabrikat ?? '',
        tillverkningsar: o.tillverkningsar != null ? String(o.tillverkningsar) : '',
        bransleslag: o.bransleslag ?? '',
        branslemangd: o.branslemangd ?? '',
        sotningsintervallVeckor: o.sotningsintervallVeckor != null ? String(o.sotningsintervallVeckor) : '',
      })),
    );
    setLoaded(true);
  }, [data, loaded]);

  const updateObjekt = (idx: number, field: keyof ObjektRow, value: string) =>
    setObjekt(prev => prev.map((o, i) => (i === idx ? { ...o, [field]: value } : o)));
  const setTypChoice = (idx: number, choice: string) =>
    setObjekt(prev =>
      prev.map((o, i) => (i === idx ? { ...o, typChoice: choice, typ: choice === 'ANNAT' ? '' : choice } : o)),
    );
  const addObjekt = () =>
    setObjekt(prev => [
      ...prev,
      { typChoice: '', typ: '', fabrikat: '', tillverkningsar: '', bransleslag: '', branslemangd: '', sotningsintervallVeckor: '' },
    ]);
  const removeObjekt = (idx: number) =>
    setObjekt(prev => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  async function logout() {
    await apiService.post('/citizen/logout');
    clear();
    navigate('/', { replace: true });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!fastighetsbeteckning.trim()) {
      setFormError('Fastighetsbeteckning är obligatorisk.');
      return;
    }
    if (objekt.some(o => !o.typ.trim())) {
      setFormError('Välj eller ange typ för varje sotningsobjekt.');
      return;
    }

    const sotningsobjekt: SotningsobjektInput[] = objekt.map(o => ({
      id: o.id,
      typ: o.typ,
      fabrikat: o.fabrikat || undefined,
      tillverkningsar: o.tillverkningsar ? Number(o.tillverkningsar) : undefined,
      bransleslag: o.bransleslag || undefined,
      branslemangd: o.branslemangd || undefined,
      sotningsintervallVeckor: o.sotningsintervallVeckor ? Number(o.sotningsintervallVeckor) : undefined,
    }));

    const payload: EgensotningUpdateInput = {
      applicantEmail: email || undefined,
      applicantPhone: phone || undefined,
      applicantFirstName: firstName || undefined,
      applicantLastName: lastName || undefined,
      applicantAddress: address || undefined,
      applicantZipCode: zipCode || undefined,
      applicantCity: city || undefined,
      fastighetsbeteckning,
      propertyAddress: propertyAddress || undefined,
      description: ovrigt || undefined,
      sotningsobjekt,
    };

    try {
      await update.mutateAsync(payload);
      navigate(`/errands/${id}`, { replace: true });
    } catch (err) {
      setFormError(apiErrorMessage(err, 'Kunde inte spara ändringarna.'));
    }
  }

  const terminal = isTerminal(data?.errand.status);

  return (
    <Wrapper
      title="Räddningstjänsten Medelpad - Uppdatera ärende"
      logout={logout}
      color="primary"
      user={user}
      showNav
      navType="citizen"
    >
      <Box sx={{ maxWidth: 720 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate(`/errands/${id}`)} sx={{ mb: 2 }}>
          Tillbaka till ärendet
        </Button>

        {!isUuid(id) ? (
          <Typography>Ogiltigt ärende.</Typography>
        ) : isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : isError ? (
          <ServiceError error={error} onRetry={() => refetch()} isRetrying={isFetching} />
        ) : !data ? (
          <Typography>Ärendet kunde inte hämtas.</Typography>
        ) : terminal ? (
          <Alert severity="info">Ärendet är avslutat och kan inte längre uppdateras.</Alert>
        ) : (
          <Paper sx={{ p: 4 }}>
            <Typography variant="h4" gutterBottom>
              Uppdatera ärende
            </Typography>
            <Typography color="text.secondary" gutterBottom>
              Du kan ändra uppgifterna så länge ärendet inte är avgjort. Bilagor hanteras via
              komplettering på ärendesidan.
            </Typography>

            {formError && (
              <Alert severity="error" sx={{ my: 2 }}>
                {formError}
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
                <TextField label="Gatuadress" value={address} onChange={e => setAddress(e.target.value)} fullWidth />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField label="Postnummer" value={zipCode} onChange={e => setZipCode(e.target.value)} fullWidth />
                  <TextField label="Ort" value={city} onChange={e => setCity(e.target.value)} fullWidth />
                </Stack>

                <Divider />

                <Typography variant="h6">Uppgifter om sotningsobjekten</Typography>
                <TextField
                  label="Fastighetsbeteckning"
                  value={fastighetsbeteckning}
                  onChange={e => setFastighetsbeteckning(e.target.value)}
                  required
                  fullWidth
                />
                <TextField
                  label="Fastighetsadress"
                  value={propertyAddress}
                  onChange={e => setPropertyAddress(e.target.value)}
                  fullWidth
                />

                {objekt.map((o, idx) => (
                  <Card key={o.id ?? idx} variant="outlined">
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
                            />
                          )}
                        </Box>
                        <TextField label="Fabrikat" value={o.fabrikat} onChange={e => updateObjekt(idx, 'fabrikat', e.target.value)} fullWidth size="small" />
                        <TextField label="Tillverkningsår" type="number" value={o.tillverkningsar} onChange={e => updateObjekt(idx, 'tillverkningsar', e.target.value)} fullWidth size="small" />
                        <TextField label="Bränsleslag" value={o.bransleslag} onChange={e => updateObjekt(idx, 'bransleslag', e.target.value)} fullWidth size="small" />
                        <TextField label="Bränslemängd/år" value={o.branslemangd} onChange={e => updateObjekt(idx, 'branslemangd', e.target.value)} fullWidth size="small" />
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
                  value={ovrigt}
                  onChange={e => setOvrigt(e.target.value)}
                  multiline
                  rows={3}
                  fullWidth
                />

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button type="submit" variant="contained" size="large" disabled={update.isPending}>
                    {update.isPending ? <CircularProgress size={24} /> : 'Spara ändringar'}
                  </Button>
                  <Button size="large" onClick={() => navigate(`/errands/${id}`)} disabled={update.isPending}>
                    Avbryt
                  </Button>
                </Box>
              </Stack>
            </Box>
          </Paper>
        )}

        <ObjektInfoDialog open={objektInfoOpen} onClose={() => setObjektInfoOpen(false)} />
      </Box>
    </Wrapper>
  );
}
