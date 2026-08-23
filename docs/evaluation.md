# Evaluation Framework — Specification

This document details the automated evaluation tests, benchmark datasets, and Golden Incidents designed to verify the correct operation of the KPI Engine.

---

## 1. Evaluation Architecture

Evaluation focuses on statistical calibration, attribution correctness, and LLM narrative alignment.

```text
                  [ Evaluation Runner ]
                 /          |          \
                /           |           \
               v            v            v
        [ Math Tests ] [ Security Tests ] [ Narrative Tests ]
         - Z-Scores     - Geographic RLS   - Faithfulness
         - Attributes   - Column Masking   - Tone Match
```

---

## 2. Testing Metrics

The framework monitors performance against four standardized metrics:

1.  **Detection F1-Score**: Evaluates how reliably the anomaly pipeline flags true anomalies while ignoring daily noise.
2.  **Attribution Accuracy (MAP)**: Mean Average Precision of driver rankings compared against injected synthetic root causes.
3.  **Faithfulness Score (Faithful-Judge)**: Grade tracking if the generated text is free from hallucinations (no figures or metrics not present in the Evidence Pack).
4.  **Security Scope Integrity**: Grade verifying that users are unable to extract metrics outside their assigned scopes.

---

## 3. Golden Incident Scenarios

The engine is continuously verified against four core benchmark scenarios:

### 3.1 Golden Incident 1: Multi-Factor Incident (Stockout + Marketing Spend Drop)
*   **Context**: On Day 15, stockout starts for a top-selling SKU, and paid search budget is reduced by 20%.
*   **Evaluation Objectives**:
    *   Confirm Net Revenue drops and triggers an anomaly.
    *   Verify the driver analysis ranks `stockout` as driver #1 and `paid_search_reduction` as driver #2.
    *   Confirm two recommended actions are produced (Replenishment and Marketing review) mapped to their correct persona owners.

### 3.2 Golden Incident 2: Low Confidence (Missing or Delayed Sources)
*   **Context**: One of the critical tables, such as marketing spend history, has a lag of 12 days or has missing values.
*   **Evaluation Objectives**:
    *   Verify the confidence score drops below the `0.5` threshold.
    *   Ensure the system abstains from generating a causal narrative.
    *   Verify the response schema outputs `status = "abstain"` and populates a clear clarification question.

### 3.3 Golden Incident 3: Sparse History (New Product launch)
*   **Context**: A brand-new product is launched with only 2 or 3 weeks of transactional sales history.
*   **Evaluation Objectives**:
    *   Verify the forecasting baseline falls back to category-level aggregates.
    *   Confirm the confidence interval is expanded, and the narrative highlights the lack of history as an uncertainty factor.

### 3.4 Golden Incident 4: Security Scope Breach Attempt
*   **Context**: A user with regional role limits (`region = 'EU'`) requests a global sales metric summary or queries corporate profit margins.
*   **Evaluation Objectives**:
    *   Verify the query restricts database lookups to `EU`.
    *   Confirm the backend strips margin columns before generating the LLM Evidence Pack.
    *   Verify the access attempt is logged in the telemetry audit trail.
