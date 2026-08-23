# Interactive Demo Script — Specification

This document provides a step-by-step walkthrough script for demonstrating the prototype.

---

## Step 1: Open Dashboard
*   **Show**:
    *   Main dashboard layout.
    *   Interactive KPI summary cards.
    *   Forecast versus actual trend charts.
    *   Material anomaly badges.
    *   Source data freshness indicators.
*   **Say**:
    *   *"The engine monitors business KPIs in real time, automatically detecting movements that are both statistically significant and business-material. By combining ingestion status checks directly on the cards, users can instantly see if the numbers represent verified metrics or delayed pipelines."*

---

## Step 2: Open Insight Detail
*   **Show**:
    *   Insight detail breakdown page.
    *   Absolute KPI delta amount ($420K below forecast).
    *   Calibration indicators: Confidence badge and Data Quality score.
    *   Evidence pack lineage panel.
*   **Say**:
    *   *"When a user drills into a detected anomaly, they are presented with a unified explanation page. Unlike traditional BI dashboards, the explanations here are anchored entirely to deterministic analytics and governed evidence logs, ensuring the numbers can be audited back to their source tables."*

---

## Step 3: Show Drivers
*   **Show**:
    *   Driver impact list.
    *   Stockout contribution (-$250K).
    *   Marketing spend reduction impact (-$120K).
    *   Offsetting factors (such as positive seasonality).
    *   Unexplained residual margin.
*   **Say**:
    *   *"The engine runs attribution algorithms to divide the total metric drop into individual drivers. It ranks these drivers by absolute impact, model confidence, and actionability, giving teams immediate clarity on where to focus."*

---

## Step 4: Switch Personas
*   **Show**:
    *   Persona toggle tabs (CFO, Supply Chain Manager, Marketing Manager).
    *   Text narratives adapting dynamically to the selected persona.
*   **Say**:
    *   *"A single metric shift has different implications for different parts of the business. By switching tabs, we can see how the engine generates persona-specific explanations: the CFO sees financial risk and approval requirements, the Supply Chain Manager sees SKU-level replenishment details, and the Marketing Manager sees advertising performance."*

---

## Step 5: Show Action Recommendation
*   **Show**:
    *   Controllable lever panel.
    *   Action description, expected outcome, and assigned owner.
    *   Target 5-day monitoring protocol.
*   **Say**:
    *   *"Instead of just describing the problem, the system recommends actionable next steps. Every driver is mapped to a controllable business lever, a specific owner, and a monitoring plan to track the recovery of the KPI over the next five days."*

---

## Step 6: Show Low-Confidence Scenario
*   **Show**:
    *   Stale data ingestion warning.
    *   Low confidence badge (< 0.50).
    *   Abstention warning and clarification prompt.
    *   Disabled recommendation buttons.
*   **Say**:
    *   *"If critical data is missing or delayed, the system calculates a low confidence score. Rather than hallucinating an explanation, the engine abstains from making assertions, details the missing sources, and asks the user clarifying questions."*

---

## Step 7: Show Security
*   **Show**:
    *   Regional manager login.
    *   Active Row-Level Security (RLS) filters (limiting data to EU region).
    *   Column-Level Security (CLS) maskings (margins column hidden).
*   **Say**:
    *   *"Access control is applied directly at the database query layer in the backend before LLM parsing. When logged in as a regional manager, data is automatically filtered to their territory, and sensitive margin fields are stripped so they never enter the LLM prompt."*

---

## Step 8: Show Feedback
*   **Show**:
    *   Helpfulness rating buttons (Yes/No).
    *   Driver correction dropdown options.
    *   Submit event confirmation.
*   **Say**:
    *   *"The user can rate insights and correct attributions. This feedback is written to PostgreSQL to calibrate confidence scores, adjust anomaly thresholds, and refine prompt templates over time."*

---

## Step 9: Show Telemetry
*   **Show**:
    *   Latency metric cards.
    *   Token usage gauges.
    *   LLM API call cost estimations.
    *   API trace tables.
*   **Say**:
    *   *"The system monitors its own operational footprint. The telemetry page tracks API latency, prompt token metrics, and real-time costs, helping administrators monitor both performance and expenses."*
