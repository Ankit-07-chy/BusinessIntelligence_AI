# KPI Intelligence-to-Action Engine

An e-commerce analytics system that catches meaningful KPI swings, figures out what actually caused them, checks whether the underlying data is trustworthy enough to say anything, and then writes up an explanation and a recommended next step for whoever needs to act on it.

The short version: dashboards tell you *what* happened. This tries to also tell you *why*, *how confident we are*, and *who should do something about it*.

## Table of Contents
- [Overview](#overview)
- [The problem this solves](#the-problem-this-solves)
- [Goals](#goals)
- [What's built](#whats-built)
- [Architecture](#architecture)
- [Database structure](#database-structure)
- [How KPIs are defined](#how-kpis-are-defined)
- [Attributing the cause of a change](#attributing-the-cause-of-a-change)
- [Data quality and when the system stays quiet](#data-quality-and-when-the-system-stays-quiet)
- [Access control](#access-control)
- [Running it locally](#running-it-locally)
- [Testing](#testing)

## Overview

Most BI dashboards are good at showing that revenue dropped 8% last week. They're bad at telling you whether that's because a warehouse ran out of your best-selling SKU, because a regional ad campaign got paused, or both at once. Someone still has to go dig through five different systems to piece the story together.

That's what this project is for. It pulls the relevant facts together, runs the numbers to isolate which factors actually moved the metric and by how much, and then generates a narrative explaining it — tuned to whoever's reading it, whether that's a CFO who wants the bottom line or a supply chain manager who wants SKU-level detail.

One deliberate design choice: the LLM never does any math. All the anomaly detection, driver attribution, and confidence scoring happens in SQL and TypeScript first. The model's only job is to turn an already-computed evidence pack into readable prose. This keeps the numbers reliable regardless of what the model does with language.

## The problem this solves

E-commerce data lives in a bunch of disconnected places — ad spend, web analytics, order transactions, inventory, shipping. When something moves, the causes are usually tangled together. An ad budget cut drops sessions; a stockout on a top product zeroes out sales for that SKU; both happen the same week. From the dashboard, all you see is "revenue is down 8%," with no way to tell how much of that came from which cause.

Two other things tend to go wrong when teams try to fix this with AI:

- Feeding raw numbers straight to an LLM and asking it to explain them invites hallucinated causes and made-up figures.
- Even a correct explanation isn't much use if nobody knows who's supposed to act on it or how to check whether the fix worked.

This project tries to close both gaps by keeping the math deterministic and pairing every explanation with an owner and a follow-up metric.

## Goals

- Flag KPI movements that are actually unusual, not just noisy — using z-scores against a same-weekday historical baseline.
- Separate concurrent causes (e.g., marketing softness vs. an inventory stockout) and attribute a dollar amount to each.
- Score how much to trust the evidence based on how fresh, complete, and consistent the underlying data is.
- Write explanations that match who's reading them — a CFO, a supply chain manager, a product manager, an analyst — without changing the underlying facts.
- Refuse to guess when the data doesn't support a conclusion, and say so explicitly instead of producing a confident-sounding narrative anyway.
- Keep data access scoped to what a given user is actually allowed to see, by region and by role.

## What's built

- **KPI definitions** — pulled from YAML config, not hardcoded, so the formulas are auditable and changeable without touching application code.
- **Anomaly detection** — compares each day against the same weekday going back four weeks (t-7, t-14, t-21, t-28), with a z-score threshold for flagging.
- **Driver attribution** — isolates the effect of stockouts and regional ad spend changes using control-group comparisons.
- **Telemetry logging** — records auth attempts, token usage, and response latency for every request.
- **Persona-specific narratives** — same underlying facts, different voice and depth depending on the role, returned as structured JSON.
- **Abstention guardrails** — if the data quality score drops below 0.5, or there's no attributable driver for a flagged change, the system stops short of writing a narrative and asks for more context instead.
- **Fallback templates** — if the LLM API is down, a deterministic template still produces a usable (if less polished) explanation, so the system doesn't just go dark.
- **Frontend workspace** — a React app where people can switch between persona views and leave ratings or comments on individual insights.
- **Feedback storage** — ratings and comments get written back to the database.

Not yet built: using that feedback to retrain or adjust the attribution logic over time. Right now ratings are collected but don't feed back into the system automatically.

## Architecture

```mermaid
flowchart TB
    subgraph Client ["Client"]
        USER[Business User]
        FRONTEND[React App]
    end

    subgraph Gateway ["API & Security"]
        API[Express API]
        AUTH[Auth]
        SEC[RLS / CLS Filters]
    end

    subgraph Analytics ["Analytics"]
        DB[(PostgreSQL)]
        EVIDENCE[Evidence Pack Builder]
        ACTION[Action Recommendation Engine]
    end

    subgraph Narrative ["Narrative Generation"]
        LLM[LLM Layer]
        GUARD[Abstention Guardrails]
    end

    subgraph Logging ["Telemetry & Feedback"]
        FEEDBACK[Feedback]
        TELEMETRY[Audit Logs]
    end

    USER --> FRONTEND
    FRONTEND --> API
    API --> AUTH --> SEC

    SEC -->|scoped query| DB
    DB --> EVIDENCE
    EVIDENCE --> GUARD
    GUARD -->|data quality OK| LLM
    GUARD -->|data quality fails| ACTION

    LLM --> ACTION
    ACTION -->|insights + action plan| FRONTEND

    USER -->|rates insight| FEEDBACK
    FEEDBACK --> DB
    API --> TELEMETRY
    LLM -->|token usage| TELEMETRY
    TELEMETRY --> DB
```

Requests come in through the React frontend, hit the Express API, and pass through auth and row/column-level security before touching the database. The evidence pack builder pulls the relevant numbers, the guardrail layer decides whether there's enough signal to say anything, and only then does the request reach the LLM. Everything gets logged for audit purposes along the way.

## Database structure

Star schema, with evaluation data kept physically separate from operational data so ground-truth labels can't leak into what the model sees.

**Dimensions:**
- `dim_product` — one row per SKU
- `dim_store` — one row per store
- `dim_campaign` — one row per marketing campaign
- `dim_warehouse` — one row per warehouse
- `dim_calendar` — one row per day
- `dim_customer` — one row per customer
- `dim_customer_segment` — one row per segment

**Facts:**
- `fact_sales` — product × store × day
- `fact_orders` — one row per transaction line item
- `fact_inventory` — product × store × day
- `fact_marketing_spend` — campaign × day
- `fact_web_traffic` — channel × region × device × day
- `fact_shipments` — one row per shipment

**Event logs:**
- `event_price_history` — price change events
- `event_promotion` — promo code activations
- `event_operational_incident_log` — outage alerts

**Ground truth (kept isolated, used only for evaluation):**
- `ground_truth_incident`
- `ground_truth_driver_contribution`

## How KPIs are defined

All formulas live in config and are computed deterministically — no LLM involvement.

**Net Revenue** = Gross Revenue − Discounts − Returns
*(from `fact_sales`)*

**Gross Margin** = (Net Revenue − Cost of Goods Sold) / Net Revenue
*(from `fact_sales`)*

**Online Conversion Rate** = Orders / Sessions
*(from `fact_web_traffic`)*

**On-Time In-Full (OTIF)** = Shipments delivered on or before the promised date *and* fully complete, divided by total shipments
*(from `fact_shipments`)*

**Customer Acquisition Cost (CAC)** = Marketing Spend / New Customers
*(from `fact_marketing_spend`)*

## Attributing the cause of a change

When a KPI moves, the engine tries to quantify how much of the move is explained by known causes, using control-group comparisons rather than guesswork:

**Stockouts.** Compare actual units sold at the affected store against expected units, estimated from stores in the same region where the product stayed in stock:

```
Lost Revenue = max(0, ExpectedUnits_control(t) − ActualUnits(t)) × Product Price
```

**Marketing spend cuts.** Model the session drop against regions that kept their ad budgets stable, then convert that into revenue:

```
Lost Revenue = Session Drop × Baseline Conversion Rate × AOV
```

## Data quality and when the system stays quiet

Before any narrative gets generated, the backend computes a data quality score:

```
DQ = 0.4 × Completeness + 0.3 × Freshness + 0.2 × Consistency + 0.1 × Validity
```

Freshness decays linearly and hits zero once a source is more than twice as overdue as its normal refresh cadence — so a feed that should update daily but hasn't in three days counts for nothing.

If DQ comes in below 0.5, or if a flagged anomaly has zero attributable drivers, the system doesn't attempt an explanation. It returns a clarification request instead, rather than producing a narrative that sounds confident but isn't backed by anything solid.

## Access control

- **Row-level security** — queries are automatically filtered to the regions a user is authorized for, based on their JWT claims (e.g. `where: { region: { in: user.allowedRegions } }`).
- **Column-level security** — a role-to-column mapping strips out fields a given role shouldn't see. Marketing roles, for example, never get `Gross Margin` back in their evidence pack, regardless of what the query would otherwise return.

Both are enforced at the API layer before data reaches the evidence builder, not left to the frontend to hide.

## Running it locally

**1. Start Postgres**
```bash
docker compose up -d postgres
```

**2. Set up environment variables**

Create `backend/.env`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/kpi_intelligence?schema=public"
JWT_SECRET="super-secret-key"
LLM_PROVIDER="groq" # or "gemini"
LLM_API_KEY="your-api-key"
LLM_MODEL="llama-3.1-8b-instant"
```

**3. Generate and load synthetic data**

This creates about six months of internally consistent synthetic data and loads it:
```bash
cd backend
npm install
npx prisma db push
npm run generate:data
```

**4. Start the backend** (port 8000)
```bash
cd backend
npm run dev
```

**5. Start the frontend** (port 5173)
```bash
cd ../frontend
npm install
npm run dev
```

## Testing

```bash
# Unit and integration tests
cd backend
npm test

# Run the golden incident benchmarks (checks known scenarios against expected output)
npx tsx scripts/runGoldenIncidents.ts
```