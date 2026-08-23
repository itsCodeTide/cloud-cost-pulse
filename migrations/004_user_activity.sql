-- Complete user activity ledger, separate from business audit records.
CREATE TABLE IF NOT EXISTS public.user_activity (
  record_id TEXT PRIMARY KEY,
  user_id TEXT,
  tenant_id TEXT,
  activity_type TEXT NOT NULL DEFAULT 'api_request',
  route TEXT NOT NULL,
  method TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_activity ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS user_activity_tenant_time_idx
  ON public.user_activity (tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS user_activity_user_time_idx
  ON public.user_activity (user_id, occurred_at DESC);

ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;
NOTIFY pgrst, 'reload schema';
