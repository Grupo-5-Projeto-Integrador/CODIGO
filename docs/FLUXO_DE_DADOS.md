# Fluxo de Dados — Sistema de Gestão de Sinistros JP Mall

## Visão Geral

O sistema é composto por três camadas:

```
Usuário → Frontend (React) → Backend (Go/Gin) → Banco de Dados (PostgreSQL)
```

O **frontend** roda na porta **5173** (desenvolvimento) e se comunica com o backend por meio de um proxy configurado no Vite. O **backend** roda na porta **8080** e acessa diretamente o PostgreSQL.

---

## 1. Fluxo de Login e Autenticação

### Passo a passo

1. O usuário acessa `http://localhost:5173/` e vê a página de **Login**.
2. Preenche e-mail e senha e clica em "Entrar no Sistema".
3. O frontend chama `login()` de `services/api/auth.ts`, que dispara:
   ```
   POST /api/login
   Body: { "email": "...", "password": "..." }
   ```
4. O Vite proxy redireciona a requisição para `http://localhost:8080/api/login`.
5. O backend (`handlers/auth.go`) consulta a tabela `users` no PostgreSQL comparando e-mail e senha.
6. Se válido, retorna `{ "success": true, "user": { ... } }`.
7. O frontend salva o objeto `user` no `localStorage` e redireciona para `/dashboard`.

### Credenciais padrão (criadas automaticamente)
- **E-mail:** `gerente@jpmall.com.br`
- **Senha:** `123456`

> Observação: o sistema atual usa autenticação simples (sem JWT). O campo `password` é comparado diretamente no banco.

---

## 2. Comunicação Frontend → Backend (Proxy Vite)

Todas as chamadas de API usam caminhos **relativos** (ex.: `/api/claims`). O Vite está configurado para redirecionar automaticamente qualquer requisição que começa com `/api` para o backend:

```js
// frontend/vite.config.ts
server: {
  proxy: {
    '/api': 'http://localhost:8080',
  },
},
```

Isso evita problemas de CORS durante o desenvolvimento, pois o browser vê tudo como vindo do mesmo endereço (`localhost:5173`).

O backend também possui middleware CORS configurado em `internal/middleware/cors.go`, que aceita explicitamente origens `http://localhost:5173` e `http://localhost:8080`.

---

## 3. Mapa de Páginas e Serviços de API

| Página (arquivo) | Rota no Frontend | Serviço de API chamado | Endpoint Backend |
|---|---|---|---|
| Login (`Login.tsx`) | `/` | `auth.ts → login()` | `POST /api/login` |
| Dashboard de Sinistros (`Dashboard.tsx`) | `/dashboard` | `claims.ts → fetchClaims()` | `GET /api/claims` |
| Novo Sinistro (`NewClaim.tsx`) | `/novo-sinistro` | `stores.ts → fetchStores()` | `GET /api/stores` |
| Novo Sinistro (`NewClaim.tsx`) | `/novo-sinistro` | `claims.ts → fetchClaims()` | `GET /api/claims` |
| Novo Sinistro (`NewClaim.tsx`) | `/novo-sinistro` | `claims.ts → createClaim()` | `POST /api/claims` |
| Detalhes do Sinistro (`ClaimDetails.tsx`) | `/sinistro/:id` | `claims.ts → fetchClaimById()` | `GET /api/claims/:id` |
| Detalhes do Sinistro (`ClaimDetails.tsx`) | `/sinistro/:id` | `claims.ts → updateClaim()` | `PUT /api/claims/:id` |
| Detalhes do Sinistro (`ClaimDetails.tsx`) | `/sinistro/:id` | `claims.ts → addAuditEntry()` | `POST /api/claims/:id/audit` |
| Histórico (`ClaimsHistory.tsx`) | `/historico` | `claims.ts → fetchClaims()` | `GET /api/claims` |
| Relatórios (`Reports.tsx`) | `/relatorios` | `reports.ts → fetchReportClaims()` | `GET /api/reports/claims` |
| Relatórios (`Reports.tsx`) | `/relatorios` | `reports.ts → downloadFinalReport()` | `GET /api/reports/final/pdf` ou `/excel` |
| Layout (todas as páginas) | — | `notifications.ts → fetchNotifications()` | `GET /api/notifications` |
| Layout (todas as páginas) | — | `notifications.ts → markNotificationAsRead()` | `PATCH /api/notifications/:id/read` |

---

## 4. Fluxo Detalhado — Aba Histórico

A página Histórico (`/historico`) exibe todos os sinistros registrados com filtros e paginação.

### Sequência completa

```
Usuário clica em "Histórico" na sidebar
        ↓
ClaimsHistory.tsx monta (useEffect)
        ↓
fetchClaims()  →  GET /api/claims
        ↓
Vite proxy encaminha para localhost:8080
        ↓
handlers/claim.go → GetClaims()
        ↓
SELECT * FROM claims_v2 ORDER BY created_at DESC
        ↓
Retorna JSON com array de sinistros
        ↓
Frontend aplica formatação de data (YYYY-MM-DD → DD/MM/YYYY)
        ↓
Filtros locais de busca, status e gravidade
        ↓
Paginação local (5 itens por página)
        ↓
Tabela renderizada para o usuário
```

