# Deployment & Build Plan — Specification

This document details the environment settings, local setup procedures, build schedule, and production hosting checklist for the KPI Intelligence Engine.

---

## 1. Local Development Setup

### 1.1 Backend Configuration
```bash
cd backend
npm install
npx prisma migrate dev
npm run dev
```

### 1.2 Frontend Configuration
```bash
cd frontend
npm install
npm run dev
```

### 1.3 Local Docker Orchestration
To spin up all services locally, execute:
```bash
docker compose up --build
```

---

## 2. One-Week Build Plan

### Day 1: Project Setup
*   Configure base repository structure.
*   Setup `docker-compose.yml` defining PostgreSQL, Express backend, and React (Vite) frontend containers.
*   Define environment files.

### Day 2: Data Generation
*   Implement `generate_synthetic_data.py` to create seed dimensions and facts.
*   Inject the known multi-factor KPI anomalies.
*   Load database tables and seed demo user profiles in PostgreSQL.

### Day 3: Deterministic Analytics Engine
*   Write SQL and TypeScript scripts for forecast baselines.
*   Implement anomaly detection, materiality thresholds, and driver contribution bridge models.
*   Set up confidence and driver ranking engines.

### Day 4: Explanation & LLM Integration
*   Design the Evidence Pack schema assembler.
*   Draft prompt templates and persona instructions.
*   Write guardrails checking mechanisms and the structured abstention parser.

### Day 5: Frontend Dashboard
*   Develop login screen (supporting demo user role selectors).
*   Build main dashboard displaying KPI cards, anomaly list, and forecast charts.
*   Construct detailed insight explanation tabs.

### Day 6: Feedback, Telemetry, and Security
*   Implement feedback buttons and logs.
*   Configure API telemetry tracers to track latencies and token expenses.
*   Build the admin panel demonstrating Row-Level Security (geographic filters) and Column-Level Security (masking margins).

### Day 7: Deployment & Verification
*   Deploy PostgreSQL database, backend service, and frontend client.
*   Run the Golden Incident test harness.
*   Record backup screencasts of the working application.

---

## 3. Environment Variables

### Backend (`.env`)
```env
NODE_ENV=local
PORT=8000
APP_NAME=KPI Intelligence Engine
API_V1_PREFIX=/api/v1
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/kpi_intelligence
CORS_ORIGINS=http://localhost:5173
JWT_SECRET=change-me
ACCESS_TOKEN_EXPIRE_MINUTES=60
LLM_PROVIDER=anthropic
LLM_API_KEY=your_api_key_here
LLM_MODEL=claude-sonnet-5
LLM_BASE_URL=
LLM_TEMPERATURE=0.2
LLM_MAX_TOKENS=1200
TELEMETRY_ENABLED=true
CACHE_TTL_SECONDS=300
SEED_DEMO_USERS=true
```

### Frontend (`.env`)
```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_APP_NAME=KPI Intelligence Engine
VITE_ENVIRONMENT=local
```

---

## 4. Production Hosting Configuration

The recommended hosting stack is structured as follows:
*   **Frontend**: Hosted on Vercel.
*   **Backend**: Hosted on Render, Railway, or Fly.io (Express/Node Docker container).
*   **Database**: Managed Serverless PostgreSQL (Neon or Supabase).
*   **LLM API**: OpenAI, Anthropic, Gemini, or self-hosted Ollama.
