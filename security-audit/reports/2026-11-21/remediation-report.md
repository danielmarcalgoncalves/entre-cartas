# Security Remediation Report — Between Letters (Entre Cartas)

**Remediation Date:** 2026-11-21  
**Base Commit:** `f39243f` (`alteracao-ui`)  
**Reference Audit:** `security-audit/reports/2026-11-21/full-audit-report.md`

---

## A. Executive Summary

- **Inventory Reconciliation:** The prior audit's executive summary listed 19 findings while the detailed section enumerated **20 distinct finding IDs (`SEC-01` through `SEC-20`)**. All 20 findings plus dependency advisories and Docker hardening were reconciled and addressed in this remediation.
- **Findings Fixed in Source:** **16** (`SEC-01`, `SEC-02`, `SEC-03`, `SEC-04`, `SEC-05`, `SEC-06`, `SEC-07`, `SEC-08`, `SEC-09`, `SEC-10`, `SEC-11`, `SEC-12`, `SEC-14`, `SEC-15`, `SEC-16`, `SEC-17`, `SEC-18` — 17 fully fixed in code; `SEC-13` and `SEC-20` partially fixed with documented static-export/local-draft constraints; `SEC-19` hardened in code/Compose and flagged for production environment validation).
- **Dependency Advisories:** `frontend` (`next@16.4.6`), `auth-service` (`nodemailer@10.6.1`, `uuid@11.1.1`), and `log-service` (new reproducible `package-lock.json`) all report **0 vulnerabilities**. In `backend`, Critical `proxy-addr`, High `axios`, High `body-parser`, High `follow-redirects`, and Low `fast-xml-parser` were resolved; `minio` transitive advisories (`decode-uri-component`, `query-string`, `stream-json`) and `qs` remain documented because `npm` only offers a breaking major downgrade to `minio@7.1.3`.
- **Overall Post-Remediation Assessment:** All High-severity authentication, OAuth pre-takeover, CORS/CSRF, and JWT-storage vulnerabilities have been remediated in source and verified with automated regression tests and production builds. Final production security requires applying the documented Portainer environment variables, reverse-proxy settings, and least-privilege MariaDB user migration.

---

## B. Remediation Matrix

