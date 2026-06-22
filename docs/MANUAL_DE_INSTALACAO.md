# Manual de Instalação — Flamboyant Shopping (Grupo 5)

Este manual cobre três formas de instalar o sistema. Escolha a que melhor se adequa ao seu ambiente:

| Opção | Quando usar |
|-------|-------------|
| **Opção A — Docker (banco) + código local** | Recomendado para desenvolvimento. Mais rápido de subir. |
| **Opção B — Docker completo** | Demonstrações e ambientes de produção simples. |
| **Opção C — Instalação manual (sem Docker)** | Quando Docker não está disponível. |

---

## Pré-requisitos por opção

### Opção A e B — com Docker

| Software | Versão | Windows | Linux |
|----------|--------|---------|-------|
| Docker Desktop | qualquer recente | [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) | ver abaixo |
| Git | qualquer | [git-scm.com](https://git-scm.com/downloads) | `sudo apt install git` |
| Go *(só opção A)* | 1.22+ | [go.dev/dl](https://go.dev/dl/) | ver abaixo |
| Node.js *(só opção A)* | 18+ | [nodejs.org](https://nodejs.org/) | ver abaixo |

### Opção C — sem Docker

| Software | Versão | Windows | Linux (Ubuntu/Debian) |
|----------|--------|---------|----------------------|
| Git | qualquer | [git-scm.com](https://git-scm.com/downloads) | `sudo apt install git` |
| Go | 1.22+ | [go.dev/dl](https://go.dev/dl/) | ver seção Linux abaixo |
| Node.js | 18+ | [nodejs.org](https://nodejs.org/) | ver seção Linux abaixo |
| PostgreSQL | 15+ | [postgresql.org/download/windows](https://www.postgresql.org/download/windows/) | `sudo apt install postgresql` |

---

## Passo 0 — Clonar o repositório (todas as opções)

```bash
git clone <url-do-repositorio>
cd CODIGO-main
```

> Substitua `<url-do-repositorio>` pela URL real do GitHub/GitLab fornecida pelo professor.

---

## Opção A — Docker (só banco) + código local

### Windows

Abra o **PowerShell** ou **CMD** na pasta do projeto.

```powershell
# 1. Subir apenas o banco de dados via Docker
docker-compose up -d db
# Aguarde a mensagem: "database system is ready to accept connections"
# O PostgreSQL fica disponível em localhost:5434 (porta externa do container)
# Confirme com: docker ps
# Deve aparecer: 0.0.0.0:5434->5432/tcp

# 2. Configurar o backend
cd backend
copy .env.example .env
# O .env.example já vem com DB_PORT=5434 (porta exposta pelo Docker)
# Abra backend\.env num editor e ajuste se necessário

# 3. Iniciar o backend — abra um novo terminal (PowerShell/CMD) em backend\
go mod download
go run main.go
# Deve aparecer: "JP Mall Backend (Go) rodando na porta 3001"

# 4. Iniciar o frontend — abra OUTRO terminal na raiz do projeto (CODIGO-main\)
npm install
npm run dev
# Deve aparecer: "Local: http://localhost:5173"
```

Acesse: **http://localhost:5173**

---

### Linux (Ubuntu / Debian)

```bash
# 1. Instalar Docker (se não tiver)
sudo apt update
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Adicionar seu usuário ao grupo docker (evita usar sudo)
sudo usermod -aG docker $USER
newgrp docker

# Instalar Go 1.22+
sudo apt install -y golang-go
# Se o apt oferecer versão < 1.22, instale manualmente:
# wget https://go.dev/dl/go1.22.0.linux-amd64.tar.gz
# sudo tar -C /usr/local -xzf go1.22.0.linux-amd64.tar.gz
# echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc && source ~/.bashrc

# Instalar Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 2. Subir apenas o banco via Docker
docker compose up -d db
# (versões mais antigas: docker-compose up -d db)
# Confirme a porta: docker ps — deve aparecer 0.0.0.0:5434->5432/tcp

# 3. Configurar o backend
cd backend
cp .env.example .env
# O .env.example já vem com DB_PORT=5434
# Edite se necessário: nano .env

# 4. Iniciar o backend (terminal 1, dentro de backend/)
go mod download
go run main.go

# 5. Iniciar o frontend (terminal 2, na raiz CODIGO-main/)
cd ..
npm install
npm run dev
```

Acesse: **http://localhost:5173**

---

## Opção B — Stack completo via Docker

Tudo (banco, backend, frontend) sobe com um único comando. **Esta é a forma recomendada para demonstração e entrega.**

### Windows e Linux

```bash
# Docker Compose v2 (recomendado):
docker compose up --build

# Docker Compose v1 (legacy):
docker-compose up --build

# Aguarde o build (~2–5 minutos na primeira vez)
```

| Serviço | URL |
|---------|-----|
| **Frontend** | http://localhost:5173 |
| **Backend health** | http://localhost:3001/api/health |
| **PostgreSQL (debug)** | `localhost:5434` (user: `postgres`, senha: `1806`, db: `jp_mall`) |

**Login padrão:** `gerente@flamboyant.com.br` / senha: `admin123`

Para parar:
```bash
docker compose down
```

Para resetar o banco (apaga tudo):
```bash
docker compose down -v
docker compose up --build
```

> **Nota:** não é necessário criar nenhum arquivo `.env` para esta opção — as variáveis já estão definidas no `docker-compose.yml`.

---

## Opção C — Instalação manual (sem Docker)

### Windows — passo a passo completo

#### 1. Instalar os pré-requisitos

- **Go 1.22+**: baixe o instalador `.msi` em [go.dev/dl](https://go.dev/dl/) e execute. Após instalar, feche e reabra o terminal.
- **Node.js 20 LTS**: baixe o instalador `.msi` em [nodejs.org](https://nodejs.org/) e execute.
- **PostgreSQL 16**: baixe o instalador em [postgresql.org/download/windows](https://www.postgresql.org/download/windows/). Durante a instalação:
  - Anote a **senha do usuário `postgres`** que você definir
  - Deixe a porta padrão **5432**
  - Marque para instalar o **pgAdmin** e as **Command Line Tools**

Verifique as instalações no PowerShell:
```powershell
go version        # deve mostrar go1.22 ou superior
node --version    # deve mostrar v18 ou superior
npm --version
psql --version    # deve mostrar 15 ou 16
```

> Se `psql` não for reconhecido, adicione `C:\Program Files\PostgreSQL\16\bin` ao PATH do Windows:
> Configurações → Sistema → Variáveis de Ambiente → Path → Novo

#### 2. Criar o banco de dados

Abra o **PowerShell** na pasta raiz do projeto (`CODIGO-main\`):

```powershell
# Criar o banco (vai pedir a senha do postgres que você definiu)
psql -U postgres -c "CREATE DATABASE jp_mall;"

# Executar as migrations em ordem
psql -U postgres -d jp_mall -f database\001_schema.sql
psql -U postgres -d jp_mall -f database\002_seed_stores.sql
psql -U postgres -d jp_mall -f database\003_seed_notifications.sql
psql -U postgres -d jp_mall -f database\004_claim_notifications.sql
```

Cada comando vai pedir a senha do postgres. Para não digitar a senha toda vez, crie o arquivo `%APPDATA%\postgresql\pgpass.conf` com o conteúdo:
```
localhost:5432:jp_mall:postgres:SUA_SENHA_AQUI
```

#### 3. Configurar o backend

```powershell
cd backend
copy .env.example .env
```

Abra `backend\.env` no Bloco de Notas ou VS Code e preencha:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=SUA_SENHA_DO_POSTGRES
DB_NAME=jp_mall
DB_SSLMODE=disable
BACKEND_PORT=3001
JWT_SECRET=qualquer_string_longa_e_unica_aqui
JWT_EXPIRES_IN=24h
SMTP_ENABLED=false
```

#### 4. Iniciar o backend

Em um terminal PowerShell dentro de `backend\`:

```powershell
go mod download
go run main.go
```

Saída esperada:
```
JP Mall Backend (Go) rodando na porta 3001
Base de dados: jp_mall
Health check: http://localhost:3001/api/health
```

#### 5. Iniciar o frontend

Em **outro** terminal PowerShell na raiz `CODIGO-main\`:

```powershell
npm install
npm run dev
```

Saída esperada:
```
  VITE v6.x.x  ready in xxx ms
  ➜  Local:   http://localhost:5173/
```

Acesse: **http://localhost:5173**

---

### Linux (Ubuntu / Debian) — passo a passo completo

#### 1. Instalar os pré-requisitos

```bash
sudo apt update && sudo apt upgrade -y

# PostgreSQL 16
sudo apt install -y postgresql postgresql-contrib

# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Go 1.22+ (via snap — mais fácil de manter atualizado)
sudo snap install go --classic
# OU via tarball:
# wget https://go.dev/dl/go1.22.0.linux-amd64.tar.gz
# sudo tar -C /usr/local -xzf go1.22.0.linux-amd64.tar.gz
# echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
# source ~/.bashrc
```

Verifique:
```bash
go version     # go1.22 ou superior
node --version # v18 ou superior
psql --version # 15 ou 16
```

#### 2. Configurar o PostgreSQL

No Linux, o PostgreSQL usa autenticação por sistema operacional para o usuário `postgres`. Existem duas formas de trabalhar:

**Forma 1 — Criar usuário com senha (recomendado)**:
```bash
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'admin123';"
```

**Forma 2 — Usar o usuário postgres diretamente** (sem senha, só localmente):
```bash
# Nesse caso deixe DB_PASSWORD= vazio no .env
sudo -u postgres psql
```

#### 3. Criar o banco de dados

Na pasta raiz do projeto (`CODIGO-main/`):

```bash
# Se definiu senha (Forma 1):
psql -U postgres -c "CREATE DATABASE jp_mall;"
psql -U postgres -d jp_mall -f database/001_schema.sql
psql -U postgres -d jp_mall -f database/002_seed_stores.sql
psql -U postgres -d jp_mall -f database/003_seed_notifications.sql
psql -U postgres -d jp_mall -f database/004_claim_notifications.sql

# Se usar autenticação por SO (Forma 2):
sudo -u postgres psql -c "CREATE DATABASE jp_mall;"
sudo -u postgres psql -d jp_mall -f database/001_schema.sql
sudo -u postgres psql -d jp_mall -f database/002_seed_stores.sql
sudo -u postgres psql -d jp_mall -f database/003_seed_notifications.sql
sudo -u postgres psql -d jp_mall -f database/004_claim_notifications.sql
```

#### 4. Configurar o backend

```bash
cd backend
cp .env.example .env
nano .env   # ou: code .env  /  gedit .env
```

Preencha o arquivo:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=admin123   # vazio se usou Forma 2
DB_NAME=jp_mall
DB_SSLMODE=disable
BACKEND_PORT=3001
JWT_SECRET=qualquer_string_longa_e_unica_aqui
JWT_EXPIRES_IN=24h
SMTP_ENABLED=false
```

#### 5. Iniciar o backend

**Terminal 1** (dentro de `backend/`):
```bash
go mod download
go run main.go
```

#### 6. Iniciar o frontend

**Terminal 2** (na raiz `CODIGO-main/`):
```bash
npm install
npm run dev
```

Acesse: **http://localhost:5173**

---

## Credenciais padrão

Criadas automaticamente pelo `001_schema.sql`:

| Campo | Valor |
|-------|-------|
| E-mail | `gerente@flamboyant.com.br` |
| Senha | `admin123` |

> Troque a senha em qualquer ambiente que não seja de desenvolvimento local.

---

## Estrutura do banco de dados

### Scripts SQL (execute na ordem)

| Arquivo | O que faz |
|---------|-----------|
| `001_schema.sql` | Cria todas as tabelas + usuário padrão |
| `002_seed_stores.sql` | Insere as ~290 lojas do Flamboyant |
| `003_seed_notifications.sql` | Mantém a tabela `notifications` vazia (notificações demo comentadas) |
| `004_claim_notifications.sql` | Adiciona `email`/`phone` em `stores`; cria `claim_notifications` |

### Tabelas

| Tabela | Descrição |
|--------|-----------|
| `users` | Usuários do sistema (e-mail + hash bcrypt) |
| `stores` | Lojas (código, nome, segmento, e-mail, telefone) |
| `claims_v2` | Sinistros / ocorrências |
| `claim_stores` | Relação N:N entre sinistros e lojas |
| `notifications` | Notificações do painel (sino) |
| `claim_notifications` | Histórico de notificações enviadas por sinistro |

---

## Variáveis de ambiente (`backend/.env`)

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `DB_HOST` | Host do PostgreSQL | `localhost` |
| `DB_PORT` | Porta do PostgreSQL | `5434` (Docker) / `5432` (local) |
| `DB_USER` | Usuário do banco | `postgres` |
| `DB_PASSWORD` | Senha do banco | — |
| `DB_NAME` | Nome do banco | `jp_mall` |
| `DB_SSLMODE` | SSL (`disable` em dev) | `disable` |
| `BACKEND_PORT` | Porta do servidor Go | `3001` |
| `JWT_SECRET` | Segredo para tokens JWT | — (obrigatório) |
| `JWT_EXPIRES_IN` | Validade do token | `24h` |
| `SMTP_ENABLED` | Ativa envio real de e-mail | `false` |
| `SMTP_HOST` | Servidor SMTP | `smtp.gmail.com` |
| `SMTP_PORT` | Porta SMTP | `587` |
| `SMTP_USER` | Login do remetente | — |
| `SMTP_PASSWORD` | Senha de app do remetente | — |
| `SMTP_FROM` | Endereço exibido como remetente | `sinistros@flamboyant.com.br` |

> Com `SMTP_ENABLED=false` (padrão), notificações por e-mail são registradas no banco com status `simulated`. O WhatsApp funciona via link — nenhuma configuração extra é necessária.

---

## Arquivos de assets necessários

Os arquivos abaixo já devem estar no repositório:

| Arquivo | Localização |
|---------|-------------|
| Logo do shopping (PDF/relatórios) | `backend/assets/logo-flamboyant.png` |
| Fonte Roboto Regular | `backend/assets/fonts/Roboto-Regular.ttf` |
| Fonte Roboto Bold | `backend/assets/fonts/Roboto-Bold.ttf` |
| Logo (frontend) | `src/assets/flamboyant-logo.png` |
| Favicon | `public/favicon.png` |

---

## Limpeza manual de dados (opcional)

### Limpar notificações acumuladas

```sql
-- Conecte ao banco (psql ou DBeaver) e execute:
DELETE FROM notifications;
```

### Limpar sinistros de teste

```sql
DELETE FROM claims_v2;
DELETE FROM claim_notifications;
```

> Use apenas em ambiente de desenvolvimento. Não execute em produção sem backup.

---

## Verificação após instalação

Acesse `http://localhost:5173` e verifique:

1. **Login** com `gerente@flamboyant.com.br` / `admin123`
2. **Dashboard** carrega dados reais do PostgreSQL
3. **Sinistros → Novo Sinistro** — registre uma ocorrência de teste
4. **Sinistros → Relatórios** — exporte um PDF
5. **Detalhe de um sinistro → aba Notificações** — clique em "Abrir WhatsApp"

### Teste de saúde do backend

```bash
curl http://localhost:3001/api/health
```

Resposta esperada:
```json
{"database":"jp_mall","status":"ok","timestamp":"2025-..."}
```

---

## Solução de problemas

### "psql não é reconhecido" (Windows)
Adicione `C:\Program Files\PostgreSQL\16\bin` ao PATH:
> Painel de Controle → Sistema → Variáveis de Ambiente → Path → Editar → Novo

### "go: command not found" (Linux)
```bash
source ~/.bashrc
# ou, se instalou via /usr/local:
export PATH=$PATH:/usr/local/go/bin
```

### "connection refused" ao conectar no banco
- Verifique se o PostgreSQL está rodando:
  - Windows: Serviços (`services.msc`) → PostgreSQL 16
  - Linux: `sudo systemctl status postgresql`
- Verifique se `DB_PASSWORD` no `.env` corresponde à senha do postgres

### "port 5432 already in use" (Docker)
Outro processo (PostgreSQL local) já usa a porta. Pare o serviço local antes de subir o Docker:
```bash
# Windows (PowerShell admin)
Stop-Service -Name "postgresql-x64-16"

# Linux
sudo systemctl stop postgresql
```

### "port 3001 already in use"
Mate o processo anterior:
```bash
# Linux / Git Bash
lsof -ti:3001 | xargs kill -9

# Windows (PowerShell)
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

### Frontend mostra "Erro ao carregar dados"
O backend ainda não subiu ou está em outra porta. Verifique:
```bash
curl http://localhost:3001/api/health
```
Se falhar, reinicie o backend.

### Migrations: "relation already exists"
Os scripts são **idempotentes** — podem ser executados várias vezes sem erro. Se aparecer uma mensagem de aviso (não erro), é normal.

---

## Resetar o banco de dados

### Com Docker (apaga TODOS os dados):
```bash
docker-compose down -v      # remove o volume
docker-compose up -d db     # recria do zero com as migrations
```

### Sem Docker:
```bash
# Linux
sudo -u postgres psql -c "DROP DATABASE IF EXISTS jp_mall;"
sudo -u postgres psql -c "CREATE DATABASE jp_mall;"
sudo -u postgres psql -d jp_mall -f database/001_schema.sql
sudo -u postgres psql -d jp_mall -f database/002_seed_stores.sql
sudo -u postgres psql -d jp_mall -f database/003_seed_notifications.sql
sudo -u postgres psql -d jp_mall -f database/004_claim_notifications.sql

# Windows (PowerShell)
psql -U postgres -c "DROP DATABASE IF EXISTS jp_mall;"
psql -U postgres -c "CREATE DATABASE jp_mall;"
psql -U postgres -d jp_mall -f database\001_schema.sql
psql -U postgres -d jp_mall -f database\002_seed_stores.sql
psql -U postgres -d jp_mall -f database\003_seed_notifications.sql
psql -U postgres -d jp_mall -f database\004_claim_notifications.sql
```
