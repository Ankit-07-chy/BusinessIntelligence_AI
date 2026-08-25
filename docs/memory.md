# KPI Intelligence Engine — State & Mathematical Memory (Phase 1 to 3)

This document maps the mathematical formulas, database structures, and testing status of the KPI Intelligence Engine prototype up to Phase 3.

---

## 1. System Mathematical Formulae & Logic

The Quantitative Truth layer executes entirely in the backend through deterministic mathematical functions in [`backend/src/analytics/`](file:///c:/Users/ankit/Desktop/BusinessIntelligence_AI/backend/src/analytics):

### 1.1 Baseline Forecast ([`baseline.ts`](file:///c:/Users/ankit/Desktop/BusinessIntelligence_AI/backend/src/analytics/baseline.ts))
Calculates an expected value per date based on same-weekday history:
- **Same-Weekday Average (4-Week)**:
  $$Same\_Weekday\_Average = \frac{\sum_{i=1}^{4} value(\text{Target Date} - i \times 7)}{\text{samplePoints}}$$
- **Trend Adjustment (OLS Slope)**:
  Calculates linear regression slope over the historical same-weekday values.
- **Seasonality Adjustment**:
  $$Seasonality\_Adjustment = (\text{WindowAverage}_{7\text{d}} - \text{WindowAverage}_{28\text{d}}) \times 0.5$$
- **Expected Value**:
  $$Expected\_Value = Same\_Weekday\_Average + Trend\_Adjustment + Seasonality\_Adjustment$$
- **Category Fallback (Incident 3)**:
  When fewer than 2 same-weekday points exist, the engine falls back to category-level aggregates (`category_fallback`), scaling the baseline accordingly.

### 1.2 Anomaly Detection & Materiality ([`anomalyDetection.ts`](file:///c:/Users/ankit/Desktop/BusinessIntelligence_AI/backend/src/analytics/anomalyDetection.ts), [`materiality.ts`](file:///c:/Users/ankit/Desktop/BusinessIntelligence_AI/backend/src/analytics/materiality.ts))
- **Residual**: $Actual\_Value - Expected\_Value$
- **Z-Score**:
  $$Z\_Score = \frac{Residual}{Historical\_StdDev}$$
- **Materiality Score**:
  $$Materiality\_Score = |Z\_Score| \times \text{Business Impact} \times \text{Data Quality}$$
  Where:
  $$\text{Business Impact} = \frac{|Residual|}{Expected\_Value} \times 10$$
- **Outlier Flag**: Triggered if $|Z\_Score| > 1.8$ AND business impact $> 1.0$ AND data quality $> 0.4$.

### 1.3 Data Quality & Confidence Scoring ([`dataQuality.ts`](file:///c:/Users/ankit/Desktop/BusinessIntelligence_AI/backend/src/analytics/dataQuality.ts), [`confidence.ts`](file:///c:/Users/ankit/Desktop/BusinessIntelligence_AI/backend/src/analytics/confidence.ts))
- **Data Quality**:
  $$Quality\_Score = 0.5 \times Completeness\_Score + 0.5 \times \left(1 - \frac{\text{Ingestion Lag in Days}}{14}\right)$$
- **Confidence Classification**:
  $$Confidence\_Score = 0.3 \times \text{Evidence Strength} + 0.25 \times \text{Data Quality} + 0.25 \times \text{Model Fit} + 0.2 \times \text{Causal Evidence}$$
  - **High**: $\ge 0.75$
  - **Medium**: $0.50 \le \text{Confidence} < 0.75$
  - **Low**: $< 0.50$ (triggers **Abstention**)

### 1.4 Abstention Handler ([`abstention.ts`](file:///c:/Users/ankit/Desktop/BusinessIntelligence_AI/backend/src/analytics/abstention.ts))
Prevents LLM processing and returns structured JSON if:
- $\text{Confidence} < 0.5$, OR
- Data quality is below `0.5`, OR
- Ingestion lag exceeds `5 days` (e.g. for marketing spend).

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
- Provisioned PostgreSQL on host port **`5433`** to resolve native host port conflict.
- Applied all 4 database migration steps in order via `npx prisma migrate dev`.
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
Running the unit test suite (`npm run test`) runs **24 tests** successfully:
1. **`baseline.test.ts`**: Verifies 4-week average forecasts, OLS trend adjustments, seasonality offsets, and category fallback.
2. **`anomalyDetection.test.ts`**: Verifies residual variance, outlier thresholds, and statistical z-scores.
3. **`materiality.test.ts`**: Confirms dollar impact levels and materiality rankings.
4. **`dataQuality.test.ts`**: Confirms freshness and completeness scoring.
5. **`confidence.test.ts`**: Checks score weighting classification.
6. **`abstention.test.ts`**: Validates bypass logic for stale inputs.
7. **`contribution.test.ts`**: Confirms driver attribution calculations.
8. **`ranking.test.ts`**: Verifies multi-factor driver order.
9. **`health.test.ts`**: Confirms API health check.
