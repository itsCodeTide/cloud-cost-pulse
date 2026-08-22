-- ============================================================================
-- SEED SCRIPT: Populate Sample FinOps Data for Cloud-Cost-Pulse v3.0
-- ============================================================================

INSERT INTO tenants (id, name, plan)
VALUES ('tenant_default', 'Acme FinOps Corp', 'Enterprise')
ON CONFLICT (id) DO NOTHING;

INSERT INTO settings (tenant_id, currency, data_source, rules_config)
VALUES ('tenant_default', 'INR', 'demo', '{"idleCostThreshold": 500, "spikePct": 25, "budgetWarnPct": 80}'::jsonb)
ON CONFLICT (tenant_id) DO NOTHING;

INSERT INTO budgets (id, tenant_id, name, amount, department, period, alert_threshold_pct)
VALUES 
  ('bgt-1', 'tenant_default', 'Engineering Monthly Budget', 60000.00, 'Engineering', 'Monthly', 80),
  ('bgt-2', 'tenant_default', 'Data Science & AI Operations', 35000.00, 'Data Science', 'Monthly', 85),
  ('bgt-3', 'tenant_default', 'Web Applications & Frontend', 20000.00, 'Web', 'Monthly', 75),
  ('bgt-4', 'tenant_default', 'Platform & DevOps Infrastructure', 45000.00, 'DevOps', 'Monthly', 80),
  ('bgt-5', 'tenant_default', 'Executive Q3 Reserve', 100000.00, 'Executive', 'Quarterly', 90)
ON CONFLICT (id) DO NOTHING;

INSERT INTO resources (id, tenant_id, resource_name, service_type, region, owner, department, status, monthly_cost, description)
VALUES 
  ('res-1', 'tenant_default', 'prod-aks-cluster-01', 'Azure Kubernetes Service', 'East US', 'devops', 'Engineering', 'Active', 12500.00, 'Main Kubernetes production cluster'),
  ('res-2', 'tenant_default', 'sql-db-primary-ha', 'Azure SQL Database', 'Central India', 'data-team', 'Data Science', 'Active', 8400.00, 'Primary SQL database instance with HA'),
  ('res-3', 'tenant_default', 'vm-app-server-eastus', 'Azure Virtual Machine', 'East US', 'platform-team', 'Engineering', 'Active', 6200.00, 'Core application server VM'),
  ('res-4', 'tenant_default', 'blob-storage-logs-archive', 'Azure Storage', 'West Europe', 'devops', 'DevOps', 'Active', 4100.00, 'Historical application logs container'),
  ('res-5', 'tenant_default', 'func-image-resizer', 'Azure Functions', 'Central India', 'web-team', 'Web', 'Active', 950.00, 'Serverless image scaling worker'),
  ('res-6', 'tenant_default', 'openai-gpt4-prod-endpoint', 'Azure AI Services', 'East US 2', 'ml-team', 'Data Science', 'Active', 9800.00, 'Azure OpenAI GPT-4 API instance'),
  ('res-7', 'tenant_default', 'app-service-frontend-prod', 'Azure App Service', 'UK South', 'web-team', 'Web', 'Active', 3200.00, 'Production web dashboard hosting'),
  ('res-8', 'tenant_default', 'vm-legacy-analytics-worker', 'Azure Virtual Machine', 'Central India', 'data-team', 'Data Science', 'Idle', 5400.00, 'Unused legacy batch analytics worker'),
  ('res-9', 'tenant_default', 'blob-temp-staging-export', 'Azure Storage', 'East US', 'data-team', 'Data Science', 'Inactive', 3100.00, 'Orphaned staging export storage container')
ON CONFLICT (id) DO NOTHING;

INSERT INTO notifications (id, tenant_id, type, title, message, severity, read)
VALUES 
  ('notif-1', 'tenant_default', 'alert', 'Budget Alert: 80% Reached', 'Engineering budget has reached 82% of allocated limits.', 'warning', false),
  ('notif-2', 'tenant_default', 'recommendation', 'Savings Opportunity Found', 'Reserved Instance recommendation could save ₹2,500/mo on prod-aks-cluster-01.', 'info', false),
  ('notif-3', 'tenant_default', 'system', 'System Sync Complete', 'Cloud cost data synced successfully.', 'success', true)
ON CONFLICT (id) DO NOTHING;
