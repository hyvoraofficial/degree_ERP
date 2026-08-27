# Production Deployment Guide: HYVORA EduERP

This guide provides complete, production-grade instructions for deploying the **HYVORA EduERP** multi-tenant educational ERP system.

---

## 1. System Requirements & Architecture

HYVORA EduERP is built using a modern decoupled architecture:
- **Backend**: NestJS (TypeScript, Node.js v20+) with Prisma ORM.
- **Frontend**: Next.js 16 (App Router, Turbopack, React 19).
- **Database**: PostgreSQL 15+ with multi-tenant schema isolation.
- **Process Manager**: PM2 or Docker / Docker Compose.
- **Reverse Proxy / SSL**: Nginx with Let's Encrypt Certbot.

---

## 2. Environment Variables Matrix

### Root / Infrastructure (`.env`)

| Variable Name | Required | Default / Example | Purpose |
|---|---|---|---|
| `NODE_ENV` | Yes | `production` | Specifies deployment environment. |
| `PORT` | Yes | `3002` | Port on which the NestJS backend listens. |
| `DATABASE_URL` | Yes | `postgresql://user:pass@localhost:5432/hyvora_eduerp` | PostgreSQL production connection string. |
| `JWT_SECRET` | Yes | `<secure_64_char_random_string>` | Secret key used for signing JWT auth tokens. |
| `CORS_ORIGINS` | Yes | `https://app.hyvora.io,https://*.hyvora.io` | Comma-separated allowed frontend origins. |
| `STORAGE_BUCKET_URL` | Yes | `https://storage.hyvora.io` | S3 / Supabase object storage endpoint. |

### Backend Service (`backend/.env`)

```env
NODE_ENV=production
PORT=3002
DATABASE_URL=postgresql://db_user:db_password@localhost:5432/hyvora_eduerp?schema=public&connection_limit=20
JWT_SECRET=super_secret_production_jwt_signing_key_hyvora
CORS_ORIGINS=https://app.hyvora.io,https://*.hyvora.io,http://localhost:3000,http://localhost:3001
STORAGE_BUCKET_URL=https://storage.hyvora.io
STORAGE_BUCKET_NAME=hyvora-erp-storage
ENABLE_SWAGGER=false
```

### Frontend Service (`frontend/.env.local`)


```env
NEXT_PUBLIC_API_URL=https://api.hyvora.io/api/v1
```

---

## 3. Database Setup & Prisma Migrations

1. Ensure PostgreSQL service is running and database exists:
   ```bash
   createdb hyvora_eduerp
   ```

2. Run production schema sync and client generation:
   ```bash
   cd backend
   npx prisma generate
   npx prisma db push --accept-data-loss
   ```

3. Seed Initial Demo Tenant Data (Optional):
   ```bash
   psql -d hyvora_eduerp -f ../database/seeds/01_hyvora_academy_seed.sql
   ```

---

## 4. Building for Production

### Backend (NestJS)

```bash
cd backend
npm ci
npm run build
```
This generates the optimized JavaScript bundle inside `backend/dist/`.

### Frontend (Next.js)

```bash
cd frontend
npm ci
npm run build
```
This generates the optimized Next.js production build inside `frontend/.next/`.

---

## 5. Production Process Management (PM2)

Create an `ecosystem.config.js` file in the root directory:

```javascript
module.exports = {
  apps: [
    {
      name: 'hyvora-backend',
      cwd: './backend',
      script: 'dist/src/main.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      }
    },
    {
      name: 'hyvora-frontend',
      cwd: './frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3001',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    }
  ]
};
```

Start applications with PM2:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## 6. Docker Deployment (Optional)

### `docker-compose.yml`

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: hyvora-postgres
    restart: always
    environment:
      POSTGRES_DB: hyvora_eduerp
      POSTGRES_USER: hyvora_user
      POSTGRES_PASSWORD: secure_db_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: hyvora-backend
    restart: always
    environment:
      NODE_ENV: production
      PORT: 3002
      DATABASE_URL: postgresql://hyvora_user:secure_db_password@postgres:5432/hyvora_eduerp
      JWT_SECRET: super_secret_production_jwt_signing_key_hyvora
      CORS_ORIGINS: https://*.hyvora.io,https://app.hyvora.io
    ports:
      - "3002:3002"
    depends_on:
      - postgres

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: hyvora-frontend
    restart: always
    environment:
      NEXT_PUBLIC_API_URL: https://api.hyvora.io/api/v1
    ports:
      - "3001:3001"
    depends_on:
      - backend

volumes:
  postgres_data:
```

---

## 7. Nginx Reverse Proxy Setup & Wildcard Subdomain SSL

Below is a production Nginx server block supporting multi-tenant subdomains (`demo.hyvora.io`, `app.hyvora.io`):

```nginx
# API Backend Proxy
server {
    listen 80;
    server_name api.hyvora.io;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.hyvora.io;

    ssl_certificate /etc/letsencrypt/live/hyvora.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hyvora.io/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Frontend Application Proxy (Multi-Tenant Wildcard Subdomains)
server {
    listen 80;
    server_name *.hyvora.io hyvora.io;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name *.hyvora.io hyvora.io;

    ssl_certificate /etc/letsencrypt/live/hyvora.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hyvora.io/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 8. Verification Checklist

Before opening the platform for client testing:
- [x] Production builds pass with zero errors (`npm run build` in backend and frontend).
- [x] Environment variables verified across backend and frontend.
- [x] CORS origin validation enabled for tenant subdomains.
- [x] Database migration applied cleanly (`npx prisma db push`).
- [x] API URL configured dynamically via `NEXT_PUBLIC_API_URL`.
- [x] Security headers (`X-Frame-Options`, `HSTS`, `X-Content-Type-Options`) active on frontend & backend.
