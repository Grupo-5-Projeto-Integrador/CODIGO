# 📘 Manual de Configuração do Banco de Dados — JP Mall

Este manual ensina como configurar o banco de dados PostgreSQL do sistema JP Mall do zero usando o pgAdmin.

---

## 📋 Pré-requisitos

- **PostgreSQL** instalado (versão 14 ou superior)
- **pgAdmin 4** instalado (vem junto com o PostgreSQL no Windows)
- Os arquivos `001_schema.sql` e `002_seed_stores.sql` desta pasta

---

## 🟢 PARTE 1 — Abrir o pgAdmin

1. No Windows, clique em **Iniciar** e pesquise por **pgAdmin 4**.
2. Aguarde o pgAdmin abrir no navegador.
3. Na primeira vez, ele vai pedir para criar uma **senha mestra** (master password).
   - Crie uma senha e guarde. Essa senha é só para desbloquear o pgAdmin.

4. No painel esquerdo, expanda **Servers**.
5. Clique no servidor (ex: `PostgreSQL 16` ou `prototipo01`).
6. Ele vai pedir a **senha do usuário postgres** — digite a senha que foi definida na instalação do PostgreSQL.

---

## 🟢 PARTE 2 — Criar o banco de dados `jp_mall`

1. No painel esquerdo, clique com o **botão direito** em **Databases**.
2. Clique em **Create** → **Database...**
3. Preencha:
   - **Database**: `jp_mall`
   - **Owner**: `postgres`
4. Clique em **Save**.

✅ O banco `jp_mall` aparecerá na lista de databases.

---

## 🟢 PARTE 3 — Rodar os scripts SQL

### 3.1 — Criar as tabelas

1. Clique no banco **jp_mall** no painel esquerdo.
2. Clique no menu **Tools** → **Query Tool** (ou pressione `Alt+Shift+Q`).
3. No editor que abrir, clique no ícone de **pasta/abrir arquivo** 📂.
4. Navegue até a pasta `database` do projeto.
5. Selecione o arquivo **`001_schema.sql`** e clique em **Select**.
6. Clique no botão **▶ Execute** (ou pressione `F5`).
7. Aguarde a mensagem de sucesso no painel inferior.

> Isso cria as tabelas `users`, `stores`, `claims`, `notifications` e insere o usuário padrão.

### 3.2 — Popular as lojas

1. Ainda no Query Tool (ou abra um novo em **Tools** → **Query Tool**).
2. Clique no ícone de **pasta/abrir arquivo** 📂.
3. Selecione o arquivo **`002_seed_stores.sql`**.
4. Clique no botão **▶ Execute** (`F5`).
5. Aguarde a mensagem de sucesso. Serão inseridas **290 lojas**.

### 3.3 — Popular notificações de teste (opcional)

1. Ainda no Query Tool (ou abra um novo).
2. Abra o arquivo **`003_seed_notifications.sql`**.
3. Clique no botão **▶ Execute** (`F5`).
4. Serão inseridas **3 notificações de demonstração**.

> 💡 Este passo é opcional. O sistema gera notificações automaticamente ao registrar sinistros.

### 3.4 — Verificar se funcionou

No Query Tool, execute:

```sql
SELECT COUNT(*) FROM users;
-- Esperado: 1

SELECT COUNT(*) FROM stores;
-- Esperado: 290

SELECT * FROM users;
-- Deve mostrar: gerente@jpmall.com.br / admin / Gestor - Goiânia

SELECT COUNT(*) FROM notifications;
-- Esperado: 3 (se executou o seed) ou 0 (se pulou o passo 3.3)

SELECT * FROM notifications ORDER BY created_at DESC;
-- Deve listar as notificações com título, mensagem, prioridade e claim_id
```

---

## 🟢 PARTE 4 — Configurar a senha no backend

O backend Go precisa se conectar ao PostgreSQL. A senha do banco está no arquivo `backend/.env`.

### 4.1 — Abra o arquivo `backend/.env`

O conteúdo atual é:

```
DATABASE_URL=postgres://postgres:123456@localhost:5432/jp_mall?sslmode=disable
PORT=8080
```

### 4.2 — Troque a senha

Substitua `123456` pela **sua senha** do PostgreSQL:

```
DATABASE_URL=postgres://postgres:SUA_SENHA_AQUI@localhost:5432/jp_mall?sslmode=disable
PORT=8080
```

**Exemplo**: se a sua senha do postgres é `minhasenha123`:

```
DATABASE_URL=postgres://postgres:minhasenha123@localhost:5432/jp_mall?sslmode=disable
PORT=8080
```

### 4.3 — Também troque no main.go (fallback)

Abra o arquivo `backend/main.go` e procure pela linha que contém:

```go
dsn = "postgres://postgres:123456@localhost:5432/jp_mall?sslmode=disable"
```

Troque `123456` pela sua senha.

> ⚠️ **Importante**: Se você não trocar a senha, o backend não vai conseguir conectar no banco e as rotas vão dar erro.

---

## 🟢 PARTE 5 — Testar o sistema

### 5.1 — Iniciar o backend

Abra um terminal na pasta `backend` e execute:

```bash
go run main.go
```

Deve aparecer:

```
[GIN-debug] Listening and serving HTTP on :8080
```

### 5.2 — Iniciar o frontend

Abra outro terminal na raiz do projeto e execute:

```bash
npm install
npm run dev
```

Acesse: **http://localhost:5173**

### 5.3 — Fazer login

