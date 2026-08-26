import { classifyConfidence } from "../analytics/confidence.js";
import { formatDriverLabel } from "./driverLabels.js";
import type { EvidencePack, ExplanationResponse } from "./types.js";

function formatUsd(value: number): string {
  const rounded = Math.round(Math.abs(value));
  return `$${rounded.toLocaleString("en-US")}`;
}

function formatPercent(value: number): string {
  return `${Math.round(Math.abs(value) * 100)} percent`;
}

function topDrivers(pack: EvidencePack, count: number) {
  return [...pack.drivers].sort((a, b) => Math.abs(b.estimated_impact) - Math.abs(a.estimated_impact)).slice(0, count);
}

function buildSummary(persona: string, pack: EvidencePack): string {
  const direction = pack.delta < 0 ? "below" : "above";
  const [primary, secondary] = topDrivers(pack, 2);

  switch (persona) {
    case "cfo": {
      let text = `${formatDriverLabel(pack.kpi_id)} is ${formatUsd(pack.delta)} ${direction} forecast.`;
      if (primary) text += ` The primary driver is ${formatDriverLabel(primary.driver)}.`;
      if (secondary) text += ` The secondary driver is ${formatDriverLabel(secondary.driver)}.`;
      if (pack.recommended_actions[0]) text += ` Recommended action: ${pack.recommended_actions[0].action}.`;
      return text;
    }
    case "supply_chain_manager": {
      let text = `${formatDriverLabel(pack.kpi_id)} moved ${formatUsd(pack.delta)} ${direction} forecast for period ${pack.period}.`;
      if (primary) text += ` Primary operational driver: ${formatDriverLabel(primary.driver)} (impact ${formatUsd(primary.estimated_impact)}).`;
      if (pack.recommended_actions[0]) text += ` Recommended action: ${pack.recommended_actions[0].action}.`;
      return text;
    }
    case "marketing_manager": {
      let text = `${formatDriverLabel(pack.kpi_id)} shifted ${formatPercent(pack.delta_percent)} ${direction} forecast.`;
      if (primary) text += ` Likely driver: ${formatDriverLabel(primary.driver)}.`;
      if (pack.recommended_actions[0]) text += ` Recommended action: ${pack.recommended_actions[0].action}.`;
      return text;
    }
    case "digital_product_manager": {
      let text = `${formatDriverLabel(pack.kpi_id)} shifted ${formatPercent(pack.delta_percent)} ${direction} forecast.`;
      if (primary) text += ` Likely funnel driver: ${formatDriverLabel(primary.driver)}.`;
      if (pack.recommended_actions[0]) text += ` Recommended action: ${pack.recommended_actions[0].action}.`;
      return text;
    }
    case "analyst":
    default: {
      let text = `Anomaly identified in ${pack.kpi_id} (confidence score: ${pack.confidence_score.toFixed(2)}, data quality: ${pack.data_quality_score.toFixed(2)}).`;
      if (primary) {
        text += ` Primary driver: ${primary.driver} (impact: ${primary.estimated_impact < 0 ? "-" : ""}${formatUsd(primary.estimated_impact)}, method: ${primary.method}, confidence: ${primary.confidence.toFixed(2)}).`;
      }
      if (Math.abs(pack.unexplained_residual) > 0.01) {
        text += ` Unexplained residual: ${formatUsd(pack.unexplained_residual)}.`;
      }
      return text;
    }
  }
}

/**
 * Deterministic, persona-flavored narrative generated from the evidence pack
 * alone — no network call. Used automatically when no LLM_API_KEY is set, or
 * as a safe fallback if the live model call fails, so the explain/narrate
 * loop is always demoable and never breaks the contract the caller expects.
 */
export function generateFallbackExplanation(pack: EvidencePack): ExplanationResponse {
  const uncertainties: string[] = [];
  const stale = pack.sources.filter((source) => source.quality < 0.7);
  if (stale.length > 0) {
    uncertainties.push(`${stale.map((s) => s.source).join(", ")} data may be stale or incomplete.`);
  }
  if (Math.abs(pack.unexplained_residual) > Math.abs(pack.delta) * 0.15) {
    uncertainties.push("A meaningful share of the movement is not explained by the identified drivers.");
  }

  return {
    status: "success",
    confidence: classifyConfidence(pack.confidence_score),
    summary: buildSummary(pack.persona, pack),
    primary_drivers: topDrivers(pack, 3).map((driver) => ({
      driver: driver.driver,
      impact: driver.estimated_impact,
      confidence: driver.confidence,
    })),
    evidence_citations: [
      ...pack.sources.map((source) => `${source.source} last refreshed ${source.freshness}`),
      ...pack.drivers.map((driver) => `${driver.driver} estimated via ${driver.method}`),
    ],
    uncertainties,
    recommended_actions: pack.recommended_actions.slice(0, 2).map((action) => ({
      action: action.action,
      owner: action.owner,
      expected_impact: action.expected_impact,
    })),
    clarification_question: null,
  };
}
