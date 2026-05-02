/**
 * Display names + maturity levels for the platform's 27 products.
 *
 * Duplicates stable platform metadata. Update when the platform adds a
 * new product. Single source of truth on the platform side is
 * `apps/functions/src/shared/partnerPlans.ts` (slugs only) +
 * product-specific runners (maturity options).
 *
 * #325 F19.
 */

export interface ProductMeta {
  slug: string
  label: string
  /** Maturity options. Empty array = single-tier product (no selector). */
  maturityLevels: { value: string; label: string }[]
}

export const PRODUCT_CATALOG: ProductMeta[] = [
  // ── Assessments (12) ────────────────────────────────────────────────
  { slug: 'e8', label: 'Essential Eight (ASD)', maturityLevels: [
    { value: 'ml1', label: 'ML1 — Maturity Level 1' },
    { value: 'ml2', label: 'ML2 — Maturity Level 2' },
    { value: 'ml3', label: 'ML3 — Maturity Level 3' },
  ] },
  { slug: 'mcsb', label: 'Microsoft Cloud Security Benchmark v2', maturityLevels: [] },
  { slug: 'cism365', label: 'CIS Microsoft 365 Benchmark', maturityLevels: [
    { value: 'level-1', label: 'Level 1' },
    { value: 'level-2', label: 'Level 2' },
  ] },
  { slug: 'copilot', label: 'Microsoft 365 Copilot Readiness', maturityLevels: [] },
  { slug: 'cps234', label: 'APRA CPS 234 Information Security', maturityLevels: [] },
  { slug: 'ransomware', label: 'Ransomware Resilience', maturityLevels: [] },
  { slug: 'powerplatform', label: 'Power Platform Security', maturityLevels: [] },
  { slug: 'nist-csf', label: 'NIST Cybersecurity Framework 2.0', maturityLevels: [
    { value: 'tier-1', label: 'Tier 1 — Partial' },
    { value: 'tier-2', label: 'Tier 2 — Risk Informed' },
    { value: 'tier-3', label: 'Tier 3 — Repeatable' },
    { value: 'tier-4', label: 'Tier 4 — Adaptive' },
  ] },
  { slug: 'cmmc', label: 'CMMC — Cybersecurity Maturity Model Certification', maturityLevels: [
    { value: 'level-1', label: 'Level 1' },
    { value: 'level-2', label: 'Level 2' },
  ] },
  { slug: 'nis2', label: 'EU NIS2 Directive Article 21', maturityLevels: [] },
  { slug: 'cyber-essentials', label: 'UK Cyber Essentials', maturityLevels: [
    { value: 'ce', label: 'CE — Cyber Essentials' },
    { value: 'ce-plus', label: 'CE+ — Cyber Essentials Plus' },
  ] },
  { slug: 'mas-trm', label: 'MAS Technology Risk Management', maturityLevels: [] },

  // ── Security Packs (7) ──────────────────────────────────────────────
  { slug: 'entra-hardening', label: 'Entra ID Hardening', maturityLevels: [] },
  { slug: 'email-security', label: 'Email Security', maturityLevels: [] },
  { slug: 'sharepoint-oversharing', label: 'SharePoint Oversharing', maturityLevels: [] },
  { slug: 'finance', label: 'Finance Security', maturityLevels: [] },
  { slug: 'legal', label: 'Legal Services Security', maturityLevels: [] },
  { slug: 'endpoint-intune', label: 'Endpoint / Intune', maturityLevels: [] },
  { slug: 'healthcare', label: 'Healthcare Security', maturityLevels: [] },

  // ── Intelligence Reports (4) ────────────────────────────────────────
  { slug: 'cyber-insurance', label: 'Cyber Insurance Readiness', maturityLevels: [] },
  { slug: 'board-risk', label: 'Board Cyber Risk', maturityLevels: [] },
  { slug: 'investor-ready', label: 'Investor-Ready Security', maturityLevels: [] },
  { slug: 'aicd-governance', label: 'AICD Governance', maturityLevels: [] },

  // ── Productivity Modules (4) ────────────────────────────────────────
  { slug: 'licence-optimisation', label: 'Licence Optimisation', maturityLevels: [] },
  { slug: 'adoption-usage', label: 'Adoption & Usage', maturityLevels: [] },
  { slug: 'copilot-roi', label: 'Copilot ROI', maturityLevels: [] },
  { slug: 'tenant-health', label: 'Tenant Health', maturityLevels: [] },
]

const BY_SLUG = new Map(PRODUCT_CATALOG.map((p) => [p.slug, p]))

/** Look up a product by slug. Returns the slug as label if not found
 *  (defensive — better to render an unknown product than throw). */
export function productMeta(slug: string): ProductMeta {
  return BY_SLUG.get(slug) ?? { slug, label: slug, maturityLevels: [] }
}

/** Filter the catalog down to the slugs the partner is allowed to use. */
export function allowedProducts(slugs: string[]): ProductMeta[] {
  const set = new Set(slugs)
  return PRODUCT_CATALOG.filter((p) => set.has(p.slug))
}
