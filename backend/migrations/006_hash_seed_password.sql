-- =============================================
-- 006_hash_seed_password.sql
-- Atualiza a senha do usuário seed para hash bcrypt.
--
-- Para gerar o hash correto, execute no diretório backend/:
--   go run cmd/hashpw/main.go 123456
-- Substitua o valor abaixo pelo hash gerado e rode este script no pgAdmin.
-- =============================================

-- SUBSTITUA o valor abaixo pelo hash gerado pelo comando acima.
-- Exemplo de como ficará depois de rodar o hashpw:
--   $2a$10$XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
UPDATE users
SET password_hash = '$2a$10$PLACEHOLDER_SUBSTITUA_PELO_HASH_GERADO'
WHERE email = 'gerente@jpmall.com.br'
  AND password_hash = '123456';

-- Confirme com:
-- SELECT id, email, name, role, LEFT(password_hash,6) as hash_prefix FROM users;
