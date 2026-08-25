import type { ConfidenceLabel } from "../../lib/types";

const STYLES: Record<ConfidenceLabel, string> = {
  high: "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-rose-50 text-rose-700 border-rose-200",
};

export function ConfidenceBadge({ label, score }: { label: ConfidenceLabel; score?: number }) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${STYLES[label]}`}
    >
      {label}
      {score !== undefined && <span className="text-[10px] opacity-70">{Math.round(score * 100)}%</span>}
    </span>
  );
}
