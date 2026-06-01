import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';

/**
 * Admin login. Mocked Entra-ID: a full-page navigation to the BFF redirect flow
 * (GET /api/admin/login -> callback -> /admin/dashboard), mirroring real OIDC.
 */
export function AdminLoginPage() {
  function login() {
    // Full page navigation so the BFF's 302 redirect chain works like real Entra OIDC.
    window.location.href = '/api/admin/login';
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8, px: 2 }}>
      <Card variant="outlined" sx={{ maxWidth: 420, width: '100%' }}>
        <CardContent>
          <Stack spacing={2} alignItems="center">
            <Typography variant="h5">Administration</Typography>
            <Typography color="text.secondary" textAlign="center">
              Logga in med ditt organisationskonto (Entra-ID).
            </Typography>
            <Button variant="contained" size="large" onClick={login} fullWidth>
              Logga in med AD
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
