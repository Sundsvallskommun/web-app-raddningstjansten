import { Card, CardContent, Stack, Typography, Divider, Chip } from '@mui/material';
import type { Me } from '@/api/api-service';

/**
 * Shows the data for the logged-in user.
 * - Admin: SAML profile (email, groups, masked citizenIdentifier).
 * - Citizen: Citizen 3.0 data (name, address) + masked personal number.
 */
export function InfoCard({ me }: { me: Me }) {
  const isAdmin = me.type === 'admin';
  const c = me.citizen;
  const fullName = c?.givenname || c?.lastname ? `${c?.givenname ?? ''} ${c?.lastname ?? ''}`.trim() : me.name;

  return (
    <Card variant="outlined" sx={{ maxWidth: 520 }}>
      <CardContent>
        <Typography variant="overline" color="text.secondary">
          Inloggad som {isAdmin ? 'administratör' : 'medborgare'}
        </Typography>
        <Typography variant="h5" gutterBottom>
          {isAdmin ? me.name : fullName}
        </Typography>
        <Divider sx={{ my: 1.5 }} />

        {isAdmin ? (
          <Stack spacing={1}>
            <Row label="Användarnamn" value={me.username ?? '—'} />
            <Row label="E-post" value={me.email ?? '—'} />
            <Row label="Personnummer" value={me.maskedPersonNumber ?? '—'} />
            <Stack direction="row" justifyContent="space-between" spacing={2} alignItems="center">
              <Typography color="text.secondary">Grupper</Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" justifyContent="flex-end">
                {me.groups?.length ? (
                  me.groups.map(g => <Chip key={g} label={g} size="small" />)
                ) : (
                  <Typography fontWeight={500}>—</Typography>
                )}
              </Stack>
            </Stack>
          </Stack>
        ) : (
          <Stack spacing={1}>
            <Row label="Personnummer" value={me.maskedPersonNumber ?? '—'} />
            <Row label="Förnamn" value={c?.givenname ?? '—'} />
            <Row label="Efternamn" value={c?.lastname ?? '—'} />
            <Row label="Ort" value={c?.city ?? '—'} />
            <Row label="Kommun" value={c?.municipality ?? '—'} />
          </Stack>
        )}

        {!isAdmin && !c && (
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
