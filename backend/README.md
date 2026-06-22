# Backend (Go)

Prerequisites: Go 1.20+, Docker (optional)

Development (local):

1. Run Postgres + pgAdmin + backend with Docker Compose:

```bash
docker-compose up --build
```

2. Backend will listen on `http://localhost:8080` and pgAdmin on `http://localhost:5050` (login: admin@admin.com / admin).

3. Frontend dev server proxies `/api` to `http://localhost:8080` (see `vite.config.ts`).

To run backend locally without Docker:

```bash
cd backend
go run .
```
