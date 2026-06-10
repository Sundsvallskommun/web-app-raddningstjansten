// Demo documents for testing the egensotning happy path, gated to the logged-in
// test citizen: each person only sees the documents that match THEIR application
// (name + personnummer + fastighet) — i.e. the ones that can pass Eneo's (LLM)
// document validation.
//
// IMPORTANT — what a PDF must contain to pass Eneo: matching the application, it
// must hold the applicant's full NAME, PERSONNUMMER and FASTIGHETSBETECKNING/adress,
// and be the right document type (brandskyddskontroll / kursintyg). The current
// demo PDFs are the correct type but LACK the personnummer, which is exactly why
// Eneo rejects them. Add a person's files below once they contain those fields.

import bskBostrom from "@/assets/BSK_Kopmangatan_5.pdf";
import kursintygBostrom from "@/assets/Kursintyg_Bostrom.pdf";
import kursintygSundberg from "@/assets/Kursintyg_Sundell.pdf";
import bskAnmarkning from "@/assets/BSK_Kopmangatan_5_Anmarkning.pdf";
import kursintygFelNamn from "@/assets/Kursintyg_FelNamn.pdf";
import kursintygFelUtbildning from "@/assets/Kursintyg_FelUtbildning_Bostrom.pdf";

export interface PersonDocs {
  /** Brandskyddskontroll (BSK) for the applicant's property. */
  bsk?: string;
  /** Kursintyg / utbildningsintyg for the applicant. */
  kursintyg?: string;
}

export interface DemoDoc {
  label: string;
  href: string;
}

// Faulty example documents — kept so the demo can also show the non-happy paths
// (avslag / komplettering / manuell granskning). Not person-specific; offered to
// every test user as deliberate "bad input".
export const FAULTY_DEMO_DOCS: DemoDoc[] = [
  { label: "BSK – med anmärkning", href: bskAnmarkning },
  { label: "Kursintyg – fel namn", href: kursintygFelNamn },
  { label: "Kursintyg – fel utbildning", href: kursintygFelUtbildning },
];

// Keyed by the citizen's realEstateDescription — unique per test person, and the
// exact fastighet each document must match. (Normalised to upper-case on lookup.)
const DEMO_DOCS_BY_FASTIGHET: Record<string, PersonDocs> = {
  // Karin Boström (pnr ...2475)
  "TIMRÅ BÖLE 1:10": { bsk: bskBostrom, kursintyg: kursintygBostrom },
  // Anna Sundberg (pnr ...0014) — add files once they carry her name + pnr + fastighet:
  "SUNDSVALL STENSTADEN 1:23": { kursintyg: kursintygSundberg },
  // Erik Lindqvist (pnr ...0219):
  // "SUNDSVALL HAGA 4:5": { bsk: bskLindqvist, kursintyg: kursintygLindqvist },
};

/** The demo documents (if any) for the logged-in test citizen. */
export function demoDocsForCitizen(
  citizen?: { realEstateDescription?: string | null } | null,
): PersonDocs {
  const key = citizen?.realEstateDescription?.trim().toUpperCase() ?? "";
  return DEMO_DOCS_BY_FASTIGHET[key] ?? {};
}
