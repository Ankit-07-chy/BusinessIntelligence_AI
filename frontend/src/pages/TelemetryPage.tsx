import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

interface TelemetryRequestRow {
  requestId: string;
  method: string;
  path: string;
  statusCode: number;
  latencyMs: number;
  createdAt: string;
}

export function TelemetryPage() {
  const requestsQuery = useQuery({
    queryKey: ["telemetry-requests"],
    queryFn: async () => (await api.get<TelemetryRequestRow[]>("/telemetry/requests")).data,
  });

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Request Trace</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Every API call is logged here automatically via the request-context middleware.
        </p>
      </div>
      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm transition-all">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 dark:border-slate-800 text-xs uppercase text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50">
            <tr>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Path</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Latency (ms)</th>
              <th className="px-4 py-3">At</th>
            </tr>
          </thead>
          <tbody>
            {requestsQuery.data?.map((row) => (
              <tr key={row.requestId} className="border-b border-slate-100 dark:border-slate-800/40 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                <td className="px-4 py-3 font-mono text-xs font-semibold">{row.method}</td>
                <td className="px-4 py-3 font-mono text-xs">{row.path}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                    row.statusCode >= 400 
                      ? "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400"
                      : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
                  }`}>
                    {row.statusCode}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium">{row.latencyMs}</td>
                <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                  {new Date(row.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
