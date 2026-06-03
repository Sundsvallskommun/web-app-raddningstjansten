import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import {
  ArrowBack,
  CheckCircleOutline,
  CancelOutlined,
  DownloadOutlined,
  AssignmentIndOutlined,
} from "@mui/icons-material";
import { adminAttachmentDownloadUrl } from "@/api/api-service";
import { useAdminErrand, useAdminDecision, useAssignErrand } from "@/api/queries";
import { useAuth } from "@/auth/AuthContext";
import { Wrapper } from "@/components/Wrapper";
import { ErrandStatusChip, statusLabel } from "@/components/ErrandStatusChip";
import { StatusStepper } from "@/components/StatusStepper";
import { markSeen } from "@/utils/seenErrands";
import { outcomeMessage } from "@/utils/egensotning";

const gridSx = {
  display: "grid",
  gridTemplateColumns: { xs: "1fr 1fr", sm: "1fr 1fr 1fr" },
  gap: 2,
} as const;

// Two-column detail layout: main content (~75%) + process sidebar (~25%).
const detailLayoutSx = {
  display: "grid",
  gridTemplateColumns: { xs: "1fr", md: "minmax(0, 3fr) minmax(0, 1fr)" },
  gap: 2,
  alignItems: "start",
} as const;

const fmt = (s?: string) => (s ? new Date(s).toLocaleString("sv-SE") : "—");

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <Box>
      <Typography variant='caption' color='text.secondary'>
        {label}
      </Typography>
      <Typography>{value || "—"}</Typography>
    </Box>
  );
}

interface AuditItem {
  at?: string;
  actor: string;
  text: string;
}

