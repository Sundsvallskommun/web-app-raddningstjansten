import { Chip } from "@mui/material";

type ChipColor = "default" | "info" | "success" | "warning" | "error";

interface StatusMeta {
  label: string;
  color: ChipColor;
}

// Labels follow the modelled process steps so the chip and the process history
// (StatusStepper) are traceable to a specific step. The engine owns the status.
const STATUS: Record<string, StatusMeta> = {
  REGISTERED: { label: "Inkommen", color: "info" },
  NEW: { label: "Ny", color: "info" },
  // Eneo/AI document review runs as a service task between Inkommen and routing;
  // the engine does not currently emit a distinct status for it.
  UNDER_REVIEW: { label: "Under AI-granskning", color: "info" },
  ONGOING: { label: "Pågående", color: "info" },
  UNDER_MANUAL_REVIEW: { label: "Manuell granskning", color: "warning" },
  AWAITING_SUPPLEMENTATION: {
    label: "Komplettering krävs",
    color: "warning",
  },
  DECIDED: { label: "Beviljad", color: "success" },
  APPROVED: { label: "Beviljad", color: "success" },
  REJECTED: { label: "Avslagen", color: "error" },
  REVOKED: { label: "Återkallad", color: "default" },
};

export function statusLabel(status?: string): string {
  return status ? (STATUS[status]?.label ?? status) : "—";
}

// For citizens an errand under manual review is presented simply as "Pågående"
// (it is being handled) — the internal review reason is never surfaced.
const CITIZEN_STATUS_REMAP: Record<string, string> = {
  UNDER_MANUAL_REVIEW: "ONGOING",
};

// Admin triage on the manual-review path: while no handläggare has taken the
// errand it reads as "Ny" (needs manual review); once a handläggare is on it it
// reads as "Manuell granskning". Assignment-aware.
const ADMIN_MANUAL_STATUSES = new Set(["UNDER_MANUAL_REVIEW", "ONGOING"]);

/** Small status chip for an errand with Swedish labels. */
export function ErrandStatusChip({
  status,
  audience = "admin",
  assigned,
}: {
  status?: string;
  audience?: "citizen" | "admin";
  /** Whether a handläggare is assigned (admin view only). */
  assigned?: boolean;
}) {
  if (audience === "admin" && status && ADMIN_MANUAL_STATUSES.has(status)) {
    return assigned ? (
      <Chip label='Manuell granskning' size='small' color='warning' variant='outlined' />
    ) : (
      <Chip label='Ny' size='small' color='info' variant='outlined' />
    );
  }

  const effective =
    audience === "citizen" && status
      ? (CITIZEN_STATUS_REMAP[status] ?? status)
      : status;
  const meta = effective ? STATUS[effective] : undefined;
  return (
    <Chip
      label={statusLabel(effective)}
      size='small'
      color={meta?.color ?? "default"}
      variant='outlined'
    />
  );
}
