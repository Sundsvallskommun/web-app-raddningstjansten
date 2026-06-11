import { lazy, Suspense } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { Wrapper } from "@/components/Wrapper";
import DemoAlert from "@/components/DemoAlert";
import PdfDownloadButton from "@/components/PdfDownloadButton";
import { FileDownload } from "@mui/icons-material";
import { EMPLOYEE_DEMO_DOCS } from "@/utils/demoDocs";

// Charts (@mui/x-charts + d3) are admin-only and heavy — lazy-load them so they
// stay out of the bundle served to citizens and the login pages.
const ErrandStatistics = lazy(() =>
  import("@/components/ErrandStatistics").then((m) => ({
    default: m.ErrandStatistics,
  })),
);

// Errand types (modules) shown on the dashboard. Each renders its own scoped
// statistics panel — add new modules here as they are introduced.
const ERRAND_TYPES = [{ typeSlug: "EGENSOTNING", title: "Egensotning" }];

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
      <Stack spacing={3}>
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
          <DemoAlert title='Information'>
            <Typography sx={{ mt: 1 }}>Dokument kopplade till demo</Typography>
            <Stack sx={{ flexFlow: "wrap", gap: 2, mt: 2 }}>
              {EMPLOYEE_DEMO_DOCS.map((d) => (
                <PdfDownloadButton
                  key={d.href}
                  icon={<FileDownload />}
                  label={d.label}
                  href={d.href}
                />
              ))}
            </Stack>
          </DemoAlert>
        </Paper>

        <Box>
          <Typography variant='h5' gutterBottom>
            Statistik
          </Typography>
          <Suspense
            fallback={
              <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                <CircularProgress />
              </Box>
            }
          >
            <Stack spacing={2}>
              {ERRAND_TYPES.map((t) => (
                <ErrandStatistics
                  key={t.typeSlug}
                  typeSlug={t.typeSlug}
                  title={t.title}
                />
              ))}
            </Stack>
          </Suspense>
        </Box>
      </Stack>
    </Wrapper>
  );
}
