-- =============================================
-- 001_create_users.sql
-- Tabela de usuários do sistema JP Mall
-- =============================================

CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'admin',
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT now()
);
