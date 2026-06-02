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
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { AddCircleOutline, DeleteOutline, InfoOutlined, UploadFileOutlined } from '@mui/icons-material';
import {
  apiService,
  createErrand,
  fetchEngagements,
  uploadAttachment,
  type Engagement,
} from '@/api/api-service';
import { useAuth } from '@/auth/AuthContext';
import { Wrapper } from '@/components/Wrapper';
import { ObjektInfoDialog } from '@/components/ObjektInfoDialog';

interface Eldstad {
  /** Dropdown selection: a preset value or the 'ANNAT' sentinel. */
  objektChoice: string;
  /** Resolved object value (the preset, or the free-text when 'Annat…'). */
  objekt: string;
  fabrikat: string;
  typ: string;
  tillverkningsar: string;
  bransletyp: string;
  branslemangd: string;
}

const OBJEKT_OPTIONS = ['Braskamin', 'Eldstad', 'Värmepanna'] as const;

const emptyEldstad = (): Eldstad => ({
  objektChoice: '',
  objekt: '',
  fabrikat: '',
  typ: '',
  tillverkningsar: '',
  bransletyp: '',
  branslemangd: '',
});

const eldstadGridSx = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
  gap: 2,
} as const;

/** Compose the free-text description the rtj-management errand stores. */
function buildDescription(
  fastighetsbeteckning: string,
  eldstader: Eldstad[],
  ovrigt: string,
): string {
  const lines: string[] = [`Fastighetsbeteckning: ${fastighetsbeteckning}`, '', 'Eldstäder:'];
  eldstader.forEach((e, i) => {
    lines.push(
      `${i + 1}. Objekt: ${e.objekt} | Fabrikat: ${e.fabrikat} | Typ: ${e.typ} | ` +
        `Tillverkningsår: ${e.tillverkningsar} | Bränsletyp: ${e.bransletyp} | ` +
        `Bränslemängd/år: ${e.branslemangd} m³`,
    );
  });
  if (ovrigt.trim()) {
    lines.push('', `Övrigt: ${ovrigt.trim()}`);
  }
  return lines.join('\n');
}