### Filtros disponíveis (todos aplicados no frontend, sem nova requisição)
- **Busca por texto:** nº do sinistro, loja, área responsável, nome do lojista
- **Status:** Em análise / Aguardando seguradora / Pago / Concluído / Cancelado
- **Gravidade:** Alta / Média / Baixa

### Ação disponível
- Botão "Ver Detalhes" em cada linha redireciona para `/sinistro/:id`

---

## 5. Fluxo Detalhado — Registro de Novo Sinistro

```
Usuário preenche o formulário e clica em "Registrar Sinistro"
        ↓
onSubmit() verifica duplicidade:
  fetchClaims()  →  GET /api/claims
        ↓
  Se já existe sinistro com mesma loja + tipo + status ativo:
    → Exibe modal de alerta de duplicidade
  Caso contrário:
    → saveAndNavigate()
        ↓
createClaim(payload)  →  POST /api/claims
  Body: { store, type, severity, date, description,
          responsibleArea, tenantNotified, files, ... }
        ↓
handlers/claim.go → CreateClaim()
        ↓
INSERT INTO claims_v2 (...) VALUES (...)
        ↓
Retorna o sinistro criado com ID gerado
        ↓
Frontend redireciona para /dashboard
```

---

## 6. Como o Backend Processa uma Requisição

Exemplo com `GET /api/claims`:

```
1. Gin recebe a requisição na porta 8080
2. Middleware CORS verifica a origem
3. Router encaminha para handlers.GetClaims()
4. Handler chama pool.Query(ctx, "SELECT ... FROM claims_v2")
5. Resultado é mapeado para slice de structs Go
6. c.JSON(200, claims) serializa para JSON
7. Resposta viaja de volta ao frontend
```

---

## 7. Acesso ao Banco de Dados

O backend usa o driver `jackc/pgx/v5` com um pool de conexões (`pgxpool`).

A conexão é configurada via variáveis de ambiente (arquivo `backend/.env`):

```env
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=123456
PGDATABASE=jp_mall
PORT=8080
```

Na inicialização (`main.go`), o backend:
1. Carrega o `.env`
2. Abre o pool de conexões
3. Chama `EnsureSchema()` que cria automaticamente as tabelas se não existirem
4. Insere o usuário padrão e lojas de exemplo se a base estiver vazia

### Tabelas principais

| Tabela | Descrição |
|---|---|
| `users` | Usuários do sistema (e-mail, nome, função, senha) |
| `claims_v2` | Sinistros registrados com todos os campos |
| `notifications` | Notificações geradas pelo sistema |
| `stores` | Lojas cadastradas no shopping |

---

