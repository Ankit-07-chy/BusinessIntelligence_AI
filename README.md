# KPI Intelligence-to-Action Engine

A governed, evidence-first KPI intelligence engine for e-commerce: detects material KPI movements, ranks likely drivers with confidence scores, generates persona-specific narratives, recommends actions, and logs feedback and telemetry. Deterministic SQL/TypeScript analytics produce the numbers; the LLM only narrates from an evidence pack.

Full project context lives in [`project_knowledge.md`](./project_knowledge.md) and [`docs/`](./docs/README.md).

## Stack

- Frontend: React (Vite) + TypeScript + Tailwind CSS
- Backend: Express.js + Node.js (TypeScript) + Prisma
- Database: PostgreSQL
- LLM: Anthropic Claude (evidence-only, structured output)

## Local Development

```bash
docker compose up --build
```

This starts PostgreSQL, the backend on `http://localhost:8000`, and the frontend on `http://localhost:5173`.

### Running services individually

Backend:

```bash
cd backend
npm install
npx prisma migrate dev
npm run seed
npm run dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Repository Layout

```text
backend/    Express API, Prisma schema, analytics engine, LLM orchestration
frontend/   React (Vite) dashboard, chat, insights, feedback, telemetry UI
semantic/   Governed KPI/persona/security contracts (YAML)
evals/      Golden incident scenarios and evaluation metrics
docs/       Architecture, data model, security, and evaluation documentation
```