- **E-mail**: `gerente@jpmall.com.br`
- **Senha**: `123456`

---

## 🔴 PARTE 6 — Como excluir o banco de dados

Se precisar remover tudo e começar do zero:

### Opção A — Pelo pgAdmin

1. No painel esquerdo, clique com o **botão direito** no banco **jp_mall**.
2. Clique em **Delete/Drop**.
3. Confirme clicando **Yes**.

> ⚠️ Se der erro dizendo que há conexões ativas, primeiro:
> - Pare o backend (feche o terminal do `go run main.go`).
> - Feche qualquer aba do Query Tool aberta no banco jp_mall.
> - Tente novamente.

### Opção B — Pelo terminal (psql)

```bash
psql -U postgres -c "DROP DATABASE jp_mall;"
```

Se der erro de conexões ativas:

```bash
psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='jp_mall';"
psql -U postgres -c "DROP DATABASE jp_mall;"
```

### Depois de excluir

Para recriar, basta repetir os passos a partir da **PARTE 2**.

---

## 🔔 PARTE 7 — Sistema de Notificações

O JP Mall possui um sistema de notificações em tempo real integrado ao banco de dados PostgreSQL.

### 7.1 — Como funciona

- Ao **registrar um novo sinistro** pelo frontend (ou via API), o backend automaticamente cria uma notificação na tabela `notifications`.
- O **sino de notificações** no header do sistema exibe as **20 últimas notificações** e a contagem de não lidas.
- Ao **clicar** em uma notificação, ela é marcada como lida e o usuário é redirecionado para o sinistro correspondente.
- O frontend faz **polling automático a cada 10 segundos** para buscar novas notificações.

### 7.2 — Tabela `notifications`

```sql
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'sistema',     -- 'sinistro', 'sistema', 'urgente'
    priority VARCHAR(50) NOT NULL DEFAULT 'normal',   -- 'normal', 'alta'
    claim_id VARCHAR(100),                            -- ID textual do sinistro (ex: SIN-2026-abc123)
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### 7.3 — Endpoints da API

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/notifications` | Retorna as 20 últimas notificações (ordenadas por data, mais recentes primeiro) |
| `PATCH` | `/api/notifications/:id/read` | Marca uma notificação como lida (`is_read = true`) |

**Exemplo de resposta do `GET /api/notifications`:**

```json
[
  {
    "id": 4,
    "title": "Sinistro de Alta Gravidade",
    "message": "C&A - LUC 1060 — Princípio de incêndio em reator de luminária contido pela brigada.",
    "type": "sinistro",
    "priority": "alta",
    "claim_id": "SIN-2026-0007",
    "is_read": false,
    "created_at": "2026-05-20T04:39:38Z"
  }
]
```

### 7.4 — Regras de prioridade

| Gravidade do Sinistro | Prioridade da Notificação | Título gerado |
|-----------------------|--------------------------|---------------|
| Alta | `alta` | "Novo sinistro de Alta Gravidade" |
| Média / Baixa | `normal` | "Novo sinistro registrado" |

### 7.5 — Consultas úteis no pgAdmin

```sql
-- Ver todas as notificações (mais recentes primeiro)
SELECT * FROM notifications ORDER BY created_at DESC;

-- Contar notificações não lidas
SELECT COUNT(*) FROM notifications WHERE is_read = FALSE;

-- Marcar todas como lidas
UPDATE notifications SET is_read = TRUE;

-- Apagar todas as notificações (limpar para testes)
DELETE FROM notifications;
```

---

## 📂 Resumo dos arquivos

| Arquivo | O que faz |
|---------|-----------|
| `001_schema.sql` | Cria as tabelas `users`, `stores`, `claims`, `notifications` e insere o usuário padrão |
| `002_seed_stores.sql` | Insere as 290 lojas do Flamboyant |
| `003_seed_notifications.sql` | Insere 3 notificações de teste/demonstração (opcional) |
| `MANUAL.md` | Este manual que você está lendo |

---

## 📋 Ordem de execução dos scripts

Para configurar o banco em uma máquina nova, execute nesta ordem:

1. **Crie o banco**: `CREATE DATABASE jp_mall;`
2. **Execute** `001_schema.sql` — cria tabelas e usuário padrão
3. **Execute** `002_seed_stores.sql` — insere as lojas
4. **(Opcional)** Execute `003_seed_notifications.sql` — insere notificações de teste

> 💡 O backend Go também cria automaticamente as tabelas necessárias ao iniciar (`ensureSchema`), mas é recomendável executar os scripts SQL manualmente para garantir que tudo está correto.

---

## ❓ Problemas comuns

| Problema | Solução |
|----------|---------|
| pgAdmin pede senha e não aceita | A senha é a que foi definida na instalação do PostgreSQL, não a do pgAdmin |
| Backend dá erro de conexão | Verifique se a senha no `backend/.env` é a mesma do PostgreSQL |
| Porta 8080 já está em uso | Feche outros programas ou mude a porta no `.env` |
| Porta 5173 já está em uso | Feche outras instâncias do `npm run dev` |
| `DROP DATABASE` dá erro | Pare o backend e feche o Query Tool antes de excluir |
| Notificações não aparecem | Verifique se o backend está rodando e se a tabela `notifications` existe no banco |
| Erro `claim_id` ao inserir notificação | A coluna `claim_id` deve ser `VARCHAR(100)`, não `INTEGER`. Veja a PARTE 7 |
