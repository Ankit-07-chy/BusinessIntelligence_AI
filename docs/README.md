# KPI Intelligence-to-Action Engine — Documentation Index

Welcome to the official documentation directory for the **KPI Intelligence-to-Action Engine** (omnichannel e-commerce analytics platform). This documentation directory aligns exactly with the repository structure specified in the project knowledge base.

## Documentation Map

Below is the directory map of the documentation files:

| File | Path | Description |
|---|---|---|
| **Overview & Index** | [`README.md`](file:///c:/Users/ankit/Desktop/BusinessIntelligence_AI/docs/README.md) | This index file. |
| **System Architecture** | [`architecture.md`](file:///c:/Users/ankit/Desktop/BusinessIntelligence_AI/docs/architecture.md) | Non-LLM mathematical baseline, forecasting, and data reconciliation logic. |
| **Data Model** | [`data_model.md`](file:///c:/Users/ankit/Desktop/BusinessIntelligence_AI/docs/data_model.md) | Dimensions, facts, governance, insight, and learning schema structures. |
| **KPI Semantic Contracts** | [`kpi_contracts.md`](file:///c:/Users/ankit/Desktop/BusinessIntelligence_AI/docs/kpi_contracts.md) | Governed metric contracts YAML templates and rules. |
| **Personas** | [`personas.md`](file:///c:/Users/ankit/Desktop/BusinessIntelligence_AI/docs/personas.md) | CFO, Supply Chain Manager, Marketing Manager, and Analyst definitions. |
| **Security Model** | [`security_model.md`](file:///c:/Users/ankit/Desktop/BusinessIntelligence_AI/docs/security_model.md) | Row-Level Security, Column-Level Security, and domain constraints. |
| **LLM Guardrails** | [`llm_guardrails.md`](file:///c:/Users/ankit/Desktop/BusinessIntelligence_AI/docs/llm_guardrails.md) | Prompt rules, Evidence Pack schema, and context validation guidelines. |
| **Telemetry & Costs** | [`telemetry.md`](file:///c:/Users/ankit/Desktop/BusinessIntelligence_AI/docs/telemetry.md) | Request, insight, and LLM token cost formulas and telemetry models. |
| **Evaluation Framework** | [`evaluation.md`](file:///c:/Users/ankit/Desktop/BusinessIntelligence_AI/docs/evaluation.md) | Automated evaluation pipeline and the four Golden Incident scenarios. |
| **Deployment & Build Plan** | [`deployment.md`](file:///c:/Users/ankit/Desktop/BusinessIntelligence_AI/docs/deployment.md) | Environmental setup, hosting checklist, and the one-week build schedule. |
| **Demo Script** | [`demo_script.md`](file:///c:/Users/ankit/Desktop/BusinessIntelligence_AI/docs/demo_script.md) | Narrative walkthrough instructions for the web application verification. |

---

## Core System Requests Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as Business User
    participant FE as React Frontend
    participant BE as Express Backend
    participant AE as Analytics Engine
    participant DB as PostgreSQL Database
    participant LLM as LLM Orchestration

    User->>FE: Selects Persona / Queries System
    FE->>BE: GET /api/v1/personas/{id}/narrative (JWT Token)
    Note over BE: Middleware verifies Token,<br/>extracts region & column scopes
    BE->>DB: Query metric dimensions & facts (with RLS/CLS filters applied)
    DB-->>BE: Sanitized Quantitative Data
    BE->>AE: Run baseline forecast & driver analysis
    Note over AE: Computes materiality,<br/>contributions & confidence
    AE-->>BE: Raw scores & driver metrics
    Note over BE: Triggers abstention check.<br/>If confidence >= 0.5, builds Evidence Pack
    BE->>LLM: Send structured Evidence Pack & persona instructions
    Note over LLM: Strict guardrails: no math,<br/>evidence-only generation
    LLM-->>BE: Rendered Persona Narrative (JSON)
    BE->>DB: Log Telemetry details
    BE-->>FE: Return JSON Response
    FE-->>User: Render Dashboard visual cards & narratives
```
