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
    <div>
      <h2 className="text-base font-semibold text-slate-900">Role Policies</h2>
      <p className="mt-1 text-sm text-slate-500">
        Loaded from <code>semantic/security/role_policies.yaml</code> — governs row/column-level access.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        {roles.map(([role, policy]) => (
          <div key={role} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="font-semibold text-slate-900">{role}</h3>
            <dl className="mt-2 space-y-1 text-sm text-slate-600">
              <div>
                <dt className="inline font-medium text-slate-500">Allowed regions: </dt>
                <dd className="inline">{policy.allowed_regions.join(", ")}</dd>
              </div>
              <div>
                <dt className="inline font-medium text-slate-500">Restricted columns: </dt>
                <dd className="inline">{policy.restricted_columns.join(", ") || "none"}</dd>
              </div>
              <div>
                <dt className="inline font-medium text-slate-500">Blocked domains: </dt>
                <dd className="inline">{policy.blocked_domains.join(", ")}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}
