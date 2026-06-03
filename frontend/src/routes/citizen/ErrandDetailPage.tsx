import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import {
  ArrowBack,
  DeleteOutline,
  DownloadOutlined,
  UploadFileOutlined,
} from "@mui/icons-material";
import { apiService, citizenAttachmentDownloadUrl } from "@/api/api-service";
import { useCitizenErrand, useSupplementErrand } from "@/api/queries";
import { useAuth } from "@/auth/AuthContext";
import { Wrapper } from "@/components/Wrapper";
import { ErrandStatusChip } from "@/components/ErrandStatusChip";
import { StatusStepper } from "@/components/StatusStepper";
import { DecisionPdfCard } from "@/components/DecisionPdfCard";
import { ServiceError } from "@/components/ServiceError";
import { markSeen } from "@/utils/seenErrands";
import {
  applicantName,
  attachmentCategoryLabel,
  outcomeMessage,
} from "@/utils/egensotning";

const fmt = (s?: string) => (s ? new Date(s).toLocaleString("sv-SE") : "—");

// Two-column detail layout: main content (~75%) + process sidebar (~25%).
const detailLayoutSx = {
  display: "grid",
  gridTemplateColumns: { xs: "1fr", md: "minmax(0, 3fr) minmax(0, 1fr)" },
  gap: 2,
  alignItems: "start",
} as const;

export function CitizenErrandDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, clear } = useAuth();
  const { data, isLoading: loading, isError, error, refetch, isFetching } = useCitizenErrand(id);
  const supplement = useSupplementErrand(id ?? "");

  // Komplettering
  const [files, setFiles] = useState<File[]>([]);
  const [supplementMsg, setSupplementMsg] = useState<string | null>(null);

  // Clear the "updated" badge whenever fresh data arrives (incl. polling).
  useEffect(() => {
    if (data) markSeen(data.errand.id, data.errand.modified);
  }, [data]);

  async function logout() {
    await apiService.post("/citizen/logout");
    clear();
    navigate("/", { replace: true });
  }

  const onFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])]);
    e.target.value = "";
  };

  async function sendSupplement() {
    if (files.length === 0) return;
    setSupplementMsg(null);
    try {
      await supplement.mutateAsync(files);
      setFiles([]);
      setSupplementMsg(
        "Kompletteringen är inskickad. Ärendet granskas på nytt.",
      );
    } catch (err) {
      setSupplementMsg(
        err instanceof Error
          ? err.message
          : "Kunde inte skicka kompletteringen.",
      );
    }
  }

  const outcome = data ? outcomeMessage(data.details) : null;
  const needsSupplement = data?.errand.status === "AWAITING_SUPPLEMENTATION";
  const isDecided =
    data?.errand.status === "DECIDED" || data?.errand.status === "REJECTED";
  // Once a decision exists the beslut card tells the story — don't also show the
  // in-progress outcome message.
  const showOutcome = !!outcome && !isDecided;

  return (
    <Wrapper
      title='Räddningstjänsten Medelpad - Ärende'
      logout={logout}
      color='primary'
      user={user}
      showNav
      navType='citizen'
    >
      <Box>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate("/errands")}
          sx={{ mb: 2 }}
        >
          Mina ärenden
        </Button>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress />
          </Box>
        ) : isError ? (
          <ServiceError error={error} onRetry={() => refetch()} isRetrying={isFetching} />
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
                  <ErrandStatusChip status={data.errand.status} audience='citizen' />
                </Stack>
                {applicantName(data.stakeholders) && (
                  <Typography variant='subtitle1'>
                    {applicantName(data.stakeholders)}
                  </Typography>
                )}
                {showOutcome && outcome && (
                  <Alert severity={outcome.severity} sx={{ mt: 2 }}>
                    {outcome.text}
                  </Alert>
                )}
              </Paper>

              {isDecided && id && <DecisionPdfCard errandId={id} role='citizen' />}

              {needsSupplement && (
                <Paper
                  sx={{
                    p: 3,
                    borderColor: "warning.main",
                    borderWidth: 1,
                    borderStyle: "solid",
                  }}
                >
                  <Typography variant='h6' gutterBottom>
                    Komplettera ärendet
                  </Typography>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                    gutterBottom
                  >
                    {data.details?.bilagaPresent === false
                      ? "En bilaga saknas. Ladda upp efterfrågat dokument (t.ex. kursbevis) nedan."
                      : "Ladda upp de dokument som efterfrågats så granskas ärendet på nytt."}
                  </Typography>
                  {supplementMsg && (
                    <Alert severity='info' sx={{ my: 1 }}>
                      {supplementMsg}
                    </Alert>
                  )}
                  <Box sx={{ mt: 1 }}>
                    <Button
                      component='label'
                      variant='outlined'
                      startIcon={<UploadFileOutlined />}
                    >
                      Välj filer
                      <input
                        hidden
                        type='file'
                        multiple
                        accept='.pdf,.jpg,.jpeg,.doc,.docx'
                        onChange={onFilesSelected}
                      />
                    </Button>
                  </Box>
                  {files.length > 0 && (
                    <Stack spacing={0.5} sx={{ mt: 1 }}>
                      {files.map((f, i) => (
                        <Stack
                          key={`${f.name}-${i}`}
                          direction='row'
                          alignItems='center'
                          justifyContent='space-between'
                          sx={{
                            border: "1px solid",
                            borderColor: "divider",
                            borderRadius: 1,
                            px: 1.5,
                            py: 0.5,
                          }}
                        >
                          <Typography variant='body2' noWrap sx={{ mr: 1 }}>
                            {f.name} ({Math.round(f.size / 1024)} kB)
                          </Typography>
                          <IconButton
                            size='small'
                            aria-label='Ta bort fil'
                            onClick={() =>
                              setFiles((prev) => prev.filter((_, j) => j !== i))
                            }
                          >
                            <DeleteOutline fontSize='small' />
                          </IconButton>
                        </Stack>
                      ))}
                    </Stack>
                  )}
                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant='contained'
                      disabled={supplement.isPending || files.length === 0}
                      onClick={sendSupplement}
                    >
                      {supplement.isPending ? (
                        <CircularProgress size={24} />
                      ) : (
                        "Skicka komplettering"
                      )}
                    </Button>
                  </Box>
                </Paper>
              )}

              <Typography variant='h6'>Sotningsobjekt</Typography>
              {data.sotningsobjekt.length === 0 ? (
                <Typography color='text.secondary'>
                  Inga objekt registrerade.
                </Typography>
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
                          {attachmentCategoryLabel(a.category) && (
                            <Chip
                              label={attachmentCategoryLabel(a.category)}
                              size='small'
                              color='primary'
                              variant='outlined'
                              sx={{ mb: 0.5 }}
                            />
                          )}
                          <Typography noWrap>{a.fileName ?? a.id}</Typography>
                        </Box>
                        <Button
                          href={citizenAttachmentDownloadUrl(id!, a.id!)}
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

              {data.decisions.length > 0 && (
                <>
                  <Divider />
                  <Typography variant='h6'>Beslut</Typography>
                  {data.decisions.map((d) => (
                    <Card key={d.id} variant='outlined'>
                      <CardContent>
                        <Typography variant='subtitle1'>
                          {d.value ?? d.decisionType}
                        </Typography>
                        {d.description && (
                          <Typography variant='body2'>
                            {d.description}
                          </Typography>
                        )}
                        <Typography variant='caption' color='text.secondary'>
                          {fmt(d.created)}
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}
            </Stack>

            <Stack spacing={2}>
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
