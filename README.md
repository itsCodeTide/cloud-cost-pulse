# CLOUD-COST-PULSE v3.0 — Enterprise Cloud Cost & FinOps SaaS Platform

Cloud-Cost-Pulse is a production-grade cloud cost monitoring and FinOps platform designed for modern engineering and finance teams. Similar to platforms like Azure Cost Management, AWS Cost Explorer, CloudZero, Finout, and Datadog Cloud Cost, Cloud-Cost-Pulse provides real-time cost tracking, cloud inventory management, budget status monitoring, forecasting, CSV/Excel/JSON data imports, custom optimization recommendation rules, and PDF/CSV/Excel report exports.

---

## Key Features

- **Dashboard Module**: Real-time insights, 7 KPI Cards (Total Spend, Active Resources, Services, Budget %, 3-Mo Forecast, Savings, MoM Growth), and 7 interactive Recharts (Monthly Trend, Service Distribution, Budget vs Spend, Forecast Line, Region Analysis, Resource Growth, Savings Trend).
- **Data Import Module**: Dedicated upload parser supporting CSV, Excel (.xlsx), and JSON. Features column structure validation, preview table, error detection, duplicate checks, and batch database insertion.
- **FinOps Demo Data Generator**: Instant demo dataset seeding 50 Azure resources across 7 services, 12 months history, 5 budgets, 20 reports, 30 notifications, and 25 recommendations (supports Replace or Merge mode).
- **Resource Inventory CRUD**: Full CRUD table with search, multi-column sorting, pagination, status badges (Active/Idle/Inactive), filters (region, service, status, owner, cost range), and bulk operations (Bulk Delete, Bulk Status, Bulk Export).
- **Analytics Module**: FinOps Business Intelligence views (Service, Region, Owner/Team, Department breakdowns) with cross-filtering.
- **Budget Management System**: Automated budget tracking with status indicators:
  - **Healthy** (0–79% - Green)
  - **Warning** (80–89% - Yellow)
  - **Critical** (90–99% - Orange)
  - **Exceeded** (100%+ - Red)
- **Optimization Recommendation Engine**: Automated FinOps rules:
  - VM Cost > ₹5,000 / $500 → Reserved Instance (20% Savings)
  - Storage Cost > ₹3,000 / $300 → Move to Archive Tier (15% Savings)
  - Inactive Resource → Deallocate / Delete Resource (100% Savings)
  - Budget Usage > 80% → Review Allocation
  - Month-over-Month Spike > 20% → Investigate Usage
- **Reports Module**: Snapshot generation and exports in **PDF** (jsPDF), **CSV**, and **Excel** (.xls).
- **Settings & Preferences**: Multi-currency conversion (**INR, USD, EUR, GBP**) updating monetary metrics application-wide, Resend email budget alerts integration, Azure Cost Management credentials sync, custom rule thresholds, and workspace JSON backup/restore.
- **Audit Logs & Notification Center**: Track all CRUD actions and system notifications.

---

## Tech Stack

- **Framework**: Next.js 15 (App Router), React 19 / 18, TypeScript / JavaScript
- **Styling**: TailwindCSS, ShadCN UI, Lucide Icons
- **Authentication**: Clerk (with Google OAuth & Team Workspaces support)
- **Charts**: Recharts
- **Exporters & Parsers**: jsPDF, PapaParse, custom Excel/CSV parsers
- **Database**: PostgreSQL / Supabase schema support with fallback memory/document adapter
- **Deployment**: Vercel ready

---

## Local Quickstart Setup

1. **Clone & Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env.local` and add your Clerk API keys:
   ```bash
   cp .env.example .env.local
   ```
   Add `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, and
   `SUPABASE_JWKS_URL`. Keep the secret key server-only; never prefix it with
   `NEXT_PUBLIC_`.

   Run `migrations/002_supabase_app_data.sql` in the Supabase SQL Editor
   before starting the app. With these variables configured, the API uses
   Supabase for persistent storage; MongoDB/in-memory storage is only a
   fallback when Supabase is absent.

3. **Run Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

4. **Run Automated Test Suite**:
   ```bash
   node tests/run_all_tests.js
   ```

---

## Project Structure

```
cloud-cost-pulse/
├── app/
│   ├── api/[[...path]]/route.js   # Next.js Route Handler for all API endpoints
│   ├── globals.css                # TailwindCSS base styles
│   ├── layout.js                 # App root layout with Clerk Provider
│   └── page.js                   # Unified FinOps SaaS Application UI
├── components/ui/                 # ShadCN UI component library
├── lib/
│   ├── azure-cost.js              # Azure Cost Management API client
│   ├── import-parser.js           # CSV/Excel/JSON upload parser & validator
│   ├── report-exporter.js         # PDF, CSV, Excel report exporters
│   ├── resend.js                  # Resend email alert helper
│   └── secret.js                  # AES-256-GCM encryption helper
├── migrations/
│   └── 001_init.sql               # PostgreSQL initial database migration
├── scripts/
│   └── seed.sql                   # SQL seed script
├── tests/
│   └── run_all_tests.js           # Automated verification test suite
├── schema.sql                     # Production PostgreSQL schema DDL
├── ARCHITECTURE.md                # System Architecture & FinOps Formulas
├── API_DOCUMENTATION.md           # REST API Reference Documentation
└── DEPLOYMENT_GUIDE.md            # Vercel & Supabase Deployment Guide
```
