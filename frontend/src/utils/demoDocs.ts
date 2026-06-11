// Demo documents, gated by audience:
//   • citizen/<Person>/…  → shown ONLY to that logged-in mock citizen
//   • employee/…          → shown to logged-in handläggare
//
// Happy path is tested with KARIN BOSTRÖM only (Skatteverket test-pnr) — she has
// the clean valid set (BSK + kursintyg). ANNA SUNDBERG has only faulty documents,
// for demoing avslag/komplettering/manuell granskning. Each also has a demoguide.

// --- Karin Boström (TIMRÅ BÖLE 1:10) — happy path ---
import bostromDemoguide from "@/assets/documents/citizen/Bostrom/Demoguide_Bostrom_Ansokan.pdf";
import bostromBsk from "@/assets/documents/citizen/Bostrom/BSK_Kopmangatan_5.pdf";
import bostromKursintyg from "@/assets/documents/citizen/Bostrom/Kursintyg_Bostrom.pdf";

// --- Anna Sundberg (SUNDSVALL STENSTADEN 1:23) — faulty paths only ---
import sundbergDemoguide from "@/assets/documents/citizen/Sundberg/Demoguide_Sundberg_Ansokan.pdf";
import sundbergBskAnmarkning from "@/assets/documents/citizen/Sundberg/BSK_Storgatan_Anmarkning.pdf";
import sundbergKursintygFelNamn from "@/assets/documents/citizen/Sundberg/Kursintyg_FelNamn.pdf";
import sundbergKursintygFelUtbildning from "@/assets/documents/citizen/Sundberg/Kursintyg_FelUtbildning_Sundberg.pdf";

// --- Handläggare (employee) ---
import handlaggningDemoguide from "@/assets/documents/employee/Demoguide_Handlaggning.pdf";

export interface DemoDoc {
  label: string;
  href: string;
}

export interface PersonDocs {
  /** Guide for this citizen's demo run. */
  demoguide?: string;
  /** Valid brandskyddskontroll for the applicant's property. */
  bsk?: string;
  /** Valid kursintyg / utbildningsintyg for the applicant. */
  kursintyg?: string;
  /** Deliberately "bad" documents to demo the non-happy paths. */
  faulty: DemoDoc[];
}

// Keyed by the citizen's realEstateDescription — unique per test person, and the
// exact fastighet each document must match. (Normalised to upper-case on lookup.)
const DEMO_DOCS_BY_FASTIGHET: Record<string, PersonDocs> = {
  // Karin Boström — the happy-path person (Skatteverket test-pnr); no faulty docs.
  "TIMRÅ BÖLE 1:10": {
    demoguide: bostromDemoguide,
    bsk: bostromBsk,
    kursintyg: bostromKursintyg,
    faulty: [],
  },
  // Anna Sundberg — faulty documents only (no valid BSK/kursintyg).
  "SUNDSVALL STENSTADEN 1:23": {
    demoguide: sundbergDemoguide,
    faulty: [
      { label: "BSK – med anmärkning", href: sundbergBskAnmarkning },
      { label: "Kursintyg – fel namn", href: sundbergKursintygFelNamn },
      { label: "Kursintyg – fel utbildning", href: sundbergKursintygFelUtbildning },
    ],
  },
};

/** The demo documents for the logged-in test citizen (empty set if unknown). */
export function demoDocsForCitizen(
  citizen?: { realEstateDescription?: string | null } | null,
): PersonDocs {
  const key = citizen?.realEstateDescription?.trim().toUpperCase() ?? "";
  return DEMO_DOCS_BY_FASTIGHET[key] ?? { faulty: [] };
}

/** Demo documents shown to a logged-in handläggare. */
export const EMPLOYEE_DEMO_DOCS: DemoDoc[] = [
  { label: "Demoguide – Handläggning", href: handlaggningDemoguide },
];
