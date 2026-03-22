# ⚡ Cloud Cost Pulse

Full-stack FinOps & Cloud Cost Optimization Platform — React + Vite + Tailwind + Express + Claude AI.
**One-click deploy to Render. Works in demo mode with no API key.**

---

## 🚀 Run Locally

```bash
# 1. Unzip and enter
unzip cloud-cost-pulse.zip && cd cloud-cost-pulse

# 2. Install all dependencies
npm install

# 3. Optional: enable AI features
cp .env.example .env
# Edit .env → set ANTHROPIC_API_KEY=sk-ant-xxxx

# 4. Terminal 1 — start backend API (port 3001)
npm start
# Shows: 🚀 Cloud Cost Pulse  Port: 3001

# 5. Terminal 2 — start frontend (port 5173)
npm run dev
# Open: http://localhost:5173
```

---

## ☁️ Deploy to Render

1. Push to GitHub: `git init && git add . && git commit -m "init" && git push`
2. **render.com → New → Blueprint → connect repo** (reads render.yaml automatically)
3. Add env var: `ANTHROPIC_API_KEY` (optional — demo mode works without it)
4. Deploy → live in ~2 minutes at `https://cloud-cost-pulse.onrender.com`

Verify: `curl https://your-app.onrender.com/api/health`

---

## ✅ Features

| Page | Description |
|------|-------------|
| Dashboard | KPI cards, multi-provider spend charts, waste heatmap, risk feed |
| New Analysis | Create cloud account analysis (AWS/Azure/GCP) — completes in 4s |
| Recommendations | Filter/sort optimization cards, apply/dismiss workflow |
| Resources | Full resource table with utilization bars, waste flags |
| Risk Analysis | Severity-sorted risks with expandable remediation steps |
| Savings | Category/provider breakdown, 12-month projection chart |
| AI Assistant | Claude-powered chat with full platform context |
| Executive Report | AI-generated reports, downloadable as Markdown |
| Terraform | HCL cost estimation + Claude AI optimization analysis |
| History | All analyses with live status polling |
| Settings | Notification toggles, alert thresholds |

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/analyses` | List analyses |
| GET | `/api/analyses/summary` | Dashboard stats + chart data |
| POST | `/api/analyses` | Create analysis (completes in 4s) |
| DELETE | `/api/analyses/:id` | Delete analysis |
| GET | `/api/resources` | Resources (filter: analysisId, category, waste) |
| GET | `/api/recommendations` | Recommendations (filter: category, status) |
| PATCH | `/api/recommendations/:id/status` | Update status |
| GET | `/api/risk` | Risks (filter: severity) |
| GET | `/api/terraform/analysis` | Terraform cost data |
| POST | `/api/terraform/estimate` | Estimate HCL cost |
| POST | `/api/ai/chat` | AI FinOps chat (Claude) |
| POST | `/api/ai/analyze-terraform` | AI Terraform review |
| POST | `/api/ai/generate-report` | AI executive report |

---

## ⚙️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 5, Tailwind CSS 3 |
| UI Components | Radix UI + shadcn/ui pattern (48 components) |
| Charts | Recharts 2 |
| Data Fetching | TanStack React Query v5 |
| Routing | React Router DOM v6 |
| HTTP Client | Axios |
| Backend | Node.js + Express 4 (CommonJS) |
| AI | Anthropic Claude via `@anthropic-ai/sdk` |
| Deploy | Render (render.yaml Blueprint) |
