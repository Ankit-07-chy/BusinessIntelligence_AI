# 3-Day Completion Plan — KPI Intelligence-to-Action Engine

Scaffolding is done (Express + Prisma backend, React + Vite frontend, Docker Compose, CI, semantic YAML contracts, golden incident specs). This plan splits the remaining work across two people for 3 days:

- **Shivam (Full-Stack)** — API wiring, database persistence, all frontend work, security enforcement, infra/deployment.
- **Ankit (ML)** — synthetic data generation logic, the analytics engine (pure functions), LLM/evidence-pack/prompt logic. Ankit's work should be self-contained TypeScript modules with clear inputs/outputs (unit-testable) so he doesn't need to touch Express/Prisma/React directly.

**Handoff contract (agree on this before Day 1 starts):** function signatures for the analytics modules (e.g. `detectAnomaly(actual, forecast, historicalStdDev): { zScore, isAnomaly }`) and for the evidence-pack builder (`buildEvidencePack(anomaly, drivers, sources): EvidencePack`). Shivam calls into these; Ankit never needs to know how they're persisted or displayed.

---

## Day 1 — Data + Analytics Core

### Ankit (ML)
- Write synthetic data generation as **pure functions returning typed arrays** (not DB calls): `generateDimProducts()`, `generateDimStores()`, `generateDimCampaigns()`, `generateFactSales()`, `generateFactInventory()`, `generateFactMarketingSpend()`, `generateFactWebTraffic()`, `generateFactShipments()`. Cover ~90 days, 2 regions (EU/US), multiple SKUs/stores.
- Inject the three mandatory scenarios into the generated data:
  - **Multi-factor incident (Day 15):** stockout begins on a top SKU, paid search spend drops 20%, a competitor promotion flag is set. This should produce a clear net-revenue drop with two attributable drivers.
  - **Sparse-history product:** a new SKU with only 2–3 weeks of `fact_sales` history.
  - **Low-confidence scenario:** `fact_marketing_spend` rows missing/delayed by 12 days for one campaign, reflected as a stale `source_status.last_successful_refresh`.
- Build the analytics engine as pure, unit-tested functions in `backend/src/analytics/`:
  - `baseline.ts` — `computeBaseline(history): expectedValue` (4-week same-weekday average + trend + seasonality adjustment, per `docs/architecture.md` §2.1).
  - `anomalyDetection.ts` — residual + z-score + threshold check (§2.2).
  - `dataQuality.ts` — completeness/freshness/consistency/validity weighted score (§2.4).
  - `materiality.ts` — statistical × business-impact × data-quality score (§2.3).
  - `contribution.ts` — driver impact / total KPI change (§2.5).
  - `confidence.ts` — weighted confidence score + High/Medium/Low labeling (§2.6).
  - `ranking.ts` — driver ranking with contradiction/staleness penalties (§2.7).
  - `abstention.ts` — abstain conditions (§2.8).
  - Write unit tests for each (`backend/tests/unit/*.test.ts` — files already stubbed).

### Shivam (Full-Stack)
- Write the Prisma loader that takes Ankit's generated arrays and `createMany`s them into the 5 fact tables plus `dim_product`/`dim_store`/`dim_campaign`/`dim_calendar`/`source_status`. Run it against local Postgres (`docker compose up`).
- Once Ankit's analytics functions are ready, wire them into a new `anomalyService.ts`: run baseline → anomaly detection → materiality → data quality → confidence for each KPI/period, persist results into `Anomaly` and `DriverContribution` tables.
- Replace the `501 not_implemented` stubs on `GET /anomalies` and `GET /anomalies/:anomalyId` with real Prisma-backed responses. Extend `GET /kpis/:kpiId/timeseries` (currently only `net_revenue` works) to cover `gross_margin`, `conversion_rate`, `otif`, `cac`.
- Frontend: build `InsightsPage` (anomaly list, sortable by materiality/confidence) and the `InsightDetailPage` shell — `DriverList`, `ContributionWaterfall` (Recharts), `EvidenceCard`, `ConfidenceBadge` components. Build against mock data first, swap to the real `/anomalies` endpoint once it's live.
- **End-of-day check:** the Day-15 incident appears as a real, correctly-scored anomaly in the UI with its two drivers ranked.

---

## Day 2 — Explanation Engine, LLM, Actions

