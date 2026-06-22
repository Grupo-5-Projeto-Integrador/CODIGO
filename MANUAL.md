# Manual do Projeto — JP Mall: Gestão de Sinistros (Grupo 5)

## Visão Geral

Sistema web de gestão integrada de sinistros e ocorrências para o shopping **JP Mall**. Permite registrar, acompanhar e gerar relatórios de sinistros por loja (LUC), com autenticação real, banco de dados PostgreSQL e API REST em Go.

---

## Estrutura de Pastas

```
Projeto-Integrado-Grupo5/
├── frontend/          # Aplicação React + TypeScript (Vite)
│   ├── src/
│   │   ├── apiClient.ts          # Ponto único de importação das APIs
│   │   ├── types/                # Tipos TypeScript compartilhados
│   │   ├── services/api/         # Serviços de comunicação com o backend
│   │   ├── app/
│   │   │   ├── components/       # Componentes reutilizáveis (Layout, Sidebar, UI)
│   │   │   ├── pages/            # Páginas da aplicação
│   │   │   ├── routes.tsx        # Definição de rotas
│   │   │   └── store.ts          # Re-exporta funções de API
│   │   ├── assets/               # Imagens e recursos estáticos
│   │   ├── styles/               # Estilos globais e tema
│   │   └── main.tsx              # Ponto de entrada
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts            # Inclui proxy /api → localhost:8080
│
├── backend/           # API REST em Go (Gin + PostgreSQL)
│   ├── main.go                   # Ponto de entrada do servidor
│   ├── internal/
│   │   ├── config/env.go         # Carregamento de variáveis de ambiente
│   │   ├── db/                   # Conexão e schema do banco
│   │   ├── handlers/             # Handlers HTTP por domínio
│   │   ├── middleware/cors.go    # Configuração de CORS
│   │   ├── model/                # Structs/modelos de dados
│   │   └── routes/routes.go     # Registro de todas as rotas
│   ├── migrations/               # Scripts SQL de criação de tabelas
│   ├── Dockerfile
│   ├── go.mod / go.sum
│   └── .env                      # Variáveis de ambiente (local)
│
├── database/          # Scripts SQL do banco de dados
│   ├── 001_schema.sql            # Schema completo (tabelas)
│   ├── 002_seed_stores.sql       # Dados iniciais das lojas
│   ├── 003_seed_notifications.sql# Notificações de exemplo
│   └── lojas_flamboyant_seed.sql # Seed completo das lojas do JP Mall
│
├── docker-compose.yml # Orquestração: PostgreSQL + pgAdmin + Backend
└── MANUAL.md          # Este arquivo
```

---

## Ambiente de Execução

> **Atenção:** Neste ambiente estamos usando **PostgreSQL local** (via pgAdmin), **sem Docker**. A virtualização de hardware está desativada nesta máquina, portanto o Docker Desktop não funciona. Todos os serviços são executados diretamente no host.

## Pré-requisitos

| Ferramenta | Versão mínima | Uso |
|-----------|--------------|-----|
| Node.js   | 18+          | Frontend |
| npm / pnpm| Qualquer     | Gerenciador de pacotes |
| Go        | 1.21+        | Backend |
| PostgreSQL | 15+ (local) | Banco de dados (instalar diretamente no SO) |
| pgAdmin 4  | Qualquer    | Interface gráfica do banco |

---

## Configuração do Ambiente

### 1. Variáveis de Ambiente (Backend)

O arquivo `.env` deve ser criado na raiz do projeto (`.env.example` está disponível):

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=1806
DB_NAME=jp_mall
DB_SSLMODE=disable
BACKEND_PORT=3001
JWT_SECRET=jp_mall_local_secret_2024
JWT_EXPIRES_IN=24h
```

> **Atenção:** Não commite este arquivo com credenciais reais em repositórios públicos. O arquivo já está no `.gitignore`.

---

## Como Executar (PostgreSQL Local — Sem Docker)

### 1. Banco de Dados

Com o PostgreSQL rodando localmente (via pgAdmin ou linha de comando), execute os scripts na ordem:

```bash
psql -U postgres -f database/001_schema.sql
psql -U postgres -f database/002_seed_stores.sql
psql -U postgres -f database/003_seed_notifications.sql
psql -U postgres -f database/lojas_flamboyant_seed.sql
```

Ou use o Query Tool do pgAdmin para executar cada arquivo manualmente.

### 2. Backend (Go)

```bash
cd backend
go mod download
go run main.go
```

O servidor iniciará em `http://localhost:3001`.

