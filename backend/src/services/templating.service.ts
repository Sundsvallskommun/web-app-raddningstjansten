import { EGENSOTNING_DECISION_TEMPLATE, getApiBase, MUNICIPALITY_ID } from '@config';
import { maskPersonNumber } from '@utils/util';
import ApiService from './api.service';
import { RenderRequest, RenderResponse } from '@/data-contracts/templating/data-contracts';
import { Decision, EgensotningDetails, Errand, Sotningsobjekt, Stakeholder } from '@/data-contracts/rtj-management/data-contracts';

/** Everything needed to render an egensotning decision document. */
export interface DecisionContext {
  errand: Errand;
  details: EgensotningDetails | null;
  sotningsobjekt: Sotningsobjekt[];
  stakeholders: Stakeholder[];
  decisions?: Decision[];
  approved: boolean;
  decisionText?: string;
  decidedBy?: string;
}

/**
 * Renders decision documents from the Templating 2.1 API (WSO2-subscribed, so it
 * reuses ApiService's bearer-token flow). `render`/`render/pdf` return the output
 * as a BASE64 string (HTML resp. PDF).
 */
export class TemplatingService {
  private readonly api = new ApiService();

  private templateId(): string {
    return EGENSOTNING_DECISION_TEMPLATE || 'egensotning-beslut';
  }

  private base(): string {
    return `${getApiBase('templating')}/${MUNICIPALITY_ID}`;
  }

  private applicantName(stakeholders: Stakeholder[]): string {
    const a = stakeholders.find(s => s.role === 'APPLICANT') ?? stakeholders[0];
    if (!a) return '';
    return a.organizationName || `${a.firstName ?? ''} ${a.lastName ?? ''}`.trim();
  }

  /** Assemble the Pebble template parameters (personnummer is always masked). */
  public buildDecisionParams(ctx: DecisionContext): Record<string, unknown> {
    const { errand, details, sotningsobjekt, stakeholders, decisions, approved, decisionText, decidedBy } = ctx;
    const latestDecision = (decisions ?? [])
      .slice()
      .sort((a, b) => (b.created ?? '').localeCompare(a.created ?? ''))[0];
    const decisionDateSource = latestDecision?.created ?? errand.modified;
    const decisionDate = new Date(decisionDateSource ?? Date.now()).toLocaleDateString('sv-SE');
    const pnSource = details?.personnummer ?? stakeholders.find(s => s.externalIdType === 'PERSON')?.externalId;

    return {
      decisionDate,
      errandNumber: errand.errandNumber ?? errand.id ?? '',
      decisionId: latestDecision?.id ?? errand.id ?? '',
      applicantName: this.applicantName(stakeholders),
      personnummer: maskPersonNumber(pnSource) ?? '',
      fastighetsbeteckning: details?.fastighetsbeteckning ?? '',
      propertyAddress: details?.propertyAddress ?? '',
      approved,
      sotningsobjekt: sotningsobjekt.map(o => ({
        typ: o.typ ?? '',
        fabrikat: o.fabrikat ?? '',
        tillverkningsar: o.tillverkningsar ?? '',
        bransleslag: o.bransleslag ?? '',
        branslemangd: o.branslemangd ?? '',
        sotningsintervallVeckor: o.sotningsintervallVeckor ?? '',
      })),
      decisionText: decisionText ?? '',
      decidedBy: decidedBy ?? errand.assignedUserId ?? '',
    };
  }

  private async render(path: 'render' | 'render/pdf', parameters: Record<string, unknown>): Promise<string> {
    const body: RenderRequest = { identifier: this.templateId(), parameters };
    const res = await this.api.post<RenderResponse, RenderRequest>({ url: `${this.base()}/${path}`, data: body });
    return res.data.output ?? '';
  }

  /** Rendered decision as an HTML string (for the preview dialog). */
  public async renderHtml(ctx: DecisionContext): Promise<string> {
    const out = await this.render('render', this.buildDecisionParams(ctx));
    return Buffer.from(out, 'base64').toString('utf8');
  }

  /** Rendered decision as a PDF buffer. */
  public async renderPdf(ctx: DecisionContext): Promise<Buffer> {
    const out = await this.render('render/pdf', this.buildDecisionParams(ctx));
    return Buffer.from(out, 'base64');
  }
}
