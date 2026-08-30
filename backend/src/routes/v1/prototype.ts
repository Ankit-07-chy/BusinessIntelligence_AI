import { Router } from "express";
import { getKpiTimeseries } from "../../services/kpiService.js";

export const prototypeRouter = Router();

prototypeRouter.get("/prototype/demo-data", async (_req, res) => {
  try {
    // Check if live series data is reachable
    const series = await getKpiTimeseries("net_revenue", { allowedRegions: ["ALL"] }).catch(() => null);
    const hasLiveSeries = Array.isArray(series) && series.length > 0;
    
    // Synthetic scenario data matching the actual engine output
    const fallbackData = {
      scenario: {
        kpiId: "net_revenue",
        kpiName: "Net Revenue",
        targetDate: "2026-08-15",
        currency: "USD",
        hasLiveSeries
      },
      scene1_businessData: {
        sales: { grossRevenue: 520000, discountAmount: 60000, returnsAmount: 40000, netRevenue: 420000, orderCount: 4200 },
        inventory: { productsTracked: 140, totalStores: 12, activeStockouts: 3, topStockoutSku: "SKU-ELEC-101 (Top 4K Monitor)" },
        marketing: { activeCampaigns: 8, channel: "paid_search", spendCutPercent: 20, spendCutUsd: 18000 }
      },
      scene2_kpiCalculation: {
        grossRevenue: 520000,
        discountAmount: 60000,
        returnsAmount: 40000,
        netRevenue: 420000,
        formula: "net_revenue = gross_revenue - discount_amount - returns_amount"
      },
      scene3_historicalBaseline: {
        points: [
          { date: "Jul 18", value: 780000 },
          { date: "Jul 25", value: 810000 },
          { date: "Aug 1",  value: 825000 },
          { date: "Aug 8",  value: 840000 },
          { date: "Aug 15", value: 420000 }
        ],
        expectedValue: 840000,
        method: "same_weekday_trend",
        sameWeekdayAverage: 813750,
        trendAdjustment: 26250,
        seasonalityAdjustment: 0,
        reliabilityScore: 0.95
      },
      scene4_actualVsExpected: {
        expectedValue: 840000,
        actualValue: 420000,
        difference: -420000,
        percentDrop: 50.0
      },
      scene5_anomalyDetection: {
        actualValue: 420000,
        expectedValue: 840000,
        residual: -420000,
        historicalStdDev: 123529.41,
        zScore: -3.4,
        statisticalThreshold: 2.0,
        isAnomaly: true,
        isAdverse: true
      },
      scene6_rootCauseAnalysis: {
        totalKpiChange: -420000,
        controlStoreComparison: {
          controlStoreExpected: 500000,
          affectedStoreActual: 200000,
          gap: -300000
        },
        drivers: [
          {
            driverId: "stockout_top_skus",
            name: "Top SKU Stockouts",
            estimatedImpact: -300000,
            contributionPercent: 71.4,
            method: "control_store_comparison"
          },
          {
            driverId: "paid_search_reduction",
            name: "Paid Search Spend Cut (-20%)",
            estimatedImpact: -120000,
            contributionPercent: 28.6,
            method: "region_channel_control_comparison"
          }
        ]
      },
      scene7_driverContribution: {
        totalChange: -420000,
        explainedImpact: -420000,
        residualImpact: 0,
        breakdown: [
          { name: "Top SKU Stockouts", impact: -300000, percent: 71.4, color: "#ef4444" },
          { name: "Paid Search Budget Cut", impact: -120000, percent: 28.6, color: "#f59e0b" }
        ]
      },
      scene8_confidenceAndMateriality: {
        factors: {
          evidenceStrength: 1.0,
          dataQualityScore: 0.9,
          modelFitScore: 0.9,
          causalConfirmation: 1.0,
          freshnessScore: 1.0
        },
        confidenceScore: 0.82,
        confidenceLabel: "HIGH",
        materialityScore: 0.85,
        materialityLevel: "HIGH"
      },
      scene9_safetyAbstention: {
        shouldAbstain: false,
        checkedRules: [
          { rule: "Confidence Score ≥ 0.5", status: "PASS", val: "0.82" },
          { rule: "Data Quality Score ≥ 0.5", status: "PASS", val: "0.90" },
          { rule: "Key Source Present", status: "PASS", val: "All Present" },
          { rule: "Contradiction Score ≤ 0.6", status: "PASS", val: "0.00" },
          { rule: "Security Filter Clear", status: "PASS", val: "Clear" }
        ]
      },
      scene10_evidencePack: {
        anomaly: {
          kpiId: "net_revenue",
          period: "2026-08-15",
          actualValue: 420000,
          forecastValue: 840000,
          delta: -420000,
          confidenceScore: 0.82,
          dataQualityScore: 0.9
        },
        drivers: [
          { driverId: "stockout_top_skus", estimatedImpact: -300000, confidenceScore: 0.85 },
          { driverId: "paid_search_reduction", estimatedImpact: -120000, confidenceScore: 0.78 }
        ],
        recommendedActions: [
          {
            action: "Expedite inventory replenishment & restore safety stock levels",
            owner: "Supply Chain Manager",
            lever: "inventory_reorder",
            expected_impact: 300000,
            confidence: 0.85,
            monitoring_plan: "Track daily SKU stockout rate and fulfillment SLA"
          }
        ]
      },
      scene11_llmExplanation: {
        narrativeText: "Net Revenue fell significantly below expected levels on August 15 ($420,000 actual vs $840,000 forecast, a 50% drop, Z-score -3.4). The primary driver was inventory stockouts in top-selling electronics SKUs, accounting for -$300,000 of the revenue loss, followed by a 20% reduction in paid-search marketing spend which contributed -$120,000. Data quality and baseline reliability are high (confidence: 82%).",
        status: "ok",
        source: "deterministic_evidence_only"
      },
      scene12_finalInsight: {
        title: "Net Revenue Anomaly & Executive Action Plan",
        kpi: "Net Revenue",
        period: "August 15, 2026",
        actual: "$420K",
        expected: "$840K",
        delta: "-$420K (-50%)",
        primaryDriver: "Inventory Stockouts in Top SKUs (-$300K / 71%)",
        secondaryDriver: "Paid Search Spend Reduction (-$120K / 29%)",
        confidence: "82% — HIGH",
        materiality: "HIGH",
        recommendedAction: "Expedite inventory replenishment for top SKUs & restore paid search budget",
        ownerPersona: "Supply Chain Manager & Marketing Manager"
      }
    };

    return res.json(fallbackData);
  } catch (error) {
    console.error("Error generating prototype data:", error);
    res.status(500).json({ error: "Failed to load prototype data" });
  }
});