### Ankit (ML/LLM)
- Build `llm/evidencePack.ts` as a pure function: `buildEvidencePack(anomaly, drivers, sources) → EvidencePack` matching the schema in `docs/llm_guardrails.md` / `project_knowledge.md` §18. Leave RLS/CLS filtering as an input the caller controls — don't bake security logic into this module.
- Set up the Anthropic SDK client (`llm/client.ts`, `llm/provider.ts`) with forced structured tool-use output validated against a Zod schema (`llm/schemas.ts`) matching the response contract in §19 (`status`, `confidence`, `summary`, `primary_drivers`, `evidence_citations`, `uncertainties`, `recommended_actions`, `clarification_question`).
- Write persona system prompts in `backend/prompts/personas/*.md` (cfo, supply_chain_manager, marketing_manager, analyst), derived from `semantic/personas/*.yaml` and the example outputs in `docs/personas.md`.
- Implement `llm/guardrails.ts` (evidence-only generation, no invented numbers, no direct DB access) and wire `abstention.ts` from Day 1 so that confidence < 0.5 skips the LLM call entirely and returns a deterministic `abstain` response with a clarification question.
- Create the missing action-mapping YAML files: `semantic/actions/replenishment.yaml`, `marketing_budget.yaml`, `pricing.yaml`, `fulfillment.yaml` (driver → lever → action → owner_persona → expected_impact → monitoring_plan, per §21). Write the mapping function `mapDriverToAction(driverId) → ActionTemplate`.

### Shivam (Full-Stack)
- Wire `/explanations/:anomalyId`, `/explanations/:anomalyId/evidence`, and `/personas/:personaId/narrative` to call Ankit's evidence-pack builder and LLM module — apply RLS (region filter) and CLS (column masking, using `semantic/security/role_policies.yaml` already loaded via `semantic/loader.ts`) to the evidence pack *before* passing it to the LLM. Persist results to `Explanation`.
- Wire `/actions` (list) and `/actions/:actionId/accept` / `/reject` using Ankit's action-mapping function, persisting to `ActionRecommendation` and updating `status`.
- Frontend: fully wire `InsightDetailPage` to real explanation data — narrative text, evidence citations, uncertainties, `PersonaNarrativeTabs` (re-fetch narrative when switching persona). Wire `ActionsPage` (list + accept/reject buttons). Build the feedback UI (`FeedbackButtons`, `DriverCorrectionForm`) on `InsightDetailPage`, posting to the already-working `/feedback` endpoint; add a `FeedbackSummary` component (may need one small new aggregate-read endpoint).
- Chat page: basic single-turn wiring to `/chat` reusing Ankit's evidence-pack/LLM logic — treat as stretch goal, drop first if the day runs long.
- **End-of-day check:** full detect → explain → recommend → give-feedback loop works locally for the primary incident, and switching personas visibly changes the narrative's tone and detail level.

---

## Day 3 — Security Enforcement, Evaluation, Deployment, Demo

### Ankit (ML)
- Run all 4 golden incidents (`evals/golden_incidents/*.yaml`) against the live pipeline and confirm each expectation holds:
  - Incident 1 (multi-factor): stockout ranks driver #1, paid-search-reduction ranks #2, two correct-owner actions produced.
  - Incident 2 (low confidence): confidence < 0.5, status = `abstain`, clarification question present.
  - Incident 3 (sparse history): baseline falls back to category-level aggregate, confidence interval widens, narrative flags the uncertainty.
  - Incident 4 (security scope): covered jointly with Shivam's RLS/CLS work below.
- Tune thresholds/weights in the confidence, materiality, and ranking formulas if any incident doesn't match its expected outcome.
- Write `evals/metrics/*.ts` scoring scripts if time allows (detection F1, attribution MAP, faithfulness) — stretch goal.

### Shivam (Full-Stack)
- Enforce RLS and CLS **for real** in the query layer and evidence-pack construction (currently only *displayed* on the security admin page, not enforced elsewhere) — every KPI/anomaly/explanation query must filter by `req.user.allowedRegions` and strip `restricted_columns` per role.
- Write the security-scope-breach integration test (golden incident 4): an EU-scoped user requesting global data gets filtered results, margin columns stripped, and the attempt logged in `telemetry_requests`.
- Provision Neon Postgres, run `prisma migrate deploy`, seed demo users + KPI definitions, load synthetic data.
- Deploy backend to Render (env vars: `DATABASE_URL`, `JWT_SECRET`, `LLM_API_KEY`, `CORS_ORIGINS`) and frontend to Vercel (`VITE_API_BASE_URL` pointing at the Render URL). Confirm CORS and end-to-end smoke test across all 4 personas on the live deployment.
- Rehearse the 9-step demo script (`project_knowledge.md` §31) against the live deployment; record a backup screen-capture video in case of live network issues during the actual demo.

**End-of-day-3 check:** the entire acceptance checklist in `project_knowledge.md` §34 is demonstrable on the live, hosted app.
