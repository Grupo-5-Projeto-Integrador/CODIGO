# ── Estágio 1: build do React/Vite ───────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --silent

COPY . .

# VITE_API_URL é injetado no build para que o frontend saiba a URL do backend
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ── Estágio 2: nginx servindo o dist + proxy /api ─────────────────────────────
FROM nginx:alpine

# gettext fornece envsubst para substituir variáveis no nginx.render.conf
RUN apk add --no-cache gettext

RUN rm /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html

# Usa a config separada para Render (suporte a $PORT e $BACKEND_URL)
COPY nginx.render.conf /etc/nginx/conf.d/default.conf.template

# Render injeta PORT em runtime; substitui no template antes de iniciar o nginx.
# BACKEND_HOST é derivado de BACKEND_URL (remove o scheme) para uso no SNI.
CMD ["/bin/sh", "-c", \
  "export PORT=${PORT:-80} BACKEND_URL=${BACKEND_URL:-http://localhost:3001}; \
   export BACKEND_HOST=${BACKEND_HOST:-$(echo $BACKEND_URL | sed 's|.*://||' | cut -d/ -f1)}; \
   envsubst '${PORT} ${BACKEND_URL} ${BACKEND_HOST}' \
     < /etc/nginx/conf.d/default.conf.template \
     > /etc/nginx/conf.d/default.conf && \
   nginx -g 'daemon off;'"]
