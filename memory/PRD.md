# Cloud-Cost-Pulse — PRD

## Product
Web-based Azure cloud cost monitoring SaaS: dashboards (Recharts), forecasting, budget tracking, optimization recommendations, PDF reports. Clerk auth. MongoDB storage. Next.js 15 App Router (single catch-all API at /app/app/api/[[...path]]/route.js, frontend in /app/app/page.js).

## Implemented (all tested)
1. MVP dashboard: landing page, Clerk auth, KPI cards, trend/pie/line/stacked charts, forecast, budget, recommendations, client-side PDF export (jspdf+html2canvas), budget toasts.
2. Team Workspaces: data scoped by tenantId = Clerk orgId || userId. OrganizationSwitcher in top bar; Clerk Organizations feature ENABLED on dev instance (membership optional). Legacy clerkUserId docs auto-migrated in seedIfEmptyForTenant.
3. Real Azure integration (self-serve): Settings page form for Service Principal (tenant/client/secret/subscription). POST /api/azure/connect validates via OAuth + Cost Management query, stores secret AES-256-GCM encrypted (CREDENTIAL_ENCRYPTION_KEY in .env), syncs 12 months monthly costs grouped by ServiceName into cost_data (source:'azure'). /api/azure/sync, /api/azure/disconnect. Dashboard switches dataSource demo↔azure, dynamic services list + currency. NO real Azure creds provided yet — error paths tested only.
4. Email budget alerts (Resend, self-serve key): /api/settings/email (+/test). Auto-send at custom warn% and 100% in GET /api/dashboard, deduped via budget_alerts collection (_id includes tenant/month/threshold/budget). Alert history in Settings. NO real Resend key provided — graceful failure path verified.
5. Custom recommendation rules: /api/settings/rules {idleCostThreshold, spikePct, budgetWarnPct}; rule-based recs (rule_based:true) for idle/stopped resources and MoM spikes merged with seeded recs.

## Key files
- /app/app/api/[[...path]]/route.js — all APIs (health, dashboard, resources, cost-data, recommendations, budget, settings, reset, azure/*, settings/email*, settings/rules)
- /app/lib/azure-cost.js, /app/lib/resend.js, /app/lib/secret.js
- /app/app/page.js — full UI incl. SettingsPage
- .env: MONGO_URL, DB_NAME, Clerk keys, CREDENTIAL_ENCRYPTION_KEY (do not modify existing values)

## Testing notes
- All API routes require Clerk session (401 otherwise). Backend tests: mint JWT via Clerk Backend API (users → sessions → tokens, ~60s expiry).
- Frontend tests: mint single-use sign-in token (POST /v1/sign_in_tokens) and visit /sign-in?__clerk_ticket=<token> with domcontentloaded wait (networkidle hangs).
- Test user: ccp.tester@example.com / CcpTest!2025Secure (user_3IGRatslGAupfj5ALyfLWJvbKLn); see /app/memory/test_credentials.md.
- Backend 13/13 passed; frontend 9/9 flows passed (this session).

## Backlog
- Real Azure & Resend keys from user (integration code ready, only creds missing)
- Live Azure resource inventory (Resource Graph) so idle-resource rule uses real resources in azure mode
- Scheduled auto-sync (cron) for Azure data
