import type { AuthTokenPayload } from "../schemas/auth.js";
import { loadSemanticYaml } from "../semantic/loader.js";
import type { EvidenceDriver, EvidencePack, EvidenceSource } from "../llm/types.js";

interface RawRolePolicy {
  row_level_security?: {
    region_scope: "ALL" | string[];
    user_intersection_required?: boolean;
  };
  kpi_access?: {
    allowed?: string[];
    denied?: string[];
  };
  column_access?: {
    allow?: string[];
    mask?: string[];
    deny?: string[];
  };
  blocked_domains?: string[];
}

interface RawRolePolicies {
  role_policies: Record<string, RawRolePolicy>;
}

export interface SecurityPolicy {
  persona: string;
  allowedRegions: string[];
  restrictedColumns: string[];
  blockedDomains: string[];
}

let cache: RawRolePolicies | null = null;

function loadRolePolicies(): RawRolePolicies {
  if (!cache) {
    cache = loadSemanticYaml<RawRolePolicies>("security/role_policies.yaml");
  }
  return cache;
}

/**
 * The user's effective policy: their JWT-scoped regions intersected with
 * their role's regional ceiling from semantic/security/role_policies.yaml,
 * plus that role's column/domain restrictions. Always derived from the
 * CALLING user's own persona/region grant — never from a narrative-style
 * persona parameter, so switching narrative tabs can't be used to see data
 * the logged-in user isn't actually entitled to.
 *
 * role_policies.yaml splits denials across kpi_access.denied (KPI ids, e.g.
 * "gross_margin") and column_access.deny (dotted table.column names, e.g.
 * "fact_sales.cogs"). isColumnRestricted matches against both a bare kpiId
 * and a bare driver/source name, so column_access.deny entries are reduced
 * to their column name (the part after the last dot) before merging with
 * kpi_access.denied into one restrictedColumns list.
 */
export function getEffectivePolicy(user: AuthTokenPayload): SecurityPolicy {
  const policies = loadRolePolicies().role_policies;
  const rolePolicy = policies[user.persona];
  if (!rolePolicy) {
    return { persona: user.persona, allowedRegions: [], restrictedColumns: [], blockedDomains: [] };
  }

  const userRegions = user.allowedRegions ?? [];
  const rawScope = rolePolicy.row_level_security?.region_scope ?? [];
  const roleRegions = rawScope === "ALL" ? ["ALL"] : rawScope;
  const requiresIntersection = rolePolicy.row_level_security?.user_intersection_required ?? true;

  const allowedRegions = !requiresIntersection
    ? roleRegions
    : userRegions.includes("ALL")
      ? roleRegions
      : roleRegions.includes("ALL")
        ? userRegions
        : userRegions.filter((region) => roleRegions.includes(region));

  const deniedKpis = rolePolicy.kpi_access?.denied ?? [];
  const deniedColumns = (rolePolicy.column_access?.deny ?? []).map((column) => column.split(".").pop() ?? column);
  const restrictedColumns = Array.from(new Set([...deniedKpis, ...deniedColumns]));

  return {
    persona: user.persona,
    allowedRegions,
    restrictedColumns,
    blockedDomains: rolePolicy.blocked_domains ?? [],
  };
}

/** True if this KPI/column is off-limits to the policy's role entirely. */
export function isColumnRestricted(policy: SecurityPolicy, columnName: string): boolean {
  return policy.restrictedColumns.some((restricted) => columnName.toLowerCase().includes(restricted.toLowerCase()));
}

/**
 * Keyword hints per blocked domain, per docs/security_model.md's list
 * (executive compensation, PII, M&A planning, legal). This is intentionally
 * a simple keyword match, not an NLP classifier — good enough to catch an
 * obvious out-of-scope chat question before it ever reaches the LLM; it is
 * not a substitute for a real content-safety pipeline in production.
 */
const DOMAIN_KEYWORDS: Record<string, string[]> = {
  executive_compensation: [
    "executive compensation",
    "ceo salary",
    "cfo salary",
    "exec pay",
    "executive pay",
    "bonus payout",
    "stock options",
    "equity grant",
  ],
  pii: [
    "social security",
    "ssn",
    "date of birth",
    "home address",
    "phone number",
    "email address",
    "employee id",
    "personal data",
  ],
  mna_planning: ["acquisition", "merger", "m&a", "buyout", "divestiture", "due diligence"],
  legal: ["lawsuit", "litigation", "legal counsel", "compliance violation", "contract dispute", "subpoena"],
  hr_sensitive: ["performance review", "disciplinary action", "termination", "employee complaint", "hr investigation"],
  finance_margin_detail: ["gross margin", "cogs", "cost of goods sold", "margin detail", "profit margin"],
  supply_chain_operational_detail: [
    "warehouse capacity",
    "fulfillment center",
    "supplier contract",
    "inventory levels",
    "shipment routing",
  ],
};

/**
 * Checks free-text (e.g. a chat question) against the policy's blocked
 * domains. Returns the matched domain name, or null if nothing matched.
 * Callers should check this BEFORE building an evidence pack or calling the
 * LLM at all — a blocked-domain question should never touch anomaly data.
 */
export function matchBlockedDomain(policy: SecurityPolicy, text: string): string | null {
  const lower = text.toLowerCase();
  for (const domain of policy.blockedDomains) {
    const keywords = DOMAIN_KEYWORDS[domain] ?? [domain.replace(/_/g, " ")];
    if (keywords.some((keyword) => lower.includes(keyword))) return domain;
  }
  return null;
}

/**
 * CLS for the evidence pack: drops any driver/source whose name matches a
 * restricted column for this policy, before the pack is ever sent to the LLM.
 *
 * Note: RLS (region filtering) is not applied here — anomalies are currently
 * detected at the whole-business grain with no region column (see
 * anomalyService.ts), so there is nothing region-scoped on the pack yet to
 * filter. `policy.allowedRegions` is threaded through for when that grain
 * exists (tracked as Day 3's "enforce RLS/CLS for real" task).
 */
export function maskEvidencePack(pack: EvidencePack, policy: SecurityPolicy): EvidencePack {
  if (policy.restrictedColumns.length === 0) return pack;

  const drivers: EvidenceDriver[] = pack.drivers.filter((driver) => !isColumnRestricted(policy, driver.driver));
  const sources: EvidenceSource[] = pack.sources.filter((source) => !isColumnRestricted(policy, source.source));

  return { ...pack, drivers, sources };
}