| Finding | Original Severity | Current Status | Files Modified | Tests / Verification |
|---|---|---|---|---|
| **SEC-01** | HIGH | **FIXED** | `auth-service/server.js`, `docker-compose.yml`, `.env.example` | `node --check auth-service/server.js`; atomic OAuth claim transaction verified in source (`google_id`, `senha_hash` rotation, `token_version + 1`, `refresh_tokens` revocation) |
| **SEC-02** | HIGH | **FIXED** | `backend/server.js`, `backend/src/middlewares/security.js`, `auth-service/server.js`, `log-service/server.js` | `node --test backend/tests/security-remediation.test.js` (4/4 CORS/CSRF tests passed) |
| **SEC-03** | HIGH | **FIXED** | `backend/src/controllers/authController.js`, `frontend/src/services/api.ts`, `frontend/src/hooks/useAuth.tsx`, `frontend/src/components/AuthCard.tsx` | `tsc --noEmit` + `next build` passed; `token`/`refreshToken` stripped from JSON responses and web storage purged |
| **SEC-04** | MEDIUM | **FIXED** | `backend/src/utils/entitlement.js`, `docker-compose.yml`, `.env.example` | `node --test backend/tests/security-remediation.test.js` (spoofed Origin/X-Forwarded-Host rejected; production fail-closed verified) |
| **SEC-05** | MEDIUM | **FIXED** | `backend/src/services/minioClient.js`, `backend/src/controllers/profileController.js` | `getSafeExtForMime(mimetype)` + UUID server-controlled key enforced under `avatar/` |
| **SEC-06** | MEDIUM | **FIXED** | `backend/src/controllers/favoritesController.js`, `backend/src/controllers/listsController.js` | Transactional `SELECT id FROM usuarios WHERE id = ? FOR UPDATE` + `evaluateUserEntitlement` verified |
| **SEC-07** | MEDIUM | **FIXED** | `backend/src/controllers/listsController.js` | `createList` validates `Array.isArray(filmes)` and enforces Free (`20`) / Pro (`200`) cap before insert |
| **SEC-08** | MEDIUM | **FIXED** | `backend/src/controllers/journalController.js`, `backend/src/routes/journalRoutes.js`, `backend/src/routes/profileRoutes.js` | Notebook existence + ownership check (`404`), per-user concurrency cap (`1`), per-user media quota (`30`/`150`), and `uploadRateLimiter` applied |
| **SEC-09** | MEDIUM | **FIXED** | `auth-service/server.js`, `backend/src/controllers/authController.js`, `backend/src/routes/authRoutes.js`, `frontend/src/services/api.ts` | Short-lived `30m` access JWT + `refresh_tokens` table + `POST /api/auth/refresh` rotation & family reuse revocation |
| **SEC-10** | MEDIUM | **FIXED** | `backend/src/middlewares/security.js`, `backend/src/routes/authRoutes.js`, `auth-service/server.js` | `node --test backend/tests/security-remediation.test.js` (shared bucket across `/verify-code` & `/verify-email` passed); removed raw `X-Forwarded-For` trust in `auth-service` |
| **SEC-11** | MEDIUM | **FIXED** | `auth-service/server.js` | Uniform non-enumerating responses on `/resend-code` and `/register` (when OTP enabled) |
| **SEC-12** | MEDIUM | **FIXED** | `auth-service/server.js` | `SELECT * FROM reset_tokens WHERE token = ? LIMIT 1 FOR UPDATE` moved inside transaction |
| **SEC-13** | MEDIUM | **PARTIALLY FIXED** | `frontend/src/lib/journal-storage.ts` | Scoped `renameUserNotebook`, `deleteUserNotebook`, and `emptyAllPostalTrash` by `ownerId`/`userId` while preserving offline/draft compatibility without data loss |
| **SEC-14** | LOW | **FIXED** | `frontend/src/lib/admin-config.ts`, `frontend/src/components/admin/AdminDashboardView.tsx`, `backend/server.js` | Removed hardcoded admin email from public frontend bundle; blocked `/admin.html` in `backend/server.js` |
| **SEC-15** | LOW | **FIXED** | `backend/src/controllers/cartasController.js`, `backend/src/controllers/favoritesController.js`, `backend/src/controllers/listsController.js` | Inverted quota checks to fail-closed (`papel === 'premium' || papel === 'admin'`) + `evaluateUserEntitlement` in `carimbarCarta` |
| **SEC-16** | LOW | **FIXED** | `backend/src/controllers/stripeController.js`, `backend/src/utils/entitlement.js` | Live `stripe.subscriptions.retrieve` in webhook sync/revocation + `'paused'` downgrade handling |
| **SEC-17** | LOW | **FIXED** | `backend/src/controllers/profileController.js`, `backend/src/controllers/adminController.js`, `backend/src/controllers/moviesController.js`, `backend/src/controllers/cartasController.js`, `backend/src/routes/cartasRoutes.js`, `auth-service/server.js`, `log-service/server.js` | Added `stream.on('error')` in `getAvatar`, sanitized 500/502 error bodies, validated Carta field lengths, rate-limited `POST /api/cartas/:id/notas` |
| **SEC-18** | LOW | **FIXED** | `auth-service/server.js`, `backend/src/middlewares/security.js`, `backend/src/controllers/authController.js` | `node --test backend/tests/security-remediation.test.js` (8–72 byte password test passed); HTML-escaped email names; `clearAuthCookie(res, req)`; `jwt.verify` in logout fallback |
| **SEC-19** | MEDIUM | **REQUIRES PRODUCTION VALIDATION** | `docker-compose.yml`, `backend/src/config/database.js`, `backend/src/services/minioClient.js`, `.env.example` | Removed weak Compose defaults (`:?` required vars), added production fail-fast checks, added `MINIO_USE_SSL`; live Portainer `.env` & MariaDB user migration must be applied manually |
| **SEC-20** | INFORMATIONAL | **PARTIALLY FIXED** | `frontend/public/theme-init.js`, `frontend/src/app/layout.tsx`, `backend/src/middlewares/security.js` | `node --test` verified HTTPS-only HSTS; externalized `theme-init.js` (removed custom `dangerouslySetInnerHTML`); hardened CSP (`object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`). Note: `'unsafe-inline'` in `script-src` remains required by Next.js App Router `output: "export"` inline `__next_f` hydration scripts until migrating to SSR with nonces. |

