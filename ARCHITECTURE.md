# Cloud-Cost-Pulse v3.0 — Architecture & Design Specifications

This document outlines the system architecture, mathematical formulas, data models, and security mechanics powering Cloud-Cost-Pulse v3.0.

---

## 1. System Architecture Overview

```
                      +---------------------------------------+
                      |         User Browser / Client         |
                      |  (Next.js 15 App Router / React UI)   |
                      +-------------------+-------------------+
                                          |
                                    HTTP / REST
                                          |
                                          v
                      +---------------------------------------+
                      |      Next.js Server API Routes        |
                      |      (app/api/[[...path]]/route.js)   |
                      +---------+-------------------+---------+
                                |                   |
             +------------------+                   +------------------+
             |                                                         |
             v                                                         v
+------------------------+                              +------------------------+
|  Clerk Auth Engine     |                              |   Azure Cost API /     |
|  (User & Tenant RBAC)  |                              |   Resend Email Service |
+------------------------+                              +------------------------+
             |                                                         |
             +------------------+                   +------------------+
                                |                   |
                                v                   v
                      +---------------------------------------+
                      |         Database Layer                |
                      | (PostgreSQL / Supabase / In-Memory)   |
                      +---------------------------------------+
```

---

## 2. FinOps Mathematical Formulas

### Total Monthly Cost
$$\text{Total Monthly Cost} = \sum_{i \in \text{Active Resources}} \text{monthly\_cost}_i$$

### Budget Utilization Percentage
$$\text{Budget Usage \%} = \left( \frac{\text{Total Monthly Cost}}{\text{Monthly Budget}} \right) \times 100$$

### Month-over-Month (MoM) Cost Growth
$$\text{Cost Growth \%} = \left( \frac{\text{Current Month Spend} - \text{Previous Month Spend}}{\text{Previous Month Spend}} \right) \times 100$$

### 3-Month Rolling Forecast
$$\text{Expected Forecast Cost} = \frac{1}{3} \sum_{m=1}^{3} \text{Spend}_{t-m}$$

### Reserved Instance (RI) Savings
$$\text{VM RI Savings} = \text{VM Active Spend} \times 0.20$$

---

## 3. Data Isolation & Multi-Tenancy

Every database query is strictly scoped by `tenantId`:
- **Personal Account**: `tenantId = userId`
- **Team Workspace**: `tenantId = orgId` (Clerk Organization)

This guarantees strict multi-tenant isolation, ensuring organization members share budgets, resources, and reports while maintaining privacy from external tenants.

---

## 4. Encryption & Security

- **Secrets Encryption**: Azure Client Secrets and Resend API Keys are encrypted using **AES-256-GCM** before being stored. Secrets are masked (`••••••••`) when returned via settings APIs.
- **RBAC & Authorization**: All API endpoints authenticate requests against Clerk JWT tokens and verify tenant ownership before mutating database records.
- **Audit Logging**: Every mutation (`create`, `update`, `delete`, `bulk_status`, `import`) records an entry in `audit_logs` with timestamps, actor IDs, and old/new values.
