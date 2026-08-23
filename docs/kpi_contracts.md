# KPI Semantic Contracts — Specification

KPI Semantic Contracts provide a governed, declarative metric layer. They define the boundaries, formulas, grains, and security filters for every metric managed by the engine.

---

## 1. Contract Structure

Every metric contract must declare:
1.  **Identity & Ownership**: KPI code identifier, description, and responsible business division.
2.  **Aggregation Rules**: Deterministic SQL formulas and source tables.
3.  **Threshold Boundaries**: Absolute or relative parameters indicating anomaly materiality.
4.  **Causal Graph Map**: List of mathematical drivers associated with this KPI.
5.  **Security Scopes**: Row-level columns and column-level masking categories.

---

## 2. Core KPI Contracts

### 2.1 Net Revenue
```yaml
kpi_id: net_revenue
name: Net Revenue
owner: Finance
business_definition: Total sales after discounts and returns
formula: SUM(gross_revenue - discount_amount - returns_amount)
primary_source: fact_sales
grain: product-store-day
refresh_cadence: daily
dimensions:
  - region
  - store
  - product
  - category
thresholds:
  absolute_drop_usd: 100000
  percent_drop: 5
drivers:
  - stockout_rate
  - marketing_spend
  - price_change
  - discount_rate
  - seasonality
access_policy:
  row_level: region
  column_level:
    margin: finance_only
version: 1.0.0
```

### 2.2 Gross Margin
```yaml
kpi_id: gross_margin
name: Gross Margin
owner: Finance
business_definition: Revenue minus cost of goods sold
formula: SUM(gross_revenue - discount_amount - returns_amount) - SUM(cost_of_goods_sold)
primary_source: fact_sales
grain: product-store-day
refresh_cadence: daily
dimensions:
  - region
  - store
  - product
  - category
thresholds:
  absolute_drop_usd: 50000
  percent_drop: 3
drivers:
  - discount_rate
  - product_mix_shift
  - cost_changes
  - returns_volume
access_policy:
  row_level: region
  column_level:
    margin: finance_only
version: 1.0.0
```

### 2.3 Online Conversion Rate
```yaml
kpi_id: conversion_rate
name: Online Conversion Rate
owner: Digital Product
business_definition: Orders divided by traffic sessions
formula: SUM(orders) / SUM(sessions)
primary_source: fact_web_traffic
grain: channel-device-day
refresh_cadence: hourly
dimensions:
  - channel
  - device
  - region
thresholds:
  absolute_drop_usd: 0
  percent_drop: 2
drivers:
  - traffic_quality
  - checkout_errors
  - product_availability
  - promotion_relevance
access_policy:
  row_level: region
  column_level: {}
version: 1.0.0
```

### 2.4 OTIF (On-Time In-Full)
```yaml
kpi_id: otif
name: On-Time In-Full
owner: Logistics
business_definition: On-Time In-Full fulfillment rate of order lines
formula: SUM(delivered_on_time_in_full) / SUM(total_shipments)
primary_source: fact_shipments
grain: order-line-day
refresh_cadence: daily
dimensions:
  - carrier
  - region
  - fulfillment_center
thresholds:
  absolute_drop_usd: 0
  percent_drop: 4
drivers:
  - carrier_delays
  - warehouse_spikes
  - stockout_rate
access_policy:
  row_level: region
  column_level: {}
version: 1.0.0
```

### 2.5 CAC (Customer Acquisition Cost)
```yaml
kpi_id: cac
name: Customer Acquisition Cost
owner: Growth Marketing
business_definition: Marketing spend divided by newly acquired customers
formula: SUM(marketing_spend) / SUM(new_customers)
primary_source: fact_marketing_spend
grain: campaign-day
refresh_cadence: weekly
dimensions:
  - channel
  - campaign
thresholds:
  absolute_drop_usd: 0
  percent_drop: 10
drivers:
  - campaign_bidding_efficiency
  - paid_traffic_mix
  - brand_search_volume
access_policy:
  row_level: region
  column_level: {}
version: 1.0.0
```
