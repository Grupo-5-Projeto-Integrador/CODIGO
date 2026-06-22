# Deploy no Render — JP Mall / Flamboyant Shopping

> Stack: **React + Vite** (frontend) · **Go + Chi** (backend) · **PostgreSQL 16**

---

## Arquitetura no Render

```
Usuário
  │
  ▼
┌─────────────────────────────────────────┐
│  Web Service — Frontend                 │
│  jpmall-frontend.onrender.com           │
│  Docker · Dockerfile (raiz) · nginx     │
│  Proxia /api/* → Backend               │
└────────────────┬────────────────────────┘
                 │ /api/*
                 ▼
┌─────────────────────────────────────────┐
│  Web Service — Backend                  │
│  jpmall-backend.onrender.com            │
│  Docker · backend/Dockerfile · Go       │
└────────────────┬────────────────────────┘
                 │ DATABASE_URL
                 ▼
┌─────────────────────────────────────────┐
│  PostgreSQL Managed (Render)            │
│  ou Supabase (free permanente)          │
│  banco: jp_mall                         │
└─────────────────────────────────────────┘
```

---

## Passo 1 — Subir o código no GitHub

```bash
# Execute na raiz do projeto
git init
git add .
git commit -m "feat: configuração de deploy para Render"
# Crie um repositório no GitHub e conecte:
git remote add origin https://github.com/SEU_USUARIO/SEU_REPO.git
git push -u origin main
```

---

## Passo 2 — Banco de Dados

### Opção A: Render PostgreSQL (expira após 90 dias no free)

1. Render → **New → PostgreSQL**
2. Name: `jpmall-db` · Database: `jp_mall` · User: `postgres` · Plan: Free
3. Após criar, copie a **Internal Database URL**

### Opção B: Supabase (gratuito permanente — recomendado)

1. [supabase.com](https://supabase.com) → **New Project**
2. Settings → Database → copie a **Connection String (URI)**
3. Adicione `?sslmode=require` no final se não tiver

---

## Passo 3 — Inicializar o banco (rodar os SQLs em ordem)

```bash
DATABASE_URL="postgresql://user:senha@host:5432/jp_mall"

psql "$DATABASE_URL" -f database/001_schema.sql
psql "$DATABASE_URL" -f database/002_seed_stores.sql
psql "$DATABASE_URL" -f database/003_seed_notifications.sql
psql "$DATABASE_URL" -f database/004_claim_notifications.sql
```

> Via **Supabase SQL Editor**: cole o conteúdo de cada arquivo na ordem acima.

**Credencial padrão criada:** `gerente@flamboyant.com.br` / `admin123` — **troque após o primeiro login.**

---

## Passo 4 — Backend (Web Service via Docker)

### Configuração no Render

| Campo | Valor |
|-------|-------|
| **Name** | `jpmall-backend` |
| **Root Directory** | `backend` |
| **Runtime** | Docker |
| **Dockerfile Path** | `Dockerfile` *(auto-detectado em `backend/`)* |
| **Region** | mesma do banco |
| **Plan** | Free |

### Variáveis de Ambiente do Backend

| Variável | Valor | Obrigatório |
|----------|-------|:-----------:|
| `DATABASE_URL` | URL completa do banco (Render ou Supabase) | ✅ |
| `JWT_SECRET` | string aleatória longa e segura | ✅ |
| `ALLOWED_ORIGINS` | `https://jpmall-frontend.onrender.com` | ✅ |
| `JWT_EXPIRES_IN` | `24h` | ✅ |
| `DB_SSLMODE` | `require` | ✅ |
| `SMTP_ENABLED` | `false` | ✅ |

> **Gere um JWT_SECRET seguro:**
> ```bash
> openssl rand -base64 48
> ```

> **Nota:** `PORT` é injetado automaticamente pelo Render — não configure manualmente.

---

## Passo 5 — Frontend (Web Service via Docker)

### Configuração no Render

| Campo | Valor |
|-------|-------|
| **Name** | `jpmall-frontend` |
| **Root Directory** | `.` *(raiz do repositório)* |
| **Runtime** | Docker |
| **Dockerfile Path** | `Dockerfile` *(na raiz)* |
| **Region** | mesma dos outros |
| **Plan** | Free |

### Variáveis de Ambiente do Frontend

| Variável | Valor |
|----------|-------|
| `BACKEND_URL` | `https://jpmall-backend.onrender.com` |

> `BACKEND_URL` é usada em runtime pelo nginx para proxy de `/api/*` e `/uploads/*`.

### Build Arg (opcional — se o frontend precisar da URL no código JS)

| Build Arg | Valor |
|-----------|-------|
| `VITE_API_URL` | `https://jpmall-backend.onrender.com` |

---

## Passo 6 — Verificar o deploy

1. Acesse `https://jpmall-backend.onrender.com/api/health` → deve retornar `{"status":"ok",...}`
2. Acesse `https://jpmall-frontend.onrender.com` → tela de login
3. Login com `gerente@flamboyant.com.br` / `admin123`
4. Troque a senha no primeiro acesso

---

## Arquivos criados/alterados

| Arquivo | O que foi feito |
|---------|----------------|
| `Dockerfile` *(novo, raiz)* | Build de produção do frontend + nginx com `$PORT` |
| `nginx.render.conf` *(novo)* | Config nginx com `$PORT` e `$BACKEND_URL` dinâmicos |
| `backend/Dockerfile` | Adicionado healthcheck; EXPOSE mantido como documentação |
| `backend/config/config.go` | Backend lê `PORT` do Render antes de `BACKEND_PORT` |
| `backend/.dockerignore` | Exclui arquivos desnecessários do build |
| `.dockerignore` | Exclui `backend/`, `node_modules/`, `.git/` do build do frontend |

---

## Checklist

- [ ] Código no GitHub
- [ ] Banco criado e SQLs executados (001 → 004)
- [ ] Backend deployado com todas as variáveis
- [ ] `ALLOWED_ORIGINS` aponta para a URL exata do frontend (sem `/` no final)
- [ ] `DB_SSLMODE=require` configurado
- [ ] `JWT_SECRET` seguro gerado
- [ ] `/api/health` respondendo OK
- [ ] Frontend deployado com `BACKEND_URL` correto
- [ ] Login funcionando
- [ ] Senha admin trocada

---

## Troubleshooting

### "open Dockerfile: no such file or directory"
Verifique o **Root Directory** no Render:
- Backend → Root Directory deve ser `backend`
- Frontend → Root Directory deve ser `.` (raiz)

### Backend não conecta ao banco
- Confirme `DATABASE_URL` está correta e completa
- Confirme `DB_SSLMODE=require` (Render e Supabase exigem SSL)

### CORS bloqueando requisições
- `ALLOWED_ORIGINS` deve ser a URL exata do frontend, sem barra no final
- Após alterar variáveis, faça **Manual Deploy** no backend

### Frontend mostra tela em branco ou erro 502
- Confirme que `BACKEND_URL` aponta para o serviço de backend correto
- Verifique os logs do serviço frontend no Render

### Serviço "dormindo" (plano free)
O free tier dorme após 15 min sem requisições. Use [UptimeRobot](https://uptimerobot.com)
para pingar `/api/health` a cada 10 minutos e manter acordado.

---

## Limitação: Upload de Arquivos

O backend salva evidências em `./uploads/` no disco local.
No Render free, o **filesystem é efêmero** — arquivos somem a cada redeploy.

Solução futura: migrar para **Supabase Storage** ou **Cloudflare R2**.
