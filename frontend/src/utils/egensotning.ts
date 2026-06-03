import type { AttachmentCategory, EgensotningDetails, Stakeholder } from '@/api/api-service';

/** The applicant's display name, taken from the APPLICANT stakeholder. */
export function applicantName(stakeholders: Stakeholder[]): string | null {
  const a = stakeholders.find(s => s.role === 'APPLICANT') ?? stakeholders[0];
  if (!a) return null;
  const name = a.organizationName || `${a.firstName ?? ''} ${a.lastName ?? ''}`.trim();
  return name || null;
}

// Swedish labels for the attachment category the server tags each upload with.
const ATTACHMENT_CATEGORY_LABEL: Record<AttachmentCategory, string> = {
  BRANDSKYDDSKONTROLL: 'Brandskyddskontroll (BSK)',
  UTBILDNINGSINTYG: 'Utbildningsintyg',
  DELEGATION: 'Fullmakt',
  COMPETENCE: 'Kompetensbevis',
  OTHER: 'Övrig bilaga',
};

export function attachmentCategoryLabel(category?: AttachmentCategory): string | null {
  return category ? ATTACHMENT_CATEGORY_LABEL[category] ?? null : null;
}

type Severity = 'success' | 'info' | 'warning' | 'error';
type Audience = 'citizen' | 'admin';

// Reason phrasing differs by who is reading: the applicant ("du") vs a
// handläggare looking at someone else's errand ("den sökande").
const REASON_TEXT: Record<Audience, Record<string, string>> = {
  citizen: {
    NOT_REGISTERED: 'du inte är folkbokförd på fastigheten',
    REAPPLICATION_REJECTED: 'en tidigare ansökan avslogs',
    REAPPLICATION_ONGOING: 'en tidigare ansökan redan pågår',
  },
  admin: {
    NOT_REGISTERED: 'den sökande inte är folkbokförd på fastigheten',
    REAPPLICATION_REJECTED: 'en tidigare ansökan avslogs',
    REAPPLICATION_ONGOING: 'en tidigare ansökan redan pågår',
  },
};

/** Friendly Swedish message describing the current verification outcome. */
export function outcomeMessage(
  details?: EgensotningDetails | null,
  audience: Audience = 'citizen',
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
      const reason =
        REASON_TEXT[audience][details.manualReviewReason ?? ''] ?? 'ärendet kräver en manuell bedömning';
      return { severity: 'info', text: `Ansökan granskas manuellt eftersom ${reason}.` };
    }
    default:
      return null;
  }
}
