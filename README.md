# Grupo 5 — Flamboyant Shopping
## Sistema de Gestão de Sinistros

Sistema integrado de gestão de ocorrências e sinistros do Flamboyant Shopping Center.

**Stack:** React 18 + Vite + TypeScript · Go 1.25 + Chi + pgx/v5 · PostgreSQL 16

---

## Rodar com Docker (recomendado)

> **Pré-requisito único:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado.

```bash
# Clona o repositório
git clone <url-do-repositorio>
cd CODIGO-main

# Sobe tudo (banco + backend + frontend)
docker compose up --build
# ou, se usar versão mais antiga do Docker:
docker-compose up --build
```

Aguarde o build (~2–5 minutos na primeira vez). Depois acesse:

| Serviço | URL |
|---------|-----|
| **Frontend** | http://localhost:5173 |
| **Backend (health)** | http://localhost:3001/api/health |
| **PostgreSQL (debug/pgAdmin)** | `localhost:5434` (user: `postgres`, db: `jp_mall`, senha: definida no `.env`) |

**Login padrão:** `gerente@flamboyant.com.br` / senha: `admin123`

> Não é necessário criar nenhum arquivo `.env` para o Docker Compose — as variáveis já estão definidas no `docker-compose.yml`.

---

## Parar e resetar

```bash
# Parar sem apagar dados
docker compose down

# Resetar banco (apaga TODOS os dados e recria do zero)
docker compose down -v
docker compose up --build
```

---

## Desenvolvimento local (banco Docker + backend/frontend no host)

```bash
# Terminal 1 — só o banco
docker compose up -d db

# Terminal 2 — backend Go
cd backend
cp .env.example .env   # Linux/Mac
# copy .env.example .env  # Windows
go mod download
go run main.go          # porta 3001

# Terminal 3 — frontend
npm install
npm run dev             # http://localhost:5173
```

Para este cenário use `DB_HOST=localhost` e `DB_PORT=5434` no `backend/.env`.

---

## Instalação sem Docker

Veja: [docs/MANUAL_DE_INSTALACAO.md](docs/MANUAL_DE_INSTALACAO.md)

---

## Portas

| Porta | Serviço |
|-------|---------|
| `5173` | Frontend (nginx no Docker / Vite em dev) |
| `3001` | Backend Go |
| `5434` | PostgreSQL exposto no host (interno: `db:5432`) |
