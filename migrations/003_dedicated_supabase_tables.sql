-- Dedicated, editable Supabase tables for Cloud-Cost-Pulse.
-- `payload` preserves the app's complete document while the table name,
-- tenant_id, record_id, and timestamps make each domain easy to inspect.

CREATE TABLE IF NOT EXISTS public.user_identities (
  record_id TEXT PRIMARY KEY, tenant_id TEXT, email TEXT, full_name TEXT,
  role TEXT, last_seen_at TIMESTAMPTZ, payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.workspaces (
  record_id TEXT PRIMARY KEY, tenant_id TEXT, name TEXT, plan TEXT,
  payload JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.cloud_resources (
  record_id TEXT PRIMARY KEY, tenant_id TEXT, resource_name TEXT, service_type TEXT,
  region TEXT, status TEXT, monthly_cost NUMERIC(14,2), payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.cloud_cost_data (
  record_id TEXT PRIMARY KEY, tenant_id TEXT, source TEXT, month TEXT, service TEXT,
  month_index INTEGER, cost NUMERIC(14,2), payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.cloud_cost_history (
  record_id TEXT PRIMARY KEY, tenant_id TEXT, month TEXT, service_type TEXT,
  service_key TEXT, month_index INTEGER, cost NUMERIC(14,2), payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.budgets (
  record_id TEXT PRIMARY KEY, tenant_id TEXT, name TEXT, monthly_budget NUMERIC(14,2),
  amount NUMERIC(14,2), period TEXT, payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.azure_connections (
  record_id TEXT PRIMARY KEY, tenant_id TEXT, azure_tenant_id TEXT,
  azure_client_id TEXT, azure_subscription_id TEXT, payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.reports (
  record_id TEXT PRIMARY KEY, tenant_id TEXT, title TEXT, report_type TEXT,
  payload JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.notifications (
  record_id TEXT PRIMARY KEY, tenant_id TEXT, type TEXT, title TEXT, message TEXT,
  severity TEXT, read BOOLEAN DEFAULT FALSE, payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.workspace_settings (
  record_id TEXT PRIMARY KEY, tenant_id TEXT UNIQUE, currency TEXT, data_source TEXT,
  payload JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.recommendations (
  record_id TEXT PRIMARY KEY, tenant_id TEXT, title TEXT, category TEXT, priority TEXT,
  status TEXT, estimated_savings NUMERIC(14,2), payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.audit_logs (
  record_id TEXT PRIMARY KEY, tenant_id TEXT, user_id TEXT, action TEXT, entity TEXT,
  entity_id TEXT, prev_value JSONB, new_value JSONB, payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.workspace_meta (
  record_id TEXT PRIMARY KEY, tenant_id TEXT, payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.workspace_auxiliary_data (
  record_id TEXT PRIMARY KEY, collection TEXT NOT NULL, tenant_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Common inspection indexes.
DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY['user_identities','workspaces','cloud_resources','cloud_cost_data','cloud_cost_history','budgets','azure_connections','reports','notifications','workspace_settings','recommendations','audit_logs','workspace_meta','workspace_auxiliary_data'] LOOP
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (tenant_id)', t || '_tenant_idx', t);
  END LOOP;
END $$;

-- Backfill the dedicated tables from the existing JSONB store.
INSERT INTO public.user_identities (record_id, tenant_id, email, full_name, role, last_seen_at, payload, created_at, updated_at)
SELECT doc_id, data->>'tenantId', data->>'email', data->>'full_name', data->>'role', NULLIF(data->>'last_seen_at','')::timestamptz, data, COALESCE(created_at,NOW()), COALESCE(updated_at,NOW()) FROM public.app_data WHERE collection='users' ON CONFLICT (record_id) DO NOTHING;
INSERT INTO public.workspaces (record_id, tenant_id, name, plan, payload, created_at, updated_at)
SELECT doc_id, data->>'tenantId', data->>'name', data->>'plan', data, COALESCE(created_at,NOW()), COALESCE(updated_at,NOW()) FROM public.app_data WHERE collection='tenants' ON CONFLICT (record_id) DO NOTHING;

-- All other domain rows are copied into their clearly named tables. The
-- application adapter writes future records to these tables directly.
INSERT INTO public.cloud_resources (record_id,tenant_id,resource_name,service_type,region,status,monthly_cost,payload,created_at,updated_at) SELECT doc_id,data->>'tenantId',data->>'resource_name',data->>'service_type',data->>'region',data->>'status',NULLIF(data->>'monthly_cost','')::numeric,data,created_at,updated_at FROM public.app_data WHERE collection='resources' ON CONFLICT DO NOTHING;
INSERT INTO public.cloud_cost_history (record_id,tenant_id,month,service_type,service_key,month_index,cost,payload,created_at,updated_at) SELECT doc_id,data->>'tenantId',data->>'month',data->>'service_type',data->>'service_key',NULLIF(data->>'month_index','')::int,NULLIF(data->>'cost','')::numeric,data,created_at,updated_at FROM public.app_data WHERE collection='cost_history' ON CONFLICT DO NOTHING;
INSERT INTO public.cloud_cost_data (record_id,tenant_id,source,month,service,month_index,cost,payload,created_at,updated_at) SELECT doc_id,data->>'tenantId',data->>'source',data->>'month',data->>'service',NULLIF(data->>'month_index','')::int,NULLIF(data->>'cost','')::numeric,data,created_at,updated_at FROM public.app_data WHERE collection='cost_data' ON CONFLICT DO NOTHING;
INSERT INTO public.budgets (record_id,tenant_id,name,monthly_budget,amount,period,payload,created_at,updated_at) SELECT doc_id,data->>'tenantId',data->>'name',NULLIF(data->>'monthly_budget','')::numeric,NULLIF(data->>'amount','')::numeric,data->>'period',data,created_at,updated_at FROM public.app_data WHERE collection='budgets' ON CONFLICT DO NOTHING;
INSERT INTO public.azure_connections (record_id,tenant_id,azure_tenant_id,azure_client_id,azure_subscription_id,payload,created_at,updated_at) SELECT doc_id,data->>'tenantId',data->>'azureTenantId',data->>'azureClientId',data->>'azureSubscriptionId',data,created_at,updated_at FROM public.app_data WHERE collection='azure_connections' ON CONFLICT DO NOTHING;
INSERT INTO public.reports (record_id,tenant_id,title,report_type,payload,created_at,updated_at) SELECT doc_id,data->>'tenantId',data->>'title',data->>'report_type',data,created_at,updated_at FROM public.app_data WHERE collection='reports' ON CONFLICT DO NOTHING;
INSERT INTO public.notifications (record_id,tenant_id,type,title,message,severity,read,payload,created_at,updated_at) SELECT doc_id,data->>'tenantId',data->>'type',data->>'title',data->>'message',data->>'severity',COALESCE((data->>'read')::boolean,false),data,created_at,updated_at FROM public.app_data WHERE collection='notifications' ON CONFLICT DO NOTHING;
INSERT INTO public.workspace_settings (record_id,tenant_id,currency,data_source,payload,created_at,updated_at) SELECT doc_id,data->>'tenantId',data->>'currency',data->>'dataSource',data,created_at,updated_at FROM public.app_data WHERE collection='settings' ON CONFLICT DO NOTHING;
INSERT INTO public.recommendations (record_id,tenant_id,title,category,priority,status,estimated_savings,payload,created_at,updated_at) SELECT doc_id,data->>'tenantId',data->>'title',data->>'category',data->>'priority',data->>'status',NULLIF(data->>'estimated_savings','')::numeric,data,created_at,updated_at FROM public.app_data WHERE collection IN ('recommendations','applied_recommendations') ON CONFLICT DO NOTHING;
INSERT INTO public.audit_logs (record_id,tenant_id,user_id,action,entity,entity_id,prev_value,new_value,payload,created_at,updated_at) SELECT doc_id,data->>'tenantId',data->>'userId',data->>'action',data->>'entity',data->>'entity_id',data->'prev_value',data->'new_value',data,created_at,updated_at FROM public.app_data WHERE collection='audit_logs' ON CONFLICT DO NOTHING;
INSERT INTO public.workspace_auxiliary_data (record_id,collection,tenant_id,payload,created_at,updated_at)
SELECT doc_id,collection,data->>'tenantId',data,created_at,updated_at FROM public.app_data
WHERE collection NOT IN ('users','tenants','resources','cost_data','cost_history','budgets','azure_connections','reports','notifications','settings','recommendations','applied_recommendations','audit_logs') ON CONFLICT DO NOTHING;

ALTER TABLE public.user_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cloud_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cloud_cost_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cloud_cost_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.azure_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_auxiliary_data ENABLE ROW LEVEL SECURITY;
NOTIFY pgrst, 'reload schema';
