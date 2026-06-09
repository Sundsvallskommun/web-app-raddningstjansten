import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import { apiService } from "@/api/api-service";
import { useAuth } from "@/auth/AuthContext";
import Logo from "@/assets/logo-red.svg?react";
import bgImage from "@/assets/background.jpg";
import DemoInfoDialog from "@/components/DemoInfoDialog";

const POLL_INTERVAL_MS = 1000;
const POLL_TIMEOUT_MS = 30000;

interface PersonOption {
  index: number;
  label: string;
}

const HINT_MESSAGES: Record<string, string> = {
  wrongPassword: "Fel lösenord.",
  notConfigured: "Inloggning är inte konfigurerad (lösenord saknas).",
  noPerson: "Välj en användare.",
};

/**
 * Citizen login. Mocked BankID: choose a test person + password, start an order,
 * then poll /collect until complete. The UI mirrors the real BankID auth/collect
 * flow so migration is a swap of endpoints. The two-panel layout matches the
 * admin login (/admin) for a consistent look.
 */
export function CitizenLoginPage() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [mode, setMode] = useState<"saml" | "mock">("mock");
  const [open, setOpen] = useState(false);
  const [persons, setPersons] = useState<PersonOption[]>([]);
  const [personIndex, setPersonIndex] = useState<number | null>(null);
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "signing">("idle");
  const [error, setError] = useState<string | null>(null);

  const isMd = useMediaQuery("(min-width:1100px)");

  // Decide which login UI to show: real OneGate BankID (redirect) or the mock dialog.
  useEffect(() => {
    apiService
      .get<{ mode: "saml" | "mock" }>("/citizen/login/config")
      .then(({ data }) => setMode(data.mode))
      .catch(() => setMode("mock"));
  }, []);

  function startBankId() {
    if (mode === "saml") {
      // Full-page redirect to the BFF, which hands off to OneGate (same as admin SAML).
      window.location.href = "/api/saml/citizen/login";
      return;
    }
    openDialog();
  }

  useEffect(() => {
    if (!open) return;
    setError(null);
    apiService
      .get<{ persons: PersonOption[] }>("/citizen/login/options")
      .then(({ data }) => {
        setPersons(data.persons);
        setPersonIndex(data.persons[0]?.index ?? null);
      })
      .catch(() => setError("Kunde inte hämta användare."));
  }, [open]);

  function openDialog() {
    setPassword("");
    setStatus("idle");
    setError(null);
    setOpen(true);
  }

  function closeDialog() {
    if (status === "signing") return; // don't close mid-sign
    setOpen(false);
  }

  async function login() {
    if (personIndex === null) {
      setError("Välj en användare.");
      return;
    }
    setError(null);
    setStatus("loading");
    try {
      const { data: order } = await apiService.post<{ orderRef: string }>(
        "/citizen/login/start",
        {
          personIndex,
          password,
        },
      );
      setStatus("signing");

      const deadline = Date.now() + POLL_TIMEOUT_MS;
      while (Date.now() < deadline) {
        const { data } = await apiService.post<{ status: string }>(
          "/citizen/login/collect",
          {
            orderRef: order.orderRef,
          },
        );
        if (data.status === "complete") {
          await refresh();
          navigate("/dashboard", { replace: true });
          return;
        }
        if (data.status === "failed") {
          throw new Error("Inloggningen avbröts.");
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }
      throw new Error("Tidsgränsen för inloggning överskreds.");
    } catch (e) {
      setStatus("idle");
      if (axios.isAxiosError(e)) {
        const hint = (e.response?.data as { hintCode?: string } | undefined)
          ?.hintCode;
        setError(
          (hint && HINT_MESSAGES[hint]) || "Något gick fel vid inloggning.",
        );
      } else {
        setError(
          e instanceof Error ? e.message : "Något gick fel vid inloggning.",
        );
      }
    }
  }

  const busy = status === "loading" || status === "signing";

  return (
    <Container
      className='login-wrapper'
      maxWidth={false}
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: isMd ? "row" : "column",
          justifyContent: "spaceBetween",
          alignItems: "center",
          gap: isMd ? 0 : 2,
          background: "#fff",
          height: "90vh",
          width: "90vw",
          maxWidth: "1260px",
          borderRadius: "8px",
          boxShadow: "0px 5px 16px 0px rgba(0,0,0,0.25)",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minWidth: isMd ? "65%" : "100%",
            height: isMd ? "100%" : "auto",
            background: "#fff",
            backgroundImage: `url(${bgImage})`,
            borderRadius: isMd ? "8px 0 0 8px" : "8px 8px 0 0",
            p: 4,
          }}
        >
          <Typography
            color='#DE0634'
            sx={{
              fontSize: isMd ? "4rem" : "1.2rem",
              fontWeight: 700,
              wordBreak: "break-all",
            }}
          >
            Räddningstjänsten
          </Typography>
          <Typography
            color='#DE0634'
            sx={{
              fontSize: isMd ? "2rem" : "1rem",
              fontWeight: 500,
              wordBreak: "break-all",
            }}
          >
            Mina Sidor
          </Typography>
          <Logo width={"64px"} />
        </Box>
        <Box
          sx={{
            minWidth: isMd ? "35%" : "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            px: 2,
            gap: 2,
          }}
        >
          <Card variant='outlined' sx={{ display: "flex", p: 2 }} elevation={2}>
            <CardContent>
              <Stack spacing={2} alignItems='center'>
                <Typography color='text.secondary' textAlign='center'>
                  Logga in som medborgare med BankID.
                </Typography>
                <Button
                  variant='outlined'
                  size='large'
                  onClick={startBankId}
                  fullWidth
                >
                  Logga in med BankID
                </Button>
              </Stack>
            </CardContent>
          </Card>

          <DemoInfoDialog />

          <Dialog open={open} onClose={closeDialog} maxWidth='xs' fullWidth>
            <DialogTitle>Logga in med BankID (mock)</DialogTitle>
            <DialogContent>
              {error && (
                <Alert severity='error' sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              {status === "signing" ? (
                <Stack spacing={1} alignItems='center' sx={{ py: 3 }}>
                  <CircularProgress />
                  <Typography variant='body2' color='text.secondary'>
                    Öppna BankID-appen… (mock)
                  </Typography>
                </Stack>
              ) : (
                <Stack spacing={2} sx={{ mt: 1 }}>
                  <FormControl>
                    <FormLabel>Välj användare</FormLabel>
                    <RadioGroup
                      value={personIndex ?? ""}
                      onChange={(e) => setPersonIndex(Number(e.target.value))}
                    >
                      {persons.map((p) => (
                        <FormControlLabel
                          key={p.index}
                          value={p.index}
                          control={<Radio />}
                          label={`${p.label}…`}
                          disabled={busy}
                        />
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <TextField
                    label='Lösenord'
                    type='password'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={busy}
                    fullWidth
                    onKeyDown={(e) => {
                      if (e.key === "Enter") login();
                    }}
                  />
                </Stack>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={closeDialog} disabled={status === "signing"}>
                Avbryt
              </Button>
              <Button
                variant='contained'
                onClick={login}
                disabled={busy || persons.length === 0}
              >
                {status === "loading" ? (
                  <CircularProgress size={24} />
                ) : (
                  "Logga in"
                )}
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Box>
    </Container>
  );
}
