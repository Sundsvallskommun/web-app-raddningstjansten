import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isUuid } from '@/utils/uuid';
import {
  adminDecision,
  assignErrand,
  fetchAdminErrand,
  fetchAdminErrands,
  fetchCitizenErrand,
  fetchEngagements,
  fetchMyErrands,
  revokeDecision,
  submitApplication,
  supplementErrand,
  updateErrand,
  type ApplicationAttachments,
  type EgensotningApplicationInput,
  type EgensotningUpdateInput,
  type ErrandDetail,
} from './api-service';

/** Centralised query keys so invalidation stays consistent. */
export const qk = {
  engagements: ['engagements'] as const,
  myErrands: ['myErrands'] as const,
  citizenErrand: (id: string) => ['citizenErrand', id] as const,
  adminErrands: (page: number, size: number) => ['adminErrands', page, size] as const,
  adminErrand: (id: string) => ['adminErrand', id] as const,
};

const TERMINAL = new Set(['DECIDED', 'REJECTED']);
const isTerminal = (status?: string) => !!status && TERMINAL.has(status);

// Poll an errand detail while it is still moving through the process, so the
// async re-verification / decision shows up without a manual refresh.
const detailRefetchInterval = (data?: ErrandDetail) => (isTerminal(data?.errand.status) ? false : 5000);

// ---- Queries ----

export function useEngagements() {
  return useQuery({ queryKey: qk.engagements, queryFn: fetchEngagements, staleTime: 5 * 60_000 });
}

export function useMyErrands() {
  return useQuery({ queryKey: qk.myErrands, queryFn: fetchMyErrands });
}

export function useCitizenErrand(id?: string) {
  return useQuery({
    queryKey: qk.citizenErrand(id ?? ''),
    queryFn: () => fetchCitizenErrand(id!),
    enabled: isUuid(id),
    refetchInterval: query => detailRefetchInterval(query.state.data),
  });
}

export function useAdminErrands(page: number, size: number) {
  return useQuery({
    queryKey: qk.adminErrands(page, size),
    queryFn: () => fetchAdminErrands(page, size),
    placeholderData: keepPreviousData,
  });
}

export function useAdminErrand(id?: string) {
  return useQuery({
    queryKey: qk.adminErrand(id ?? ''),
    queryFn: () => fetchAdminErrand(id!),
    enabled: isUuid(id),
    refetchInterval: query => detailRefetchInterval(query.state.data),
  });
}

// ---- Mutations (invalidate -> automatic refetch) ----

export function useSubmitApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { application: EgensotningApplicationInput; attachments: ApplicationAttachments }) =>
      submitApplication(vars.application, vars.attachments),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.myErrands }),
  });
}

export function useUpdateErrand(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: EgensotningUpdateInput) => updateErrand(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.citizenErrand(id) });
      qc.invalidateQueries({ queryKey: qk.myErrands });
    },
  });
}

export function useSupplementErrand(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (files: File[]) => supplementErrand(id, files),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.citizenErrand(id) });
      qc.invalidateQueries({ queryKey: qk.myErrands });
    },
  });
}

export function useAdminDecision(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { approved: boolean; decisionText?: string }) =>
      adminDecision(id, vars.approved, vars.decisionText),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.adminErrand(id) });
      qc.invalidateQueries({ queryKey: ['adminErrands'] });
    },
  });
}

export function useAssignErrand(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => assignErrand(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.adminErrand(id) });
      qc.invalidateQueries({ queryKey: ['adminErrands'] });
    },
  });
}

export function useRevokeDecision(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) => revokeDecision(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.adminErrand(id) });
      qc.invalidateQueries({ queryKey: ['adminErrands'] });
    },
  });
}