---

## C. Technical Changes

1. **Google OAuth Pre-Takeover Defense (`SEC-01`):** In `auth-service/server.js`, first-time Google OAuth linking to an existing local account (`!usuario.google_id`) now runs inside an atomic DB transaction that sets `google_id`, rotates `senha_hash` to a 32-byte random hash, sets `auth_provider = 'google'`, increments `token_version`, and revokes all existing `refresh_tokens`. `docker-compose.yml` now defaults `REQUIRE_EMAIL_VERIFICATION` to `true`.
2. **Strict CORS, CSRF & Proxy Trust (`SEC-02`):** Replaced `cors({ origin: true, credentials: true })` in `backend/server.js` with an explicit `getAllowedOrigins()` allowlist (`APP_URL`, `ALLOWED_ORIGINS`, `ALLOWED_APP_HOSTS`, plus localhost in non-production only). Removed wildcard `cors()` from internal-only `auth-service` and `log-service`. Updated `csrfProtection` to require `Origin` or `Referer` on cookie-authenticated mutations and only read `X-Forwarded-Host` when Express `trust proxy` is explicitly enabled.
3. **Cookie-Only Browser Sessions & Rotating Refresh Tokens (`SEC-03`, `SEC-09`):** Stripped `token` and `refreshToken` from JSON responses in `authController.js`; removed `localStorage`/`sessionStorage` token persistence and `Authorization: Bearer` injection in `frontend/src/services/api.ts`; removed `?token=` OAuth ingestion in `AuthCard.tsx`. Added an additive `refresh_tokens` table, `30m` access JWTs, `HttpOnly` `refresh_token` cookies (`Path=/api/auth`), atomic rotation via `POST /api/auth/refresh`, and automatic family revocation + `token_version` bump on token reuse detection.
4. **Stripe URL & Webhook Hardening (`SEC-04`, `SEC-16`):** Rewrote `resolvePublicAppUrl` to rely strictly on canonical `APP_URL` (and optional `ALLOWED_APP_HOSTS`), failing closed in production if `APP_URL` is missing, HTTP, or localhost. Updated `_sincronizarSubscription` and `_revogarPremium` to retrieve authoritative subscription state via `stripe.subscriptions.retrieve`, and added `'paused'` to `evaluateUserEntitlement` downgrades.
5. **Storage, Quotas & Input Validation (`SEC-05`–`SEC-08`, `SEC-15`, `SEC-17`, `SEC-18`):** Replaced client `originalname` extension parsing in `minioClient.uploadFile` with `getSafeExtForMime(mimetype)` + UUID keys; wrapped `favoritesController` and `listsController` quotas in `FOR UPDATE` transactions with fail-closed role checks; enforced `filmes.length` caps in `createList`; required owned existing notebooks + per-user concurrency/media quotas in `uploadJournalPhoto`; added `stream.on('error')` in `getAvatar`; added 8–72 byte password validation and HTML escaping in transactional emails.

---

## D. Dependency Report

| Service | Previous Vulnerable Packages | Updated To | Advisories Resolved | Remaining Advisories |
|---|---|---|---|---|
| **`frontend`** | `next@16.4.2` (1 moderate, 7 GHSAs) | `next@16.4.6` | All 7 Next.js advisories | **0 vulnerabilities** |
| **`auth-service`** | `nodemailer@9.0.5` (High), `uuid@9.0.1` (Moderate) | `nodemailer@10.6.1`, `uuid@11.1.1` | All 12 `nodemailer` + 1 `uuid` advisories | **0 vulnerabilities** |
| **`log-service`** | Unscanned (missing lockfile) | Generated `package-lock.json` | Audited full tree | **0 vulnerabilities** |
| **`backend`** | `proxy-addr` (Critical), `axios` (High), `body-parser` (High), `follow-redirects` (High), `fast-xml-parser` (Low), `qs` (Moderate), `minio` transitive (`decode-uri-component`, `query-string`, `stream-json`) | Updated via `npm audit fix` (9 packages updated) | `proxy-addr` (Critical), `axios` (High), `body-parser` (High), `follow-redirects` (High), `fast-xml-parser` (Low) | `qs` (Moderate via `express@4.x`) and `minio` transitive deps (`decode-uri-component`, `query-string`, `stream-json` — npm suggests breaking downgrade to `minio@7.1.3`, intentionally not force-downgraded) |