### 3. Frontend (React)

```bash
npm install       # ou: pnpm install
npm run dev       # ou: pnpm dev
```

Frontend disponível em: **http://localhost:5173**

Serviços disponíveis:

| Serviço    | URL                        |
|------------|----------------------------|
| Frontend   | http://localhost:5173       |
| Backend    | http://localhost:3001       |
| PostgreSQL | localhost:5432 (local)      |

> O `vite.config.ts` inclui um proxy que redireciona `/api/*` para `http://localhost:3001`, evitando problemas de CORS em desenvolvimento.

---

## Credenciais de Acesso

O login é validado contra a tabela `users` do PostgreSQL. Não há usuário hardcoded nem fallback sem banco.

| Campo  | Valor                      |
|--------|---------------------------|
| E-mail | `gerente@jpmall.com.br`   |
| Senha  | `123456`                  |

> A senha `123456` está armazenada em texto puro na coluna `password_hash` (seed inicial).
> Para migrar para bcrypt — **recomendado** — veja a seção "Migrar senha para bcrypt" abaixo.

### Como criar um novo usuário no banco

Execute no pgAdmin (Query Tool) ou via `psql`:

```sql
-- Inserir usuário com senha em texto puro (temporário)
INSERT INTO users (name, email, password_hash, role)
VALUES ('Nome do Usuário', 'email@exemplo.com', 'minhasenha', 'admin');

-- Ou com hash bcrypt (recomendado — veja seção abaixo)
INSERT INTO users (name, email, password_hash, role)
VALUES ('Nome do Usuário', 'email@exemplo.com', '$2a$10$HASH_GERADO_PELO_UTILITARIO', 'admin');
```

Roles disponíveis: `admin`, `gerente`, `analista`.

### Migrar senha para bcrypt

1. No diretório `backend/`, gere o hash:
   ```bash
   go run cmd/hashpw/main.go 123456
   # Saída: $2a$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

2. Copie a saída e execute no pgAdmin:
   ```sql
   UPDATE users
   SET password_hash = '$2a$10$COLE_O_HASH_AQUI'
   WHERE email = 'gerente@jpmall.com.br';
   ```

3. Confirme:
   ```sql
   SELECT id, email, name, role, LEFT(password_hash, 6) AS hash_prefix FROM users;
   -- hash_prefix deve ser "$2a$10" após a migração
   ```

### pgAdmin

| Campo    | Valor               |
|----------|---------------------|
| E-mail   | `admin@admin.com`   |
| Senha    | `123456`            |

---

## API REST — Endpoints

Base URL: `http://localhost:3001/api`

### Autenticação

| Método | Rota              | Auth  | Descrição                     |
|--------|------------------|-------|-------------------------------|
| POST   | `/auth/login`    | Não   | Autenticar usuário (retorna JWT) |
| GET    | `/auth/me`       | JWT   | Dados do usuário autenticado   |

**POST /api/auth/login — Body:**
```json
{ "email": "gerente@jpmall.com.br", "password": "123456" }
```

**Resposta 200:**
```json
{
  "token": "eyJhbGci...",
  "user": {
    "id": 1,
    "name": "Gerente JP Mall",
    "email": "gerente@jpmall.com.br",
    "role": "admin"
  }
}
```

**Resposta 401 (credenciais inválidas):**
```json
{ "error": "Credenciais inválidas." }
```

O token JWT é armazenado no `localStorage` como `jp_token` e enviado automaticamente via `Authorization: Bearer <token>` em todas as requisições autenticadas.

**Rotas públicas:** `POST /api/auth/login`, `GET /api/health`, `GET /api/stores`

**Rotas protegidas (requerem JWT):** `PUT /api/claims/:id`, `DELETE /api/claims/:id`, `POST /api/claims/:id/audit`, `GET /api/auth/me`

### Sinistros

| Método | Rota                      | Auth | Descrição                        |
|--------|--------------------------|------|----------------------------------|
| GET    | `/claims`                | Não  | Listar todos os sinistros        |
| GET    | `/claims/:id`            | Não  | Buscar sinistro por ID           |
| POST   | `/claims`                | Não  | Criar novo sinistro              |
| PUT    | `/claims/:id`            | JWT  | Atualizar sinistro               |
| DELETE | `/claims/:id`            | JWT  | Remover sinistro                 |
| POST   | `/claims/:id/audit`      | JWT  | Adicionar entrada de auditoria   |

