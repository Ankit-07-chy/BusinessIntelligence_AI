# KPI Intelligence Engine — State & Mathematical Memory (Phase 1 to 3)

This document maps the mathematical formulas, database structures, and testing status of the KPI Intelligence Engine prototype up to Phase 3.

---

## 1. System Mathematical Formulae & Logic

> **Correction (2026-08-26):** this section previously described formulas that do
> not match the actual implementation (wrong weights, wrong thresholds, an
> `outlier flag`/`business impact ×10` rule that doesn't exist in code). The
> analytics source under `backend/src/analytics/` has not changed since Day 1 —
> below is what it actually computes, per docs/architecture.md §2.1-2.8.

The Quantitative Truth layer executes entirely in the backend through deterministic mathematical functions in `backend/src/analytics/`:

### 1.1 Baseline Forecast (`baseline.ts`)
Calculates an expected value per date based on same-weekday history:
- **Same-Weekday Average**: mean of up to 4 same-weekday values from the prior 4 weeks (needs at least 2 to use this method).
- **Trend Adjustment**: OLS slope over those same-weekday points (oldest first).
- **Seasonality Adjustment**: `(windowAverage(7d) - windowAverage(28d)) * 0.5`.
- **Expected Value**: `sameWeekdayAverage + trendAdjustment + seasonalityAdjustment`.
- **Category Fallback (Incident 3)**: when fewer than 2 same-weekday points exist and a `categoryHistory` series is supplied, recurses on that series instead (`method: "category_fallback"`); with no category history either, falls back to a plain mean (`method: "insufficient_history_mean"`).

### 1.2 Anomaly Detection & Materiality (`anomalyDetection.ts`, `materiality.ts`)
- **Residual**: `actualValue - expectedValue`.
- **Z-Score**: `residual / historicalStdDev` (0 if stdDev is 0).
- **Is Anomaly**: `|residual| > absoluteThreshold AND |zScore| > statisticalThreshold AND dataQualityScore > minimumQualityScore`.
- **Statistical Score**: `clamp01(|zScore| / referenceZScore)` (referenceZScore defaults to 3).
- **Business Impact Score**: `clamp01(normalizedAbsDollarImpact + marginImpact + strategicWeight)`.
- **Materiality Score**: `clamp01(statisticalScore * businessImpactScore * dataQualityScore)`.

### 1.3 Data Quality & Confidence Scoring (`dataQuality.ts`, `confidence.ts`)
- **Data Quality Score**: `0.4*completeness + 0.3*freshness + 0.2*consistency + 0.1*validity` (all clamped to [0,1]).
- **Freshness Score**: decays linearly from 1 to 0 as a source gets up to 2x its expected refresh cadence overdue.
- **Confidence Score**: `0.30*evidenceStrength + 0.25*dataQualityScore + 0.20*modelFitScore + 0.15*causalOrBusinessConfirmation + 0.10*freshnessScore`.
  - **High**: `>= 0.75`
  - **Medium**: `0.50 <= confidence < 0.75`
  - **Low**: `< 0.50` (triggers **Abstention**)

### 1.4 Abstention Handler (`abstention.ts`)
Abstains (returns a structured `status: "abstain"` response instead of calling the LLM) if ANY of:
- `confidenceScore < 0.5`, OR
- `keySourceMissing` is true, OR
- `dataQualityScore < 0.5`, OR
- `contradictionScore > contradictionThreshold` (default 0.6), OR
- `securityFilterRemovedCriticalData` is true (the anomaly's KPI is a CLS-restricted column for the caller's role).

---

## 2. Database Schema & Fact Tables ([`schema.prisma`](file:///c:/Users/ankit/Desktop/BusinessIntelligence_AI/backend/prisma/schema.prisma))

The engine maps 5 factual streams into PostgreSQL:
1. **`fact_sales`**: daily transaction level metrics (revenue, returns, cost of goods sold).
2. **`fact_inventory`**: daily items on hand and stockout flags.
3. **`fact_marketing_spend`**: campaign search/social advertising costs, clicks, impressions, and new client acquisitions.
4. **`fact_web_traffic`**: channel sessions and conversion orders.
5. **`fact_shipments`**: delivery logs mapping carriers, regions, and OTIF flags.

---

## 3. Implemented and Verified Phase Steps

### Phase 1: Environment & Database Initialization (Passed)
- Provisioned PostgreSQL via `docker compose up -d postgres`, on the default host port **`5432`** (per `docker-compose.yml` — not 5433 as an earlier draft of this doc claimed).
- Applied all database migration steps in order (6 migrations as of 2026-08-26).
- Seeded system roles (CFO, Supply Chain Manager, Marketing Manager, Analyst) and metric catalog metadata.

### Phase 2: Synthetic Data Generation & Golden Incidents (Passed)
- Executed [`generateSyntheticData.ts`](file:///c:/Users/ankit/Desktop/BusinessIntelligence_AI/backend/scripts/generateSyntheticData.ts) to seed 90 days of transactions.
- Injected specific validation cases:
  - **Golden Incident 1**: SKU stockout and 20% search marketing cut in EU starting on June 10.
  - **Golden Incident 2**: Lagging ingestion pipeline for Campaign 8.
  - **Golden Incident 3**: Newly launched VR Goggles (`SKU-0024`) with sparse history.
  - **Golden Incident 4**: Geographic stores partitioned across region scopes (`US` vs. `EU`).

### Phase 3: Deterministic Analytics & Quantitative Layer (Passed)
- All calculation utilities are fully implemented in the backend.
- Verified mathematically through the automated test suite.

---

## 4. Test Verification Status
As of 2026-08-26, `npm test` runs **32 tests across 12 files** successfully — the 8 analytics unit test files (22 tests), `health.test.ts` (2), `explanation.test.ts` (2), `security.test.ts` (3), and `goldenIncident004Security.test.ts` (3, added to cover golden incident 4 explicitly). All 4 golden incidents (`evals/golden_incidents/*.yaml`) have been run against the live pipeline and pass — see `backend/scripts/runGoldenIncidents.ts` for incidents 1-3 and `goldenIncident004Security.test.ts` for incident 4.
