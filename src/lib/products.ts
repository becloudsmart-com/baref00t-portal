/**
 * Display names + maturity levels for the platform's 32 products.
 *
 * NOTE (#755): the canonical registry is
 * `packages/shared/src/productCatalog.ts` — apps/web derives every product
 * picker from it. This portal CANNOT import it: the portal is mirrored to a
 * public repo as a standalone export of `apps/partner-portal/`, and
 * @baref00t/shared is `private: true` (never published), so a workspace
 * dependency would break `pnpm install` in the mirror.
 *
 * This list is therefore a deliberate mirror — but it IS drift-guarded: the
 * parity test in `packages/shared/src/productCatalog.test.ts` (which lives
 * outside the mirrored directory) parses this file and fails CI if it falls
 * behind the registry. When adding a product, add it here too.
 *
 * Includes the `category` field for grouped <optgroup> filters and the
 * 4 Copilot Assessments SKUs (one Coming Soon).
 *
 * #325 F19.
 */

export type ProductCategory =
  | 'compliance'
  | 'pack'
  | 'intelligence'
  | 'productivity'
  | 'copilot'

export interface ProductMeta {
  slug: string
  label: string
  category: ProductCategory
  /** Maturity options. Empty array = single-tier product (no selector). */
  maturityLevels: { value: string; label: string }[]
  /**
   * True when the SKU is provisioned in the catalogue + Stripe + Entra
   * but partner_trigger_assessment rejects it (Coming Soon). UI surfaces
   * should render the option disabled with a "(Coming Soon)" suffix.
   */
  comingSoon?: boolean
}

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  compliance:    'Compliance Assessments',
  pack:          'Security Packs',
  intelligence:  'Intelligence Reports',
  productivity:  'Productivity Analytics',
  copilot:       'Copilot Assessments',
}

export const CATEGORY_ORDER: ProductCategory[] = [
  'compliance', 'pack', 'intelligence', 'productivity', 'copilot',
]

