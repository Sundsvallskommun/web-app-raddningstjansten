import { Card, CardContent, Stack, Typography, Divider, Chip } from '@mui/material';
import type { Me, PortalPersonData } from '@/api/api-service';

/**
 * Shows the data for the logged-in user.
 * - Admin: SAML profile (email, groups, masked citizenIdentifier) + the full
 *   Employee 2.0 record (all PortalPersonData fields).
 * - Citizen: Citizen 3.0 data (name, address) + masked personal number.
 */
export function InfoCard({ me }: { me: Me }) {
  const isAdmin = me.type === 'admin';
  const c = me.citizen;
  const fullName = c?.givenname || c?.lastname ? `${c?.givenname ?? ''} ${c?.lastname ?? ''}`.trim() : me.name;

  return (
    <Card variant="outlined" sx={{ maxWidth: 560 }}>
      <CardContent>
        <Typography variant="overline" color="text.secondary">
          Inloggad som {isAdmin ? 'administratör' : 'medborgare'}
        </Typography>
        <Typography variant="h5" gutterBottom>
          {isAdmin ? me.name : fullName}
        </Typography>
        <Divider sx={{ my: 1.5 }} />

        {isAdmin ? (
          <AdminBody me={me} />
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

// Ordered labels for the full Employee 2.0 (PortalPersonData) record.
const EMPLOYEE_FIELDS: { key: keyof PortalPersonData; label: string }[] = [
  { key: 'fullname', label: 'Fullständigt namn' },
  { key: 'givenname', label: 'Förnamn' },
  { key: 'lastname', label: 'Efternamn' },
  { key: 'email', label: 'E-post' },
  { key: 'mailNickname', label: 'Mail-alias' },
  { key: 'workPhone', label: 'Arbetstelefon' },
  { key: 'mobilePhone', label: 'Mobil' },
  { key: 'extraMobilePhone', label: 'Extra mobil' },
  { key: 'address', label: 'Adress' },
  { key: 'postalCode', label: 'Postnummer' },
  { key: 'city', label: 'Ort' },
  { key: 'company', label: 'Företag' },
  { key: 'companyId', label: 'Företags-id' },
  { key: 'orgTree', label: 'Organisation' },
  { key: 'fullOrgTree', label: 'Organisation (full)' },
  { key: 'referenceNumber', label: 'Referensnummer' },
  { key: 'isManager', label: 'Chef' },
  { key: 'loginName', label: 'Inloggningsnamn' },
  { key: 'personid', label: 'Person-id' },
  { key: 'aboutMe', label: 'Om mig' },
];

function AdminBody({ me }: { me: Me }) {
  const emp = me.employee;

  const fmt = (v: unknown): string => {
    if (v === null || v === undefined || v === '') return '—';
    if (typeof v === 'boolean') return v ? 'Ja' : 'Nej';
    return String(v);
  };

  return (
    <Stack spacing={1.5}>
      <Stack spacing={1}>
        <Row label="Användarnamn" value={me.username ?? '—'} />
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

      <Divider textAlign="left">
        <Typography variant="caption" color="text.secondary">
          Anställduppgifter (Employee 2.0)
        </Typography>
      </Divider>

      {emp ? (
        <Stack spacing={1}>
          {EMPLOYEE_FIELDS.map(f => (
            <Row key={f.key} label={f.label} value={fmt(emp[f.key])} />
          ))}
        </Stack>
      ) : (
        <Typography variant="body2" color="error">
          Kunde inte hämta uppgifter från Employee.
        </Typography>
      )}
    </Stack>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2}>
      <Typography color="text.secondary">{label}</Typography>
      <Typography fontWeight={500} sx={{ textAlign: 'right', wordBreak: 'break-word' }}>
        {value}
      </Typography>
    </Stack>
  );
}
