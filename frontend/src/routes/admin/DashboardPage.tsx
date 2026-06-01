import { AppBar, Toolbar, Typography, Button, Box, Container } from '@mui/material';
import { useAuth } from '@/auth/AuthContext';
import { InfoCard } from '@/components/InfoCard';

export function AdminDashboardPage() {
  const { user } = useAuth();

  function logout() {
    // Server-side redirect flow clears the session and returns to /admin.
    window.location.href = '/api/saml/logout';
  }

  return (
    <Box>
      <AppBar position="static" sx={{ bgcolor: 'secondary.main' }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Räddningstjänsten – Administration
          </Typography>
          <Button color="inherit" onClick={logout}>
            Logga ut
          </Button>
        </Toolbar>
      </AppBar>
      <Container sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Administratörsöversikt
        </Typography>
        {user && <InfoCard me={user} />}
      </Container>
    </Box>
  );
}
