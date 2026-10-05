# Production Storage, Infrastructure & Deployment Hardening

## Overview
This document details the production infrastructure, security controls, database configurations, object storage architecture, backup/recovery strategies, and deployment runbooks for the Digital Marketplace.

---

## 1. Database Architecture & PostgreSQL Hardening

### Connection Pooling & SSL
Production deployments should connect through a pooled proxy (such as PgBouncer, AWS RDS Proxy, Supabase Pooler, or Neon Connection Pooler) to avoid exhausting database connection limits during traffic spikes.

- **SSL Requirement**: Enforce `sslmode=require` or `sslmode=verify-full` in `DATABASE_URL`.
- **PgBouncer Pooling**: Append `&pgbouncer=true&connection_limit=20` to the query string:
  ```env
  DATABASE_URL="postgresql://marketplace_user:PASSWORD@db-pooler.internal:5432/digital_marketplace?schema=public&sslmode=require&pgbouncer=true&connection_limit=20"
  ```
- **Direct Connection for Migrations**: When running migrations, connect directly to port 5432 (bypassing transaction-mode poolers):
  ```env
  DIRECT_URL="postgresql://marketplace_user:PASSWORD@db-instance.internal:5432/digital_marketplace?schema=public&sslmode=require"
  ```

### Least-Privilege Database User
Create a dedicated application role with access restricted exclusively to the marketplace schema:
```sql
-- 1. Create dedicated application user
CREATE USER marketplace_app WITH ENCRYPTED PASSWORD 'REPLACE_WITH_STRONG_PASSWORD';

-- 2. Grant connection rights to the target database
GRANT CONNECT ON DATABASE digital_marketplace TO marketplace_app;

-- 3. Grant schema usage and table privileges
GRANT USAGE ON SCHEMA public TO marketplace_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO marketplace_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO marketplace_app;

-- 4. Automatically grant on future tables created by migrations
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO marketplace_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO marketplace_app;

-- 5. Revoke administrative/superuser privileges
REVOKE CREATE ON SCHEMA public FROM marketplace_app;
```

### Migration Execution Strategy
- Run migrations during deployment pipelines using `npx prisma migrate deploy`.
- **NEVER** run `prisma db push` or destructive commands (`migrate reset`, `drop schema`) in production.
- Keep schema indexes and composite indexes synchronized with `prisma/schema.prisma`.

---

## 2. Private Object Storage (Cloudflare R2 / AWS S3)

The marketplace utilizes an abstract `StorageProvider` interface (`src/lib/storage/storage-provider.ts`). In production, this resolves to `S3StorageProvider` (`src/lib/storage/s3-storage-provider.ts`), supporting Cloudflare R2, AWS S3, and MinIO.

### Bucket Privacy & Access Control
1. **Public Access Block**:
   - Enable **Block all public access** on the S3/R2 bucket.
   - No public ACLs (`public-read`, `public-read-write`) are permitted.
   - All files (products, seller assets, receipts, and templates) are completely private.
2. **Presigned Upload URLs (PUT)**:
   - Server validates seller authentication, ownership of product, file type/size, and generates a random collision-resistant key (`products/<productId>/<randomHex>/file.<ext>`).
   - Generates AWS Signature Version 4 presigned PUT URL valid for exactly **15 minutes (900 seconds)**.
   - Direct-to-bucket upload relieves server resources while preserving access validation.
3. **Presigned Download URLs (GET)**:
   - File downloads require verified buyer entitlement (`Entitlement` record).
   - Generates AWS Signature Version 4 presigned GET URL valid for **15 minutes (900 seconds)**.
   - Injects `response-content-disposition: attachment; filename="<sanitized-filename>"` to prevent browser execution.
4. **CORS Policy on S3/R2 Bucket**:
   Apply the following CORS rule on the bucket to allow authorized browser PUT uploads:
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["PUT", "GET", "HEAD"],
       "AllowedOrigins": ["https://marketplace.yourdomain.com"],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

---

## 3. Environment Security & Zero Leakage

### Variable Isolation
- **Client-Accessible (`NEXT_PUBLIC_*`)**:
  - `NEXT_PUBLIC_APP_URL`
  - `NEXT_PUBLIC_RAZORPAY_KEY_ID` (Public Key ID only)
- **Server-Only (NEVER exposed to frontend, logs, or error responses)**:
  - `DATABASE_URL` / `DIRECT_URL`
  - `JWT_SECRET` (Minimum 32 random characters)
  - `RAZORPAY_KEY_SECRET`
  - `RAZORPAY_WEBHOOK_SECRET`
  - `STORAGE_ACCESS_KEY` / `R2_ACCESS_KEY_ID`
  - `STORAGE_SECRET_KEY` / `R2_SECRET_ACCESS_KEY`
  - `DOWNLOAD_SIGNING_SECRET`

