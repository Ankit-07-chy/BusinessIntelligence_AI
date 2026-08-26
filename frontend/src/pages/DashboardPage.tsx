import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AreaChart, Area, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../lib/api";
import { useTheme } from "../hooks/useTheme";
import type { KpiDefinition, KpiTimeseriesPoint } from "../lib/types";

const CHART_THEMES: Record<string, { stroke: string; stopStart: string; stopEnd: string; activeBg: string; hoverBorder: string }> = {
  net_revenue: {
    stroke: "#10b981",
    stopStart: "#10b981",
    stopEnd: "#14b8a6",
    activeBg: "bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-transparent shadow-[0_0_25px_rgba(16,185,129,0.45)] scale-105",
    hoverBorder: "hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-[0_0_15px_rgba(16,185,129,0.15)]",
  },
  gross_margin: {
    stroke: "#06b6d4",
    stopStart: "#06b6d4",
    stopEnd: "#3b82f6",
    activeBg: "bg-gradient-to-br from-cyan-500 to-blue-600 text-white border-transparent shadow-[0_0_25px_rgba(6,182,212,0.45)] scale-105",
    hoverBorder: "hover:border-cyan-300 dark:hover:border-cyan-700 hover:shadow-[0_0_15px_rgba(6,182,212,0.15)]",
  },
  conversion_rate: {
    stroke: "#6366f1",
    stopStart: "#6366f1",
    stopEnd: "#a855f7",
    activeBg: "bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-transparent shadow-[0_0_25px_rgba(99,102,241,0.45)] scale-105",
    hoverBorder: "hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-[0_0_15px_rgba(99,102,241,0.15)]",
  },
  otif: {
    stroke: "#d946ef",
    stopStart: "#d946ef",
    stopEnd: "#ec4899",
    activeBg: "bg-gradient-to-br from-fuchsia-500 to-pink-600 text-white border-transparent shadow-[0_0_25px_rgba(217,70,239,0.45)] scale-105",
    hoverBorder: "hover:border-fuchsia-300 dark:hover:border-fuchsia-700 hover:shadow-[0_0_15px_rgba(217,70,239,0.15)]",
  },
  cac: {
    stroke: "#f59e0b",
    stopStart: "#f59e0b",
    stopEnd: "#f97316",
    activeBg: "bg-gradient-to-br from-amber-500 to-orange-600 text-white border-transparent shadow-[0_0_25px_rgba(245,158,11,0.45)] scale-105",
    hoverBorder: "hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-[0_0_15px_rgba(245,158,11,0.15)]",
  },
};

