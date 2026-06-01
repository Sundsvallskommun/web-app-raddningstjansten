import { useNavigate } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, Box, Container } from '@mui/material';
import { apiService } from '@/api/api-service';
import { useAuth } from '@/auth/AuthContext';
import { InfoCard } from '@/components/InfoCard';

export function CitizenDashboardPage() {
  const navigate = useNavigate();
  const { user, clear } = useAuth();

  async function logout() {
    await apiService.post('/citizen/logout');
    clear();
    navigate('/', { replace: true });
  }

  return (
    <Box>
      <AppBar position="static" color="primary">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Räddningstjänsten – Medborgare
          </Typography>
          <Button color="inherit" onClick={logout}>
            Logga ut
          </Button>
        </Toolbar>
      </AppBar>
      <Container sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Din översikt
        </Typography>
        {user && <InfoCard me={user} />}
      </Container>
    </Box>
  );
}
