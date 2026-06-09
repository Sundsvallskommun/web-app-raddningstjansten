import { useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import { PieChart } from "@mui/x-charts/PieChart";
import { useAdminStatistics } from "@/api/queries";
import { statusLabel } from "@/components/ErrandStatusChip";
import { ServiceError } from "@/components/ServiceError";

type Period = "all" | "30d" | "12m";

function periodRange(p: Period): { from?: string; to?: string } {
  if (p === "all") return {};
  const to = new Date();
  const from = new Date(to);
  if (p === "30d") from.setDate(from.getDate() - 30);
  else from.setMonth(from.getMonth() - 12);
  return { from: from.toISOString(), to: to.toISOString() };
}

/** Human-readable average handling time (seconds → sek/min/tim/dygn). */
function fmtDuration(seconds?: number): string {
  if (seconds == null) return "—";
  if (seconds < 60) return `${Math.round(seconds)} sek`;
  const min = seconds / 60;
  if (min < 60) return `${Math.round(min)} min`;
  const hours = min / 60;
  if (hours < 48) return `${hours.toFixed(1)} tim`;
  return `${(hours / 24).toFixed(1)} dygn`;
}

function statusColor(status?: string): string {
  switch (status) {
    case "DECIDED":
    case "APPROVED":
      return "#2e7d32";
    case "REJECTED":
      return "#d32f2f";
    case "REVOKED":
      return "#9e9e9e";
    case "UNDER_MANUAL_REVIEW":
      return "#ed6c02";
    case "AWAITING_SUPPLEMENTATION":
      return "#f9a825";
    case "ONGOING":
    case "REGISTERED":
    case "NEW":
      return "#0288d1";
    default:
      return "#90a4ae";
  }
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <Card variant='outlined' sx={{ flex: "1 1 150px", minWidth: 150 }}>
      <CardContent>
        <Typography variant='overline' color='text.secondary'>
          {label}
        </Typography>
        <Typography variant='h4'>{value}</Typography>
      </CardContent>
    </Card>
  );
}

const chartCardSx = { flex: "1 1 320px", minWidth: 300 } as const;

/**
 * Workflow statistics for a single errand type (module). Self-contained — it
 * fetches its own scoped stats — so the dashboard can render one panel per errand
 * type as more modules than egensotning are added.
 */
export function ErrandStatistics({
  typeSlug,
  title,
}: {
  typeSlug?: string;
  title: string;
}) {
  const [period, setPeriod] = useState<Period>("all");
  // Memoize so from/to (which call new Date()) only change when the period does —
  // otherwise every render produces new timestamps, churning the query key and
  // causing react-query to refetch endlessly.
  const { from, to } = useMemo(() => periodRange(period), [period]);
  const { data, isLoading, isError, error, refetch, isFetching } = useAdminStatistics(typeSlug, from, to);

  const statusData = useMemo(
    () =>
      (data?.byStatus ?? []).map((s, i) => ({
        id: i,
        value: s.count ?? 0,
        label: statusLabel(s.status),
        color: statusColor(s.status),
      })),
    [data],
  );

  const handlaggare = data?.byHandlaggare ?? [];
  const barLabels = [...handlaggare.map(h => h.handlaggare ?? "—"), "Otilldelade"];
  const barCounts = [...handlaggare.map(h => h.count ?? 0), data?.unassigned ?? 0];
  const isEmpty = (data?.total ?? 0) === 0;

  return (
    <Paper sx={{ p: 3 }}>
      <Stack
        direction='row'
        justifyContent='space-between'
        alignItems='center'
        flexWrap='wrap'
        gap={1}
        sx={{ mb: 2 }}
      >
        <Typography variant='h5'>{title}</Typography>
        <ToggleButtonGroup
          size='small'
          exclusive
          value={period}
          onChange={(_, v) => v && setPeriod(v as Period)}
        >
          <ToggleButton value='all'>Allt</ToggleButton>
          <ToggleButton value='30d'>30 dagar</ToggleButton>
          <ToggleButton value='12m'>12 mån</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      ) : isError ? (
        <ServiceError error={error} onRetry={() => refetch()} isRetrying={isFetching} />
      ) : (
        <Stack spacing={2}>
          <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap>
            <Kpi label='Totalt' value={data?.total ?? 0} />
            <Kpi label='I kö (otilldelade)' value={data?.unassigned ?? 0} />
            <Kpi label='Beslutade' value={data?.decidedCount ?? 0} />
            <Kpi
              label='Snitt handläggningstid'
              value={fmtDuration(data?.averageHandlaggningstidSeconds)}
            />
          </Stack>

          {isEmpty ? (
            <Typography color='text.secondary'>
              Inga ärenden i den valda perioden.
            </Typography>
          ) : (
            <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap>
              <Card variant='outlined' sx={chartCardSx}>
                <CardContent>
                  <Typography variant='subtitle1' gutterBottom>
                    Ärenden per status
                  </Typography>
                  <PieChart
                    series={[
                      {
                        data: statusData,
                        innerRadius: 45,
                        paddingAngle: 2,
                        cornerRadius: 3,
                      },
                    ]}
                    height={260}
                  />
                </CardContent>
              </Card>

              <Card variant='outlined' sx={chartCardSx}>
                <CardContent>
                  <Typography variant='subtitle1' gutterBottom>
                    Ärenden per handläggare
                  </Typography>
                  <BarChart
                    xAxis={[{ scaleType: "band", data: barLabels }]}
                    series={[{ data: barCounts, label: "Ärenden", color: "#0288d1" }]}
                    height={260}
                    hideLegend
                  />
                </CardContent>
              </Card>
            </Stack>
          )}
        </Stack>
      )}
    </Paper>
  );
}
