-- =============================================
-- 002_create_claims.sql
-- Tabela de sinistros/ocorrências do JP Mall
-- =============================================

CREATE TABLE IF NOT EXISTS claims_v2 (
    id                   TEXT PRIMARY KEY,
    store                TEXT,
    type                 TEXT,
    other_type           TEXT,
    severity             TEXT,
    date                 TEXT,
    description          TEXT,
    responsible_area     TEXT,
    tenant_notified      BOOLEAN DEFAULT false,
    responsible_notified BOOLEAN DEFAULT false,
    employee_name        TEXT,
    employee_contact     TEXT,
    status               TEXT,
    files                JSONB DEFAULT '[]'::jsonb,
    irregular_policy     BOOLEAN DEFAULT false,
    audit_trail          JSONB DEFAULT '[]'::jsonb,
    created_at           TIMESTAMP WITH TIME ZONE DEFAULT now()
);