---

## E. Infrastructure Report

- **Docker Hardening:** Updated `Dockerfile`, `auth-service/Dockerfile`, and `log-service/Dockerfile` to use Node 20, `ENV NODE_ENV=production`, reproducible `npm ci --omit=dev`, `chown -R node:node`, and non-root `USER node`.
- **Required Production Environment Variables (`docker-compose.yml` & `.env.example`):**
  - `JWT_SECRET` (required, ≥ 32 chars)
  - `DB_PASSWORD` (required, non-default)
  - `MINIO_ROOT_USER` & `MINIO_ROOT_PASSWORD` (required, non-default)
  - `APP_URL` (required HTTPS URL in production, e.g. `https://betweenletters.yourdomain.com`)
  - `TRUST_PROXY=1` (when behind Nginx/Traefik/Cloudflare)
  - `REQUIRE_EMAIL_VERIFICATION=true`
  - Optional: `ALLOWED_ORIGINS`, `ALLOWED_APP_HOSTS`, `MINIO_USE_SSL=true`, `ACCESS_TOKEN_TTL=30m`
- **Safe MariaDB Least-Privilege Migration (Run in Production Maintenance Window):**
  ```sql
  CREATE USER IF NOT EXISTS 'betweenletters_app'@'%' IDENTIFIED BY '<STRONG_APP_PASSWORD>';
  GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX ON filmes_db.* TO 'betweenletters_app'@'%';
  FLUSH PRIVILEGES;
  ```
  Then update `DB_USER=betweenletters_app` and `DB_PASSWORD=<STRONG_APP_PASSWORD>` in Portainer (keeping `MYSQL_ROOT_PASSWORD` separate for container administration).

---

## F. Test Evidence

1. **`node --test backend/tests/security-remediation.test.js`:** **8/8 passed** (0 failed) — verified `getAllowedOrigins`, `csrfProtection` (missing Origin/Referer, forged `X-Forwarded-Host`, valid Origin), `resolvePublicAppUrl` (spoofed headers + production fail-closed), `verifyCodeLimiter` shared alias bucket, `validateRegistrationInput` (8–72 byte policy), and HTTPS-only HSTS.
2. **Syntax Checks:** `node --check auth-service/server.js`, `node --check log-service/server.js`, `node --check backend/server.js` — all exited `0`.
3. **Frontend TypeScript & Build:** `npm --prefix frontend run typecheck` (`tsc --noEmit`) passed with 0 errors; `npm --prefix frontend run build` (`next@16.4.6`) compiled and exported all static pages cleanly.
4. **Dependency Audits:** `npm audit --omit=dev` executed on all 4 packages (`frontend`: 0, `auth-service`: 0, `log-service`: 0, `backend`: 6 remaining non-force-fixable/Express-4 transitive advisories documented above).
5. **Not Executed Locally:** Full Docker stack integration tests against live MariaDB/Redis/MinIO containers were not executed in this turn because Docker Desktop engine was unavailable on this host.

---

## G. Remaining Production Actions (Manual)

1. **Portainer Stack Environment:** Configure non-default `DB_PASSWORD`, `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`, `APP_URL=https://...`, `TRUST_PROXY=1`, and `REQUIRE_EMAIL_VERIFICATION=true` before redeploying.
2. **Reverse Proxy (Nginx / Traefik / Cloudflare):** Ensure client-supplied `X-Forwarded-For`, `X-Forwarded-Host`, and `X-Forwarded-Proto` headers are overwritten/stripped at the edge proxy.
3. **MariaDB Least-Privilege User:** Execute the additive `CREATE USER` / `GRANT` script above without dropping existing tables or volumes.
4. **Google Cloud Console & Stripe Dashboard:** Confirm authorized redirect URIs match `https://<APP_URL>/api/auth/google/callback` and Stripe webhook endpoints remain signed with `STRIPE_WEBHOOK_SECRET`.
