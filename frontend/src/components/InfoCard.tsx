import { Card, CardContent, Stack, Typography, Divider } from '@mui/material';
import type { Me } from '@/api/api-service';

/**
 * Shows the masked, Citizen-sourced data for the logged-in user.
 * Used by both the citizen and admin dashboards.
 */
export function InfoCard({ me }: { me: Me }) {
  const c = me.citizen;
  const fullName = c?.givenname || c?.lastname ? `${c?.givenname ?? ''} ${c?.lastname ?? ''}`.trim() : me.name;

  return (
    <Card variant="outlined" sx={{ maxWidth: 520 }}>
      <CardContent>
        <Typography variant="overline" color="text.secondary">
          Inloggad som {me.type === 'admin' ? 'administratör' : 'medborgare'}
        </Typography>
        <Typography variant="h5" gutterBottom>
          {fullName}
        </Typography>
        <Divider sx={{ my: 1.5 }} />
        <Stack spacing={1}>
          <Row label="Personnummer" value={me.maskedPersonNumber ?? '—'} />
          <Row label="Förnamn" value={c?.givenname ?? '—'} />
          <Row label="Efternamn" value={c?.lastname ?? '—'} />
          <Row label="Ort" value={c?.city ?? '—'} />
          <Row label="Kommun" value={c?.municipality ?? '—'} />
        </Stack>
        {!c && (
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            Kunde inte hämta uppgifter från Citizen.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2}>
      <Typography color="text.secondary">{label}</Typography>
      <Typography fontWeight={500}>{value}</Typography>
    </Stack>
  );
}
