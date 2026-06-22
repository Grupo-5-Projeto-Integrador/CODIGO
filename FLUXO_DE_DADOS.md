# Manual de Fluxo de Dados — JP Mall

## Visão Geral

```
┌─────────────────────────────────────────────────────────────────────┐
│                         NAVEGADOR (React)                           │
│                                                                     │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────────────┐ │
│  │  Página  │──▶│  Hook    │──▶│  api.ts  │──▶│  fetch() HTTP    │ │
│  │ (*.tsx)  │◀──│  (state) │◀──│(serviço) │◀──│  /api/...        │ │
│  └──────────┘   └──────────┘   └──────────┘   └────────┬─────────┘ │
└──────────────────────────────────────────────────────────┼──────────┘
                                                           │ proxy Vite
                                                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js / Express)                      │
│                                                                     │
│  ┌──────────┐   ┌──────────────┐   ┌──────────┐   ┌─────────────┐  │
│  │ server.js│──▶│  middleware  │──▶│  Route   │──▶│  db/index   │  │
│  │ (entrada)│   │ auth/errors  │   │ (lógica) │   │  (pool pg)  │  │
│  └──────────┘   └──────────────┘   └──────────┘   └──────┬──────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                                           │
                                                           ▼
                                              PostgreSQL — jp_mall
```

---

## Como rodar o sistema completo

```bash
# Terminal 1 — Backend Go (porta 3001)
cd backend
go run .
# ou para gerar o binário compilado:
go build -o jpmall-backend . && ./jpmall-backend

# Terminal 2 — Frontend (porta 5173, com proxy /api → 3001)
npm run dev
```

O Vite redireciona automaticamente qualquer chamada `/api/*` para `http://localhost:3001`.

---

## Camadas do Frontend

### `src/app/types/index.ts`
Define **todos os tipos TypeScript** usados na aplicação.  
Importe de aqui, nunca declare o mesmo tipo em dois arquivos.

```
Claim, ClaimStatus, ClaimSeverity
AuditEntry, UserRole
Store, Notification
AuthUser, DashboardStats
```

### `src/app/constants/index.ts`
Strings e arrays que não mudam em runtime.  
Centraliza valores como `CLAIM_TYPES`, `RESPONSIBLE_AREAS`, cores, estilos de badge.

### `src/app/api.ts`
**Única camada que faz chamadas HTTP.**  
Cada função corresponde a exatamente um endpoint do backend.

```
login()               → POST /api/auth/login
getClaims()           → GET  /api/claims
getClaimById(id)      → GET  /api/claims/:id
createClaim()         → POST /api/claims
updateClaim(id, ...)  → PUT  /api/claims/:id
addAuditEntry()       → POST /api/claims/:id/audit
getStores()           → GET  /api/stores
getNotifications()    → GET  /api/notifications
getDashboardStats()   → GET  /api/dashboard/stats
```

### `src/app/hooks/`
**Hooks React que encapsulam estado + chamadas à API.**  
As páginas usam hooks, não `api.ts` diretamente.

| Hook | O que faz |
|------|-----------|
| `useClaims` | Lista e gerencia sinistros com loading/error |
| `useClaimById` | Busca um sinistro específico e expõe `update`, `addAudit` |
| `useDashboard` | Busca stats e recentes do dashboard |
| `useNotifications` | Busca notificações, `markRead`, `markAllRead` |

**Exemplo de uso em uma página:**
```tsx
function MinhaPage() {
  const { claims, loading, createClaim } = useClaims({ status: "Em análise" });

  if (loading) return <Spinner />;
  return claims.map(c => <ClaimCard key={c.id} claim={c} />);
}
```

### `src/app/context/AuthContext.tsx`
**Estado global de autenticação.**  
Expõe `user`, `isAuthenticated`, `login()`, `logout()`.

Envolva o `<App>` com `<AuthProvider>` para disponibilizar em toda a árvore:
```tsx
// main.tsx
<AuthProvider>
  <App />
</AuthProvider>
```

### `src/app/components/shared/`
Componentes reutilizáveis extraídos das páginas:

| Componente | Uso |
|------------|-----|
| `StatusBadge` | `<StatusBadge status="Em análise" />` |
| `SeverityBadge` | `<SeverityBadge severity="Alta" />` |
| `ConfirmModal` | Modal de confirmação com `onConfirm` / `onCancel` |
| `MultiSelect` | Select com múltipla escolha e busca |

