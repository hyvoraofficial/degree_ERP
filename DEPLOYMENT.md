# Production Deployment Guide: HYVORA Degree College EduERP

This guide provides the complete, production-grade instructions for deploying the **HYVORA Degree College EduERP** multi-tenant educational ERP system using Docker Compose, dedicated Supabase PostgreSQL, and Nginx reverse proxy with SSL.

---

## 1. System Architecture & Dual-Product Port Isolation

The HYVORA platform operates two distinct, independently deployable SaaS products. They can run on separate cloud servers or coexist cleanly on the same physical host without port, network, or database collision.

| Component | Product 1: Academy EduERP (JEE/NEET) | Product 2: Degree College EduERP |
|---|---|---|
| **Compose Project Name** | `hyvora-academy` (or legacy default) | `hyvora-degree` |
| **Frontend Container** | `hyvora-frontend` | `hyvora-degree-frontend` |
| **Backend Container** | `hyvora-backend` | `hyvora-degree-backend` |
| **Docker Network** | `hyvora-network` | `hyvora-degree-network` |
| **Frontend Host Port** | `3001` | `3003` |
| **Backend Host Port** | `3002` | `3004` |
| **Database** | Supabase Project A (`hyvora_eduerp`) | Dedicated Supabase Project B (`eduERP_degree`) |
| **Object Storage** | `hyvora-academy-storage` | `hyvora-degree-storage` |
| **Production Web Domain** | `eduerp.hyvora.in` / `*.hyvora.in` | `degree.hyvora.in` / `*.degree.hyvora.in` |
| **Production API Domain** | `api.eduerp.hyvora.in` | `api.degree.hyvora.in` |

---

## 2. Environment Variables Specification

### Backend Service (`backend/.env`)

Create `backend/.env` with your dedicated Degree College production credentials:

```env
NODE_ENV=production
PORT=3002

# Supabase PostgreSQL Connection Strings (Dedicated Degree College Supabase Instance)
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[DB_PASSWORD]@[POOLER_HOST]:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[PROJECT_REF]:[DB_PASSWORD]@[POOLER_HOST]:5432/postgres"

# Supabase API Credentials & Storage
SUPABASE_URL="https://[PROJECT_REF].supabase.co"
SUPABASE_ANON_KEY="[ANON_KEY]"
SUPABASE_SERVICE_ROLE_KEY="[SERVICE_ROLE_KEY]"

# Security & CORS
JWT_SECRET="[SECURE_64_CHARACTER_RANDOM_JWT_SECRET]"
CORS_ORIGINS="http://localhost:3003,https://degree.hyvora.in,https://*.degree.hyvora.in,https://*.hyvora.in"
ENABLE_SWAGGER=true
```

### Frontend Service (`frontend/.env.local`)

```env
# Degree College API Gateway
NEXT_PUBLIC_API_URL=https://api.degree.hyvora.in/api/v1
NEXT_PUBLIC_APP_DOMAIN=degree.hyvora.in

# Supabase Client Credentials (Public Anon Key only)
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT_REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[ANON_KEY]
```

---

## 3. Production Database Migration Flow

Follow this exact sequence for applying database migrations safely without data loss:

### Step 1: Verify Environment
Ensure `DATABASE_URL` and `DIRECT_URL` in `backend/.env` point exclusively to the dedicated Degree College Supabase database.

### Step 2: Apply Prisma Migrations
Run Prisma's official production migration command:
```bash
cd backend
npx prisma migrate deploy
```
> [!IMPORTANT]
> Always use `npx prisma migrate deploy` in production. Do NOT use `npx prisma db push` or `prisma migrate reset` in production, as those can drop existing schemas or cause data loss.

### Step 3: Run Seed Data (Explicit & Idempotent)
Populate initial academic entities (HITM institution, departments, degree programs, semesters, faculty, students, timetables, UGC grading scales, fees, placements, etc.):
```bash
npm run seed
```
> [!NOTE]
> The seed script is completely idempotent. It uses upserts and unique code identifiers so running it multiple times will not create duplicate records.

---

## 4. Docker Deployment Workflow

### Step 1: Build Docker Images
Build both backend and frontend images under the `hyvora-degree` project namespace:
```bash
docker compose -p hyvora-degree build --no-cache
```

### Step 2: Start Services in Background
```bash
docker compose -p hyvora-degree up -d
```

### Step 3: Verify Container Health
```bash
docker compose -p hyvora-degree ps
```

Expected output:
```
NAME                     COMMAND                  SERVICE    STATUS              PORTS
hyvora-degree-backend    "node dist/src/main.…"   backend    running (healthy)   0.0.0.0:3004->3002/tcp
hyvora-degree-frontend   "node server.js"         frontend   running (healthy)   0.0.0.0:3003->3001/tcp
```

### Step 4: Validate Health Endpoints
- **Backend API Health**:
  ```bash
  curl http://localhost:3004/api/v1/health
  # Response: {"status":"up","database":"connected","timestamp":"..."}
  ```
- **Frontend HTTP Check**:
  ```bash
  curl -I http://localhost:3003/
  # Response: HTTP/1.1 200 OK
  ```

---

## 5. Nginx Reverse Proxy & SSL Configuration

Below is the production Nginx reverse proxy configuration for routing traffic from `degree.hyvora.in` and `api.degree.hyvora.in` to the Degree College Docker containers.

Create `/etc/nginx/sites-available/degree.hyvora.in`:

```nginx
# ==========================================
# 1. Degree College API Gateway (api.degree.hyvora.in) -> Host Port 3004
# ==========================================
server {
    listen 80;
    server_name api.degree.hyvora.in;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.degree.hyvora.in;

    ssl_certificate /etc/letsencrypt/live/degree.hyvora.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/degree.hyvora.in/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3004;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90s;
    }
}

# ==========================================
# 2. Degree College Frontend Application (degree.hyvora.in / *.degree.hyvora.in) -> Host Port 3003
# ==========================================
server {
    listen 80;
    server_name degree.hyvora.in *.degree.hyvora.in;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name degree.hyvora.in *.degree.hyvora.in;

    ssl_certificate /etc/letsencrypt/live/degree.hyvora.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/degree.hyvora.in/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        proxy_pass http://127.0.0.1:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site and reload Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/degree.hyvora.in /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Obtain Let's Encrypt SSL Certificates:
```bash
sudo certbot --nginx -d degree.hyvora.in -d "*.degree.hyvora.in" -d api.degree.hyvora.in
```

---

## 6. Zero-Downtime Maintenance & Commands

| Task | Command |
|---|---|
| **View Logs (Both Services)** | `docker compose -p hyvora-degree logs -f` |
| **View Backend Logs** | `docker compose -p hyvora-degree logs -f backend` |
| **View Frontend Logs** | `docker compose -p hyvora-degree logs -f frontend` |
| **Restart Degree Services** | `docker compose -p hyvora-degree restart` |
| **Stop Degree Services** | `docker compose -p hyvora-degree down` |
| **Update / Rebuild** | `docker compose -p hyvora-degree up -d --build` |