### Automated Error Sanitization
All public API errors returned by `apiError()` in `src/lib/api-response.ts` pass through `sanitizeErrorMessage()`. In production mode (`NODE_ENV=production`), internal database exceptions, stack traces, SQL queries, and local file paths are stripped and replaced with generic, safe error descriptions.

---

## 4. HTTP Security Headers, CORS & Rate Limiting

### Next.js Middleware (`src/middleware.ts`)
The edge middleware enforces strict security policies across every incoming request:
1. **Content-Security-Policy (CSP)**:
   Restricts scripts to `'self'`, inline hashes, and `https://checkout.razorpay.com`. Disallows arbitrary script execution and frame embedding except for Razorpay checkout.
2. **X-Frame-Options**: `DENY` (prevents clickjacking attacks).
3. **X-Content-Type-Options**: `nosniff` (prevents MIME sniffing).
4. **Referrer-Policy**: `strict-origin-when-cross-origin`.
5. **Permissions-Policy**: Disables camera, microphone, and geolocation.
6. **Strict-Transport-Security (HSTS)**: `max-age=31536000; includeSubDomains; preload` in production.
7. **Rate Limiting**: Sliding-window rate limiter protects:
   - Auth endpoints (`/api/v1/auth/*`): 15 req/min
   - Checkout (`/api/v1/checkout`): 30 req/min
   - Payments & Webhooks (`/api/v1/payments/*`): 60 req/min
   - Uploads (`/api/v1/seller/*/assets/upload`): 30 req/min
   - Downloads (`/api/v1/downloads/*`): 60 req/min
   - Admin operations (`/api/v1/admin/*`): 120 req/min
   - Returns RFC standard `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, and `Retry-After`.

---

## 5. Health Check & Observability

### Endpoint: `GET /api/v1/health`
- **Application Health**: Returns server uptime, memory state, and operational status.
- **Database Connectivity**: Executes active `SELECT 1` ping and reports round-trip latency in ms.
- **Storage Configuration**: Verifies storage provider status without exposing credentials.
- **HTTP Status Codes**:
  - `200 OK`: Database connected, storage configured, app healthy.
  - `503 Service Unavailable`: Database ping timed out or failed.
- **Security**: No database credentials, server paths, or IPs are included in output.

---

## 6. Backup, Archival & Disaster Recovery Strategy

### PostgreSQL Backup Strategy
1. **Automated Daily Backups (Logical `pg_dump`)**:
   - Run nightly logical backups:
     ```bash
     pg_dump -Fc -v --no-owner --no-acl -h db.internal -U marketplace_app digital_marketplace > /backups/marketplace_$(date +%Y%m%d_%H%M%S).dump
     ```
   - Retain daily backups for 30 days, weekly backups for 90 days, monthly backups for 1 year.
   - Encrypt dumps with GPG before uploading to cold backup storage.
2. **Point-in-Time Recovery (PITR)**:
   - For managed databases (RDS, Supabase, Neon), enable continuous WAL archiving with 7-day retention.
   - Enables restoring the database to any millisecond within the retention period.
3. **Database Restore Runbook**:
   ```bash
   # 1. Verify dump integrity
   pg_restore -l marketplace_20261005.dump > /dev/null

   # 2. Restore to clean staging database
   createdb -h db.internal -U postgres marketplace_restore_test
   pg_restore -v -d marketplace_restore_test -U postgres marketplace_20261005.dump

   # 3. Verify record counts (Users, Orders, Entitlements, Products)
   psql -d marketplace_restore_test -c "SELECT count(*) FROM \"Order\";"
   ```

### Storage Backup & Versioning Strategy
1. **Object Versioning**: Enable Object Versioning on Cloudflare R2 / S3 bucket to prevent accidental file deletion or malicious overwrites.
2. **Lifecycle Rules**:
   - Expire non-current versions after 90 days.
   - Retain current versions indefinitely.
3. **Cross-Region Replication**: For multi-region resilience, replicate bucket contents to a secondary backup region or alternative cloud provider.

---

## 7. Deployment Runbook

### Pre-Deployment Verification Checklist
- [ ] Environment variables configured in target environment.
- [ ] `DATABASE_URL` connects via SSL (`sslmode=require`).
- [ ] Database user is non-superuser (`marketplace_app`).
- [ ] Storage bucket is private and CORS rules applied.
- [ ] `npx prisma validate` passes.
- [ ] `npm run lint` passes.
- [ ] `npx tsc --noEmit` passes with 0 errors.
- [ ] Automated regression tests pass.

### Deployment Commands
```bash
# 1. Install production dependencies
npm ci

# 2. Generate Prisma client
npx prisma generate

# 3. Apply pending database migrations safely
npx prisma migrate deploy

# 4. Build Next.js production bundle
npm run build

# 5. Start production server
npm run start
```
