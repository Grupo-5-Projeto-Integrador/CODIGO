-- =============================================
-- 005_add_active_and_claim_stores.sql
-- Adiciona coluna active à stores e cria tabela claim_stores
-- =============================================

ALTER TABLE stores ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS claim_stores (
    id          SERIAL PRIMARY KEY,
    claim_id    TEXT NOT NULL REFERENCES claims_v2(id) ON DELETE CASCADE,
    store_id    INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    UNIQUE(claim_id, store_id)
);

CREATE INDEX IF NOT EXISTS idx_claim_stores_claim ON claim_stores (claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_stores_store ON claim_stores (store_id);