export function ErrandDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, isLoading: loading } = useAdminErrand(id);
  const decision = useAdminDecision(id ?? "");
  const assign = useAssignErrand(id ?? "");
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Clear the "updated" badge whenever fresh data arrives (incl. polling).
  useEffect(() => {
    if (data) markSeen(data.errand.id, data.errand.modified);
  }, [data]);

  function logout() {
    window.location.href = "/api/saml/logout";
  }

  async function decide(approved: boolean) {
    setActionMsg(null);
    try {
      await decision.mutateAsync(approved);
      setActionMsg(approved ? "Ärendet godkändes." : "Ärendet avslogs.");
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : "Åtgärden misslyckades.");
    }
  }

  async function assignSelf() {
    setActionMsg(null);
    try {
      await assign.mutateAsync();
      setActionMsg("Du tilldelades som handläggare.");
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : "Tilldelningen misslyckades.");
    }
  }

  const acting = decision.isPending;
  const assignedToMe =
    !!data?.errand.assignedUserId && data.errand.assignedUserId === user?.username;

  const outcome = data ? outcomeMessage(data.details, "admin") : null;
  const inReview = data?.errand.status === "UNDER_MANUAL_REVIEW";

  const audit: AuditItem[] = data
    ? [
        ...data.statusHistory.map((h) => ({
          at: h.changedAt,
          actor: h.changedBy || "System",
          text: `Status: ${statusLabel(h.fromStatus)} → ${statusLabel(h.toStatus)}`,
        })),
        ...data.decisions.map((d) => ({
          at: d.created,
          actor: d.createdBy || "System",
          text: `Beslut: ${d.value ?? d.decisionType ?? ""}${d.description ? ` – ${d.description}` : ""}`,
        })),
        ...data.notes.map((n) => ({
          at: n.created,
          actor: n.author || "System",
          text: n.body ?? "",
        })),
      ].sort((a, b) => (a.at ?? "").localeCompare(b.at ?? ""))
    : [];

  return (
    <Wrapper
      title='Räddningstjänsten Medelpad - Ärende'
      logout={logout}
      color='secondary'
      user={user}
      showNav
      navType='admin'
    >
      <Box>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate("/admin/errands")}
          sx={{ mb: 2 }}
        >
          Tillbaka
        </Button>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress />
          </Box>
        ) : !data ? (
          <Typography>Ärendet kunde inte hämtas.</Typography>
        ) : (
          <Box sx={detailLayoutSx}>
            <Stack spacing={2}>
              <Paper sx={{ p: 3 }}>
                <Stack
                  direction='row'
                  justifyContent='space-between'
                  alignItems='center'
                  sx={{ mb: 1 }}
                >
                  <Typography variant='h5'>{data.errand.title}</Typography>
                  <ErrandStatusChip status={data.errand.status} />
                </Stack>
                <Typography variant='body2' color='text.secondary' gutterBottom>
                  {data.errand.errandNumber ?? data.errand.id}
                </Typography>
                {outcome && (
                  <Alert severity={outcome.severity} sx={{ my: 1 }}>
                    {outcome.text}
                  </Alert>
                )}
                <Divider sx={{ my: 2 }} />
                <Box sx={gridSx}>
                  <Field
                    label='Sökandes e-post'
                    value={data.errand.applicantEmail}
                  />
                  <Field label='Rapportör' value={data.errand.reporterUserId} />
                  <Field
                    label='Handläggare'
                    value={data.errand.assignedUserId}
                  />
                  <Field
                    label='Fastighetsbeteckning'
                    value={data.details?.fastighetsbeteckning}
                  />
                  <Field
                    label='Fastighetsadress'
                    value={data.details?.propertyAddress}
                  />
                  <Field label='Inskickat' value={fmt(data.errand.created)} />
                </Box>

                {inReview && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant='subtitle2' gutterBottom>
                      Manuell granskning — fatta beslut
                    </Typography>
                    {actionMsg && (
                      <Alert severity='info' sx={{ mb: 1 }}>
                        {actionMsg}
                      </Alert>
                    )}
                    <Stack direction='row' spacing={2}>
                      <Button
                        variant='contained'
                        color='success'
                        startIcon={<CheckCircleOutline />}
                        disabled={acting}
                        onClick={() => decide(true)}
                      >
                        Godkänn
                      </Button>
                      <Button
                        variant='outlined'
                        color='error'
                        startIcon={<CancelOutlined />}
                        disabled={acting}
                        onClick={() => decide(false)}
                      >
                        Avslå
                      </Button>
                    </Stack>
                  </>
                )}
              </Paper>

              <Typography variant='h6'>Sotningsobjekt</Typography>
              {data.sotningsobjekt.length === 0 ? (
                <Typography color='text.secondary'>Inga objekt.</Typography>
              ) : (
                data.sotningsobjekt.map((o) => (
                  <Card key={o.id} variant='outlined'>
                    <CardContent>
                      <Typography variant='subtitle1'>{o.typ}</Typography>
                      <Typography variant='body2' color='text.secondary'>
                        {[
                          o.fabrikat,
                          o.tillverkningsar,
                          o.bransleslag,
                          o.branslemangd,
                          o.sotningsintervallVeckor
                            ? `var ${o.sotningsintervallVeckor}:e vecka`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </Typography>
                    </CardContent>
                  </Card>
                ))
              )}

              <Typography variant='h6'>Händelselogg</Typography>
              <Paper sx={{ p: 2 }}>
                {audit.length === 0 ? (
                  <Typography color='text.secondary'>
                    Inga händelser ännu.
                  </Typography>
                ) : (
                  <Stack spacing={1.5}>
                    {audit.map((a, i) => (
                      <Box
                        key={i}
                        sx={{
                          borderLeft: "3px solid",
                          borderColor: "divider",
                          pl: 1.5,
                        }}
                      >
                        <Typography variant='body2'>{a.text}</Typography>
                        <Typography variant='caption' color='text.secondary'>
                          {fmt(a.at)} · {a.actor}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Paper>

              <Typography variant='h6'>Intressenter</Typography>
              {data.stakeholders.length === 0 ? (
                <Typography color='text.secondary'>
                  Inga intressenter.
                </Typography>
              ) : (
                data.stakeholders.map((s) => (
                  <Card key={s.id} variant='outlined'>
                    <CardContent>
                      <Typography variant='subtitle1'>
                        {s.organizationName ||
                          `${s.firstName ?? ""} ${s.lastName ?? ""}`.trim() ||
                          "—"}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {s.role} · {s.externalIdType}
                      </Typography>
                      <Box sx={{ ...gridSx, mt: 0.5 }}>
                        <Field label='Adress' value={s.address} />
                        <Field label='Postnr' value={s.zipCode} />
                        <Field label='Ort' value={s.city} />
                        {s.contactChannels?.map((c, i) => (
                          <Field
                            key={i}
                            label={c.key ?? "Kontakt"}
                            value={c.value}
                          />
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                ))
              )}

              <Typography variant='h6'>Bilagor</Typography>
              {data.attachments.length === 0 ? (
                <Typography color='text.secondary'>Inga bilagor.</Typography>
              ) : (
                <Stack spacing={1}>
                  {data.attachments.map((a) => (
                    <Card key={a.id} variant='outlined'>
                      <CardContent
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 2,
                          "&:last-child": { pb: 2 },
                        }}
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Typography noWrap>{a.fileName ?? a.id}</Typography>
                          <Typography variant='caption' color='text.secondary'>
                            {[
                              a.mimeType,
                              a.fileSize
                                ? `${Math.round(a.fileSize / 1024)} kB`
                                : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </Typography>
                        </Box>
                        <Button
                          href={adminAttachmentDownloadUrl(id!, a.id!)}
                          download
                          startIcon={<DownloadOutlined />}
                          sx={{ flexShrink: 0 }}
                        >
                          Ladda ner
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )}
            </Stack>

            <Stack spacing={2}>
              <Paper sx={{ p: 2 }}>
                <Typography variant='h6' sx={{ pb: 1 }}>
                  Handläggare
                </Typography>
                <Field
                  label='Tilldelad'
                  value={
                    assignedToMe ? `${data.errand.assignedUserId} (du)` : data.errand.assignedUserId
                  }
                />
                {!assignedToMe && (
                  <Button
                    variant='contained'
                    color='secondary'
                    fullWidth
                    startIcon={<AssignmentIndOutlined />}
                    disabled={assign.isPending}
                    onClick={assignSelf}
                    sx={{ mt: 1.5 }}
                  >
                    {data.errand.assignedUserId
                      ? "Ta över ärendet"
                      : "Tilldela mig själv"}
                  </Button>
                )}
              </Paper>

              <Paper sx={{ p: 2 }}>
                <Typography variant='h6' sx={{ pb: 2 }}>
                  Handläggningsprocess
                </Typography>
                <StatusStepper
                  statusHistory={data.statusHistory}
                  createdAt={data.errand.created}
                />
              </Paper>
            </Stack>
          </Box>
        )}
      </Box>
    </Wrapper>
  );
}