### Lojas

| Método | Rota                      | Auth | Descrição                        |
|--------|--------------------------|------|----------------------------------|
| GET    | `/stores`                | Não  | Listar lojas (público para NewClaim) |
| GET    | `/stores/meta/segments`  | Não  | Listar segmentos únicos          |
| GET    | `/stores/:id`            | Não  | Buscar loja por ID               |

### Notificações

| Método | Rota                        | Auth | Descrição                              |
|--------|-----------------------------|------|----------------------------------------|
| GET    | `/notifications`            | Não  | Listar notificações (ORDER BY created_at DESC, LIMIT 50) |
| GET    | `/notifications?is_read=false` | Não | Somente não lidas                   |
| POST   | `/notifications`            | Não  | Criar notificação manualmente          |
| PUT    | `/notifications/{id}/read`  | Não  | Marcar uma notificação como lida       |
| PUT    | `/notifications/read-all`   | Não  | Marcar todas as notificações como lidas |

**GET /api/notifications — Resposta:**
```json
{
  "notifications": [
    {
      "id": 1,
      "title": "Novo sinistro: SIN-2026-abc123",
      "message": "Sinistro registrado para Zara — Roubo (Alta)",
      "type": "sinistro",
      "priority": "alta",
      "claim_id": "SIN-2026-abc123",
      "is_read": false,
      "created_at": "2026-06-02T10:00:00Z"
    }
  ],
  "unreadCount": 2
}
```

**Como testar no Thunder Client / Postman:**
```
GET  http://localhost:3001/api/notifications
GET  http://localhost:3001/api/notifications?is_read=false
PUT  http://localhost:3001/api/notifications/1/read
PUT  http://localhost:3001/api/notifications/read-all
POST http://localhost:3001/api/notifications
Body: { "title": "Teste", "message": "Mensagem de teste", "type": "sistema" }
```

**Como consultar no pgAdmin:**
```sql
SELECT id, title, type, priority, is_read, created_at FROM notifications ORDER BY created_at DESC;
```

**Como criar notificação manual no banco:**
```sql
INSERT INTO notifications (title, message, type, priority, claim_id, is_read)
VALUES ('Título', 'Mensagem detalhada', 'sistema', 'normal', NULL, false);
```

**Tipos disponíveis:** `sinistro`, `sistema`, `documentacao`
**Prioridades:** `normal`, `media`, `alta` (alta → badge URGENTE no frontend)

> **Notificação automática:** toda vez que um sinistro é criado via `POST /api/claims`, uma notificação é inserida automaticamente na tabela com `type = 'sinistro'` e `priority` baseada na gravidade (`Alta` → `alta`, `Média` → `media`, `Baixa` → `normal`).

### Histórico de Sinistros

| Método | Rota                          | Auth | Descrição                              |
|--------|------------------------------|------|----------------------------------------|
| GET    | `/claims/history`             | Não  | Lista paginada com filtros             |
| GET    | `/claims/history/export`      | Não  | Exporta relatório (PDF / Excel / CSV)  |

**Filtros disponíveis (query string):**

| Parâmetro       | Tipo    | Exemplo                  |
|----------------|---------|--------------------------|
| `search`       | string  | `renner`                 |
| `status`       | string  | `Em análise`             |
| `severity`     | string  | `Alta`                   |
| `area`         | string  | `Segurança / CFTV`       |
| `responsibility` | string | `Externa`               |
| `start_date`   | date    | `2026-01-01`             |
| `end_date`     | date    | `2026-06-30`             |
| `page`         | int     | `1`                      |
| `limit`        | int     | `10` (max 100)           |

**GET /api/claims/history — Resposta:**
```json
{
  "items": [ { "id": "SIN-...", "store": "...", "severity": "Alta", ... } ],
  "page": 1,
  "limit": 10,
  "total": 42,
  "total_pages": 5
}
```

**Exportação:**
```
GET /api/claims/history/export?format=pdf
GET /api/claims/history/export?format=excel
GET /api/claims/history/export?format=csv
GET /api/claims/history/export?format=pdf&severity=Alta&status=Em+an%C3%A1lise
```

**Como testar no Thunder Client / Postman:**
```
GET http://localhost:3001/api/claims/history
GET http://localhost:3001/api/claims/history?severity=Alta&page=1&limit=10
GET http://localhost:3001/api/claims/history?search=renner&status=Em+an%C3%A1lise
GET http://localhost:3001/api/claims/history/export?format=pdf&severity=Alta
```

