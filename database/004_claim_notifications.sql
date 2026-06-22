-- =============================================
-- 004_claim_notifications.sql
-- Execute: psql -U postgres -d jp_mall -f database/004_claim_notifications.sql
-- Idempotente: pode rodar várias vezes sem erros.
-- =============================================

-- Adiciona colunas de contato nas lojas (idempotente)
ALTER TABLE stores ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

-- Preenche telefone padrão onde estiver vazio (não apaga dados existentes)
UPDATE stores SET phone = '556232511000' WHERE phone IS NULL OR phone = '';
-- Preenche email padrão onde estiver vazio
UPDATE stores SET email = 'lojista@flamboyant.com.br' WHERE email IS NULL OR email = '';

-- Tabela de notificações enviadas por sinistro
CREATE TABLE IF NOT EXISTS claim_notifications (
    id               SERIAL       PRIMARY KEY,
    claim_id         TEXT         NOT NULL REFERENCES claims_v2(id) ON DELETE CASCADE,
    recipient_type   VARCHAR(50)  NOT NULL DEFAULT 'store',  -- 'store' | 'area'
    recipient_name   VARCHAR(255),
    recipient_email  VARCHAR(255),
    recipient_phone  VARCHAR(50),
    channel          VARCHAR(30)  NOT NULL DEFAULT 'whatsapp', -- 'email' | 'whatsapp'
    subject          VARCHAR(255),
    message          TEXT         NOT NULL,
    status           VARCHAR(50)  NOT NULL DEFAULT 'link_generated',
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_claim_notif_claim   ON claim_notifications (claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_notif_created ON claim_notifications (created_at DESC);
