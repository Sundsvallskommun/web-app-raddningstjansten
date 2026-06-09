import { Alert, Box, Typography } from "@mui/material";
import type { EgensotningDetails } from "@/api/api-service";

const fmtDate = (s?: string) =>
  s ? new Date(s).toLocaleDateString("sv-SE") : null;

/**
 * Read-only summary of a granted egensotning's validity window and any
 * revocation. Rendered on both the citizen and admin errand detail pages;
 * returns null when there is nothing to show.
 */
export function DecisionValidityInfo({
  details,
}: {
  details?: EgensotningDetails | null;
}) {
  const from = fmtDate(details?.validFrom);
  const until = fmtDate(details?.validUntil);
  const revoked = fmtDate(details?.revokedAt);
  if (!from && !until && !revoked) return null;

  return (
    <Box>
      {(from || until) && (
        <Typography variant='body2' color='text.secondary'>
          Giltighet: {from ?? "—"} – {until ?? "tills vidare"}
        </Typography>
      )}
      {revoked && (
        <Alert severity='warning' sx={{ mt: 1 }}>
          Beslutet återkallades {revoked}
          {details?.revocationReason
            ? `. Anledning: ${details.revocationReason}`
            : "."}
        </Alert>
      )}
    </Box>
  );
}
