import { useNavigate } from "react-router-dom";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { apiService } from "@/api/api-service";
import { useAuth } from "@/auth/AuthContext";
import { Wrapper } from "@/components/Wrapper";
import DemoAlert from "@/components/DemoAlert";
import { FileDownload } from "@mui/icons-material";
import PdfDownloadButton from "@/components/PdfDownloadButton";
import demoGuidePdf from "@/assets/Demo-guide — Ansökan om egen sotning.pdf";
import bskPdf from "@/assets/BSK_Kopmangatan_5.pdf";
import bskAnmarkningPdf from "@/assets/BSK_Kopmangatan_5_Anmarkning.pdf";
import kursintygOkPdf from "@/assets/Kursintyg_Bostrom.pdf";
import kursintygFelNamnPdf from "@/assets/Kursintyg_FelNamn.pdf";
import kursintygFelUtbildningPdf from "@/assets/Kursintyg_FelUtbildning_Bostrom.pdf";

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
          <DemoAlert title='Information'>
            <Typography sx={{ mt: 1 }}>Dokument kopplade till demo</Typography>
            <Stack sx={{ flexFlow: "wrap", gap: 2, mt: 2 }}>
              <PdfDownloadButton
                icon={<FileDownload />}
                label='Demoguide - Ansökan om egensotning'
                href={demoGuidePdf}
              />
              <PdfDownloadButton
                icon={<FileDownload />}
                label='BSK - Brandskyddskontroll'
                href={bskPdf}
              />
              <PdfDownloadButton
                icon={<FileDownload />}
                label='BSK - Brandskyddskontroll med anmärkning'
                href={bskAnmarkningPdf}
              />
              <PdfDownloadButton
                icon={<FileDownload />}
                label='Kursintyg - OK'
                href={kursintygOkPdf}
              />
              <PdfDownloadButton
                icon={<FileDownload />}
                label='Kursintyg - Fel namn'
                href={kursintygFelNamnPdf}
              />
              <PdfDownloadButton
                icon={<FileDownload />}
                label='Kursintyg - Fel utbildning'
                href={kursintygFelUtbildningPdf}
              />
            </Stack>
          </DemoAlert>
        </Paper>
      </Box>
    </Wrapper>
  );
}
