# System Architecture — KPI Intelligence Engine

This document provides a comprehensive description of the analytical and architectural layers of the KPI Intelligence Engine.

---

## 1. High-Level Architectural Flow

```text
User
  |
  v
React Frontend (Vite, TypeScript, Tailwind CSS, shadcn/ui, Recharts)
  |
  | HTTPS / JSON
  v
Express Backend (Node.js/TypeScript, Prisma, Zod)
  |
  |----------------------------------|
  |                                  |
  v                                  v
Deterministic Analytics Engine     LLM Orchestration Layer
  |                                  |
  v                                  v
PostgreSQL (Neon/Supabase)         Evidence Pack + Guardrails (Zod schemas)
```

### End-to-End Request Flow
1. **User Request**: The user logs in (generating a JWT token detailing their identity, persona, and scopes) and requests the dashboard or asks a question.
2. **Gateway Verification**: The React frontend calls the Express backend. The API validates the JWT, extracts security claims, and invokes security filters.
3. **Database Fetching**: Database repositories query PostgreSQL with Row-Level Security (RLS) and Column-Level Security (CLS) boundaries enforced directly.
4. **Deterministic Analysis**: The Analytics Engine calculates the baseline, residuals, materiality, driver contributions, and confidence score.
5. **Abstention Valuation**: The engine evaluates the confidence score. If it falls below `0.5`, the system halts narrative generation and outputs a structured abstention response.
6. **Narrative Generation**: If approved, an Evidence Pack JSON payload is generated and sent to the prompt template renderer. The LLM processes this evidence-only context.
7. **Response & Audit**: The parsed JSON is validated, returned to the user, and telemetry (latency, token usage, cost) is written to PostgreSQL.

---

## 2. Deterministic Analytics Engine Formulas

The Quantitative Truth Layer is completely independent of the LLM. It calculates metrics using the following deterministic formulas:

### 2.1 Baseline Forecast
$$expected\_value = \text{Average of same weekday in previous 4 weeks} + trend\_adjustment + seasonality\_adjustment$$
*Note: The prototype analytics layer can also be extended with a lightweight ETS-style model (e.g. via `simple-statistics`) if the naive baseline proves insufficient.*

### 2.2 Anomaly Detection
$$residual = actual\_value - expected\_value$$
$$z\_score = \frac{residual}{historical\_standard\_deviation}$$
An anomaly is triggered if and only if:
$$|residual| > absolute\_threshold \quad \text{AND} \quad |z\_score| > statistical\_threshold \quad \text{AND} \quad data\_quality\_score > minimum\_quality$$

### 2.3 Materiality Scoring
$$materiality\_score = statistical\_score \times business\_impact\_score \times data\_quality\_score$$
Where:
$$business\_impact\_score = normalized\_abs\_dollar\_impact + margin\_impact + strategic\_weight$$

### 2.4 Data Quality Score
$$data\_quality\_score = 0.4 \times completeness\_score + 0.3 \times freshness\_score + 0.2 \times consistency\_score + 0.1 \times validity\_score$$

### 2.5 Driver Contribution
$$driver\_contribution = \frac{estimated\_impact\_of\_driver}{total\_kpi\_change}$$

### 2.6 Confidence Score
$$confidence\_score = 0.30 \times evidence\_strength + 0.25 \times data\_quality\_score + 0.20 \times model\_fit\_score + 0.15 \times causal\_or\_business\_confirmation + 0.10 \times freshness\_score$$
Confidence classifications:
*   **High**: $confidence\_score \ge 0.75$
*   **Medium**: $0.50 \le confidence\_score < 0.75$
*   **Low**: $confidence\_score < 0.50$ (triggers abstention)

### 2.7 Driver Ranking
$$driver\_score = 0.35 \times estimated\_impact\_score + 0.25 \times confidence\_score + 0.15 \times evidence\_strength\_score + 0.10 \times actionability\_score + 0.10 \times business\_relevance\_score + 0.05 \times timeliness\_score$$
*Penalties applied dynamically:*
*   $driver\_score \mathrel{-}= contradiction\_penalty$
*   $driver\_score \mathrel{-}= low\_data\_quality\_penalty$
*   $driver\_score \mathrel{-}= stale\_evidence\_penalty$

### 2.8 Abstention Logic
The engine immediately abstains from generating causal narratives if:
$$confidence\_score < 0.5 \quad \text{OR} \quad key\_source\_missing = \text{true} \quad \text{OR} \quad data\_quality\_score < 0.5 \quad \text{OR} \quad contradiction\_score > threshold \quad \text{OR} \quad security\_filter\_removed\_critical\_data = \text{true}$$
*Abstention JSON response format:*
```json
{
  "status": "abstain",
  "confidence": "low",
  "summary": "Insufficient evidence to explain the KPI movement.",
  "missing_evidence": ["marketing_spend", "store_footfall"],
  "clarification_question": "Were there store closures, tracking issues, or local events during this period?"
}
```