function formatKpiValue(kpiId: string, value: number | null): string {
  if (value === null) return "—";
  if (kpiId === "net_revenue" || kpiId === "gross_margin") {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}k`;
    return `$${value.toLocaleString()}`;
  }
  if (kpiId === "cac") {
    return `$${value.toFixed(2)}`;
  }
  if (kpiId === "conversion_rate" || kpiId === "otif") {
    return `${(value * 100).toFixed(1)}%`;
  }
  return value.toLocaleString();
}

function getKpiStats(series: KpiTimeseriesPoint[] | undefined) {
  if (!series || series.length < 2) {
    return { latestValue: null, changePercent: null };
  }
  const latest = series[series.length - 1].value;
  const previous = series[series.length - 2].value;
  const change = previous !== 0 ? (latest - previous) / previous : 0;
  return { latestValue: latest, changePercent: change };
}

// Helpers for weekly and monthly aggregation
function getWeekNumber(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  const oneJan = new Date(d.getUTCFullYear(), 0, 1);
  const numberOfDays = Math.floor((d.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
  const weekNum = Math.ceil((numberOfDays + oneJan.getDay() + 1) / 7);
  return `W${weekNum}`;
}

function getMonthName(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  return d.toLocaleString("en-US", { month: "long" });
}

function processSeries(
  kpiId: string,
  rawData: KpiTimeseriesPoint[] | undefined,
  viewMode: "daily" | "weekly" | "monthly",
  specificDate: string,
  weekStartDate: string,
  specificMonth: string
): KpiTimeseriesPoint[] {
  if (!rawData) return [];

  let raw = [...rawData];

  // Specific Date filter
  if (specificDate) {
    raw = raw.filter(p => p.date === specificDate);
  }

  // Specific Week (7-day start date crop) filter
  if (weekStartDate) {
    const start = new Date(`${weekStartDate}T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6);
    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);
    raw = raw.filter(p => p.date >= startStr && p.date <= endStr);
  }

  // Specific Month filter
  if (specificMonth) {
    raw = raw.filter(p => getMonthName(p.date) === specificMonth);
  }

  // Interval Aggregations
  if (viewMode === "weekly") {
    const weeksMap = new Map<string, number[]>();
    raw.forEach(p => {
      const wk = getWeekNumber(p.date);
      if (!weeksMap.has(wk)) weeksMap.set(wk, []);
      weeksMap.get(wk)!.push(p.value);
    });
    return Array.from(weeksMap.entries()).map(([week, vals]) => {
      const isRate = kpiId === "conversion_rate" || kpiId === "otif" || kpiId === "cac";
      const val = isRate ? (vals.reduce((a, b) => a + b, 0) / vals.length) : vals.reduce((a, b) => a + b, 0);
      return { date: week, value: val };
    });
  } else if (viewMode === "monthly") {
    const monthsMap = new Map<string, number[]>();
    raw.forEach(p => {
      const mn = getMonthName(p.date);
      if (!monthsMap.has(mn)) monthsMap.set(mn, []);
      monthsMap.get(mn)!.push(p.value);
    });
    return Array.from(monthsMap.entries()).map(([month, vals]) => {
      const isRate = kpiId === "conversion_rate" || kpiId === "otif" || kpiId === "cac";
      const val = isRate ? (vals.reduce((a, b) => a + b, 0) / vals.length) : vals.reduce((a, b) => a + b, 0);
      return { date: month, value: val };
    });
  }

  return raw;
} export function DashboardPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Split Compare and Zoom States
  const [compareMode, setCompareMode] = useState<boolean>(false);
  const [selectedKpiIds, setSelectedKpiIds] = useState<string[]>(["net_revenue"]);
  const [zoomedKpiId, setZoomedKpiId] = useState<string | null>(null);

  // Filters state
  const [viewMode, setViewMode] = useState<"daily" | "weekly" | "monthly">("daily");
  const [specificDate, setSpecificDate] = useState<string>("");
  const [weekStartDate, setWeekStartDate] = useState<string>("");
  const [specificMonth, setSpecificMonth] = useState<string>("");

  // Fetch KPI Definitions
  const kpisQuery = useQuery({
    queryKey: ["kpis"],
    queryFn: async () => (await api.get<KpiDefinition[]>("/kpis")).data,
  });

  // Fetch Timeseries for all KPIs to display current values and trend percents on cards
  const netRevenueTimeseries = useQuery({
    queryKey: ["kpi-timeseries", "net_revenue"],
    queryFn: async () => (await api.get<KpiTimeseriesPoint[]>("/kpis/net_revenue/timeseries")).data,
    enabled: !!kpisQuery.data && kpisQuery.data.some((k) => k.kpiId === "net_revenue"),
  });
  const grossMarginTimeseries = useQuery({
    queryKey: ["kpi-timeseries", "gross_margin"],
    queryFn: async () => (await api.get<KpiTimeseriesPoint[]>("/kpis/gross_margin/timeseries")).data,
    enabled: !!kpisQuery.data && kpisQuery.data.some((k) => k.kpiId === "gross_margin"),
  });
  const conversionRateTimeseries = useQuery({
    queryKey: ["kpi-timeseries", "conversion_rate"],
    queryFn: async () => (await api.get<KpiTimeseriesPoint[]>("/kpis/conversion_rate/timeseries")).data,
    enabled: !!kpisQuery.data && kpisQuery.data.some((k) => k.kpiId === "conversion_rate"),
  });
  const otifTimeseries = useQuery({
    queryKey: ["kpi-timeseries", "otif"],
    queryFn: async () => (await api.get<KpiTimeseriesPoint[]>("/kpis/otif/timeseries")).data,
    enabled: !!kpisQuery.data && kpisQuery.data.some((k) => k.kpiId === "otif"),
  });
  const cacTimeseries = useQuery({
    queryKey: ["kpi-timeseries", "cac"],
    queryFn: async () => (await api.get<KpiTimeseriesPoint[]>("/kpis/cac/timeseries")).data,
    enabled: !!kpisQuery.data && kpisQuery.data.some((k) => k.kpiId === "cac"),
  });

  // Processed timeseries for dials and charts
  const processedNetRevenue = useMemo(() => processSeries("net_revenue", netRevenueTimeseries.data, viewMode, specificDate, weekStartDate, specificMonth), [netRevenueTimeseries.data, viewMode, specificDate, weekStartDate, specificMonth]);
  const processedGrossMargin = useMemo(() => processSeries("gross_margin", grossMarginTimeseries.data, viewMode, specificDate, weekStartDate, specificMonth), [grossMarginTimeseries.data, viewMode, specificDate, weekStartDate, specificMonth]);
  const processedConversionRate = useMemo(() => processSeries("conversion_rate", conversionRateTimeseries.data, viewMode, specificDate, weekStartDate, specificMonth), [conversionRateTimeseries.data, viewMode, specificDate, weekStartDate, specificMonth]);
  const processedOtif = useMemo(() => processSeries("otif", otifTimeseries.data, viewMode, specificDate, weekStartDate, specificMonth), [otifTimeseries.data, viewMode, specificDate, weekStartDate, specificMonth]);
  const processedCac = useMemo(() => processSeries("cac", cacTimeseries.data, viewMode, specificDate, weekStartDate, specificMonth), [cacTimeseries.data, viewMode, specificDate, weekStartDate, specificMonth]);

  const timeseriesMap: Record<string, { data: KpiTimeseriesPoint[] | undefined; processed: KpiTimeseriesPoint[]; isLoading: boolean }> = {
    net_revenue: { data: netRevenueTimeseries.data, processed: processedNetRevenue, isLoading: netRevenueTimeseries.isLoading },
    gross_margin: { data: grossMarginTimeseries.data, processed: processedGrossMargin, isLoading: grossMarginTimeseries.isLoading },
    conversion_rate: { data: conversionRateTimeseries.data, processed: processedConversionRate, isLoading: conversionRateTimeseries.isLoading },
    otif: { data: otifTimeseries.data, processed: processedOtif, isLoading: otifTimeseries.isLoading },
    cac: { data: cacTimeseries.data, processed: processedCac, isLoading: cacTimeseries.isLoading },
  };

  // Determine active KPI under single-focus or zoom state
  const activeKpiId = compareMode ? (zoomedKpiId || selectedKpiIds[0] || "net_revenue") : selectedKpiIds[0];
  const activeQuery = timeseriesMap[activeKpiId] || timeseriesMap.net_revenue;
  const activeTheme = CHART_THEMES[activeKpiId] || CHART_THEMES.net_revenue;
  const selectedKpiName = kpisQuery.data?.find((k) => k.kpiId === activeKpiId)?.name || "KPI";

  // Dynamic filter drop-down arrays based on loaded dataset
  const availableMonths = useMemo(() => {
    if (!activeQuery.data) return [];
    return Array.from(new Set(activeQuery.data.map(p => getMonthName(p.date))));
  }, [activeQuery.data]);

  const processedData = timeseriesMap[activeKpiId]?.processed || [];

  // 1. Calculations for Specific Date layout
  const targetIndex = useMemo(() => {
    if (!specificDate || !activeQuery.data) return -1;
    return activeQuery.data.findIndex(p => p.date === specificDate);
  }, [specificDate, activeQuery.data]);

  const targetPoint = targetIndex !== -1 ? activeQuery.data![targetIndex] : null;
  const previousPoint = targetIndex > 0 ? activeQuery.data![targetIndex - 1] : null;
  const targetChangePercent = targetPoint && previousPoint && previousPoint.value !== 0
    ? (targetPoint.value - previousPoint.value) / previousPoint.value
    : null;

  // 2. Calculations for Specific Week daily trend chart (7-day date crop)
  const weekProcessedData = useMemo(() => {
    if (!weekStartDate || !activeQuery.data) return [];
    return processSeries(activeKpiId, activeQuery.data, "daily", "", weekStartDate, "");
  }, [activeKpiId, activeQuery.data, weekStartDate]);

  // 3. Calculations for Specific Month dual charts
  const monthWeeklyData = useMemo(() => {
    if (!specificMonth || !activeQuery.data) return [];
    return processSeries(activeKpiId, activeQuery.data, "weekly", "", "", specificMonth);
  }, [activeKpiId, activeQuery.data, specificMonth]);

  const monthDailyData = useMemo(() => {
    if (!specificMonth || !activeQuery.data) return [];
    return processSeries(activeKpiId, activeQuery.data, "daily", "", "", specificMonth);
  }, [activeKpiId, activeQuery.data, specificMonth]);

  const handleDialClick = (kpiId: string) => {
    if (compareMode) {
      if (selectedKpiIds.includes(kpiId)) {
        if (selectedKpiIds.length > 1) {
          setSelectedKpiIds(selectedKpiIds.filter(id => id !== kpiId));
        }
      } else {
        setSelectedKpiIds([...selectedKpiIds, kpiId]);
      }
    } else {
      setSelectedKpiIds([kpiId]);
    }
    setZoomedKpiId(null);
  };

  const handleResetFilters = () => {
    setSpecificDate("");
    setWeekStartDate("");
    setSpecificMonth("");
  };

  return (
    <div className="space-y-8">
      {/* 5 Circular selectors at top */}
      <section className="flex flex-col items-center">
        {/* Compare Mode Toggle Switch */}
        <div className="flex items-center gap-3 mb-6 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-2xl shadow-inner">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Compare Split Mode</span>
          <button
            onClick={() => {
              const newMode = !compareMode;
              setCompareMode(newMode);
              setZoomedKpiId(null);
              if (newMode === false && selectedKpiIds.length > 1) {
                setSelectedKpiIds([selectedKpiIds[0]]);
              }
            }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition duration-300 ${compareMode ? "bg-indigo-650" : "bg-slate-350 dark:bg-slate-700"
              }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-300 ${compareMode ? "translate-x-6" : "translate-x-1"
                }`}
            />
          </button>
        </div>

        {kpisQuery.isLoading ? (
          <div className="flex items-center justify-center h-32 w-full border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            <p className="text-sm text-slate-400 animate-pulse">Loading KPI dials…</p>
          </div>
        ) : kpisQuery.isError ? (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/20 rounded-xl border border-rose-100 dark:border-rose-900/50 w-full text-center">
            <p className="text-sm text-rose-600 dark:text-rose-450 font-medium">Failed to load dials. Please check backend connection.</p>
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-6 md:gap-8 px-4 w-full">
            {kpisQuery.data?.map((kpi) => {
              const ts = timeseriesMap[kpi.kpiId];
              const { latestValue, changePercent } = getKpiStats(ts?.processed);
              const isActive = selectedKpiIds.includes(kpi.kpiId);
              const themeStyles = CHART_THEMES[kpi.kpiId] || CHART_THEMES.net_revenue;
              const isCac = kpi.kpiId === "cac";
              const isPositive = changePercent !== null && (isCac ? changePercent < 0 : changePercent > 0);
              const isZero = changePercent === 0;

              return (
                <div
                  key={kpi.kpiId}
                  onClick={() => handleDialClick(kpi.kpiId)}
                  className={`flex-1 min-w-[180px] max-w-[240px] h-32 md:h-36 rounded-2xl flex flex-col items-center justify-center p-4 cursor-pointer transition-all duration-300 border-2 text-center select-none relative ${isActive
                    ? themeStyles.activeBg
                    : `bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 ${themeStyles.hoverBorder}`
                    }`}
                >
                  {/* Selection Indicator Checkbox */}
                  {compareMode && (
                    <div className="absolute top-2 right-2 md:top-3 md:right-3">
                      <div className={`w-4.5 h-4.5 rounded-full flex items-center justify-center border text-[9px] font-bold shadow-sm transition ${isActive
                        ? "bg-white text-indigo-650 border-white"
                        : "border-slate-300 dark:border-slate-700 bg-black/5 dark:bg-white/5 text-transparent"
                        }`}>
                        ✓
                      </div>
                    </div>
                  )}

                  <p className={`text-[9px] font-bold uppercase tracking-wider ${isActive ? "text-white/80" : "text-slate-400 dark:text-slate-500"}`}>
                    {kpi.owner.replace("_", " ")}
                  </p>
                  <h3 className={`mt-1 text-xs md:text-sm font-extrabold tracking-tight truncate max-w-full px-1 ${isActive ? "text-white" : "text-slate-900 dark:text-white"}`}>
                    {kpi.name}
                  </h3>
                  <span className={`mt-2 text-lg sm:text-xl md:text-2xl font-black ${isActive ? "text-white" : "text-slate-900 dark:text-white"}`}>
                    {formatKpiValue(kpi.kpiId, latestValue)}
                  </span>
                  {changePercent !== null && (
                    <span className={`mt-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold ${isActive
                      ? "bg-white/20 text-white"
                      : isZero
                        ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        : isPositive
                          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400"
                          : "bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-450"
                      }`}>
                      {!isZero && (isPositive ? "↑ " : "↓ ")}
                      {Math.abs(changePercent * 100).toFixed(1)}%
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Filter Options Control Bar */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          {/* Interval Aggregations selector */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Report View</span>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-fit">
              {(["daily", "weekly", "monthly"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition ${viewMode === mode
                    ? "bg-white dark:bg-slate-700 text-slate-950 dark:text-slate-50 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Specific Filters Row */}
          <div className="flex flex-wrap items-end gap-4 flex-grow justify-start md:justify-end">
            {/* Specific Date */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 block">Select Date</label>
              <input
                type="date"
                min="2026-05-28"
                max="2026-08-25"
                value={specificDate}
                onChange={(e) => {
                  handleResetFilters();
                  setSpecificDate(e.target.value);
                }}
                className="rounded-lg border border-slate-350 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Specific Week (Start Date Picker) */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 block">Select Week Start</label>
              <input
                type="date"
                min="2026-05-28"
                max="2026-08-25"
                value={weekStartDate}
                onChange={(e) => {
                  handleResetFilters();
                  setWeekStartDate(e.target.value);
                }}
                className="rounded-lg border border-slate-350 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Specific Month */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 block">Select Month</label>
              <select
                value={specificMonth}
                onChange={(e) => {
                  handleResetFilters();
                  setSpecificMonth(e.target.value);
                }}
                className="rounded-lg border border-slate-350 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500 transition"
              >
                <option value="">All Months</option>
                {availableMonths.map(mn => (
                  <option key={mn} value={mn}>{mn}</option>
                ))}
              </select>
            </div>

            {/* Clear Button */}
            {(specificDate || weekStartDate || specificMonth) && (
              <button
                onClick={handleResetFilters}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-450 text-xs font-semibold rounded-lg transition"
              >
                Reset Specific Filters
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Main Chart Layout Selection */}
      {compareMode && selectedKpiIds.length > 1 && !zoomedKpiId ? (
        // RENDER SPLIT GRID VIEW
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>

              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Analyzing {selectedKpiIds.length} Metrics in Parallel
              </h2>
            </div>
            <button
              onClick={() => setSelectedKpiIds([selectedKpiIds[0]])}
              className="text-xs font-bold text-rose-600 dark:text-rose-450 hover:underline"
            >
              Reset Comparison
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {selectedKpiIds.map((kpiId) => {
              const kpi = kpisQuery.data?.find((k) => k.kpiId === kpiId);
              const kpiName = kpi?.name || "KPI";
              const kpiOwner = kpi?.owner || "Owner";
              const ts = timeseriesMap[kpiId];
              const processedKpiData = ts?.processed || [];
              const theme = CHART_THEMES[kpiId] || CHART_THEMES.net_revenue;
              const stats = getKpiStats(ts?.processed);

              return (
                <div
                  key={kpiId}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/50 flex flex-col justify-between hover:shadow-md transition duration-300"
                >
                  <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                    <div>
                      <span className="text-[9px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">
                        {kpiOwner.replace("_", " ")}
                      </span>
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5 truncate">{kpiName}</h3>
                      <p className="text-lg font-black text-slate-900 dark:text-white mt-1">
                        {formatKpiValue(kpiId, stats.latestValue)}
                      </p>
                    </div>
                    {/* Zoom In button */}
                    <button
                      onClick={() => setZoomedKpiId(kpiId)}
                      className="p-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-indigo-650 dark:text-indigo-400 rounded-xl transition shadow-sm border border-slate-200 dark:border-slate-700"
                      title="Focus on this chart"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                      </svg>
                    </button>
                  </div>

                  <div className="h-44 w-full mt-2">
                    {processedKpiData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={processedKpiData} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                          <defs>
                            <linearGradient id={`gradient-${kpiId}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={theme.stopStart} stopOpacity={0.2} />
                              <stop offset="95%" stopColor={theme.stopEnd} stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#1e293b" : "#f1f5f9"} />
                          <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: isDark ? "#94a3b8" : "#64748b" }} />
                          <YAxis tickLine={false} axisLine={false} tickFormatter={(val) => formatKpiValue(kpiId, val)} tick={{ fontSize: 9, fill: isDark ? "#94a3b8" : "#64748b" }} width={45} />
                          <Tooltip
                            contentStyle={{ backgroundColor: isDark ? "#0f172a" : "#ffffff", border: `1px solid ${isDark ? "#1e293b" : "#e2e8f0"}`, borderRadius: "6px", fontSize: "11px" }}
                            formatter={(val: number) => [formatKpiValue(kpiId, val), "Value"]}
                          />
                          <Area type="monotone" dataKey="value" stroke={theme.stroke} strokeWidth={2.2} fillOpacity={1} fill={`url(#gradient-${kpiId})`} />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center text-center p-4">
                        <p className="text-xs text-slate-400">No data matches current filters.</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        // RENDER STANDARD SINGLE/ZOOM VIEW
        <>
          {compareMode && zoomedKpiId && (
            <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 p-4 rounded-xl mb-6">
              <span className="text-sm font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-650 animate-ping" />
                Focused Zoom View: {selectedKpiName} (Exit focus to return to {selectedKpiIds.length} KPI split comparison)
              </span>
              <button
                onClick={() => setZoomedKpiId(null)}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition shadow-md"
              >
                Exit Focus Mode
              </button>
            </div>
          )}

          {specificDate ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900/50 flex flex-col items-center justify-center text-center">
              <div className="max-w-2xl w-full space-y-6">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-500 dark:text-indigo-400">
                    Single Day Analytics Detail
                  </span>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                    {selectedKpiName} on {new Date(`${specificDate}T00:00:00.000Z`).toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </h2>
                </div>

                {targetPoint ? (
                  <div className="space-y-6">
                    {/* Large Value & Change Badge */}
                    <div className="p-8 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-850 inline-block w-full">
                      <p className="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Recorded Metric Value</p>
                      <p className="text-5xl md:text-6xl font-black text-slate-900 dark:text-white mt-2 tracking-tight">
                        {formatKpiValue(activeKpiId, targetPoint.value)}
                      </p>
                      {targetChangePercent !== null && (
                        <div className="mt-4 flex items-center justify-center">
                          <span className={`inline-flex items-center gap-1 rounded-full px-3.5 py-1 text-sm font-extrabold leading-none ${(activeKpiId === "cac" ? targetChangePercent < 0 : targetChangePercent > 0)
                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-450"
                            : targetChangePercent === 0
                              ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                              : "bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-450"
                            }`}>
                            {targetChangePercent > 0 ? "↑ " : targetChangePercent < 0 ? "↓ " : ""} {Math.abs(targetChangePercent * 100).toFixed(1)}%
                          </span>
                          <span className="text-xs text-slate-400 dark:text-slate-500 ml-2 font-medium">vs. previous day</span>
                        </div>
                      )}
                    </div>

                    {/* KPI Metadata description cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                      <div className="p-4 bg-slate-50 dark:bg-slate-950/25 rounded-xl border border-slate-100 dark:border-slate-850">
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Strategic Owner</p>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1 capitalize">
                          {kpisQuery.data?.find(k => k.kpiId === activeKpiId)?.owner.replace("_", " ")}
                        </p>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-950/25 rounded-xl border border-slate-100 dark:border-slate-850">
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Operational Cadence</p>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">Updates {kpisQuery.data?.find(k => k.kpiId === activeKpiId)?.refreshCadence}</p>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-950/25 rounded-xl border border-slate-100 dark:border-slate-850 md:col-span-2">
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Business Context</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                          {kpisQuery.data?.find(k => k.kpiId === activeKpiId)?.businessDefinition}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No recorded details found for this date.</p>
                )}

                <div className="pt-4">
                  <button
                    onClick={handleResetFilters}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition shadow-md"
                  >
                    Reset Filter and Show Charts
                  </button>
                </div>
              </div>
            </section>
          ) : specificMonth ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Dual Grain Analysis · {specificMonth}
                  </span>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                    {selectedKpiName} Monthly Overview
                  </h2>
                </div>
                <button
                  onClick={handleResetFilters}
                  className="text-xs font-bold text-rose-500 dark:text-rose-455 hover:underline"
                >
                  Reset Filters
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Chart 1: Weekly Aggregates */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 uppercase tracking-wider">Weekly Aggregations</h3>
                  <div className="h-64 w-full">
                    {monthWeeklyData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={monthWeeklyData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                          <defs>
                            <linearGradient id="chartGradientW" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={activeTheme.stopStart} stopOpacity={0.3} />
                              <stop offset="95%" stopColor={activeTheme.stopEnd} stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#1e293b" : "#f1f5f9"} />
                          <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: isDark ? "#94a3b8" : "#64748b" }} dy={10} />
                          <YAxis tickLine={false} axisLine={false} tickFormatter={(val) => formatKpiValue(activeKpiId, val)} tick={{ fontSize: 11, fill: isDark ? "#94a3b8" : "#64748b" }} dx={-10} />
                          <Tooltip
                            contentStyle={{ backgroundColor: isDark ? "#0f172a" : "#ffffff", border: `1px solid ${isDark ? "#1e293b" : "#e2e8f0"}`, borderRadius: "8px" }}
                            labelStyle={{ fontSize: "11px", fontWeight: "bold", color: isDark ? "#94a3b8" : "#64748b" }}
                            itemStyle={{ fontSize: "13px", fontWeight: "bold", color: isDark ? "#f1f5f9" : "#0f172a" }}
                            formatter={(val: number) => [formatKpiValue(activeKpiId, val), "Value"]}
                          />
                          <Area type="monotone" dataKey="value" stroke={activeTheme.stroke} strokeWidth={3} fillOpacity={1} fill="url(#chartGradientW)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center"><p className="text-xs text-slate-400">No weekly aggregates</p></div>
                    )}
                  </div>
                </div>

                {/* Chart 2: Daily Trend */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 uppercase tracking-wider">Daily Granular Trend</h3>
                  <div className="h-64 w-full">
                    {monthDailyData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={monthDailyData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                          <defs>
                            <linearGradient id="chartGradientD" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={activeTheme.stopStart} stopOpacity={0.3} />
                              <stop offset="95%" stopColor={activeTheme.stopEnd} stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#1e293b" : "#f1f5f9"} />
                          <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: isDark ? "#94a3b8" : "#64748b" }} dy={10} />
                          <YAxis tickLine={false} axisLine={false} tickFormatter={(val) => formatKpiValue(activeKpiId, val)} tick={{ fontSize: 11, fill: isDark ? "#94a3b8" : "#64748b" }} dx={-10} />
                          <Tooltip
                            contentStyle={{ backgroundColor: isDark ? "#0f172a" : "#ffffff", border: `1px solid ${isDark ? "#1e293b" : "#e2e8f0"}`, borderRadius: "8px" }}
                            labelStyle={{ fontSize: "11px", fontWeight: "bold", color: isDark ? "#94a3b8" : "#64748b" }}
                            itemStyle={{ fontSize: "13px", fontWeight: "bold", color: isDark ? "#f1f5f9" : "#0f172a" }}
                            formatter={(val: number) => [formatKpiValue(activeKpiId, val), "Value"]}
                          />
                          <Area type="monotone" dataKey="value" stroke={activeTheme.stroke} strokeWidth={3} fillOpacity={1} fill="url(#chartGradientD)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center"><p className="text-xs text-slate-400">No daily trend data</p></div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 capitalize">
                    Trend Analysis · {weekStartDate ? "Weekly Period" : `${viewMode} reporting`}
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                    {selectedKpiName} {weekStartDate ? `(Starting ${weekStartDate})` : "History"}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: activeTheme.stroke }} />
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                    {weekStartDate ? "Daily Trend (7 Days)" : viewMode === "daily" ? "Daily Actuals" : `${viewMode} aggregates`}
                  </span>
                </div>
              </div>

              <div className="h-80 w-full">
                {activeQuery.isLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-sm text-slate-500 animate-pulse">Loading timeseries data…</p>
                  </div>
                ) : (weekStartDate ? weekProcessedData.length > 0 : processedData.length > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weekStartDate ? weekProcessedData : processedData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={activeTheme.stopStart} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={activeTheme.stopEnd} stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#1e293b" : "#f1f5f9"} />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: isDark ? "#94a3b8" : "#64748b" }} dy={10} />
                      <YAxis tickLine={false} axisLine={false} tickFormatter={(val) => formatKpiValue(activeKpiId, val)} tick={{ fontSize: 11, fill: isDark ? "#94a3b8" : "#64748b" }} dx={-10} />
                      <Tooltip
                        contentStyle={{ backgroundColor: isDark ? "#0f172a" : "#ffffff", border: `1px solid ${isDark ? "#1e293b" : "#e2e8f0"}`, borderRadius: "8px" }}
                        labelStyle={{ fontSize: "11px", fontWeight: "bold", color: isDark ? "#94a3b8" : "#64748b" }}
                        itemStyle={{ fontSize: "13px", fontWeight: "bold", color: isDark ? "#f1f5f9" : "#0f172a" }}
                        formatter={(val: number) => [formatKpiValue(activeKpiId, val), "Value"]}
                      />
                      <Area type="monotone" dataKey="value" stroke={activeTheme.stroke} strokeWidth={3} fillOpacity={1} fill="url(#chartGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900/20 p-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold">No data matches the selected filter.</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Please try resetting your specific filters or choosing a different metric.</p>
                  </div>
                )}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
