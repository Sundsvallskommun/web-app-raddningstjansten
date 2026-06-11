// Demo documents, gated by audience:
//   • citizen/<Person>/…  → shown ONLY to that logged-in mock citizen
//   • employee/…          → shown to logged-in handläggare
//
// Happy path is tested with KARIN BOSTRÖM only (she has a Skatteverket test
// personnummer). Her documents must hold NAME + PERSONNUMMER + FASTIGHET to pass
// Eneo's LLM validation. Anna Sundberg keeps her remaining (non-personnummer)
// documents for demoing the faulty / non-happy paths. Each citizen also has a
// demoguide; "faulty" variants demo avslag/komplettering/manuell granskning.

// --- Karin Boström (TIMRÅ BÖLE 1:10) ---
import bostromDemoguide from "@/assets/documents/citizen/Bostrom/Demoguide_Bostrom_Ansokan.pdf";
import bostromBsk from "@/assets/documents/citizen/Bostrom/BSK_Kopmangatan_5.pdf";
import bostromKursintyg from "@/assets/documents/citizen/Bostrom/Kursintyg_Bostrom.pdf";
import bostromBskAnmarkning from "@/assets/documents/citizen/Bostrom/BSK_Kopmangatan_5_Anmarkning 1.pdf";
import bostromKursintygFelNamn from "@/assets/documents/citizen/Bostrom/Kursintyg_FelNamn.pdf";

// --- Anna Sundberg (SUNDSVALL STENSTADEN 1:23) ---
import sundbergDemoguide from "@/assets/documents/citizen/Sundberg/Demoguide_Sundberg_Ansokan.pdf";
import sundbergBsk from "@/assets/documents/citizen/Sundberg/BSK_Storgatan.pdf";
import sundbergBskAnmarkning from "@/assets/documents/citizen/Sundberg/BSK_Storgatan_Anmarkning.pdf";
import sundbergKursintygFelNamn from "@/assets/documents/citizen/Sundberg/Kursintyg_FelNamn.pdf";

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
  // Karin Boström — the happy-path person (Skatteverket test-pnr).
  "TIMRÅ BÖLE 1:10": {
    demoguide: bostromDemoguide,
    bsk: bostromBsk,
    kursintyg: bostromKursintyg,
    faulty: [
      { label: "BSK – med anmärkning", href: bostromBskAnmarkning },
      { label: "Kursintyg – fel namn", href: bostromKursintygFelNamn },
    ],
  },
  // Anna Sundberg — non-happy-path only (valid kursintyg removed; it held a real
  // personnummer). Remaining docs are for demoing the faulty paths.
  "SUNDSVALL STENSTADEN 1:23": {
    demoguide: sundbergDemoguide,
    bsk: sundbergBsk,
    faulty: [
      { label: "BSK – med anmärkning", href: sundbergBskAnmarkning },
      { label: "Kursintyg – fel namn", href: sundbergKursintygFelNamn },
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
