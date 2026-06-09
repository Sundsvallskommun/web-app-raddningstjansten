import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
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
import {
  fetchTestSsoConfig,
  fetchTestSsoUsers,
  testSsoLogin,
  type TestSsoUser,
} from "@/api/api-service";
import { useAuth } from "@/auth/AuthContext";
import Logo from "@/assets/logo-red.svg?react";
import bgImage from "@/assets/background.jpg";
import useMediaQuery from "@mui/material/useMediaQuery";

const ERROR_MESSAGES: Record<string, string> = {
  MISSING_PERMISSIONS:
    "Ditt konto saknar behörighet (rätt AD-grupp) för administration.",
  AUTH_FAILED: "Inloggningen misslyckades. Försök igen.",
  NO_USER: "Ingen användare kunde verifieras.",
  SESSION_ERROR: "Sessionen kunde inte sparas. Försök igen.",
};

const ROLE_LABEL: Record<TestSsoUser["role"], string> = {
  editor: "Full behörighet",
  viewer: "Endast läs",
};

/**
 * Admin login. Two paths:
 *  - "AD - Sundsvall SSO": full-page navigation to the BFF (GET /api/saml/login),
 *    the real SAML redirect handshake; only members of the configured groups pass.
 *  - "Test SSO": a dialog that logs in as one of three mocked handläggare
 *    (admin/editor/viewer) with the shared password — no AD/Citizen involved.
 * Denied SAML logins return here with ?error=.
 */
export function AdminLoginPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const error = params.get("error");

  const [testSsoEnabled, setTestSsoEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<TestSsoUser[]>([]);
  const [userId, setUserId] = useState<number | null>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const isMd = useMediaQuery("(min-width:1100px)");

  function login() {
    // Full page navigation so the SAML redirect/POST handshake works.
    window.location.href = "/api/saml/login";
  }

  // Only show the Test-SSO button when the backend has it configured.
  useEffect(() => {
    fetchTestSsoConfig()
      .then(({ enabled }) => setTestSsoEnabled(enabled))
      .catch(() => setTestSsoEnabled(false));
  }, []);

  // Load the selectable mock users when the dialog opens.
  useEffect(() => {
    if (!open) return;
    setDialogError(null);
    setPassword("");
    fetchTestSsoUsers()
      .then((list) => {
        setUsers(list);
        setUserId(list[0]?.id ?? null);
      })
      .catch(() => setDialogError("Kunde inte hämta testanvändare."));
  }, [open]);

  async function submitTestSso() {
    if (userId === null) {
      setDialogError("Välj en användare.");
      return;
    }
    setBusy(true);
    setDialogError(null);
    try {
      await testSsoLogin(userId, password);
      await refresh();
      navigate("/admin/dashboard", { replace: true });
    } catch (e) {
      const hint =
        axios.isAxiosError(e) &&
        (e.response?.data as { hintCode?: string } | undefined)?.hintCode;
      setDialogError(
        hint === "wrongPassword"
          ? "Fel lösenord."
          : "Inloggningen misslyckades.",
      );
    } finally {
      setBusy(false);
    }
  }

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
            Administration
          </Typography>
          <Logo width={"64px"} />
        </Box>
        <Box
          sx={{
            minWidth: isMd ? "35%" : "100%",
            display: "flex",
            justifyContent: "center",
            px: 2,
          }}
        >
          <Card variant='outlined' sx={{ display: "flex", p: 2 }} elevation={2}>
            <CardContent>
              <Stack spacing={2} alignItems='center'>
                <Typography color='text.secondary' textAlign='center'>
                  Logga in med ditt organisationskonto eller Test SSO
                </Typography>

                {error && (
                  <Alert severity='error' sx={{ width: "100%" }}>
                    {ERROR_MESSAGES[error] ??
                      "Inloggningen kunde inte slutföras."}
                  </Alert>
                )}
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Button
                    variant='outlined'
                    size='large'
                    onClick={login}
                    fullWidth
                  >
                    {"Logga in med AD - Sundsvall SSO"}
                  </Button>
                  {testSsoEnabled && (
                    <Button
                      color='secondary'
                      variant='outlined'
                      size='large'
                      onClick={() => setOpen(true)}
                      fullWidth
                    >
                      {"Logga in med Test SSO"}
                    </Button>
                  )}
                </Box>
              </Stack>
            </CardContent>
          </Card>

          <Dialog
            open={open}
            onClose={() => !busy && setOpen(false)}
            maxWidth='xs'
            fullWidth
          >
            <DialogTitle>Logga in med Test SSO</DialogTitle>
            <DialogContent>
              {dialogError && (
                <Alert severity='error' sx={{ mb: 2 }}>
                  {dialogError}
                </Alert>
              )}
              <Stack spacing={2} sx={{ mt: 1 }}>
                <FormControl>
                  <FormLabel>Välj testanvändare</FormLabel>
                  <RadioGroup
                    value={userId ?? ""}
                    onChange={(e) => setUserId(Number(e.target.value))}
                  >
                    {users.map((u) => (
                      <FormControlLabel
                        key={u.id}
                        value={u.id}
                        control={<Radio />}
                        disabled={busy}
                        label={
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            {u.name}
                            <Chip
                              size='small'
                              label={ROLE_LABEL[u.role]}
                              color={
                                u.role === "editor" ? "success" : "default"
                              }
                              variant='outlined'
                            />
                          </Box>
                        }
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
                    if (e.key === "Enter") submitTestSso();
                  }}
                />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => setOpen(false)} disabled={busy}>
                Avbryt
              </Button>
              <Button
                variant='contained'
                onClick={submitTestSso}
                disabled={busy || users.length === 0}
              >
                {busy ? <CircularProgress size={24} /> : "Logga in"}
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Box>
    </Container>
  );
}
