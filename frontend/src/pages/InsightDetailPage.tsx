import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { api, getRestrictionMessage } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import { ConfidenceBadge } from "../components/insights/ConfidenceBadge";
import { DriverList } from "../components/insights/DriverList";
import { PersonaNarrativeTabs } from "../components/insights/PersonaNarrativeTabs";
import { ActionPlan } from "../components/insights/ActionPlan";
import { FeedbackPanel } from "../components/feedback/FeedbackPanel";
import { InsightChatWidget } from "../components/insights/InsightChatWidget";
import type { AnomalyDetail } from "../lib/types";

function formatPeriodText(period: string, cadence: "daily" | "weekly" | "monthly"): string {
  if (!period) return "";
  const d = new Date(`${period}T00:00:00.000Z`);
  if (isNaN(d.getTime())) return period;

  if (cadence === "daily") {
    const prev = new Date(d.getTime() - 24 * 60 * 60 * 1000);
    const formatDate = (date: Date) => date.toISOString().slice(5, 10);
    return `${formatDate(d)} vs ${formatDate(prev)}`;
  }
  
  if (cadence === "weekly") {
    const curEnd = d;
    const curStart = new Date(curEnd.getTime() - 6 * 24 * 60 * 60 * 1000);
    const prevEnd = new Date(curStart.getTime() - 1 * 24 * 60 * 60 * 1000);
    const prevStart = new Date(prevEnd.getTime() - 6 * 24 * 60 * 60 * 1000);
    
    const formatDate = (date: Date) => date.toISOString().slice(5, 10);
    return `${formatDate(curStart)} to ${formatDate(curEnd)} vs ${formatDate(prevStart)} to ${formatDate(prevEnd)}`;
  }
  
  if (cadence === "monthly") {
    const curMonthName = d.toLocaleString("en-US", { month: "long" });
    const curYear = d.getUTCFullYear();
    const prevDate = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    const prevMonthName = prevDate.toLocaleString("en-US", { month: "long" });
    const prevYear = prevDate.getUTCFullYear();
    
    return `${curMonthName} ${curYear} vs ${prevMonthName} ${prevYear}`;
  }
  
  return period;
}

export function InsightDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();

  const anomalyQuery = useQuery({
    queryKey: ["anomaly", id],
    queryFn: async () => (await api.get<AnomalyDetail>(`/anomalies/${id}`)).data,
    enabled: Boolean(id),
  });

  if (anomalyQuery.isLoading) {
    return <p className="text-sm text-slate-500">Loading insight…</p>;
  }

  const restrictionMessage = getRestrictionMessage(anomalyQuery.error);
  if (restrictionMessage) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
        <p className="font-semibold">Restricted by your role's data policy</p>
        <p className="mt-1">{restrictionMessage}</p>
      </div>
    );
  }
  if (anomalyQuery.isError || !anomalyQuery.data || !id) {
    return <p className="text-sm text-red-600">Anomaly not found.</p>;
  }

  const anomaly = anomalyQuery.data;
  const driverOptions = anomaly.driverContributions.map((driver) => driver.driverId);

  const pct = Math.round(anomaly.periodOverPeriodChange * 100);
  const direction = pct < 0 ? "decreased" : "increased";
  const absPct = Math.abs(pct);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {anomaly.kpiName} {direction} by {absPct}%
          </h2>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">Period: {anomaly.period}</p>
        </div>
        <ConfidenceBadge label={anomaly.confidenceLabel} score={anomaly.confidenceScore} />
      </div>

      <div className="grid grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80">
        <div className="text-center p-2 border-r border-slate-200 dark:border-slate-800">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Daily Trend</p>
          <p className={`text-lg font-extrabold mt-1 ${anomaly.periodOverPeriodChange < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
            {anomaly.periodOverPeriodChange >= 0 ? "+" : ""}{Math.round(anomaly.periodOverPeriodChange * 100)}%
          </p>
          <p className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 mt-1">
            {formatPeriodText(anomaly.period, "daily")}
          </p>
        </div>
        <div className="text-center p-2 border-r border-slate-200 dark:border-slate-800">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Weekly Trend</p>
          <p className={`text-lg font-extrabold mt-1 ${anomaly.weeklyChangePercent < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
            {anomaly.weeklyChangePercent >= 0 ? "+" : ""}{Math.round(anomaly.weeklyChangePercent * 100)}%
          </p>
          <p className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 mt-1">
            {formatPeriodText(anomaly.period, "weekly")}
          </p>
        </div>
        <div className="text-center p-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Monthly Trend</p>
          <p className={`text-lg font-extrabold mt-1 ${anomaly.monthlyChangePercent < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
            {anomaly.monthlyChangePercent >= 0 ? "+" : ""}{Math.round(anomaly.monthlyChangePercent * 100)}%
          </p>
          <p className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 mt-1">
            {formatPeriodText(anomaly.period, "monthly")}
          </p>
        </div>
      </div>

      <section className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">What caused this change?</h3>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <PersonaNarrativeTabs anomalyId={id} defaultPersona={user?.persona} />
          </div>
          <div className="bg-slate-50 dark:bg-slate-900/40 p-5 rounded-xl border border-slate-100 dark:border-slate-800/80">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Attributed Drivers</h4>
            <DriverList drivers={anomaly.driverContributions} />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Suggestions</h3>
        <ActionPlan anomalyId={id} />
      </section>

      <section className="border-t border-slate-100 dark:border-slate-800/80 pt-6">
        <FeedbackPanel anomalyId={id} driverOptions={driverOptions} />
      </section>

      {/* Contextual chatbot widget */}
      <InsightChatWidget anomalyId={id} />
    </div>
  );
}
