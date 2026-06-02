import { useNavigate } from "react-router-dom";
import { Box, Paper, Typography } from "@mui/material";
import { apiService } from "@/api/api-service";
import { useAuth } from "@/auth/AuthContext";
import { Wrapper } from "@/components/Wrapper";

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
    >
      <Box>
        <Paper sx={{ p: 4 }}>
          <Typography variant='h4' gutterBottom>
            Din översikt
          </Typography>
          <Typography>{`Inloggad som ${user?.name}`}</Typography>
        </Paper>
      </Box>
    </Wrapper>
  );
}