### `src/app/pages/`
Cada arquivo é uma rota. As páginas **não fazem fetch direto** — usam hooks.

| Página | Rota | Hook principal |
|--------|------|----------------|
| `Login` | `/` | `useAuth` |
| `Dashboard` | `/dashboard` | `useDashboard` |
| `NewClaim` | `/novo-sinistro` | `useClaims.createClaim` |
| `ClaimDetails` | `/sinistro/:id` | `useClaimById` |
| `ClaimsHistory` | `/historico` | `useClaims` |
| `Reports` | `/relatorios` | `useDashboard` |

---

## Camadas do Backend (Go)

### `backend/config/config.go`
Lê variáveis do `.env` via `godotenv` e expõe a struct `Config`.  
Todo o código recebe `cfg` por parâmetro — nunca `os.Getenv` espalhado.

### `backend/db/db.go`
Pool de conexão PostgreSQL usando `pgx/v5`.  
`db.Pool` é a variável global acessada por todos os handlers.

### `backend/middleware/auth.go`
- `RequireAuth(secret)` — middleware chi que verifica JWT no header `Authorization: Bearer <token>`
- Injeta `*UserClaims` no `context.Context` da request.

**Como proteger uma rota:**
```go
// rota pública
r.Get("/claims", handlers.ListClaims)

// rota protegida — requer token válido
r.With(auth).Put("/{id}", handlers.UpdateClaim)
```

### `backend/handlers/`
Cada arquivo contém os handlers HTTP de um domínio.  
Handlers recebem `(w http.ResponseWriter, r *http.Request)` e usam `db.Pool` diretamente.

| Arquivo | Domínio | Tabela principal |
|---------|---------|-----------------|
| `auth.go` | Login, token, `/me` | `users` |
| `claims.go` | CRUD sinistros, upload, audit trail | `claims_v2` |
| `stores.go` | Listagem e busca de lojas | `stores` |
| `notifications.go` | Criar, listar, marcar lida | `notifications` |
| `dashboard.go` | Agregações e estatísticas | `claims_v2` |
| `helpers.go` | `JSONResponse`, `jsonError`, `queryParam` | — |

### `backend/models/models.go`
Structs Go que representam as entidades do banco.  
Tags `json:` controlam a serialização para o frontend.

---

## Banco de Dados — Tabelas

### `users`
Autenticação dos gestores.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | serial | PK |
| `email` | varchar | único, usado no login |
| `password` | varchar | senha em texto (legado) |
| `password_hash` | text | bcrypt (preferido) |
| `role` | varchar | `admin` \| outros papéis futuros |
| `name` | varchar | nome exibido na interface |

### `stores`
Cadastro das lojas (LUCs) do shopping.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | serial | PK |
| `code` | varchar | código LUC (ex: `A-105`) |
| `name` | varchar | nome da loja |
| `segment` | varchar | categoria (moda, alimentos…) |

### `claims_v2`
Sinistros — tabela principal da aplicação.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | text | `SIN-{ano}-{hex}` |
| `store` | text | `"Nome Loja - Código"` |
| `type` | text | tipo do sinistro |
| `other_type` | text | quando tipo = "Outros" |
| `severity` | text | Baixa / Média / Alta |
| `date` | text | data do ocorrido `YYYY-MM-DD` |
| `status` | text | Em análise / Aguardando seguradora / Pago / Concluído / Cancelado |
| `description` | text | descrição detalhada |
| `responsible_area` | text | área(s) responsável(is) |
| `tenant_notified` | boolean | lojista foi notificado? |
| `responsible_notified` | boolean | área notificada? |
| `employee_name` | text | nome do lojista |
| `employee_contact` | text | contato do lojista |
| `irregular_policy` | boolean | apólice irregular detectada |
| `files` | jsonb | array de nomes de arquivos |
| `audit_trail` | jsonb | array de `AuditEntry` |
| `compensation_amount` | numeric | valor de indenização |
| `responsibility` | text | Externa / Interna |
| `created_at` | timestamptz | criação |
| `resolved_at` | timestamptz | quando concluído/pago |

### `notifications`
Notificações geradas automaticamente ao criar sinistros.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | serial | PK |
| `title` | varchar | título curto |
| `message` | text | descrição |
| `type` | varchar | `sinistro` \| `sistema` |
| `priority` | varchar | `normal` \| `media` \| `alta` |
| `claim_id` | varchar | referência ao sinistro |
| `is_read` | boolean | foi lida? |
| `created_at` | timestamp | quando criada |