## 8. Todos os Endpoints do Backend

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/login` | Autenticação do usuário |
| GET | `/api/stores` | Lista todas as lojas |
| GET | `/api/stores/search` | Busca lojas por query string |
| GET | `/api/claims` | Lista todos os sinistros |
| GET | `/api/claims/:id` | Busca sinistro por ID |
| POST | `/api/claims` | Cria novo sinistro |
| PUT | `/api/claims/:id` | Atualiza sinistro existente |
| POST | `/api/claims/:id/audit` | Adiciona entrada na trilha de auditoria |
| GET | `/api/reports/claims` | Dados para relatório com filtros |
| GET | `/api/reports/claims/pdf` | Download do relatório em PDF |
| GET | `/api/reports/claims/excel` | Download do relatório em Excel |
| GET | `/api/reports/final/pdf` | Download do relatório final em PDF |
| GET | `/api/reports/final/excel` | Download do relatório final em Excel |
| GET | `/api/notifications` | Lista notificações |
| PATCH | `/api/notifications/:id/read` | Marca notificação como lida |

---

## 9. Estrutura Final de Pastas do Projeto

```
Projeto-Integrado-Grupo5/
│
├── backend/                          # Servidor Go (API REST)
│   ├── main.go                       # Ponto de entrada: inicia DB e servidor
│   ├── .env                          # Variáveis de ambiente (local)
│   ├── .env.example                  # Modelo de variáveis de ambiente
│   ├── Dockerfile                    # Imagem Docker do backend
│   ├── go.mod / go.sum               # Dependências Go
│   ├── migrations/                   # Scripts SQL de migração
│   └── internal/
│       ├── config/
│       │   └── env.go                # Carregamento do arquivo .env
│       ├── db/
│       │   ├── connection.go         # Abertura do pool de conexões PostgreSQL
│       │   └── schema.go             # Criação automática de tabelas e seed inicial
│       ├── handlers/
│       │   ├── handlers.go           # Inicialização compartilhada (SetDB)
│       │   ├── auth.go               # Handler de login
│       │   ├── claim.go              # Handlers de sinistros (CRUD + auditoria)
│       │   ├── store.go              # Handlers de lojas
│       │   ├── notification.go       # Handlers de notificações
│       │   └── report.go             # Handlers de relatórios (PDF/Excel)
│       ├── middleware/
│       │   └── cors.go               # Middleware de CORS
│       ├── model/
│       │   ├── auth.go               # Structs de autenticação
│       │   ├── claim.go              # Struct do sinistro
│       │   ├── store.go              # Struct da loja
│       │   ├── notification.go       # Struct de notificação
│       │   └── user.go               # Struct do usuário
│       └── routes/
│           └── routes.go             # Registro de todas as rotas da API
│
├── frontend/                         # Aplicação React (interface do usuário)
│   ├── index.html                    # HTML base
│   ├── vite.config.ts                # Configuração do Vite + proxy de API
│   ├── package.json                  # Dependências Node
│   └── src/
│       ├── main.tsx                  # Ponto de entrada React
│       ├── apiClient.ts              # Barrel de exportação dos serviços de API
│       ├── app/
│       │   ├── App.tsx               # Componente raiz com Router e Toaster
│       │   ├── routes.tsx            # Definição de todas as rotas do frontend
│       │   ├── store.ts              # Dados iniciais de exemplo e helpers locais
│       │   ├── components/
│       │   │   ├── Layout.tsx        # Layout principal (header + sidebar + conteúdo)
│       │   │   ├── Sidebar.tsx       # Menu lateral de navegação
│       │   │   ├── SinistroForm.tsx  # Componente de formulário de sinistro
│       │   │   ├── figma/
│       │   │   │   └── ImageWithFallback.tsx  # Imagem com fallback
│       │   │   └── ui/               # Biblioteca de componentes visuais (shadcn/Radix UI)
│       │   │       └── (40+ arquivos: button, dialog, table, select, etc.)
│       │   └── pages/
│       │       ├── Login.tsx         # Tela de login
│       │       ├── Dashboard.tsx     # Dashboard de sinistros
│       │       ├── DashboardMain.tsx # Dashboard principal do shopping
│       │       ├── NewClaim.tsx      # Formulário de novo sinistro
│       │       ├── ClaimDetails.tsx  # Detalhes e edição de sinistro
│       │       ├── ClaimsHistory.tsx # Histórico com filtros e paginação
│       │       ├── Reports.tsx       # Geração e download de relatórios
│       │       ├── LojistasMain.tsx  # Área de lojistas
│       │       ├── Treinamentos.tsx  # Área de treinamentos
│       │       ├── Seguros.tsx       # Área de seguros
│       │       ├── Manutencao.tsx    # Área de manutenção
│       │       ├── Marketing.tsx     # Área de marketing
│       │       ├── Comercial.tsx     # Área comercial
│       │       ├── Institucional.tsx # Área institucional
│       │       └── RelatoriosMain.tsx # Relatórios gerais
│       ├── services/
│       │   └── api/
│       │       ├── auth.ts           # Serviço de autenticação
│       │       ├── claims.ts         # Serviço de sinistros
│       │       ├── stores.ts         # Serviço de lojas
│       │       ├── reports.ts        # Serviço de relatórios
│       │       └── notifications.ts  # Serviço de notificações
│       ├── types/
│       │   ├── index.ts              # Re-exportação dos tipos
│       │   └── claim.ts              # Interfaces TypeScript (Claim, AuditEntry, etc.)
│       ├── styles/                   # Arquivos CSS globais e temas
│       └── assets/                  # Imagens e recursos estáticos
│
├── database/                         # Scripts SQL para popular o banco
│   ├── 001_schema.sql
│   ├── 002_seed_stores.sql
│   ├── 003_seed_notifications.sql
│   └── lojas_flamboyant_seed.sql
│
├── docs/
│   └── FLUXO_DE_DADOS.md            # Este documento
│
├── docker-compose.yml                # Orquestração: PostgreSQL + pgAdmin + Backend
└── MANUAL.md                         # Manual de uso do sistema
```

---

## 10. Como Iniciar o Sistema

### Opção A — Com Docker (recomendado para apresentação)

```bash
# No diretório raiz do projeto:
docker compose up --build

# Em outro terminal, inicie o frontend:
cd frontend
npm run dev
```

Acesse: `http://localhost:5173`

### Opção B — Local (sem Docker)

Pré-requisito: PostgreSQL rodando localmente com banco `jp_mall` criado.

```bash
# Terminal 1 — Backend:
cd backend
go run main.go

# Terminal 2 — Frontend:
cd frontend
npm run dev
```

Acesse: `http://localhost:5173`

### Credenciais de acesso

| Campo | Valor |
|---|---|
| E-mail | `gerente@jpmall.com.br` |
| Senha | `123456` |

> Esses dados são inseridos automaticamente pelo backend na primeira inicialização.
