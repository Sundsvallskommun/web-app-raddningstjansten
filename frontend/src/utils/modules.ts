/**
 * Errand modules (types). Single source of truth for the side-nav sub-items and
 * the per-module list scoping. Add a module here and it appears in the nav and
 * becomes selectable in the errand lists — currently only egensotning exists.
 */
export interface ErrandModule {
  /** URL slug used in `?module=` */
  slug: string;
  /** Display label */
  label: string;
  /** rtj-management errand type */
  typeSlug: string;
}

export const ERRAND_MODULES: ErrandModule[] = [
  { slug: "egensotning", label: "Egensotning", typeSlug: "EGENSOTNING" },
];

export const moduleBySlug = (slug: string | null): ErrandModule | undefined =>
  slug ? ERRAND_MODULES.find(m => m.slug === slug) : undefined;
