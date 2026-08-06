# =============================================================================
# Multi-stage: build do Next.js + imagem final só com o necessário para rodar
# =============================================================================

# --- Stage 1: dependências ---
FROM node:20-alpine AS deps
WORKDIR /app

# libc6-compat evita problemas de libs nativas no Alpine
RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
RUN npm ci

# --- Stage 2: build ---
FROM node:20-alpine AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* é embutido no JS no momento do build — passe no docker build
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
ARG NEXT_PUBLIC_DEBUG_MODE=false
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_DEBUG_MODE=$NEXT_PUBLIC_DEBUG_MODE

# Desliga telemetria do Next durante o build
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# --- Stage 3: runtime (Node rodando o servidor standalone) ---
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# standalone já traz um node_modules mínimo + server.js
COPY --from=build /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
