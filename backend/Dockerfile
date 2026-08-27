# ==========================================
# HYVORA EduERP Backend - Production Dockerfile
# ==========================================

# STAGE 1: Build Application & Prisma Engine
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies required for native Node bindings
RUN apk add --no-cache openssl python3 make g++

# Copy package manifests and Prisma schema
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

# Copy source code and generate Prisma Client
COPY . .
RUN npx prisma generate
RUN npm run build

# STAGE 2: Production Minimal Runtime Image
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3002

# Install OpenSSL & wget for Prisma engine and health checks
RUN apk add --no-cache openssl wget

# Copy package manifests and install production-only dependencies
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --only=production && npm cache clean --force

# Copy Prisma engine artifacts and compiled NestJS code from builder stage
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/dist ./dist

EXPOSE 3002

# Health check endpoint verification
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-3002}/api/v1/health || exit 1

# Launch NestJS production application
CMD ["node", "dist/src/main.js"]