export function ErrandFormPage() {
  const navigate = useNavigate();
  const { user, clear } = useAuth();

  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [representation, setRepresentation] = useState<string>('PRIVATE');

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
  const [eldstader, setEldstader] = useState<Eldstad[]>([emptyEldstad()]);
  const [ovrigt, setOvrigt] = useState('');

  // Bilagor
  const [files, setFiles] = useState<File[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [objektInfoOpen, setObjektInfoOpen] = useState(false);

  const onFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    setFiles(prev => [...prev, ...selected]);
    e.target.value = ''; // allow re-selecting the same file
  };
  const removeFile = (idx: number) => setFiles(prev => prev.filter((_, i) => i !== idx));

  useEffect(() => {
    fetchEngagements()
      .then(setEngagements)
      .catch(() => setEngagements([]));
  }, []);

  const updateEldstad = (idx: number, field: keyof Eldstad, value: string) =>
    setEldstader(prev => prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e)));
  // Dropdown change: preset sets objekt directly; 'ANNAT' clears it for free text.
  const setObjektChoice = (idx: number, choice: string) =>
    setEldstader(prev =>
      prev.map((e, i) =>
        i === idx ? { ...e, objektChoice: choice, objekt: choice === 'ANNAT' ? '' : choice } : e,
      ),
    );
  const addEldstad = () => setEldstader(prev => [...prev, emptyEldstad()]);
  const removeEldstad = (idx: number) =>
    setEldstader(prev => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  async function logout() {
    await apiService.post('/citizen/logout');
    clear();
    navigate('/', { replace: true });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (eldstader.some(el => !el.objekt.trim())) {
      setError('Välj eller ange ett objekt för varje eldstad.');
      return;
    }

    setSubmitting(true);
    try {
      const chosen = engagements.find(en => en.organizationNumber === representation);
      const rep =
        representation === 'PRIVATE' || !chosen
          ? ({ type: 'PRIVATE' } as const)
          : ({
              type: 'COMPANY',
              organizationNumber: chosen.organizationNumber,
              organizationName: chosen.name,
            } as const);

      const { id } = await createErrand({
        firstName,
        lastName,
        email,
        phone: phone || undefined,
        address,
        zipCode: zipCode || undefined,
        city: city || undefined,
        description: buildDescription(fastighetsbeteckning, eldstader, ovrigt),
        representation: rep,
      });

      // Upload each document as its own request (not a batch).
      const failed: string[] = [];
      for (const file of files) {
        try {
          await uploadAttachment(id, file);
        } catch {
          failed.push(file.name);
        }
      }
      if (failed.length > 0) {
        setError(
          `Ansökan skapades, men dessa bilagor kunde inte laddas upp: ${failed.join(', ')}. ` +
            'Du kan försöka igen senare.',
        );
        setSubmitting(false);
        return;
      }

      navigate('/errands', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte skicka ansökan.');
    } finally {
      setSubmitting(false);
    }
  }

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

          {error && (
            <Alert severity="error" sx={{ my: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <Stack spacing={2}>
              {engagements.length > 0 && (
                <FormControl>
                  <FormLabel>Jag ansöker som</FormLabel>
                  <RadioGroup value={representation} onChange={e => setRepresentation(e.target.value)}>
                    <FormControlLabel value="PRIVATE" control={<Radio />} label="Privatperson" />
                    {engagements.map(en => (
                      <FormControlLabel
                        key={en.organizationNumber}
                        value={en.organizationNumber}
                        control={<Radio />}
                        label={`${en.name} (${en.organizationNumber})`}
                      />
                    ))}
                  </RadioGroup>
                </FormControl>
              )}

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
                placeholder="Ange din fastighetsbeteckning"
                value={fastighetsbeteckning}
                onChange={e => setFastighetsbeteckning(e.target.value)}
                required
                fullWidth
              />

              <Typography variant="subtitle1">Eldstäder</Typography>
              <Typography variant="body2" color="text.secondary">
                Fyll i uppgifter för de eldstäder som finns i fastigheten. Bränslemängd/år anges i
                kubikmeter och används för att bedöma hur ofta eldstaden behöver rengöras.
              </Typography>

              {eldstader.map((el, idx) => (
                <Card key={idx} variant="outlined">
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                      <Typography variant="subtitle2">Eldstad {idx + 1}</Typography>
                      {eldstader.length > 1 && (
                        <IconButton aria-label="Ta bort eldstad" size="small" onClick={() => removeEldstad(idx)}>
                          <DeleteOutline fontSize="small" />
                        </IconButton>
                      )}
                    </Stack>
                    <Box sx={eldstadGridSx}>
                      <Box>
                        <Stack direction="row" spacing={0.5} alignItems="flex-start">
                          <TextField
                            select
                            label="Objekt"
                            value={el.objektChoice}
                            onChange={e => setObjektChoice(idx, e.target.value)}
                            required
                            fullWidth
                            size="small"
                          >
                            {OBJEKT_OPTIONS.map(opt => (
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
                        {el.objektChoice === 'ANNAT' && (
                          <TextField
                            label="Ange objekt"
                            value={el.objekt}
                            onChange={e => updateEldstad(idx, 'objekt', e.target.value)}
                            required
                            fullWidth
                            size="small"
                            sx={{ mt: 1 }}
                            autoFocus
                          />
                        )}
                      </Box>
                      <TextField label="Fabrikat" helperText="Märke och gärna modell" value={el.fabrikat} onChange={e => updateEldstad(idx, 'fabrikat', e.target.value)} required fullWidth size="small" />
                      <TextField label="Typ" helperText="T.ex. pelletspanna, vedpanna, kamin" value={el.typ} onChange={e => updateEldstad(idx, 'typ', e.target.value)} required fullWidth size="small" />
                      <TextField label="Tillverkningsår" value={el.tillverkningsar} onChange={e => updateEldstad(idx, 'tillverkningsar', e.target.value)} required fullWidth size="small" />
                      <TextField label="Bränsletyp" helperText="Ved, pellets, olja eller liknande" value={el.bransletyp} onChange={e => updateEldstad(idx, 'bransletyp', e.target.value)} required fullWidth size="small" />
                      <TextField label="Bränslemängd/år (m³)" value={el.branslemangd} onChange={e => updateEldstad(idx, 'branslemangd', e.target.value)} required fullWidth size="small" />
                    </Box>
                  </CardContent>
                </Card>
              ))}

              <Box>
                <Button startIcon={<AddCircleOutline />} onClick={addEldstad}>
                  Lägg till eldstad
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

              <Typography variant="h6">Bilagor</Typography>
              <Typography variant="body2" color="text.secondary">
                Bifoga t.ex. kopia av kursbevis för genomförd sotningsutbildning. Tillåtna filtyper:
                pdf, jpg, jpeg, doc, docx. Varje fil laddas upp separat.
              </Typography>
              <Box>
                <Button component="label" variant="outlined" startIcon={<UploadFileOutlined />}>
                  Välj filer
                  <input
                    hidden
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.doc,.docx"
                    onChange={onFilesSelected}
                  />
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
