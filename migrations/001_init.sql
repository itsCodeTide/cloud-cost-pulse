-- ============================================================================
-- MIGRATION 001: Initial Schema Setup for Cloud-Cost-Pulse v3.0
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS tenants (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    plan VARCHAR(50) DEFAULT 'Enterprise',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255) REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'Admin',
    phone VARCHAR(50),
    timezone VARCHAR(50) DEFAULT 'UTC',
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS resources (
    id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,
    resource_name VARCHAR(255) NOT NULL,
    service_type VARCHAR(100) NOT NULL,
    region VARCHAR(100) NOT NULL,
    owner VARCHAR(100) DEFAULT 'platform-team',
    department VARCHAR(100) DEFAULT 'Engineering',
    status VARCHAR(50) DEFAULT 'Active' CHECK (status IN ('Active', 'Idle', 'Inactive')),
    monthly_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    description TEXT,
    tags JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cost_history (
    id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,
    month_name VARCHAR(20) NOT NULL,
    month_index INT NOT NULL,
    year INT NOT NULL,
    total_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    service_breakdown JSONB DEFAULT '{}'::jsonb,
    region_breakdown JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS budgets (
    id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    department VARCHAR(100) DEFAULT 'Engineering',
    period VARCHAR(50) DEFAULT 'Monthly' CHECK (period IN ('Monthly', 'Quarterly', 'Annual')),
    description TEXT,
    start_date DATE,
    end_date DATE,
    alert_threshold_pct INT DEFAULT 80,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recommendations (
    id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,
    resource_id VARCHAR(255) REFERENCES resources(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    priority VARCHAR(20) DEFAULT 'Medium' CHECK (priority IN ('High', 'Medium', 'Low')),
    estimated_savings NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    impact_level VARCHAR(50) DEFAULT 'Low Risk',
    status VARCHAR(50) DEFAULT 'Active' CHECK (status IN ('Active', 'Applied', 'Dismissed')),
    rule_based BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reports (
    id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    report_type VARCHAR(100) NOT NULL,
    format VARCHAR(20) DEFAULT 'PDF',
    snapshot_data JSONB NOT NULL,
    schedule VARCHAR(50) DEFAULT 'Manual' CHECK (schedule IN ('Manual', 'Daily', 'Weekly', 'Monthly')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('info', 'success', 'warning', 'error')),
    read BOOLEAN DEFAULT FALSE,
    archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(100) NOT NULL,
    entity_id VARCHAR(255),
    prev_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(50) DEFAULT '127.0.0.1',
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
    tenant_id VARCHAR(255) PRIMARY KEY,
    currency VARCHAR(10) DEFAULT 'INR',
    data_source VARCHAR(50) DEFAULT 'demo',
    azure_config JSONB DEFAULT '{}'::jsonb,
    email_config JSONB DEFAULT '{}'::jsonb,
    rules_config JSONB DEFAULT '{"idleCostThreshold": 500, "spikePct": 25, "budgetWarnPct": 80}'::jsonb,
    notification_prefs JSONB DEFAULT '{"budgetAlerts": true, "optAlerts": true, "emailWeekly": true}'::jsonb,
    appearance JSONB DEFAULT '{"mode": "dark", "compact": false, "accentColor": "blue"}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMIT;
