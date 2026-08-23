-- Supabase persistence layer for the existing Mongo-compatible API.
-- Each logical collection is stored as JSONB so all current endpoints and
-- imported/Azure-managed fields persist without a destructive data rewrite.

CREATE TABLE IF NOT EXISTS public.app_data (
  collection TEXT NOT NULL,
  doc_id TEXT NOT NULL,
  tenant_id TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (collection, doc_id)
);

CREATE INDEX IF NOT EXISTS app_data_collection_tenant_idx
  ON public.app_data (collection, tenant_id);
CREATE INDEX IF NOT EXISTS app_data_updated_at_idx
  ON public.app_data (updated_at DESC);

ALTER TABLE public.app_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "server only app data" ON public.app_data;
