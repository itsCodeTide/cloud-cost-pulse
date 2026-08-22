# Cloud-Cost-Pulse v3.0 — REST API Reference Documentation

All endpoints are hosted under `/api/*` and require an authenticated Clerk session token passed via Authorization header or cookies.

---

## 1. System & Health

### `GET /api/health`
- **Description**: Public health check endpoint.
- **Response**: `{ "status": "ok", "service": "cloud-cost-pulse" }`

---

## 2. Dashboard & Analytics

### `GET /api/dashboard`
- **Description**: Returns 7 KPI cards, 7 dynamic Recharts series, forecast details, budget health, recommendations, and currency mode.
- **Response**:
  ```json
  {
    "stats": {
      "totalMonthlyCost": 72470,
      "totalResources": 50,
      "activeResources": 36,
      "activeServices": 7,
      "totalServices": 7,
      "potentialSavings": 14500,
      "budgetUsage": 120.8,
      "growth": 7.7
    },
    "currency": "INR",
    "dataSource": "demo"
  }
  ```

### `GET /api/analytics`
- **Description**: Returns FinOps Business Intelligence breakdowns by Service, Region, Owner/Team, and Department.

---

## 3. Resource Management (CRUD)

### `GET /api/resources`
- **Parameters**: `search`, `service`, `region`, `status`, `minCost`, `maxCost`, `page`, `pageSize`
- **Response**: Paginated resources list, total counts, page info, and filter facets.

### `POST /api/resources`
- **Description**: Creates a new resource in the inventory.
- **Payload**:
  ```json
  {
    "resource_name": "prod-vm-eastus-01",
    "service_type": "Azure Virtual Machine",
    "region": "East US",
    "monthly_cost": 4500,
    "status": "Active",
    "owner": "platform-team"
  }
  ```

### `PUT /api/resources/:id`
- **Description**: Updates an existing resource by ID.

### `DELETE /api/resources/:id`
- **Description**: Deletes a resource by ID.

### `POST /api/resources/bulk`
- **Payload**: `{ "action": "bulk_delete" | "bulk_status", "ids": ["id1", "id2"], "status": "Active" }`

---

## 4. Data Upload & Demo Seeding

### `POST /api/upload`
- **Description**: Batch parses and inserts cloud cost rows from CSV/Excel/JSON files.

### `POST /api/reset`
- **Payload**: `{ "mode": "replace" | "merge" }`
- **Description**: Reseeds the 50-resource demo dataset.

---

## 5. Budget Management

### `GET /api/budget`
- **Description**: Returns current monthly budget limits.

### `POST /api/budget`
- **Payload**: `{ "monthly_budget": 60000 }`

---

## 6. Recommendations & Optimization

### `GET /api/recommendations`
- **Description**: Returns active FinOps savings recommendations.

### `POST /api/recommendations/:id/apply`
- **Description**: Applies recommendation action and updates resource status/cost.

---

## 7. Reports & Exporters

### `GET /api/reports`
- **Description**: Lists saved report snapshots.

### `POST /api/reports`
- **Payload**: `{ "type": "Monthly Cost Report" }`

---

## 8. Settings & Currency

### `POST /api/settings/currency`
- **Payload**: `{ "currency": "INR" | "USD" | "EUR" | "GBP" }`

### `POST /api/settings/export`
- **Description**: Downloads full JSON backup of the workspace state.
