import { Paper, Typography } from "@mui/material";
import { useAuth } from "@/auth/AuthContext";
import { Wrapper } from "@/components/Wrapper";

export function AdminDashboardPage() {
  const { user } = useAuth();

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
    >
      <Paper sx={{ p: 4 }}>
        <Typography variant='h4' gutterBottom>
          Din översikt
        </Typography>
      </Paper>
    </Wrapper>
  );
}
