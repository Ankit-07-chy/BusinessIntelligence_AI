# KPI Semantic Contracts — Specification

KPI Semantic Contracts provide a governed, declarative metric layer. They define the boundaries, formulas, grains, and security filters for every metric managed by the engine.

---

## 1. Contract Structure

Every metric contract must declare:
1.  **Identity & Ownership**: KPI code identifier, description, unit, and direction of positive movement.
2.  **Aggregation Rules**: Deterministic SQL formulas, primary, and secondary tables.
3.  **Threshold Boundaries**: Absolute or relative parameters indicating anomaly materiality.
4.  **Causal Graph Map**: List of mathematical drivers associated with this KPI.
5.  **Security Scopes**: Row-level columns and column-level masking categories.
6.  **Data Lineage & Quality Rules**: Min data quality scores and default fallback checks.

---

## 2. Core KPI Contracts

### 2.1 Net Revenue (`net_revenue.yaml`)
```yaml
kpi_id: net_revenue
name: Net Revenue
owner: Finance
unit: currency_usd
direction: increase_is_good
anomaly_direction: decrease
business_definition: Total sales after discounts and returns.
formula: SUM(gross_revenue - discount_amount - returns_amount)
primary_source: fact_sales
secondary_sources:
  - dim_store
  - dim_product
  - fact_inventory
  - fact_marketing_spend
  - fact_web_traffic
grain: product-store-day
period: daily
refresh_cadence: daily
dimensions:
  - region
  - store_id
  - product_id
  - category
thresholds:
  percent_drop: 5
  absolute_drop_usd: 100000
drivers:
  - stockout_rate
  - marketing_spend
  - price_change
  - discount_rate
  - traffic_volume
  - conversion_rate
access_policy:
  row_level: region
  column_level:
    fact_sales.cogs: finance_only
    fact_sales.gross_margin: finance_only
version: 1.0.1
```

### 2.2 Gross Margin (`gross_margin.yaml`)
```yaml
kpi_id: gross_margin
name: Gross Margin
owner: Finance
unit: currency_usd
direction: increase_is_good
anomaly_direction: decrease
business_definition: Revenue after discounts and returns minus cost of goods sold.
formula: SUM(gross_revenue - discount_amount - returns_amount - cogs)
primary_source: fact_sales
secondary_sources:
  - dim_product
  - dim_store
grain: product-store-day
period: daily
refresh_cadence: daily
dimensions:
  - region
  - store_id
  - product_id
  - category
thresholds:
  percent_drop: 3
  absolute_drop_usd: 50000
drivers:
  - discount_rate
  - product_mix_shift
  - cost_changes
  - returns_volume
access_policy:
  row_level: region
  column_level:
    fact_sales.gross_margin: finance_only
    fact_sales.cogs: finance_only
    dim_product.cost: finance_only
version: 1.0.1
```

### 2.3 Online Conversion Rate (`conversion_rate.yaml`)
```yaml
kpi_id: conversion_rate
name: Online Conversion Rate
owner: Digital Product
unit: percentage
direction: increase_is_good
anomaly_direction: decrease
business_definition: Completed online orders divided by online sessions.
formula: COUNT(DISTINCT fact_orders.order_id) / SUM(fact_web_traffic.sessions)
primary_source: fact_web_traffic
secondary_sources:
  - fact_orders
  - dim_store
grain: store-day
period: daily
refresh_cadence: daily
dimensions:
  - store_id
  - region
  - channel_type
filters:
  store_channel_type: Online
  order_status: Completed
thresholds:
  percent_drop: 2
drivers:
  - traffic_quality
  - checkout_errors
  - payment_failures
  - product_availability
  - promotion_relevance
access_policy:
  row_level: region
  column_level: {}
version: 1.0.1
```

### 2.4 OTIF (On-Time In-Full) (`otif.yaml`)
```yaml
kpi_id: otif
name: On-Time In-Full
owner: Logistics
unit: percentage
direction: increase_is_good
anomaly_direction: decrease
business_definition: Percentage of shipments delivered both on time and in full.
formula: SUM(CASE WHEN is_otif THEN 1 ELSE 0 END) / COUNT(shipment_id)
primary_source: fact_shipments
secondary_sources:
  - fact_orders
  - dim_store
  - dim_warehouse
grain: shipment-day
period: daily
refresh_cadence: daily
dimensions:
  - carrier_name
  - warehouse_id
  - store_id
  - region
filters:
  actual_delivery_date_not_null: true
thresholds:
  percent_drop: 4
drivers:
  - carrier_delays
  - warehouse_processing_delays
  - demand_spikes
  - stockout_rate
access_policy:
  row_level: region
  column_level: {}
version: 1.0.1
```

### 2.5 CAC (Customer Acquisition Cost) (`cac.yaml`)
```yaml
kpi_id: cac
name: Customer Acquisition Cost
owner: Growth Marketing
unit: currency_usd
direction: decrease_is_good
anomaly_direction: increase
business_definition: Marketing spend divided by newly acquired customers.
formula: SUM(fact_marketing_spend.spend_amount) / COUNT(DISTINCT fact_orders.customer_id)
primary_source: fact_marketing_spend
secondary_sources:
  - fact_orders
  - dim_customer
  - dim_campaign
grain: campaign-day
period: weekly
refresh_cadence: weekly
dimensions:
  - region
  - campaign_id
  - marketing_channel
filters:
  order_status: Completed
  is_new_customer: true
thresholds:
  percent_increase: 10
  absolute_increase_usd: 5
drivers:
  - campaign_bidding_efficiency
  - paid_traffic_mix
  - brand_search_volume
access_policy:
  row_level: region
  column_level: {}
version: 1.0.1
```