---

## Fluxo Completo: Registrar um Sinistro

```
Usuário preenche o formulário (NewClaim.tsx)
       │
       ▼
handleSubmit(data, files)
       │
       ▼
useClaims.createClaim(payload, files)   ← hook
       │
       ▼
api.createClaim()                        ← api.ts
  → POST /api/claims  (FormData ou JSON)
       │
       ▼ (Vite proxy → :3001)
backend/routes/claims.js  POST /
  1. Multer processa arquivos → salva em /uploads/
  2. Gera ID único: SIN-{ano}-{hex}
  3. Monta auditTrail inicial
  4. INSERT INTO claims_v2 (...)
  5. INSERT INTO notifications (...)  ← notificação automática
  6. RETURNING * → mapClaim(row)
       │
       ▼
Resposta JSON (Claim)
       │
       ▼
Hook atualiza estado local (setClaims)
       │
       ▼
Página navega para /dashboard
```

---

## Fluxo: Login e Autenticação

```
Login.tsx submete (email, senha)
       │
       ▼
useAuth().login(email, senha)           ← context
       │
       ▼
api.login()
  → POST /api/auth/login
       │
       ▼
backend/routes/auth.js
  1. Busca user por email
  2. Compara senha (texto ou bcrypt)
  3. jwt.sign({ id, email, role, name })
  4. Retorna { token, user }
       │
       ▼
AuthContext salva token no localStorage
  localStorage.setItem("jp_token", token)
  localStorage.setItem("jp_user", user)
       │
       ▼
Todas as chamadas seguintes incluem:
  Authorization: Bearer <token>
```

---

## Estrutura de Pastas Resumida

```
projeto/
├── backend/                    ← API REST em Go
│   ├── config/config.go        ← leitura do .env
│   ├── db/db.go                ← pool pgx/v5
│   ├── middleware/auth.go      ← verificação JWT (chi middleware)
│   ├── models/models.go        ← structs das entidades
│   ├── handlers/
│   │   ├── auth.go             ← login + /me
│   │   ├── claims.go           ← CRUD sinistros + upload
│   │   ├── stores.go           ← lojas
│   │   ├── notifications.go    ← notificações
│   │   ├── dashboard.go        ← estatísticas
│   │   └── helpers.go          ← JSONResponse, jsonError
│   ├── uploads/                ← evidências enviadas
│   ├── go.mod / go.sum         ← dependências Go
│   ├── .env                    ← credenciais (não commitar)
│   └── main.go                 ← entry point + roteamento chi
│
├── src/
│   ├── app/
│   │   ├── types/index.ts      ← tipos TypeScript centrais
│   │   ├── constants/index.ts  ← strings/arrays fixos
│   │   ├── api.ts              ← chamadas HTTP (fetch)
│   │   ├── context/
│   │   │   └── AuthContext.tsx ← estado de autenticação
│   │   ├── hooks/
│   │   │   ├── useClaims.ts
│   │   │   ├── useClaimById.ts
│   │   │   ├── useDashboard.ts
│   │   │   └── useNotifications.ts
│   │   ├── components/
│   │   │   ├── shared/         ← componentes reutilizáveis
│   │   │   │   ├── StatusBadge.tsx
│   │   │   │   ├── SeverityBadge.tsx
│   │   │   │   ├── ConfirmModal.tsx
│   │   │   │   └── MultiSelect.tsx
│   │   │   ├── Layout.tsx      ← estrutura com sidebar + header
│   │   │   └── Sidebar.tsx
│   │   ├── pages/              ← uma página por rota
│   │   └── routes.tsx          ← mapeamento URL → componente
│   └── main.tsx
│
├── vite.config.ts              ← proxy /api → :3001
└── FLUXO_DE_DADOS.md           ← este arquivo
```

---

## Regras de Ouro

1. **Páginas nunca chamam `fetch()` diretamente** — usam hooks.
2. **Hooks nunca importam de outras páginas** — só de `api.ts`, `types` e `constants`.
3. **`api.ts` nunca tem lógica de negócio** — só HTTP e mapeamento de resposta.
4. **Backend nunca retorna exceção sem tratar** — todas as rotas têm `try/catch → next(err)`.
5. **Tipos são definidos em `types/index.ts`** — nunca inline em componentes.
6. **Strings de status/severidade vêm de `constants/`** — nunca hardcoded em JSX.
