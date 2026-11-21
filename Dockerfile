# ====================================================================
# Dockerfile Multi-Stage: Frontend (Next.js) + Backend (Node.js/Express)
# Between Letters — Hardened Non-Root Runtime
# ====================================================================

# Stage 1: Build Next.js Frontend (Static Export)
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install --legacy-peer-deps

COPY frontend/ ./
ENV NODE_OPTIONS="--max-old-space-size=2048"
RUN npm run build

# Stage 2: Hardened Non-Root Backend Runtime
FROM node:20-slim AS runtime
WORKDIR /app/backend

ENV PORT=3000
ENV NODE_ENV=production

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/ ./
COPY --from=frontend-builder /app/frontend/out ./public
COPY avatar-base /app/avatar-base

RUN chown -R node:node /app
USER node

EXPOSE 3000

CMD ["node", "server.js"]
