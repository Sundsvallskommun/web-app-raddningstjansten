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
    <Box sx={{ display: "flex", justifyContent: "center", mt: 8, px: 2 }}>
      <Card variant='outlined' sx={{ display: "flex", p: 2 }}>
        <CardContent>
          <Stack spacing={2} alignItems='center'>
            <Box sx={{ color: "secondary.main" }}>
              <Logo />
            </Box>
            <Typography variant='h5'>
              Räddningstjänsten - Administration
            </Typography>
            <Typography color='text.secondary' textAlign='center'>
              Logga in med ditt organisationskonto.
            </Typography>

            {error && (
              <Alert severity='error' sx={{ width: "100%" }}>
                {ERROR_MESSAGES[error] ?? "Inloggningen kunde inte slutföras."}
              </Alert>
            )}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Button
                variant='contained'
                size='large'
                onClick={login}
                fullWidth
              >
                {"Logga in med AD - Sundsvall SSO"}
              </Button>
              {testSsoEnabled && (
                <Button
                  color='secondary'
                  variant='contained'
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
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        {u.name}
                        <Chip
                          size='small'
                          label={ROLE_LABEL[u.role]}
                          color={u.role === "editor" ? "success" : "default"}
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
  );
}
