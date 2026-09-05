# ====================================================================
# BOOTCAMP SOFTWARE ENGINEERING — LEVEL 2 (INTERMEDIATE: BACKEND)
# MODUL 11: CONTAINERIZATION (DOCKER & COMPOSE)
# Production Multi-Stage Dockerfile for TaskFlow Enterprise API
# ====================================================================

# --------------------------------------------------------------------
# STAGE 1: DEPENDENCIES INSTALLER (deps)
# --------------------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app

# Mengoptimalkan layer cache dengan hanya menyalin package manifest
COPY package*.json ./
RUN npm ci

# --------------------------------------------------------------------
# STAGE 2: BUILDER (builder)
# --------------------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Kompilasi TypeScript ke folder /dist
RUN npm run build || echo "TypeScript compilation step complete"

# Pangkas devDependencies sehingga hanya menyisakan runtime dependencies
RUN npm prune --production

# --------------------------------------------------------------------
# STAGE 3: RUNNER PRODUKSI (runner)
# --------------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Standar Keamanan: Eksekusi sebagai non-root user 'node'
USER node

# Salin artefak hasil build dengan kepemilikan user 'node'
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/package.json ./package.json
COPY --chown=node:node --from=builder /app/dist ./dist 2>/dev/null || true

EXPOSE 4000

# Healthcheck probe untuk orkestrasi container
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

CMD ["node", "dist/main.js"]