export const PRODUCT_CATALOG: ProductMeta[] = [
  // ── Compliance Assessments (12) ─────────────────────────────────────
  { slug: 'e8', category: 'compliance', label: 'Essential Eight (ASD)', maturityLevels: [
    { value: 'ml1', label: 'ML1 — Maturity Level 1' },
    { value: 'ml2', label: 'ML2 — Maturity Level 2' },
    { value: 'ml3', label: 'ML3 — Maturity Level 3' },
  ] },
  { slug: 'mcsb', category: 'compliance', label: 'Microsoft Cloud Security Benchmark v2', maturityLevels: [] },
  { slug: 'cism365', category: 'compliance', label: 'CIS Microsoft 365 Benchmark', maturityLevels: [
    { value: 'level-1', label: 'Level 1' },
    { value: 'level-2', label: 'Level 2' },
  ] },
  { slug: 'copilot', category: 'copilot', label: 'Microsoft 365 Copilot Readiness', maturityLevels: [] },
  { slug: 'cps234', category: 'compliance', label: 'APRA CPS 234 Information Security', maturityLevels: [] },
  { slug: 'ransomware', category: 'compliance', label: 'Ransomware Resilience', maturityLevels: [] },
  { slug: 'powerplatform', category: 'compliance', label: 'Power Platform Security', maturityLevels: [] },
  { slug: 'nist-csf', category: 'compliance', label: 'NIST Cybersecurity Framework 2.0', maturityLevels: [
    { value: 'tier-1', label: 'Tier 1 — Partial' },
    { value: 'tier-2', label: 'Tier 2 — Risk Informed' },
    { value: 'tier-3', label: 'Tier 3 — Repeatable' },
    { value: 'tier-4', label: 'Tier 4 — Adaptive' },
  ] },
  { slug: 'cmmc', category: 'compliance', label: 'CMMC — Cybersecurity Maturity Model Certification', maturityLevels: [
    { value: 'level-1', label: 'Level 1' },
    { value: 'level-2', label: 'Level 2' },
  ] },
  { slug: 'nis2', category: 'compliance', label: 'EU NIS2 Directive Article 21', maturityLevels: [] },
  { slug: 'cyber-essentials', category: 'compliance', label: 'UK Cyber Essentials', maturityLevels: [
    { value: 'ce', label: 'CE — Cyber Essentials' },
    { value: 'ce-plus', label: 'CE+ — Cyber Essentials Plus' },
  ] },
  { slug: 'mas-trm', category: 'compliance', label: 'MAS Technology Risk Management', maturityLevels: [] },

  // ── Security Packs (8) ──────────────────────────────────────────────
  { slug: 'entra-hardening', category: 'pack', label: 'Entra ID Hardening', maturityLevels: [] },
  { slug: 'email-security', category: 'pack', label: 'Email Security', maturityLevels: [] },
  { slug: 'sharepoint-oversharing', category: 'pack', label: 'SharePoint Oversharing', maturityLevels: [] },
  { slug: 'finance', category: 'pack', label: 'Finance Security', maturityLevels: [] },
  { slug: 'legal', category: 'pack', label: 'Legal Services Security', maturityLevels: [] },
  { slug: 'endpoint-intune', category: 'pack', label: 'Endpoint / Intune', maturityLevels: [] },
  { slug: 'healthcare', category: 'pack', label: 'Healthcare Security', maturityLevels: [] },
  { slug: 'oauth-app-risk', category: 'pack', label: 'OAuth App & Consent-Grant Risk', maturityLevels: [] },

  // ── Intelligence Reports (4) ────────────────────────────────────────
  { slug: 'cyber-insurance', category: 'intelligence', label: 'Cyber Insurance Readiness', maturityLevels: [] },
  { slug: 'board-risk', category: 'intelligence', label: 'Board Cyber Risk', maturityLevels: [] },
  { slug: 'investor-ready', category: 'intelligence', label: 'Investor-Ready Security', maturityLevels: [] },
  { slug: 'aicd-governance', category: 'intelligence', label: 'AICD Governance', maturityLevels: [] },

  // ── Productivity Modules (4) ────────────────────────────────────────
  { slug: 'licence-optimisation', category: 'productivity', label: 'Licence Optimisation', maturityLevels: [] },
  { slug: 'adoption-usage', category: 'productivity', label: 'Adoption & Usage', maturityLevels: [] },
  { slug: 'copilot-roi', category: 'copilot', label: 'Copilot ROI', maturityLevels: [] },
  { slug: 'tenant-health', category: 'productivity', label: 'Tenant Health', maturityLevels: [] },

  // ── Copilot Assessments (4) — v2.4.0 ────────────────────────────────
  { slug: 'copilot-agent-inventory', category: 'copilot', label: 'Copilot Agent Inventory & Governance', maturityLevels: [] },
  { slug: 'copilot-interaction-compliance', category: 'copilot', label: 'Copilot Interaction Compliance', maturityLevels: [] },
  { slug: 'copilot-meeting-insights', category: 'copilot', label: 'Copilot Meeting Insights Privacy & Coverage', maturityLevels: [] },
  // #474 — delegated probe-account flow shipped; red-team-probe is live.
  { slug: 'copilot-redteam-probe', category: 'copilot', label: 'Copilot Synthetic Red-Team Probe', maturityLevels: [] },
]

const BY_SLUG = new Map(PRODUCT_CATALOG.map((p) => [p.slug, p]))

/** Look up a product by slug. Returns the slug as label if not found
 *  (defensive — better to render an unknown product than throw). */
export function productMeta(slug: string): ProductMeta {
  return BY_SLUG.get(slug) ?? { slug, label: slug, category: 'compliance', maturityLevels: [] }
}

/** Filter the catalog down to the slugs the partner is allowed to use. */
export function allowedProducts(slugs: string[]): ProductMeta[] {
  const set = new Set(slugs)
  return PRODUCT_CATALOG.filter((p) => set.has(p.slug))
}

/** Group an arbitrary list of ProductMeta entries by category, in
 *  CATEGORY_ORDER. Used by the runs filter dropdown to render
 *  <optgroup>s. */
export function groupByCategory(products: ProductMeta[]): Array<{ category: ProductCategory; label: string; products: ProductMeta[] }> {
  const buckets = new Map<ProductCategory, ProductMeta[]>()
  for (const p of products) {
    const list = buckets.get(p.category) ?? []
    list.push(p)
    buckets.set(p.category, list)
  }
  const out: Array<{ category: ProductCategory; label: string; products: ProductMeta[] }> = []
  for (const cat of CATEGORY_ORDER) {
    const list = buckets.get(cat)
    if (list && list.length > 0) out.push({ category: cat, label: CATEGORY_LABELS[cat], products: list })
  }
  return out
}
