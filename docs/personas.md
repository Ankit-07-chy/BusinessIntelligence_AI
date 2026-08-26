# User Personas Specification — KPI Intelligence Engine

This document defines the target roles, their operational focus, output requirements, and narrative styles managed by the persona generator.

---

## 1. Persona Configuration Matrix

| Persona | Primary Focus | Level of Detail | Preferred Actions | Access Scope |
|---|---|---|---|---|
| **CFO** | Financial risk, revenue & margin dollar impact | High-level summary | Strategic / Budget / Margin approval | Global / Allowed sensitive columns |
| **Supply Chain Manager** | Stockouts, fill rates, warehouse performance | SKU/Store level | Replenishment / Warehouse labor / Carrier escalation | Permitted regional stores focus |
| **Marketing Manager** | Spend efficiency, traffic volume, conversion | Campaign level | Budget shift / incrementality test / Creative refresh | Global marketing columns |
| **Analyst** | Evidence lineage, formulas, validation | Raw logs, methodology | Calibration / Manual adjustment / Missing data check | full structural analytical view |
| **Digital Product Manager** | Web conversions, funnel friction, payment success | Funnel level | Payment success / Web outage / Checkout flow fixes | Sessions, clicks, errors, conversions |

---

## 2. Persona Specifications

### 2.1 CFO
*   **Focus**: Financial materiality, revenue deviations vs forecast, margin impact, returns risk, and audit governance.
*   **Narrative Strategy**: Professional, high-level, business-impact focused. Highlights absolute dollar amounts first.
*   **Access Scope**: Allowed specific sensitive cogs/margin fields. Denied Customer PII and HR payroll.

### 2.2 Supply Chain Manager
*   **Focus**: SKU availability, inventory levels, warehouse processing delays, carrier capacity constraints, and OTIF anomalies.
*   **Narrative Strategy**: Operational, detail-oriented, tactical. Mentions specific locations and inventory quantities.
*   **Access Scope**: Allowed warehouse/inventory logs. Denied margin details, supplier raw contract details, and Customer PII.

### 2.3 Marketing Manager
*   **Focus**: Traffic metrics, marketing channels (Paid Search, Social, Affiliate), campaigns spend, conversion rates, and CAC trends.
*   **Narrative Strategy**: Performance-driven, optimization-focused. Highlights traffic-to-conversion efficiency.
*   **Access Scope**: Allowed ad impressions, clicks, spend metrics. Denied COGS, margins, and Customer PII.

### 2.4 Analyst
*   **Focus**: Data lineage, mathematical baseline methodology, statistical confidence calibration, and evidence veracity.
*   **Narrative Strategy**: Mathematical, analytical, transparent. Includes metrics about model errors and data quality.
*   **Access Scope**: Allowed raw analytical data, telemetry cost/latency reports. Denied Customer PII and executive compensation.

### 2.5 Digital Product Manager (NEW)
*   **Focus**: E-commerce funnel conversions, checkout error rates, payment gateway reliability, page latency, and UX crash logs.
*   **Narrative Strategy**: Tactical, problem-solving, UX impact oriented.
*   **Access Scope**: Allowed web sessions, page actions, error metrics. Denied supplier costs and financial margins.
