import { useNavigate } from "react-router-dom";
import { Typography } from "@mui/material";
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
      <Typography variant='h4' gutterBottom>
        Din översikt
      </Typography>
    </Wrapper>
  );
}
