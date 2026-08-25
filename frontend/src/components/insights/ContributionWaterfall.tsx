import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDriverLabel } from "../../lib/driverLabels";
import type { AnomalyDetail } from "../../lib/types";

type StepKind = "total" | "decrease" | "increase";

const COLORS: Record<StepKind, string> = {
  total: "#0f172a",
  decrease: "#e11d48",
  increase: "#059669",
};

interface WaterfallStep {
  name: string;
  base: number;
  value: number;
  kind: StepKind;
}

function buildSteps(anomaly: AnomalyDetail): WaterfallStep[] {
  const steps: WaterfallStep[] = [{ name: "Forecast", base: 0, value: anomaly.forecastValue, kind: "total" }];

  let running = anomaly.forecastValue;
  for (const driver of anomaly.driverContributions) {
    const start = running;
    running += driver.estimatedImpact;
    steps.push({
      name: formatDriverLabel(driver.driverId),
      base: Math.min(start, running),
      value: Math.abs(driver.estimatedImpact),
      kind: driver.estimatedImpact < 0 ? "decrease" : "increase",
    });
  }

  steps.push({ name: "Actual", base: 0, value: anomaly.actualValue, kind: "total" });
  return steps;
}

export function ContributionWaterfall({ anomaly }: { anomaly: AnomalyDetail }) {
  const steps = buildSteps(anomaly);

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={steps} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 0 })} />
          <Bar dataKey="base" stackId="waterfall" fill="transparent" />
          <Bar dataKey="value" stackId="waterfall">
            {steps.map((step, index) => (
              <Cell key={index} fill={COLORS[step.kind]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
