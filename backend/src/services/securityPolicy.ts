import type { AuthTokenPayload } from "../schemas/auth.js";
import { loadSemanticYaml } from "../semantic/loader.js";
import type { EvidenceDriver, EvidencePack, EvidenceSource } from "../llm/types.js";

interface RawRolePolicy {
  allowed_regions: string[];
  restricted_columns: string[];
  blocked_domains: string[];
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
 */
export function getEffectivePolicy(user: AuthTokenPayload): SecurityPolicy {
  const policies = loadRolePolicies().role_policies;
  const rolePolicy = policies[user.persona];
  if (!rolePolicy) {
    return { persona: user.persona, allowedRegions: [], restrictedColumns: [], blockedDomains: [] };
  }

  const userRegions = user.allowedRegions ?? [];
  const roleRegions = rolePolicy.allowed_regions ?? [];
  const allowedRegions = userRegions.includes("ALL")
    ? roleRegions
    : roleRegions.includes("ALL")
      ? userRegions
      : userRegions.filter((region) => roleRegions.includes(region));

  return {
    persona: user.persona,
    allowedRegions,
    restrictedColumns: rolePolicy.restricted_columns ?? [],
    blockedDomains: rolePolicy.blocked_domains ?? [],
  };
}

/** True if this KPI/column is off-limits to the policy's role entirely. */
export function isColumnRestricted(policy: SecurityPolicy, columnName: string): boolean {
  return policy.restrictedColumns.some((restricted) => columnName.toLowerCase().includes(restricted.toLowerCase()));
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
