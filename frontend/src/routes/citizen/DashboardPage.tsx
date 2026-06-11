import { useNavigate } from "react-router-dom";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { apiService } from "@/api/api-service";
import { useAuth } from "@/auth/AuthContext";
import { Wrapper } from "@/components/Wrapper";
import DemoAlert from "@/components/DemoAlert";
import { FileDownload } from "@mui/icons-material";
import PdfDownloadButton from "@/components/PdfDownloadButton";
import { demoDocsForCitizen } from "@/utils/demoDocs";

export function CitizenDashboardPage() {
  const navigate = useNavigate();
  const { user, clear } = useAuth();
  // Only this test person's own (valid) documents are offered — the ones that
  // match their application and can pass Eneo's document validation.
  const docs = demoDocsForCitizen(user?.citizen);

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
          <DemoAlert title='Information'>
            <Typography sx={{ mt: 1 }}>
              Testdokument för din ansökan (endast dina egna visas)
            </Typography>
            <Stack sx={{ flexFlow: "wrap", gap: 2, mt: 2 }}>
              {docs.demoguide && (
                <PdfDownloadButton
                  icon={<FileDownload />}
                  label='Demoguide - Ansökan om egensotning'
                  href={docs.demoguide}
                />
              )}
              {docs.bsk && (
                <PdfDownloadButton
                  icon={<FileDownload />}
                  label='Brandskyddskontroll (BSK)'
                  href={docs.bsk}
                />
              )}
              {docs.kursintyg && (
                <PdfDownloadButton
                  icon={<FileDownload />}
                  label='Kursintyg (utbildningsintyg)'
                  href={docs.kursintyg}
                />
              )}
            </Stack>
            {!docs.bsk && !docs.kursintyg && (
              <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                Inga giltiga testdokument är kopplade till denna testperson ännu.
              </Typography>
            )}

            {docs.faulty.length > 0 && (
              <>
                <Typography sx={{ mt: 3 }}>
                  Felaktiga testdokument (för att demonstrera avslag, komplettering
                  och manuell granskning)
                </Typography>
                <Stack sx={{ flexFlow: "wrap", gap: 2, mt: 2 }}>
                  {docs.faulty.map((d) => (
                    <PdfDownloadButton
                      key={d.href}
                      icon={<FileDownload />}
                      label={d.label}
                      href={d.href}
                    />
                  ))}
                </Stack>
              </>
            )}
          </DemoAlert>
        </Paper>
      </Box>
    </Wrapper>
  );
}
