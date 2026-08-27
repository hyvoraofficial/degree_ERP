# ==========================================
# HYVORA EduERP Frontend - Multi-stage Production Dockerfile
# ==========================================

# STAGE 1: Dependency Installation
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# STAGE 2: Application Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Accept client environment variable at build time
ARG NEXT_PUBLIC_API_URL=http://localhost:3002/api/v1
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

ENV NODE_ENV=production
RUN npm run build

# STAGE 3: Production Minimal Runtime Image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

RUN apk add --no-cache wget

# Create non-root user for container security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy static assets and compiled standalone server
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3001

HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/ || exit 1

CMD ["node", "server.js"]
