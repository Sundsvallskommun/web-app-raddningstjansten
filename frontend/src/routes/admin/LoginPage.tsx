import { useSearchParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
} from "@mui/material";
import Logo from "@/assets/logo-red.svg?react";

const ERROR_MESSAGES: Record<string, string> = {
  MISSING_PERMISSIONS:
    "Ditt konto saknar behörighet (rätt AD-grupp) för administration.",
  AUTH_FAILED: "Inloggningen misslyckades. Försök igen.",
  NO_USER: "Ingen användare kunde verifieras.",
  SESSION_ERROR: "Sessionen kunde inte sparas. Försök igen.",
};

/**
 * Admin login via SAML against the fake SSO IdP. A full-page navigation to the
 * BFF (GET /api/saml/login) starts the SAML redirect handshake; on success the
 * BFF redirects back to /admin/dashboard. Only members of the configured
 * ADMIN_GROUP are allowed in; denied logins return here with ?error=.
 */
export function AdminLoginPage() {
  const [params] = useSearchParams();
  const error = params.get("error");

  function login() {
    // Full page navigation so the SAML redirect/POST handshake works.
    window.location.href = "/api/saml/login";
  }

  return (
    <Box sx={{ display: "flex", justifyContent: "center", mt: 8, px: 2 }}>
      <Card variant='outlined' sx={{ maxWidth: 420, width: "100%" }}>
        <CardContent>
          <Stack spacing={2} alignItems='center'>
            <Box sx={{ color: "secondary.main" }}>
              <Logo />
            </Box>
            <Typography variant='h5'>Administration</Typography>
            <Typography color='text.secondary' textAlign='center'>
              Logga in med ditt organisationskonto.
            </Typography>

            {error && (
              <Alert severity='error' sx={{ width: "100%" }}>
                {ERROR_MESSAGES[error] ?? "Inloggningen kunde inte slutföras."}
              </Alert>
            )}

            <Button variant='contained' size='large' onClick={login} fullWidth>
              Logga in med AD
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
