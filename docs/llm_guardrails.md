# LLM Guardrails & Prompts — Specification

This document details the guardrails, prompt rules, and schema structures enforced on the Large Language Model (LLM) orchestration layer.

---

## 1. LLM Integration Scope

The LLM is strictly used as an orchestrator and narrative generator. It does not calculate numbers, query database records directly, or define security policies.

```text
               Deterministic Analytics Layer (Non-LLM)
                                  |
                                  v
                    [ Generates Evidence Pack ]
                                  |
                                  v
                   LLM Narrative Generation Layer
                 (Enforces Prompt Rules & Guardrails)
                                  |
                                  v
                        [ Client Response ]
```

---

## 2. Evidence Pack Structure

The Evidence Pack is the only structured data the LLM is permitted to read. An example payload:

```json
{
  "kpi_id": "net_revenue",
  "period": "2026-W34",
  "persona": "cfo",
  "actual_value": 4720000,
  "forecast_value": 5140000,
  "delta": -420000,
  "delta_percent": -8.2,
  "confidence_score": 0.82,
  "data_quality_score": 0.91,
  "sources": [
    {
      "source": "fact_sales",
      "freshness": "2026-08-22T23:45:00Z",
      "quality": 0.98
    },
    {
      "source": "fact_marketing_spend",
      "freshness": "2026-08-18T00:00:00Z",
      "quality": 0.76
    }
  ],
  "drivers": [
    {
      "driver": "stockout_top_skus",
      "estimated_impact": -250000,
      "method": "control_store_comparison",
      "confidence": 0.84
    },
    {
      "driver": "paid_search_reduction",
      "estimated_impact": -120000,
      "method": "marketing_response_model",
      "confidence": 0.68
    }
  ],
  "unexplained_residual": -50000,
  "recommended_actions": [
    {
      "action": "expedite_replenishment",
      "owner": "supply_chain_manager",
      "expected_impact": 180000,
      "confidence": 0.75
    }
  ]
}
```

---

## 3. Strict LLM System Rules

To prevent hallucinations, data leakage, and mathematical drift, the LLM must follow ten system rules:

1.  **Strict Evidence Boundary**: Rely exclusively on the provided Evidence Pack. Do not introduce outside knowledge or facts.
2.  **No Numerical Estimation**: Do not compute, estimate, or modify any numbers. Use only the exact numbers provided in the pack.
3.  **No Driver Inventing**: Explain the movement using only the explicit drivers provided in the Evidence Pack.
4.  **Enforce Abstention**: If the evidence is marked as insufficient or the status is 'abstain', immediately transition to the clarification flow.
5.  **Uncertainty Transparency**: Clearly express confidence metrics and mention if any key data sources are stale or missing.
6.  **Highlight Missing Sources**: List any metrics or tables that were delayed or missing during baseline calculation.
7.  **Tone Alignment**: Adapt vocabulary, tone, and granularity to the user's role persona.
8.  **Column Protection**: Do not mention masked fields or attributes (e.g. margin metrics if the role is Supply Chain).
9.  **No Code Execution**: Do not run database queries or code block commands in responses.
10. **Structured Response Contract**: Return responses conforming strictly to the defined structured Zod schema.

---

## 4. Structured Output Contract

The LLM response must match the following JSON schema contract:

```json
{
  "status": "success",
  "confidence": "high",
  "summary": "Revenue dropped by $420K vs forecast, primarily driven by a stockout in top SKUs (-$250K) and a decline in paid search spend (-$120K).",
  "primary_drivers": [
    {
      "driver": "stockout_top_skus",
      "impact": -250000,
      "confidence": 0.84
    },
    {
      "driver": "paid_search_reduction",
      "impact": -120000,
      "confidence": 0.68
    }
  ],
  "evidence_citations": [
    "fact_sales updated 2026-08-22T23:45:00Z",
    "fact_marketing_spend updated 2026-08-18T00:00:00Z"
  ],
  "uncertainties": [
    "Marketing spend data has a lag of 5 days (last updated 2026-08-18)."
  ],
  "recommended_actions": [
    {
      "action": "expedite_replenishment",
      "owner": "supply_chain_manager",
      "expected_impact": 180000
    }
  ],
  "clarification_question": null
}
```
