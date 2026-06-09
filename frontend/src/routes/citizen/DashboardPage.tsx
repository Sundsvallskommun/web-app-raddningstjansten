import { useNavigate } from "react-router-dom";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { apiService } from "@/api/api-service";
import { useAuth } from "@/auth/AuthContext";
import { Wrapper } from "@/components/Wrapper";
import DemoAlert from "@/components/DemoAlert";

export function CitizenDashboardPage() {
  const navigate = useNavigate();
  const { user, clear } = useAuth();

  async function logout() {
    await apiService.post("/citizen/logout");
    clear();
    navigate("/", { replace: true });
  }

  return (
    <Wrapper
      title='Räddningstjänsten Medelpad - Mina Sidor'
      logout={logout}
      color='primary'
      user={user}
      showNav
      navType='citizen'
    >
      <Box>
        <Paper sx={{ p: 4 }}>
          <Typography variant='h4' gutterBottom>
            Din översikt
          </Typography>
          <Typography gutterBottom>{`Inloggad som ${user?.name}`}</Typography>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            sx={{ mt: 2 }}
          >
            <Button variant='contained' onClick={() => navigate("/errand/new")}>
              Ny ansökan om egensotning
            </Button>
            <Button variant='outlined' onClick={() => navigate("/errands")}>
              Mina ärenden
            </Button>
          </Stack>
          <DemoAlert title='Information' />
        </Paper>
      </Box>
    </Wrapper>
  );
}
