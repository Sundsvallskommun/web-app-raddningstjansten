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
  DECISION: 'Beslut',
  OTHER: 'Övrig bilaga',
};

export function attachmentCategoryLabel(category?: AttachmentCategory): string | null {
  return category ? ATTACHMENT_CATEGORY_LABEL[category] ?? null : null;
}

type Severity = 'success' | 'info' | 'warning' | 'error';
type Audience = 'citizen' | 'admin';

// Manual-review reasons are only shown to the handläggare. The applicant never
// sees why their errand is under review — to them it is simply "being handled".
const ADMIN_REASON_TEXT: Record<string, string> = {
  NOT_REGISTERED: 'den sökande inte är folkbokförd på fastigheten',
  OWNER_NOT_REGISTERED: 'den sökande inte är folkbokförd på fastigheten',
  REAPPLICATION_REJECTED: 'en tidigare ansökan avslogs',
  REAPPLICATION_ONGOING: 'en tidigare ansökan redan pågår',
  ACTIVE_PERMIT_EXISTS: 'det redan finns ett aktivt tillstånd',
};

/**
 * Friendly message describing the errand's current state. Driven by the actual
 * status, not by `lastOutcome` — `lastOutcome === 'AUTO_APPROVE'` is only the
 * verify routing result; the final decision still depends on the document
 * validation (Eneo). So an "AUTO_APPROVE" errand that is still in review is shown
 * as "handläggs", never as approved. A decided errand returns null (its decision
 * card tells the story).
 */
export function outcomeMessage(
  details: EgensotningDetails | null | undefined,
  status: string | undefined,
  audience: Audience = 'citizen',
): { severity: Severity; text: string } | null {
  if (!details || !status) return null;
  if (status === 'DECIDED' || status === 'REJECTED' || status === 'REVOKED') return null;

  if (status === 'AWAITING_SUPPLEMENTATION') {
    return {
      severity: 'warning',
      text: 'Något saknas i ansökan (t.ex. en bilaga). En komplettering behövs.',
    };
  }

  if (status === 'UNDER_MANUAL_REVIEW') {
    if (audience === 'citizen') {
      return {
        severity: 'info',
        text: 'Din ansökan handläggs. Handläggaren kan behöva kontrollera kompletterande uppgifter, till exempel om fastigheten.',
      };
    }
    // Document validation failed (Eneo/LLM) — show its actual reasoning if present.
    if (details.documentsValid === false) {
      const detail = details.documentValidationDetail?.trim();
      return {
        severity: 'warning',
        text: detail
          ? `Dokumentvalideringen (Eneo) underkändes: ${detail}`
          : 'Granskas manuellt — dokumenten kunde inte verifieras automatiskt mot sökanden.',
      };
    }
    const reason = ADMIN_REASON_TEXT[details.manualReviewReason ?? ''] ?? 'ärendet kräver en manuell bedömning';
    return { severity: 'info', text: `Ansökan granskas manuellt eftersom ${reason}.` };
  }

  // REGISTERED / NEW / ONGOING — verification/processing still running.
  return { severity: 'info', text: 'Din ansökan behandlas.' };
}
