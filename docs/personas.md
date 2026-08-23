# User Personas Specification — KPI Intelligence Engine

This document defines the target roles, their operational focus, output requirements, and narrative styles managed by the persona generator.

---

## 1. Persona Configuration Matrix

| Persona | Primary Focus | Level of Detail | Preferred Actions | Access Scope |
|---|---|---|---|---|
| **CFO** | Financial risk, revenue & margin dollar impact | High-level summary | Strategic / Capex approval | Global / Masked column access |
| **Supply Chain Manager** | Stockouts, fill rates, warehouse performance | SKU/Store level | Replenishment / Reallocation | Regional store focus |
| **Marketing Manager** | Spend efficiency, traffic volume, conversion | Campaign level | Budget shift / Bid optimization | Global marketing access |
| **Analyst** | Evidence lineage, formulas, validation | Raw logs, methodology | Calibration / Manual adjustment | Full structural view |

---

## 2. Persona Specifications

### 2.1 CFO
*   **Focus**: Financial materiality, revenue deviations vs forecast, margin impact, returns risk, and audit governance.
*   **Narrative Strategy**: Professional, high-level, business-impact focused. Highlights absolute dollar amounts first.
*   **Example Output**:
    ```text
    Revenue is $420K below forecast.
    The primary driver is a stockout in top SKU categories.
    The secondary driver is a reduction in paid search spend.
    Recommended action: Approve expedited replenishment budget.
    ```

### 2.2 Supply Chain Manager
*   **Focus**: SKU availability, inventory levels, lead times, carrier delays, fulfillment center performance, and OTIF anomalies.
*   **Narrative Strategy**: Operational, detail-oriented, tactical. Mentions specific locations and inventory quantities.
*   **Example Output**:
    ```text
    Stockout rate increased from 3 percent to 14 percent.
    Top affected SKUs are concentrated in EU stores (Region: North).
    Recommended action: Expedite purchase order and reallocate inventory across warehouses.
    ```

### 2.3 Marketing Manager
*   **Focus**: Traffic metrics, marketing channels (Paid Search, Social, Affiliate), campaigns spend, conversion rates, and CAC trends.
*   **Narrative Strategy**: Performance-driven, optimization-focused. Highlights traffic-to-conversion efficiency.
*   **Example Output**:
    ```text
    Paid search spend decreased 22 percent.
    Conversion remained stable.
    Likely impact is traffic loss.
    Recommended action: Restore budget and run incrementality test.
    ```

### 2.4 Analyst
*   **Focus**: Data lineage, mathematical baseline methodology, statistical confidence calibration, and evidence veracity.
*   **Narrative Strategy**: Mathematical, analytical, transparent. Includes metrics about model errors and data quality.
*   **Example Output**:
    ```text
    Anomaly identified in Net Revenue (Z-Score: 3.42, Materiality: 0.86).
    Data quality index: 0.91 (completeness: 0.98, freshness: 0.76).
    Primary mathematical driver: stockout_top_skus (impact: -$250K, method: control_store_comparison).
    ```
