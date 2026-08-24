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
    <div>
      <h2 className="text-base font-semibold text-slate-900">Request Trace</h2>
      <p className="mt-1 text-sm text-slate-500">
        Every API call is logged here automatically via the request-context middleware.
      </p>
      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Method</th>
              <th className="px-4 py-2">Path</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Latency (ms)</th>
              <th className="px-4 py-2">At</th>
            </tr>
          </thead>
          <tbody>
            {requestsQuery.data?.map((row) => (
              <tr key={row.requestId} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-2 font-mono text-xs">{row.method}</td>
                <td className="px-4 py-2 font-mono text-xs">{row.path}</td>
                <td className="px-4 py-2">{row.statusCode}</td>
                <td className="px-4 py-2">{row.latencyMs}</td>
                <td className="px-4 py-2 text-xs text-slate-500">
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
