import { Chip } from "@mui/material";

type ChipColor = "default" | "info" | "success" | "warning" | "error";

interface StatusMeta {
  label: string;
  color: ChipColor;
}

const STATUS: Record<string, StatusMeta> = {
  REGISTERED: { label: "Inskickad", color: "info" },
  NEW: { label: "Ny", color: "info" },
  ONGOING: { label: "Pågående", color: "info" },
  UNDER_MANUAL_REVIEW: {
    label: "Behandlas",
    color: "warning",
  },
  AWAITING_SUPPLEMENTATION: {
    label: "Väntar på komplettering",
    color: "warning",
  },
  DECIDED: { label: "Beslutad", color: "success" },
  APPROVED: { label: "Godkänd", color: "success" },
  REJECTED: { label: "Avslagen", color: "error" },
};

export function statusLabel(status?: string): string {
  return status ? (STATUS[status]?.label ?? status) : "—";
}

// For citizens an errand under manual review is presented simply as "Pågående"
// (it is being handled) — the internal review reason is never surfaced.
const CITIZEN_STATUS_REMAP: Record<string, string> = {
  UNDER_MANUAL_REVIEW: "ONGOING",
};

// For a handläggare, an errand still awaiting pickup (no assignee) reads as "Ny"
// rather than its internal handling status. Status-based + assignment-aware.
const ADMIN_NEW_WHEN_UNASSIGNED = new Set(["UNDER_MANUAL_REVIEW"]);

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
  if (
    audience === "admin" &&
    assigned === false &&
    status &&
    ADMIN_NEW_WHEN_UNASSIGNED.has(status)
  ) {
    return <Chip label='Ny' size='small' color='info' variant='outlined' />;
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
