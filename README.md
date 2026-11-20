# SentinelPay

A simulated mobile money service in the style of bKash and Nagad for university database education.

## Repository Structure

```
sentinelpay/
  frontend/   <- React 18, Vite, Tailwind CSS (Mock data first, real API ready)
  backend/    <- Express API (built separately)
  database/   <- SQL initialization scripts (database/sql/001init.sql)
  docs/
```

## Frontend Setup

Please refer to [`frontend/README.md`](file:///home/abdul-basit/projects/cse-311/sentinelpay/frontend/README.md) and [`frontend/FRONTEND_NOTES.md`](file:///home/abdul-basit/projects/cse-311/sentinelpay/frontend/FRONTEND_NOTES.md) for full instructions, route tables, and architectural explanations.

```bash
cd frontend
npm install
npm run dev
```
Runs at `http://localhost:5173`.
