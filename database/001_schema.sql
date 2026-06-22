-- =============================================
-- 001_schema.sql — Flamboyant Shopping / Grupo 5
-- Execute a partir da raiz do projeto:
--   psql -U postgres -d jp_mall -f database/001_schema.sql
-- =============================================

-- ── Extensões ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- usada para gen_random_uuid()

-- ── Usuários ─────────────────────────────────────────────────────────────────
-- ATENÇÃO: a coluna chama-se password_hash (não "password")
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(50)  NOT NULL DEFAULT 'admin',
    name          VARCHAR(255) NOT NULL DEFAULT 'Gestor',
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Lojas ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stores (
    id         SERIAL PRIMARY KEY,
    code       VARCHAR(100) UNIQUE NOT NULL,
    name       VARCHAR(255) NOT NULL,
    segment    VARCHAR(255),
    active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stores_name    ON stores (name);
CREATE INDEX IF NOT EXISTS idx_stores_code    ON stores (code);
CREATE INDEX IF NOT EXISTS idx_stores_segment ON stores (segment);

-- ── Sinistros — tabela principal usada por TODOS os handlers ─────────────────
-- Nome obrigatório: claims_v2  (handlers/claims.go, dashboard.go, history.go, reports.go)
CREATE TABLE IF NOT EXISTS claims_v2 (
    id                   TEXT         PRIMARY KEY DEFAULT gen_random_uuid()::text,
    store                VARCHAR(255) NOT NULL,
    type                 VARCHAR(100) NOT NULL,
    other_type           VARCHAR(255),
    severity             VARCHAR(50)  NOT NULL,
    date                 DATE         NOT NULL,
    description          TEXT         NOT NULL,
    responsible_area     VARCHAR(255),
    tenant_notified      BOOLEAN      NOT NULL DEFAULT FALSE,
    responsible_notified BOOLEAN      NOT NULL DEFAULT FALSE,
    employee_name        VARCHAR(255),
    employee_contact     VARCHAR(255),
    employee_contacts    JSONB        NOT NULL DEFAULT '[]',
    status               VARCHAR(50)  NOT NULL DEFAULT 'Em análise',
    files                JSONB        NOT NULL DEFAULT '[]',
    irregular_policy     BOOLEAN      NOT NULL DEFAULT FALSE,
    audit_trail          JSONB        NOT NULL DEFAULT '[]',
    responsibility       VARCHAR(50)  NOT NULL DEFAULT 'Externa',
    compensation_amount  NUMERIC(12,2)         DEFAULT 0,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    resolved_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_claims_v2_status     ON claims_v2 (status);
CREATE INDEX IF NOT EXISTS idx_claims_v2_severity   ON claims_v2 (severity);
CREATE INDEX IF NOT EXISTS idx_claims_v2_created_at ON claims_v2 (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_claims_v2_store       ON claims_v2 (store);

-- ── Relação Sinistro ↔ Lojas (multi-loja) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS claim_stores (
    id       SERIAL  PRIMARY KEY,
    claim_id TEXT    NOT NULL REFERENCES claims_v2(id) ON DELETE CASCADE,
    store_id INTEGER NOT NULL REFERENCES stores(id)    ON DELETE CASCADE,
    UNIQUE (claim_id, store_id)
);

CREATE INDEX IF NOT EXISTS idx_claim_stores_claim ON claim_stores (claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_stores_store ON claim_stores (store_id);

-- ── Notificações ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    id         SERIAL       PRIMARY KEY,
    title      VARCHAR(255) NOT NULL,
    message    TEXT         NOT NULL,
    type       VARCHAR(50)  NOT NULL DEFAULT 'sistema',
    priority   VARCHAR(50)  NOT NULL DEFAULT 'normal',
    claim_id   VARCHAR(100),
    is_read    BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_is_read   ON notifications (is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications (created_at DESC);

-- ── Usuário administrador padrão ─────────────────────────────────────────────
-- Senha padrão: admin123  (hash bcrypt custo 10)
-- TROQUE A SENHA após o primeiro login em produção.
INSERT INTO users (email, password_hash, role, name)
VALUES (
    'gerente@flamboyant.com.br',
    '$2a$10$7U2vrdEJUPmPpDSKJ.SJee/Y5dJ7IEDlCFuM/.uAGnsOZYB/HR.nO',
    'admin',
    'Gestor - Goiânia'
)
ON CONFLICT (email) DO NOTHING;
