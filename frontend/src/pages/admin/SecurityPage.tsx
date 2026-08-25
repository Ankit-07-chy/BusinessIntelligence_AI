import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";

interface RolePolicy {
  allowed_regions: string[];
  restricted_columns: string[];
  blocked_domains: string[];
}

interface RolePoliciesResponse {
  role_policies: Record<string, RolePolicy>;
}

export function SecurityPage() {
  const policiesQuery = useQuery({
    queryKey: ["security-policies"],
    queryFn: async () => (await api.get<RolePoliciesResponse>("/admin/security/policies")).data,
  });

  const roles = Object.entries(policiesQuery.data?.role_policies ?? {});

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Role Policies</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Loaded from <code>semantic/security/role_policies.yaml</code> — governs row/column-level access.
        </p>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        {roles.map(([role, policy]) => (
          <div key={role} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all hover:shadow-md">
            <h3 className="font-bold text-slate-900 dark:text-white capitalize">{role.replace(/_/g, " ")}</h3>
            <dl className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-400 border-t border-slate-50 dark:border-slate-800/50 pt-3">
              <div>
                <dt className="inline font-bold text-slate-400 dark:text-slate-500 uppercase text-[10px] tracking-wider">Allowed regions: </dt>
                <dd className="inline font-semibold text-slate-800 dark:text-slate-200">{policy.allowed_regions.join(", ")}</dd>
              </div>
              <div>
                <dt className="inline font-bold text-slate-400 dark:text-slate-500 uppercase text-[10px] tracking-wider">Restricted columns: </dt>
                <dd className="inline font-semibold text-slate-800 dark:text-slate-200">{policy.restricted_columns.join(", ") || "none"}</dd>
              </div>
              <div>
                <dt className="inline font-bold text-slate-400 dark:text-slate-500 uppercase text-[10px] tracking-wider">Blocked domains: </dt>
                <dd className="inline font-semibold text-slate-800 dark:text-slate-200">{policy.blocked_domains.join(", ")}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}
