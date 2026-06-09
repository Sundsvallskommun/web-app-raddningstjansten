import { Box, Button, Paper, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { Wrapper } from "@/components/Wrapper";
import DemoAlert from "@/components/DemoAlert";

export function AdminDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  function logout() {
    // Server-side redirect flow clears the session and returns to /admin.
    window.location.href = "/api/saml/logout";
  }

  return (
    <Wrapper
      title='Räddningstjänsten Medelpad - Admin'
      logout={logout}
      color='secondary'
      user={user}
      showNav
      navType='admin'
    >
      <Paper sx={{ p: 4 }}>
        <Typography variant='h4' gutterBottom>
          Din översikt
        </Typography>
        <Typography color='text.secondary' gutterBottom>
          {`Inloggad som ${user?.name ?? ""}`}
        </Typography>
        <Box sx={{ mt: 2 }}>
          <Button
            variant='contained'
            onClick={() => navigate("/admin/errands")}
          >
            Visa inkomna ärenden
          </Button>
        </Box>
        <DemoAlert title='Information' />
      </Paper>
    </Wrapper>
  );
}
