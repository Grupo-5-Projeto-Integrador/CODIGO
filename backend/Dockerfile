# ── Estágio 1: build ─────────────────────────────────────────────────────────
FROM golang:1.25-alpine AS builder

ENV GOTOOLCHAIN=local

WORKDIR /app

RUN apk add --no-cache git

# Copia dependências primeiro para aproveitar cache do Docker
COPY go.mod go.sum ./
RUN go mod download

# Copia o código-fonte
COPY . .

# Compila o binário estático
RUN CGO_ENABLED=0 GOOS=linux go build -o /backend .

# ── Estágio 2: imagem final mínima ────────────────────────────────────────────
FROM alpine:3.19

WORKDIR /app

# Certificados TLS para HTTPS externo e curl para healthcheck
RUN apk add --no-cache ca-certificates curl

# Copia o binário compilado
COPY --from=builder /backend ./backend

# Copia assets necessários para geração de PDF (fontes + logo)
COPY assets/ ./assets/

# Render injeta PORT em runtime; EXPOSE é apenas documentação
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT:-3001}/api/health || exit 1

CMD ["./backend"]
