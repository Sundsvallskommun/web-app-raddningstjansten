import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { apiService, createErrand, fetchEngagements, type Engagement } from '@/api/api-service';
import { useAuth } from '@/auth/AuthContext';
import { Wrapper } from '@/components/Wrapper';

export function ErrandFormPage() {
  const navigate = useNavigate();
  const { user, clear } = useAuth();

  const [engagements, setEngagements] = useState<Engagement[]>([]);
  // representation: 'PRIVATE' or an organizationNumber
  const [representation, setRepresentation] = useState<string>('PRIVATE');

  const [firstName, setFirstName] = useState(user?.citizen?.givenname ?? '');
  const [lastName, setLastName] = useState(user?.citizen?.lastname ?? '');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [city, setCity] = useState(user?.citizen?.city ?? '');
  const [description, setDescription] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEngagements()
      .then(setEngagements)
      .catch(() => setEngagements([]));
  }, []);

  async function logout() {
    await apiService.post('/citizen/logout');
    clear();
    navigate('/', { replace: true });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
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

      await createErrand({
        firstName,
        lastName,
        email,
        phone: phone || undefined,
        address,
        zipCode: zipCode || undefined,
        city: city || undefined,
        description,
        representation: rep,
      });
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
      <Box sx={{ maxWidth: 640 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom>
            Ansökan om egensotning
          </Typography>
          <Typography color="text.secondary" gutterBottom>
            Fyll i uppgifterna nedan för att ansöka om att själv få sota din eldstad.
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
                  <RadioGroup
                    value={representation}
                    onChange={e => setRepresentation(e.target.value)}
                  >
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

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Förnamn"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  required
                  fullWidth
                />
                <TextField
                  label="Efternamn"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  required
                  fullWidth
                />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="E-post"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  fullWidth
                />
                <TextField
                  label="Telefon"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  fullWidth
                />
              </Stack>

              <Divider />

              <TextField
                label="Fastighetsadress"
                value={address}
                onChange={e => setAddress(e.target.value)}
                required
                fullWidth
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Postnummer"
                  value={zipCode}
                  onChange={e => setZipCode(e.target.value)}
                  fullWidth
                />
                <TextField label="Ort" value={city} onChange={e => setCity(e.target.value)} fullWidth />
              </Stack>

              <TextField
                label="Beskrivning"
                helperText="Beskriv eldstaden, byggår, hur länge du sotat själv m.m."
                value={description}
                onChange={e => setDescription(e.target.value)}
                required
                multiline
                rows={4}
                fullWidth
              />

              <Box>
                <Button type="submit" variant="contained" size="large" disabled={submitting}>
                  {submitting ? <CircularProgress size={24} /> : 'Skicka ansökan'}
                </Button>
              </Box>
            </Stack>
          </Box>
        </Paper>
      </Box>
    </Wrapper>
  );
}
