import type { EgensotningDetails } from '@/api/api-service';

type Severity = 'success' | 'info' | 'warning' | 'error';

const REASON_TEXT: Record<string, string> = {
  NOT_REGISTERED: 'du inte är folkbokförd på fastigheten',
  REAPPLICATION_REJECTED: 'en tidigare ansökan avslogs',
  REAPPLICATION_ONGOING: 'en tidigare ansökan redan pågår',
};

/** Friendly Swedish message describing the current verification outcome. */
export function outcomeMessage(
  details?: EgensotningDetails | null,
): { severity: Severity; text: string } | null {
  if (!details?.lastOutcome) return null;
  switch (details.lastOutcome) {
    case 'AUTO_APPROVE':
      return { severity: 'success', text: 'Ansökan uppfyller kraven och har godkänts automatiskt.' };
    case 'NEEDS_SUPPLEMENT':
      return {
        severity: 'warning',
        text: 'Något saknas i ansökan (t.ex. en bilaga). En komplettering behövs.',
      };
    case 'NEEDS_MANUAL_REVIEW': {
      const reason = REASON_TEXT[details.manualReviewReason ?? ''] ?? 'ärendet kräver en manuell bedömning';
      return { severity: 'info', text: `Ansökan granskas manuellt eftersom ${reason}.` };
    }
    default:
      return null;
  }
}
