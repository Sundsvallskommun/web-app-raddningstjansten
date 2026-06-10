import { Box, Button, MenuItem, Stack, TextField } from "@mui/material";
import { FilterAltOffOutlined } from "@mui/icons-material";
import {
  emptyErrandFilters,
  hasActiveFilters,
  statusOptions,
  type Audience,
  type ErrandFilterState,
} from "@/utils/errandFilter";

/**
 * Filter bar shown above an errand table. Controlled — the parent owns the state
 * and applies it (client-side) to the list. Used by both the citizen and admin
 * errand lists.
 */
export function ErrandFilters({
  value,
  onChange,
  audience,
}: {
  value: ErrandFilterState;
  onChange: (next: ErrandFilterState) => void;
  audience: Audience;
}) {
  const set = (patch: Partial<ErrandFilterState>) =>
    onChange({ ...value, ...patch });

  const slotProps = {
    inputLabel: {
      shrink: true,
    },
  };

  return (
    <Box>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        alignItems={{ md: "center" }}
        useFlexGap
        flexWrap='nowrap'
      >
        <TextField
          label='Titel'
          size='small'
          value={value.title}
          onChange={(e) => set({ title: e.target.value })}
        />
        <TextField
          select
          label='Status'
          size='small'
          value={value.status}
          onChange={(e) => set({ status: e.target.value })}
          sx={{ minWidth: 190 }}
        >
          <MenuItem value=''>Alla</MenuItem>
          {statusOptions(audience).map((o) => (
            <MenuItem key={o.value} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label={audience === "admin" ? "Sökande (e-post)" : "Sökande"}
          size='small'
          value={value.applicant}
          onChange={(e) => set({ applicant: e.target.value })}
        />
        <TextField
          label='Från'
          type='date'
          size='small'
          value={value.dateFrom}
          onChange={(e) => set({ dateFrom: e.target.value })}
          slotProps={slotProps}
          sx={{ minWidth: "162px" }}
        />
        <TextField
          label='Till'
          type='date'
          size='small'
          value={value.dateTo}
          onChange={(e) => set({ dateTo: e.target.value })}
          slotProps={slotProps}
          sx={{ minWidth: "162px" }}
        />
        <Button
          size='small'
          startIcon={<FilterAltOffOutlined />}
          disabled={!hasActiveFilters(value)}
          onClick={() => onChange(emptyErrandFilters)}
        >
          Rensa
        </Button>
      </Stack>
    </Box>
  );
}
