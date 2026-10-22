# ====================================================================
# Dockerfile Multi-Stage: Frontend (Next.js) + Backend (Node.js/Express)
# Entre Cartas — Arquivo Epistolar — Professor @siriani
# ====================================================================

# Estágio 1: Build do Frontend Next.js (Static Export)
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install --legacy-peer-deps

COPY frontend/ ./
ENV NODE_OPTIONS="--max-old-space-size=2048"
RUN npm run build

# Estágio 2: Ambiente de Execução do Backend Node.js
FROM node:20-slim AS runtime
WORKDIR /app

# Instalação de dependências do backend
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm install --omit=dev

# Copia o código fonte do backend
COPY backend/ ./

# Copia os arquivos estáticos exportados do Next.js para a pasta pública do backend
COPY --from=frontend-builder /app/frontend/out ./public

# Define variáveis padrão
ENV PORT=3000
ENV NODE_ENV=production

# Expõe a porta de execução
EXPOSE 3000

# Inicializa o servidor
CMD ["node", "server.js"]
