-- =============================================
-- 004_create_stores.sql
-- Tabela de lojas do JP Mall
-- =============================================

CREATE TABLE IF NOT EXISTS stores (
    id       SERIAL PRIMARY KEY,
    code     TEXT NOT NULL,
    name     TEXT NOT NULL,
    segment  TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_stores_name ON stores (name);
CREATE INDEX IF NOT EXISTS idx_stores_code ON stores (code);
