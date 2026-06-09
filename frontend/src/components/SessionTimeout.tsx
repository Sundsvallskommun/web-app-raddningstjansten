import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Button, Snackbar } from "@mui/material";
import { useAuth } from "@/auth/AuthContext";

// Show the warning this long before the session expires.
const WARNING_BEFORE_MS = 2 * 60 * 1000;

const fmtCountdown = (ms: number): string => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

/**
 * Watches the session expiry (from /me) and, when it is about to run out, shows
 * an info snackbar with a live countdown and a "Stanna kvar" button that renews
 * the session. When the time runs out the client session is cleared and the user
 * is sent back to the matching login. Mounted inside Wrapper (authenticated pages).
 */
export function SessionTimeout() {
  const { user, sessionExpiresAt, keepAlive, clear } = useAuth();
  const navigate = useNavigate();
  const [now, setNow] = useState(() => Date.now());
  const [extending, setExtending] = useState(false);

  const expMs = sessionExpiresAt ? new Date(sessionExpiresAt).getTime() : null;
  const left = user && expMs != null ? expMs - now : null;

  // Tick every second while a session is active so the countdown stays live.
  useEffect(() => {
    if (!user || expMs == null) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [user, expMs]);

  const logout = useCallback(() => {
    clear();
    navigate(user?.type === "admin" ? "/admin" : "/", { replace: true });
  }, [clear, navigate, user?.type]);

  // Expired → drop the client session and return to login.
  useEffect(() => {
    if (left != null && left <= 0) logout();
  }, [left, logout]);

  const stay = useCallback(async () => {
    setExtending(true);
    try {
      await keepAlive();
    } catch {
      logout();
    } finally {
      setExtending(false);
    }
  }, [keepAlive, logout]);

  if (left == null || left <= 0 || left > WARNING_BEFORE_MS) return null;

  return (
    <Snackbar open anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
      <Alert
        severity='info'
        variant='filled'
        sx={{ alignItems: "center" }}
        action={
          <Button color='inherit' size='small' onClick={stay} disabled={extending}>
            Stanna kvar
          </Button>
        }
      >
        Din session går ut om {fmtCountdown(left)}.
      </Alert>
    </Snackbar>
  );
}