**Como validar no pgAdmin:**
```sql
-- Total de sinistros
SELECT COUNT(*) FROM claims_v2;

-- Filtrado por gravidade
SELECT id, store, severity, status, date FROM claims_v2
WHERE severity = 'Alta'
ORDER BY created_at DESC
LIMIT 10;
```

### Relatórios

| Método | Rota                           | Descrição                         |
|--------|-------------------------------|-----------------------------------|
| GET    | `/reports/claims`              | Dados para relatório              |
| GET    | `/reports/claims/pdf`          | Exportar sinistros em PDF         |
| GET    | `/reports/claims/excel`        | Exportar sinistros em Excel       |
| GET    | `/reports/final/pdf`           | Relatório final em PDF            |
| GET    | `/reports/final/excel`         | Relatório final em Excel          |

---

## Páginas do Frontend

| Rota                | Componente         | Descrição                              |
|--------------------|--------------------|----------------------------------------|
| `/`                | `Login`            | Tela de autenticação                   |
| `/dashboard`       | `Dashboard`        | KPIs, gráficos e atividades recentes   |
| `/novo-sinistro`   | `NewClaim`         | Formulário de registro de sinistro     |
| `/historico`       | `ClaimsHistory`    | Histórico e filtros de sinistros       |
| `/sinistro/:id`    | `ClaimDetails`     | Detalhes, auditoria e apólices         |
| `/relatorios`      | `Reports`          | Geração e exportação de relatórios     |
| `/dashboard-main`  | `DashboardMain`    | Hub central do shopping                |
| `/lojistas-main`   | `LojistasMain`     | Gestão de lojistas                     |
| `/treinamentos`    | `Treinamentos`     | Módulo de treinamentos                 |
| `/seguros`         | `Seguros`          | Módulo de seguros                      |
| `/manutencao`      | `Manutencao`       | Módulo de manutenção                   |
| `/marketing`       | `Marketing`        | Módulo de marketing                    |
| `/comercial`       | `Comercial`        | Módulo comercial                       |
| `/institucional`   | `Institucional`    | Módulo institucional                   |
| `/relatorios-main` | `RelatoriosMain`   | Hub de relatórios                      |

---

## Build para Produção

### Frontend

```bash
cd frontend
npm run build
```

Os arquivos estáticos são gerados em `frontend/dist/`.

### Backend

```bash
cd backend
go build -o server main.go
./server
```

---

## Estrutura do Banco de Dados

### Tabelas Principais

- **`users`** — Usuários do sistema (gerentes, analistas)
- **`claims`** — Sinistros registrados
- **`audit_trail`** — Histórico de alterações por sinistro
- **`stores`** — Lojas (LUCs) do shopping
- **`notifications`** — Notificações do sistema

Os scripts de criação ficam em `backend/migrations/` e os seeds completos em `database/`.

---

## Tecnologias Utilizadas

### Frontend
- **React 18** + **TypeScript**
- **Vite** — bundler e dev server
- **Tailwind CSS 4** — utilitários de estilo
- **shadcn/ui** + **Radix UI** — componentes acessíveis
- **Recharts** — gráficos interativos
- **React Router 7** — roteamento SPA
- **Lucide React** — ícones
- **Sonner** — notificações toast

### Backend
- **Go** (Golang) — linguagem principal
- **Chi v5** — framework HTTP
- **pgx v5** — driver PostgreSQL
- **excelize** — geração de Excel
- **fpdf** — geração de PDF

### Infraestrutura
- **PostgreSQL 15** — banco de dados relacional
- **pgAdmin 4** — interface gráfica do banco
- **Docker + Docker Compose** — containerização

---

## Solução de Problemas

### Frontend não conecta ao backend

Verifique se o backend está rodando em `localhost:3001`:
```bash
curl http://localhost:3001/api/health
# Esperado: {"status":"ok",...}
```

### Erro de CORS

Em desenvolvimento, o `vite.config.ts` já possui proxy configurado. Em produção, configure um servidor Nginx ou ajuste as origens permitidas em `backend/main.go` (lista `AllowedOrigins`).

### Banco de dados não responde

Verifique se o serviço PostgreSQL está ativo no pgAdmin ou via:
```bash
pg_isready -U postgres
```

Confirme que o banco `jp_mall` foi criado e os scripts SQL foram executados.

### Porta já em uso

Altere `BACKEND_PORT` no `.env` para outra porta (ex: `3002`) e atualize o proxy em `vite.config.ts` correspondentemente.
