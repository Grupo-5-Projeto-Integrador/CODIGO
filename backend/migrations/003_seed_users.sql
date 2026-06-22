-- =============================================
-- 003_seed_users.sql
-- Usuário inicial para acesso ao sistema
-- =============================================

INSERT INTO users (name, email, password_hash, role)
VALUES ('Gerente JP Mall', 'gerente@jpmall.com.br', '123456', 'admin')
ON CONFLICT (email) DO NOTHING;
