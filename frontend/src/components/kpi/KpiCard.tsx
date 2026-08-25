import type { KpiDefinition } from "../../lib/types";

interface KpiCardProps {
  kpi: KpiDefinition;
  latestValue: number | null;
  changePercent: number | null;
  isActive: boolean;
  onClick: () => void;
}

const THEME_STYLES: Record<string, {
  hoverBorder: string;
  activeBg: string;
  activeShadow: string;
  trendUpText: string;
  trendDownText: string;
}> = {
  net_revenue: {
    hoverBorder: "hover:border-emerald-300 dark:hover:border-emerald-700",
    activeBg: "bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-transparent",
    activeShadow: "shadow-[0_8px_30px_rgba(16,185,129,0.25)]",
    trendUpText: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30",
    trendDownText: "text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/30",
  },
  gross_margin: {
    hoverBorder: "hover:border-cyan-300 dark:hover:border-cyan-700",
    activeBg: "bg-gradient-to-br from-cyan-500 to-blue-600 text-white border-transparent",
    activeShadow: "shadow-[0_8px_30px_rgba(6,182,212,0.25)]",
    trendUpText: "text-cyan-600 bg-cyan-50 dark:text-cyan-400 dark:bg-cyan-950/30",
    trendDownText: "text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/30",
  },
  conversion_rate: {
    hoverBorder: "hover:border-indigo-300 dark:hover:border-indigo-700",
    activeBg: "bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-transparent",
    activeShadow: "shadow-[0_8px_30px_rgba(99,102,241,0.25)]",
    trendUpText: "text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-950/30",
    trendDownText: "text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/30",
  },
  otif: {
    hoverBorder: "hover:border-fuchsia-300 dark:hover:border-fuchsia-700",
    activeBg: "bg-gradient-to-br from-fuchsia-500 to-pink-600 text-white border-transparent",
    activeShadow: "shadow-[0_8px_30px_rgba(217,70,239,0.25)]",
    trendUpText: "text-fuchsia-600 bg-fuchsia-50 dark:text-fuchsia-400 dark:bg-fuchsia-950/30",
    trendDownText: "text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/30",
  },
  cac: {
    hoverBorder: "hover:border-amber-300 dark:hover:border-amber-700",
    activeBg: "bg-gradient-to-br from-amber-500 to-orange-600 text-white border-transparent",
    activeShadow: "shadow-[0_8px_30px_rgba(245,158,11,0.25)]",
    // For CAC, lower is better, so decreasing is good (green) and increasing is bad (red)
    trendUpText: "text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/30",
    trendDownText: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30",
  },
};

function formatKpiValue(kpiId: string, value: number | null): string {
  if (value === null) return "—";
  if (kpiId === "net_revenue" || kpiId === "gross_margin") {
    if (value >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(2)}M`;
    }
    if (value >= 1_000) {
      return `$${(value / 1_000).toFixed(1)}k`;
    }
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (kpiId === "cac") {
    return `$${value.toFixed(2)}`;
  }
  if (kpiId === "conversion_rate" || kpiId === "otif") {
    return `${(value * 100).toFixed(2)}%`;
  }
  return value.toLocaleString();
}

export function KpiCard({ kpi, latestValue, changePercent, isActive, onClick }: KpiCardProps) {
  const theme = THEME_STYLES[kpi.kpiId] || THEME_STYLES.net_revenue;
  const isCac = kpi.kpiId === "cac";

  // Determine trend color classes based on whether it is CAC (lower is better) or others (higher is better)
  const isPositive = changePercent !== null && (isCac ? changePercent < 0 : changePercent > 0);
  const isZero = changePercent === 0;

  let trendColorClass = "";
  if (isActive) {
    // On active gradient background, use light colors for text readability
    trendColorClass = "bg-white/20 text-white";
  } else {
    trendColorClass = isZero
      ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
      : isPositive
        ? theme.trendUpText
        : theme.trendDownText;
  }

  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-xl border p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${
        isActive
          ? `${theme.activeBg} ${theme.activeShadow} scale-[1.02]`
          : `bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 ${theme.hoverBorder} text-slate-800 dark:text-slate-100`
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-wider ${isActive ? "text-white/80" : "text-slate-400 dark:text-slate-500"}`}>
            {kpi.owner}
          </p>
          <h3 className={`mt-1 font-semibold tracking-tight text-base ${isActive ? "text-white" : "text-slate-900 dark:text-white"}`}>{kpi.name}</h3>
        </div>

        {changePercent !== null && (
          <span className={`inline-flex items-center gap-0.5 rounded-full px-2.5 py-0.5 text-xs font-bold leading-none ${trendColorClass}`}>
            {!isZero && (isPositive ? "↑" : "↓")}
            {Math.abs(changePercent * 100).toFixed(1)}%
          </span>
        )}
      </div>

      <div className="mt-4">
        <span className={`text-3xl font-extrabold tracking-tight ${isActive ? "text-white" : "text-slate-900 dark:text-white"}`}>
          {formatKpiValue(kpi.kpiId, latestValue)}
        </span>
      </div>

      <p className={`mt-2 text-xs line-clamp-2 ${isActive ? "text-white/90" : "text-slate-500 dark:text-slate-400"}`}>
        {kpi.businessDefinition}
      </p>

      <div className="mt-4 flex items-center justify-between border-t border-dashed pt-3 text-[10px] uppercase tracking-wider font-semibold opacity-75">
        <span className={isActive ? "text-white/80" : "text-slate-400 dark:text-slate-500"}>Grain: {kpi.grain}</span>
        <span className={isActive ? "text-white/80" : "text-slate-400 dark:text-slate-500"}>Refresh: {kpi.refreshCadence}</span>
      </div>
    </div>
  );
}
