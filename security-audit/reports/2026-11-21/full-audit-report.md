# Full Security Audit Report — Between Letters (Entre Cartas)

**Audit Date:** 2026-11-21  
**Reviewed Commit:** `f39243f` (`modo 2 UI`, with uncommitted `M frontend/next-env.d.ts`)  
**Audit Scope:** Full-project read-only source, dependency, and infrastructure security assessment (Frontend, Backend Core, Auth Service, Log Service, Database, External Integrations, Docker/Compose).  
**Safety & Constraints:** Audit-only execution. Zero source files modified; no destructive or production tests performed; no secrets exposed.

---

## A. Executive Summary

### Overall Security Assessment
Between Letters demonstrates **solid foundational security controls** in several high-risk areas: parameterized SQL queries throughout MariaDB access, fail-closed `JWT_SECRET` length enforcement (`>= 32` chars), real-time token revocation (`revoked_tokens` + `token_version`) and DB-backed role/entitlement re-evaluation, Stripe webhook cryptographic signature verification with atomic event-ID idempotency, magic-byte validation on image uploads, and internal Docker network isolation for MariaDB, Redis, MinIO, `auth-service`, and `log-service`.

However, the audit identified **19 distinct findings** across the stack—including **3 High-severity**, **9 Medium-severity**, **5 Low-severity**, and **2 Informational** issues—stemming primarily from:
1. **Cross-System Session & Origin Boundary Weaknesses:** Returning raw 7d/30d JWTs in JSON bodies (`authController.js`), persisting them in `localStorage`/`sessionStorage` (`api.ts`), and ingesting `?token=` in OAuth redirects (`AuthCard.tsx`) undermines `HttpOnly` cookie protections; meanwhile, `cors({ origin: true, credentials: true })` (`backend/server.js`) and origin-optional `csrfProtection` (`security.js`) weaken cross-origin isolation.
2. **Pre-Account Takeover Vector in Google OAuth:** When `REQUIRE_EMAIL_VERIFICATION=false` (the Compose default), an attacker can pre-register a victim's email; when the victim later signs in via Google OAuth, `auth-service` links `google_id` without rotating the attacker's password or `token_version`.
3. **Business-Logic Quota & Storage Exhaustion Gaps:** TOCTOU race conditions in `favoritesController` and `listsController`, unchecked `filmes` array length in `createList`, unbounded orphaned 5 MB MinIO uploads in `uploadJournalPhoto`, and user-controlled file extensions in avatar uploads (`minioClient.js`).
4. **Infrastructure & Dependency Hygiene:** Containers run as `root`, Compose/config fall back to weak default MariaDB/MinIO credentials (`root_password`, `minioadmin123`), `auth-service` trusts `X-Forwarded-For` for rate limiting, and `npm audit` reports known advisories in `next`, `axios`, `proxy-addr`, `minio`, and `nodemailer`.

### Findings Summary

| Severity | Confirmed | Requires Validation | Total |
|---|---:|---:|---:|
| **CRITICAL** | 0 | 0 | **0** |
| **HIGH** | 3 | 0 | **3** |
| **MEDIUM** | 7 | 2 | **9** |
| **LOW** | 5 | 0 | **5** |
| **INFORMATIONAL** | 2 | 0 | **2** |
| **Total** | **17** | **2** | **19** |

> *Note: Following strict evidence-first classification, findings marked `requires_validation` are not inflated and note the exact missing runtime/deployment evidence.*

### Top 5 Most Important Risks
1. **SEC-01 (HIGH):** Pre-Account Takeover via Google OAuth linking on verified local accounts when `REQUIRE_EMAIL_VERIFICATION=false`.
2. **SEC-02 (HIGH):** Permissive CORS (`origin: true, credentials: true`) paired with origin-optional `csrfProtection` and unconditional `X-Forwarded-Host` trust.
3. **SEC-03 (HIGH):** Session token exposure outside `HttpOnly` cookies (returned in JSON body, stored in `localStorage`/`sessionStorage`, and read from OAuth `?token=` query string).
4. **SEC-04 (MEDIUM):** Host/Origin header injection in Stripe Checkout & Billing Portal `success_url` / `return_url` when `APP_URL` is `localhost` or unset.
5. **SEC-05 (MEDIUM):** Path/key manipulation & user-controlled extension in MinIO avatar uploads (`minioClient.uploadFile`).

---

## B. Project Architecture Reviewed

### Services & Modules Inspected
- **Frontend (`frontend/`):** Next.js `16.4.2` (static export `output: "export"`), React `19.3.1`, TypeScript, `api.ts`, `useAuth.tsx`, `useGuestDemo.tsx`, `AuthCard.tsx`, `SiteShell.tsx`, `AdminDashboardView.tsx`, `admin-config.ts`, `journal-storage.ts`, `MyDeskPage.tsx`.
- **Backend Core (`backend/`):** Node.js/Express `4.x` serving both REST API (`/api/*`) and static Next.js export (`public/`). Inspected `server.js`, `database.js`, `middlewares/{auth,security}.js`, `routes/*`, `controllers/*`, `services/{logClient,minioClient}.js`, `utils/{entitlement,quotaErrors}.js`.
- **Auth Service (`auth-service/`):** Dedicated Node.js/Express `5.2.1` service (`server.js`, `package.json`, `Dockerfile`) handling registration, login, OTP email verification, password reset, Google OAuth verification, and JWT issuance/revocation.
- **Log Service (`log-service/`):** Dedicated Node.js/Express `4.19.2` service (`server.js`, `package.json`, `Dockerfile`) persisting audit events to Redis Streams.
- **Database (`database/`):** MariaDB `10.11` (`database/init.sql` + runtime `initDb` migrations in `backend/src/config/database.js`).
- **Infrastructure:** `Dockerfile`, `auth-service/Dockerfile`, `log-service/Dockerfile`, `docker-compose.yml`, `.dockerignore`, `.gitignore`, `.env.example`.

### Technologies & External Integrations
- **Stripe** (Checkout, Billing Portal, Webhooks)
- **Google OAuth 2.0** (Authorization Code + `userinfo` verification)
- **Brevo** (HTTP API v3 & SMTP Relay via `nodemailer`)
- **MinIO** (S3-compatible object storage for `perfil-fotos` and `journal-media`)
- **Redis** (Audit log streams)
- **TMDB API** (Movie catalog proxy)

### Security Boundaries Analyzed
1. Browser ↔ Backend Core (`/api/*`, static export, `HttpOnly` cookie + Bearer token, CORS/CSRF).
2. Backend Core ↔ Auth Service (`INTERNAL_AUTH_SECRET` HMAC header, `JWT_SECRET`, shared MariaDB).
3. Backend Core / Auth Service ↔ Log Service (`INTERNAL_LOG_SECRET` HMAC header, Redis).
4. Backend Core ↔ MariaDB & MinIO (SQL isolation, bucket ACLs, object key generation).
5. External Webhooks / Callbacks ↔ Backend Core (Stripe signatures, Google OAuth `state`).

### Components Not Inspected / External to Repository
- Live Portainer stack configuration, reverse proxy (Nginx/Traefik/Cloudflare) TLS termination & header stripping rules, and production `.env` secret values (deliberately excluded from inspection).
- Live Stripe Dashboard webhook endpoint settings, Google Cloud Console OAuth redirect allowlists, and Brevo domain SPF/DKIM/DMARC records.

---

## C. Detailed Findings

### SEC-01 — Pre-Account Takeover via Google OAuth Linking on Local Accounts
- **Severity:** HIGH | **Confidence:** High | **Status:** `confirmed`
- **Affected Service:** `auth-service` / Docker configuration
- **File & Lines:** `auth-service/server.js:645-649, 938-979`; `docker-compose.yml:63`
- **Technical Explanation:** With `REQUIRE_EMAIL_VERIFICATION=false` (default in `docker-compose.yml:63`), `POST /register` (`auth-service/server.js:645-649`) immediately marks new local accounts `email_verificado = TRUE` and issues a 7-day JWT. In `POST /oauth/google` (`953-976`), password hash rotation (`rotatedHash`) and `token_version` protection only run inside `if (wasUnverifiedLocal)`. When `email_verificado` is already `TRUE`, the `else` branch (`966-976`) links `google_id` to the existing row **without** rotating `senha_hash` or incrementing `token_version`.
- **Attack Scenario:** Attacker registers `victim@example.com` with an attacker-chosen password, receiving `email_verificado = TRUE` and a valid JWT. Later, the victim signs in with "Continue with Google". `auth-service` links the victim's `google_id` to the attacker's pre-registered account while leaving the attacker's password and JWT active.
- **Potential Impact:** Full persistent account takeover of users who onboard via Google OAuth.
- **Prerequisites:** `REQUIRE_EMAIL_VERIFICATION=false`; attacker pre-registers victim's email before victim uses Google OAuth.
- **Recommended Remediation:** Set `REQUIRE_EMAIL_VERIFICATION=true` in production. Additionally, in `auth-service/server.js:966-976`, when linking a `google_id` for the first time to an existing `local` account (`!usuario.google_id`), require explicit password verification or rotate `senha_hash` and increment `token_version`.
- **Suggested Validation Procedure:** In an isolated local test environment with `REQUIRE_EMAIL_VERIFICATION=false`, register a local account for `test@example.com`, then complete Google OAuth for `test@example.com`; verify whether the original password still logs in and whether the pre-OAuth JWT remains valid.

---

### SEC-02 — Permissive CORS (`origin: true, credentials: true`) & Origin-Optional CSRF Middleware
- **Severity:** HIGH | **Confidence:** High | **Status:** `confirmed`
- **Affected Service:** `backend` (and `auth-service`, `log-service` wildcard CORS)
- **File & Lines:** `backend/server.js:47-50`; `backend/src/middlewares/security.js:188-223`; `auth-service/server.js:13`; `log-service/server.js:8`
- **Technical Explanation:** `backend/server.js:47-50` configures `cors({ origin: true, credentials: true })`, reflecting any `Origin` header with `Access-Control-Allow-Credentials: true`. Meanwhile, `csrfProtection` (`security.js:188-223`) skips `GET`/`HEAD`/`OPTIONS`, only validates `Origin` when `req.headers['origin']` is present (`if (origin)` at line 195), and unconditionally trusts `req.headers['x-forwarded-host']` (`202-206`) even when `trust proxy` is `false` (`server.js:40`). Both `auth-service` and `log-service` also mount `cors()` with wildcard `*`.
- **Attack Scenario:** A malicious page on a same-site origin (e.g., another localhost port or compromised subdomain) or a client context that sends `SameSite=Lax` cookies can perform credentialed `GET` requests to `/api/cartas/minhas`, `/api/journal/notebooks`, or `/api/admin/users` and read private responses. For state-changing endpoints, requests without an `Origin` header or with forged `X-Forwarded-Host` matching `Origin` bypass `csrfProtection`.
- **Potential Impact:** Cross-origin read of sensitive user/admin data and weakened CSRF protection.
- **Prerequisites:** Victim has an active session cookie and interacts with an attacker-controlled origin or request without `Origin`.
- **Recommended Remediation:** Replace `origin: true` in `backend/server.js:47-50` with an explicit allowlist derived from `APP_URL` (plus dev localhost only when `NODE_ENV !== 'production'`). In `csrfProtection`, only read `x-forwarded-host` when `req.app.get('trust proxy')` is enabled, and verify `Origin` or `Referer` on cookie-authenticated state-changing requests. Remove or restrict `cors()` on internal-only `auth-service` and `log-service`.
- **Suggested Validation Procedure:** Send a `GET /api/auth/me` request with `Origin: https://evil.example` and verify `Access-Control-Allow-Origin` is not reflected.

---

### SEC-03 — Session JWT Exposed Outside `HttpOnly` Cookies (JSON Body, Web Storage & OAuth Query String)
- **Severity:** HIGH | **Confidence:** High | **Status:** `confirmed`
- **Affected Service:** `backend` + `frontend` (cross-system chain)
- **File & Lines:** `backend/src/controllers/authController.js:132-145, 162-187, 523-535`; `frontend/src/services/api.ts:7, 11-58, 60-75, 183-185, 280-283`; `frontend/src/components/AuthCard.tsx:82-104`; `frontend/src/hooks/useAuth.tsx:217-226`
- **Technical Explanation:** Although `authController.js` sets an `HttpOnly`, `SameSite=Lax` `access_token` cookie, it also returns the raw JWT string in `response.data.token` on `register`, `login`, and `verifyCode`. The frontend persists this token in `localStorage` (`entre-cartas:auth:token`) or `sessionStorage` (`api.ts:11-58`) and attaches `Authorization: Bearer ${token}` to all requests. Additionally, `AuthCard.tsx:82-104` ingests `?oauth=success&token=...` from the URL query string and, when `onSuccess` is provided (e.g., `AuthModal`), does not strip `token` from the URL.
- **Attack Scenario:** Any XSS, compromised browser extension, or third-party script can read `localStorage.getItem('entre-cartas:auth:token')` to steal a 7-day/30-day session token, completely bypassing `HttpOnly`. OAuth tokens in URL query strings also leak to browser history, proxy logs, and `Referer` headers.
- **Potential Impact:** Persistent account takeover (including admin accounts) bypassing `HttpOnly` cookie protections.
- **Prerequisites:** Script execution in origin (for web storage) or OAuth callback returning `?token=` (for URL leakage).
- **Recommended Remediation:** Strip `token` from JSON responses in `authController.js` (`register`, `login`, `verifyCode`), stop passing `?token=` in OAuth redirects (rely on the `HttpOnly` cookie set during callback), and remove `SESSION_TOKEN_STORAGE_KEY` / `Authorization: Bearer` web-storage handling from `frontend/src/services/api.ts` and `AuthCard.tsx`.
- **Suggested Validation Procedure:** Inspect `/api/auth/login` response body and browser `localStorage` after login; confirm `token` is absent from both and authenticated calls succeed via `HttpOnly` cookie alone.

---

### SEC-04 — Host/Origin Header Injection in Stripe Checkout & Billing Portal Return URLs
- **Severity:** MEDIUM | **Confidence:** High | **Status:** `confirmed`
- **Affected Service:** `backend` (`stripeController`, `entitlement.js`)
- **File & Lines:** `backend/src/utils/entitlement.js:10-19, 29-71`; `backend/src/controllers/stripeController.js:28-33, 153-154, 404-407`; `docker-compose.yml:35`
- **Technical Explanation:** `resolvePublicAppUrl(req)` (`entitlement.js:29-71`) ignores `process.env.APP_URL` whenever `isLocalhostUrl(configured)` is `true` (which is true for the default `APP_URL=http://localhost:3000` in `docker-compose.yml:35`), and then constructs the base URL from `req.headers.origin`, `req.headers['x-forwarded-host']`, `req.headers['x-forwarded-proto']`, `req.headers['cf-visitor']`, or `req.headers.host`—even when `trust proxy` is `false`. `stripeController.js` uses this URL for Stripe `success_url` (which includes `{CHECKOUT_SESSION_ID}`), `cancel_url`, and `return_url`.
- **Attack Scenario:** If `APP_URL` is unset or `localhost`, an attacker sends `POST /api/stripe/checkout` or `POST /api/stripe/portal` with `Origin: https://attacker.example` and `X-Forwarded-Host: attacker.example` (which also satisfies `csrfProtection`). Stripe creates a session redirecting to `https://attacker.example`.
- **Potential Impact:** Open redirect via trusted `checkout.stripe.com` / `billing.stripe.com` domains and `{CHECKOUT_SESSION_ID}` leakage.
- **Prerequisites:** `APP_URL` unset or pointing to `localhost`; authenticated request.
- **Recommended Remediation:** Enforce an explicit `ALLOWED_APP_HOSTS` allowlist in `resolvePublicAppUrl`, and only honor `x-forwarded-*` headers when `req.app.get('trust proxy')` is enabled.
- **Suggested Validation Procedure:** Call `POST /api/stripe/checkout` with spoofed `Origin`/`X-Forwarded-Host` in local test mode and verify the resolved `success_url` rejects non-allowlisted hosts.

---

### SEC-05 — Path/Key Manipulation & User-Controlled Extension in MinIO Avatar Upload
- **Severity:** MEDIUM | **Confidence:** High | **Status:** `confirmed`
- **Affected Service:** `backend` (`minioClient.js`, `profileController.js`)
- **File & Lines:** `backend/src/services/minioClient.js:43-54, 61-71, 98-103`; `backend/src/controllers/profileController.js:180`
- **Technical Explanation:** `uploadFile` (`minioClient.js:61-71`) extracts the file extension directly from the client-supplied `originalname` via `filename.split('.').pop().toLowerCase()` (`line 62`), unlike `uploadJournalMedia` which uses `getSafeExtForMime(mimetype)` (`98-103`). It then writes `objectName = 'avatar/' + rawFileName` into the public-read `perfil-fotos` bucket (`43-54`).
- **Attack Scenario:** An authenticated user uploads a valid PNG with `originalname` set to `pic.png/../../arbitrary.html` or `pic.svg`. `putObject` writes outside `avatar/` or with an arbitrary extension inside `perfil-fotos`. (`GET /api/profile/avatar/:filename` mitigates XSS via `Content-Type` and `X-Content-Type-Options: nosniff`.)
- **Potential Impact:** Arbitrary S3 key/prefix write within `perfil-fotos` and storage of non-image extensions.
- **Prerequisites:** Authenticated user calling `POST /api/profile/avatar`.
- **Recommended Remediation:** Replace `filename.split('.').pop().toLowerCase()` in `minioClient.js:62` with `getSafeExtForMime(mimetype)` and sanitize/ignore `originalname`.
- **Suggested Validation Procedure:** Upload a PNG with `filename="test.png/../../evil.html"` in a local test environment and confirm the stored MinIO key uses `.png` directly under `avatar/`.

---

### SEC-06 — TOCTOU Race Conditions on Quota Checks (`favoritesController` & `listsController`)
- **Severity:** MEDIUM | **Confidence:** High | **Status:** `confirmed`
- **Affected Service:** `backend`
- **File & Lines:** `backend/src/controllers/favoritesController.js:49-89`; `backend/src/controllers/listsController.js:208-233, 260-282, 372-404`
- **Technical Explanation:** Unlike `cartasController` and `journalController` (which lock the user row with `SELECT ... FOR UPDATE` inside a transaction), `favoritesController.addFavorite` and `listsController.{toggleWatchlist,createList,addMovieToList}` perform `SELECT COUNT(*)` followed by `INSERT` without a transaction or row lock.
- **Attack Scenario:** A Free-plan user sends 10 concurrent `POST /api/favorites` or `POST /api/lists` requests; multiple requests read `total < limite` before any `INSERT` commits, bypassing Free-tier quotas.
- **Potential Impact:** Business-logic quota bypass for favorites, custom lists, list items, and watchlist entries.
- **Prerequisites:** Authenticated Free-tier user issuing concurrent requests.
- **Recommended Remediation:** Wrap quota checks and inserts in a DB transaction with `SELECT id, papel FROM usuarios WHERE id = ? FOR UPDATE`.
- **Suggested Validation Procedure:** Send 10 parallel `POST /api/favorites` requests from a Free-tier test account at `limit - 1` and verify only 1 succeeds.

---

### SEC-07 — Quota Bypass via Unchecked `filmes` Array in `createList`
- **Severity:** MEDIUM | **Confidence:** High | **Status:** `confirmed`
- **Affected Service:** `backend`
- **File & Lines:** `backend/src/controllers/listsController.js:246-300`
- **Technical Explanation:** `createList` checks the number of lists owned by the user, then loops through `req.body.filmes` (`287-299`) and inserts every element into `itens_lista` with no length limit—whereas `addMovieToList` (`371-389`) and `updateList` (`474-480`) enforce per-list item quotas.
- **Attack Scenario:** An authenticated Free-tier user calls `POST /api/lists` with a `filmes` array of 500+ items, bypassing the 20-item Free-tier list cap in one request.
- **Potential Impact:** Quota bypass and unbounded batch DB inserts per request.
- **Prerequisites:** Authenticated user.
- **Recommended Remediation:** Validate `Array.isArray(filmes)` and enforce the per-list item cap (`20` for Free users, reasonable upper bound for Pro) before inserting into `listas` / `itens_lista`.
- **Suggested Validation Procedure:** Submit `POST /api/lists` with 25 items as a Free-tier test user and verify `403` is returned.

---

### SEC-08 — Unbounded Orphaned Media Uploads & Global Concurrency DoS (`uploadJournalPhoto`)
- **Severity:** MEDIUM | **Confidence:** High | **Status:** `confirmed`
- **Affected Service:** `backend` (`journalController`, `journalRoutes`)
- **File & Lines:** `backend/src/controllers/journalController.js:20-21, 435-490`; `backend/src/routes/journalRoutes.js:37`
- **Technical Explanation:** `uploadJournalPhoto` queries `cadernos` (`462-465`) but ignores `nbRows`, performs no per-user storage/file-count quota check, has no upload rate limiter, and uploads 5 MB images to `journal-media` for any arbitrary `clientId`. Unreferenced objects are never garbage-collected unless an existing DB notebook is later updated/deleted. Additionally, `activeJournalUploads` is a global counter capped at `4` (`436`), allowing 4 concurrent slow uploads to trigger `503` for all users.
- **Attack Scenario:** An authenticated user floods `POST /api/journal/notebooks/fake-<n>/media` with 5 MB images (disk exhaustion) or holds 4 slow upload requests open (global upload DoS).
- **Potential Impact:** MinIO storage exhaustion and cross-user denial of service on journal photo uploads.
- **Prerequisites:** Authenticated user account.
- **Recommended Remediation:** Add a per-user upload rate limiter on `journalRoutes.js:37` and `profileRoutes.js`, verify `nbRows.length > 0` (or enforce a strict per-user object/byte quota), and schedule cleanup of unreferenced objects.
- **Suggested Validation Procedure:** Attempt to upload media to a non-existent `clientId` or exceed the rate limit in a local test environment and verify rejection.

---

### SEC-09 — Long-Lived Access JWTs (7d / 30d) Without Refresh Token Rotation
- **Severity:** MEDIUM | **Confidence:** High | **Status:** `confirmed`
- **Affected Service:** `auth-service` / `backend`
- **File & Lines:** `auth-service/server.js:655, 767, 879-884, 1021`; `backend/src/controllers/authController.js:51`
- **Technical Explanation:** Access JWTs are signed with `expiresIn: '7d'` (or `'30d'` with `rememberMe`), and no refresh token rotation exists.
- **Attack Scenario:** Any leaked JWT (via `response.data.token`, `localStorage`, or interception) remains valid for up to 30 days until explicit logout or password reset.
- **Potential Impact:** Extended window of unauthorized access following token compromise.
- **Prerequisites:** Token leakage.
- **Recommended Remediation:** Shorten access JWT TTL (e.g., 15–60 minutes) and introduce rotating `HttpOnly` refresh tokens stored hashed in MariaDB.
- **Suggested Validation Procedure:** Decode issued JWT `exp - iat` and verify shortened access token lifetime + refresh rotation.

---

### SEC-10 — Rate-Limiting Weaknesses (`X-Forwarded-For` Spoofing, Alias Split, Missing Limiters, IP-Only Keys)
- **Severity:** MEDIUM | **Confidence:** High | **Status:** `confirmed`
- **Affected Service:** `backend` & `auth-service`
- **File & Lines:** `backend/src/middlewares/security.js:20-61`; `backend/src/routes/authRoutes.js:14-31`; `auth-service/server.js:482-500, 831-832, 837, 1247, 1336`
- **Technical Explanation:**
  1. `auth-service/server.js:485` trusts `req.headers['x-forwarded-for']` directly even though `trust proxy` is `false`.
  2. `backend/src/middlewares/security.js:23` keys limiters by `${req.baseUrl}${req.path}:${ip}`, giving aliased routes (`/verify-code` vs `/verify-email`, `/resend-code` vs `/resend-verification`) independent quota buckets (2x attempts).
  3. `GET /api/auth/reset-password/validate` has no rate limiter; `auth-service` has no rate limiters on `/login`, `/resend-code`, `/validate-reset-token`, or `/logout`; and limits are IP-only (no per-email throttling).
- **Attack Scenario:** Attackers can double OTP/resend attempts via route aliases, brute-force passwords across rotating IPs, or spoof `X-Forwarded-For` against `auth-service` to email-bomb victims via `/resend-code`.
- **Potential Impact:** Weakened brute-force protection and email-bombing DoS.
- **Prerequisites:** Network access to `/api/auth/*` (or internal network access to `auth-service`).
- **Recommended Remediation:** Normalize limiter bucket keys across route aliases, add per-email + IP throttling on login/OTP/resend, rate-limit `/reset-password/validate`, and use `req.ip` instead of raw `X-Forwarded-For` in `auth-service`.
- **Suggested Validation Procedure:** Alternate requests between `/api/auth/verify-code` and `/api/auth/verify-email` from one IP and confirm they share a single 8-attempt budget.

---

### SEC-11 — Account Enumeration on `/register` and `/resend-code`
- **Severity:** MEDIUM | **Confidence:** High | **Status:** `confirmed`
- **Affected Service:** `auth-service`
- **File & Lines:** `auth-service/server.js:596-616, 806-812`
- **Technical Explanation:** `/resend-code` returns `404` for unknown emails, `400` for already-verified emails, and `200` for pending unverified emails. `/register` returns `409 Conflict` for existing verified emails and `200` for pending unverified emails.
- **Attack Scenario:** An unauthenticated attacker probes email lists against `POST /api/auth/resend-code` to enumerate registered users and verification status.
- **Potential Impact:** User email address enumeration.
- **Prerequisites:** Unauthenticated access to `/api/auth/resend-code`.
- **Recommended Remediation:** Return a generic `200` response on `/resend-code` regardless of account existence or verification state (matching `/forgot-password`).
- **Suggested Validation Procedure:** Submit registered, unverified, and non-existent emails to `/api/auth/resend-code` and verify identical HTTP status and response body.

---

### SEC-12 — Race Condition in Password Reset Token Consumption
- **Severity:** MEDIUM | **Confidence:** High | **Status:** `confirmed`
- **Affected Service:** `auth-service`
- **File & Lines:** `auth-service/server.js:1290-1319`
- **Technical Explanation:** `POST /reset-password` reads `reset_tokens` (`1290`) **before** starting `conn.beginTransaction()` (`1310`), without `SELECT ... FOR UPDATE`.
- **Attack Scenario:** Two concurrent `POST /reset-password` requests with the same token can both pass `if (resetRequest.usado)` (`1299`) before either commits `UPDATE reset_tokens SET usado = TRUE` (`1316`).
- **Potential Impact:** Concurrent reuse of a single-use password reset token.
- **Prerequisites:** Attacker possesses a valid reset token and sends parallel requests.
- **Recommended Remediation:** Move the `SELECT ... FROM reset_tokens WHERE token = ? LIMIT 1 FOR UPDATE` query inside the transaction block and validate `usado` / `expira_em` on the locked row.
- **Suggested Validation Procedure:** Send 2 concurrent `POST /api/auth/reset-password` requests with the same valid token and verify only 1 succeeds.

---

### SEC-13 — Multi-User `localStorage` Plaintext Persistence & Unscoped Mutators on Shared Browsers
- **Severity:** MEDIUM | **Confidence:** High | **Status:** `confirmed`
- **Affected Service:** `frontend` (`journal-storage.ts`)
- **File & Lines:** `frontend/src/lib/journal-storage.ts:469-531, 636-758, 923-990`
- **Technical Explanation:** Notebooks, saved letters, and trashed letters are persisted in plaintext in `localStorage`. While `clearAllPrivateBrowserData()` runs on login/logout/user-switch, if a user closes the browser without signing out, their private entries remain readable in `localStorage`. Additionally, `renameUserNotebook`, `deleteUserNotebook`, and `emptyAllPostalTrash` mutate global arrays without scoping by `userId`.
- **Attack Scenario:** On a shared computer, User A closes the tab without logging out; User B opens DevTools before logging in and reads User A's private journals and letters.
- **Potential Impact:** Confidentiality loss of private user journals/letters on shared devices.
- **Prerequisites:** Shared browser where User A does not click Sign Out.
- **Recommended Remediation:** Keep authenticated users' private journal/letter bodies in React memory hydrated from the backend (or transient `sessionStorage` drafts) and scope all `journal-storage.ts` mutators by `userId`.
- **Suggested Validation Procedure:** Log in as User A, create a journal, close tab without logging out, reopen `/my-shelf` and inspect `localStorage` before logging in.

---

### SEC-14 — Hardcoded Admin Route & Admin Email in Public Static JS Bundle
- **Severity:** LOW | **Confidence:** High | **Status:** `confirmed`
- **Affected Service:** `frontend` (and `backend/server.js` static routing)
- **File & Lines:** `frontend/src/lib/admin-config.ts:1-16`; `frontend/src/app/X2fQYLS5UbTYaIchwvwqLqzWqU32ZNoa/page.tsx`; `frontend/src/components/admin/AdminDashboardView.tsx:108-109`; `backend/server.js:105-134`
- **Technical Explanation:** `ADMIN_ROUTE_ID` and `AUTHORIZED_ADMIN_EMAIL` (`danielpgmarcal@gmail.com`) are compiled into the public static JS bundle. Client-side UI gating (`isAuthorizedAdminUser`) can be bypassed in DevTools, though backend `/api/admin/*` routes independently enforce `requireAdmin` (DB `role === 'admin'` + email check). Additionally, `backend/server.js:105` blocks `/admin` and `/admin/*` but does not explicitly block `/admin.html`.
- **Attack Scenario:** Anyone can inspect the public JS bundle to discover the admin email, the obscure admin route, and all `/api/admin/*` endpoints for targeted reconnaissance.
- **Potential Impact:** Information disclosure of admin identity and internal admin route/API surface.
- **Prerequisites:** Public access to frontend JS assets.
- **Recommended Remediation:** Remove `AUTHORIZED_ADMIN_EMAIL` from frontend code (drive UI solely from server-verified role), and add `/admin.html` to the blocked list in `backend/server.js:105`.
- **Suggested Validation Procedure:** Search built `frontend/out/_next/static/` for the admin email and verify `/api/admin/metrics` returns `403` for non-admin accounts.

---

### SEC-15 — Fail-Open Role Checks in Quota Enforcement (`=== 'usuario'`)
- **Severity:** LOW | **Confidence:** High | **Status:** `confirmed`
- **Affected Service:** `backend`
- **File & Lines:** `backend/src/controllers/cartasController.js:327-349`; `backend/src/controllers/favoritesController.js:43-46`; `backend/src/controllers/listsController.js:76-77, 208, 372, 474-475`
- **Technical Explanation:** Quota limits are only enforced when `papel === 'usuario'`. Any unexpected, null, or empty `papel` value skips limits (`limite = null`). Also, `carimbarCarta` (`cartasController.js:327-331`) reads `usuarios.papel` directly without calling `evaluateUserEntitlement`.
- **Attack Scenario:** Any account with a non-standard/null `papel` value receives unlimited quotas.
- **Potential Impact:** Unintended Free-tier quota bypass on malformed role values.
- **Prerequisites:** Account row with `papel` other than `'usuario'`, `'premium'`, or `'admin'`.
- **Recommended Remediation:** Invert the check to `const isPro = papel === 'premium' || papel === 'admin';` (defaulting all other values to Free limits) and call `evaluateUserEntitlement` in `carimbarCarta`.
- **Suggested Validation Procedure:** Unit-test quota helper with `papel = null` and `papel = ''` and verify Free-tier limits apply.

---

### SEC-16 — Out-of-Order Stripe Webhook Overwrite & Missing `paused` Status Downgrade
- **Severity:** LOW | **Confidence:** High | **Status:** `confirmed`
- **Affected Service:** `backend` (`stripeController`, `entitlement.js`)
- **File & Lines:** `backend/src/controllers/stripeController.js:619-678`; `backend/src/utils/entitlement.js:145`
- **Technical Explanation:** `_sincronizarSubscription` and `_revogarPremium` trust `event.data.object` directly without fetching the authoritative subscription via `stripe.subscriptions.retrieve` or checking `event.created`. Also, `evaluateUserEntitlement` (`entitlement.js:145`) downgrades `canceled`, `unpaid`, `incomplete_expired`, and `inactive`, but omits `paused`.
- **Attack Scenario:** Out-of-order `customer.subscription.updated` delivery overwrites newer `active` status with stale `past_due`/`canceled`, or a `paused` subscription retains `premium`.
- **Potential Impact:** Temporary subscription entitlement desynchronization.
- **Prerequisites:** Out-of-order Stripe webhook delivery or `paused` subscription state.
- **Recommended Remediation:** Retrieve the latest subscription via `stripe.subscriptions.retrieve` in `_sincronizarSubscription` / `_revogarPremium` and add `'paused'` to `entitlement.js:145`.
- **Suggested Validation Procedure:** Replay an older `customer.subscription.updated` fixture after an `active` event in a local test harness and verify the newer state is preserved.

---

### SEC-17 — Unhandled Stream Error in `getAvatar`, Raw Error Reflection & Missing Input Length Validation
- **Severity:** LOW | **Confidence:** High | **Status:** `confirmed`
- **Affected Service:** `backend`, `auth-service`, `log-service`
- **File & Lines:** `backend/src/controllers/profileController.js:211, 240`; `backend/src/controllers/adminController.js:728-730`; `backend/src/controllers/moviesController.js:17-19`; `backend/src/controllers/cartasController.js:197-281, 316-392, 522-563`; `auth-service/server.js:690, 827`; `log-service/server.js:157, 220`
- **Technical Explanation:** `profileController.getAvatar` (`240`) calls `stream.pipe(res)` without `stream.on('error', ...)`. Multiple endpoints (`uploadAvatar`, `adminController.getLogs`, `auth-service`, `log-service`) return raw `error.message` on 500/502 responses. `cartasController` lacks length/allowlist validation on `titulo`, `categoria`, `tipo_papel`, `lacre_cera_cor`, `fonte`, `remetente_anonimo`, `destinatario_anonimo`, and `tipo_carimbo`, and `POST /api/cartas/:id/notas` has no rate limiter.
- **Potential Impact:** Potential Node process crash on mid-stream MinIO read error; internal error string disclosure; DB `ER_DATA_TOO_LONG` 500s.
- **Prerequisites:** Mid-stream storage failure or oversized field submission.
- **Recommended Remediation:** Attach `stream.on('error', ...)` in `getAvatar`; return static generic error messages on 500/502; add length/allowlist checks in `cartasController` and rate-limit `POST /api/cartas/:id/notas`.
- **Suggested Validation Procedure:** Submit oversized `titulo` (300+ chars) to `POST /api/cartas` and verify `400` validation response instead of `500`.

---

### SEC-18 — Weak Password Policy (6-Char Min, No Max), Unescaped Email Name & Unverified Logout Fallback
- **Severity:** LOW | **Confidence:** High | **Status:** `confirmed`
- **Affected Service:** `auth-service` / `backend`
- **File & Lines:** `auth-service/server.js:349-354, 396-401, 441-446, 570, 1283`; `backend/src/middlewares/security.js:162`; `backend/src/controllers/authController.js:217-228, 327`
- **Technical Explanation:**
  1. Passwords require only `length >= 6` with no upper bound (bcrypt truncates at 72 bytes).
  2. Transactional HTML emails interpolate `safeName` without HTML-escaping (`auth-service/server.js:349-446`), allowing HTML injection via Google display names.
  3. `authController.js:327` calls `clearAuthCookie(res)` without `req`, potentially setting `secure: false` behind an HTTPS proxy on password reset.
  4. `authController.js:217-228` inserts `SHA-256(t)` into `revoked_tokens` during an `auth-service` outage without `jwt.verify()`.
- **Recommended Remediation:** Enforce 8–128 char password length, HTML-escape `safeName` in email templates, pass `req` to `clearAuthCookie(res, req)`, and verify JWT signature before fallback revocation.

---

### SEC-19 — Default Weak MinIO & MariaDB Root Credentials (Requires Environment Validation)
- **Severity:** MEDIUM | **Confidence:** Medium | **Status:** `requires_validation`
- **Affected Service:** Infrastructure / `docker-compose.yml` / `backend`
- **File & Lines:** `docker-compose.yml:14-15, 27-28, 51-52, 98-99, 109`; `backend/src/config/database.js:8-9`; `backend/src/services/minioClient.js:16-30`
- **Technical Explanation:** `docker-compose.yml` and service configs fall back to `root` / `root_password` for MariaDB and `minioadmin` / `minioadmin123` for MinIO if env vars are unset. `minioClient.js:27` also hardcodes `useSSL: false`. (In `docker-compose.yml`, MariaDB `3306` and MinIO `9000`/`9001` are `expose`d internally only, not published to host.)
- **Potential Impact:** If deployed without overriding `.env` credentials and/or if internal ports are exposed in Portainer, full database and object storage compromise occurs; running as MariaDB `root` also violates least privilege.
- **Prerequisites:** Deployment missing `.env` overrides or exposing internal ports.
- **Recommended Remediation:** Require `DB_PASSWORD`, `MINIO_ROOT_USER`, and `MINIO_ROOT_PASSWORD` via `:?` in `docker-compose.yml`, create a dedicated least-privilege MariaDB application user, and make `MINIO_USE_SSL` configurable.
- **Suggested Validation Procedure:** Inspect Portainer stack environment variables (without printing secrets) and verify non-default credentials and non-published internal ports.

---

### SEC-20 — Static `dangerouslySetInnerHTML` & CSP `'unsafe-inline'` (Informational)
- **Severity:** INFORMATIONAL | **Confidence:** High | **Status:** `confirmed`
- **Affected Service:** `frontend` & `backend`
- **File & Lines:** `frontend/src/app/layout.tsx:19-33, 39`; `backend/src/middlewares/security.js:177-180`
- **Technical Explanation:** `layout.tsx:39` injects a static hardcoded `themeInitScript` via `dangerouslySetInnerHTML` (no user input, not directly exploitable for XSS), which forces `securityHeaders` (`security.js:179`) to keep `'unsafe-inline'` in `script-src`, weakening XSS defense-in-depth. Also, `Strict-Transport-Security` is emitted unconditionally even over HTTP.
- **Recommended Remediation:** Move `themeInitScript` to a static file or use a SHA-256 CSP hash, remove `'unsafe-inline'` from `script-src`, and emit HSTS only when `isSecureConnection(req)` is true.

---

## D. Dependency Vulnerabilities

Results from read-only `npm audit --omit=dev --json` across all four Node.js packages:

| Package / Service | Total Advisories | Critical | High | Moderate | Low | Key Advisories & Recommended Safe Version |
|---|---:|---:|---:|---:|---:|---|
| **`frontend`** (`next@16.4.2`) | 1 | 0 | 0 | 1 | 0 | `next` (`16.0.0 - 16.4.4`): 7 advisories including `GHSA-f3mh-rxg3-f5g2`, `GHSA-pc58-hwjq-p385`, `GHSA-7qx7-33qx-rqx2` (note: static export limits SSR/Edge exposure). **Fix:** `next@16.4.6+`. |
| **`backend`** | 10 | 1 | 6 | 2 | 1 | `proxy-addr` (`1.1.0 - 2.0.7`, Critical `GHSA-jqcg-44mw-7w3h` IP spoofing); `axios` (`1.0.0 - 1.19.0`, High prototype pollution / ReDoS / SSRF redirect bypass); `body-parser` (`<1.20.9`, High DoS); `follow-redirects` (`1.16.0 - 1.16.1`, High header leak); `minio` (`>=7.0.30`, High); `decode-uri-component`, `query-string`, `stream-json`, `qs`, `fast-xml-parser`. **Fix:** Update `axios`, `express`/`body-parser`/`proxy-addr`, and evaluate `minio@7.1.3` (major). |
| **`auth-service`** | 2 | 0 | 1 | 1 | 0 | `nodemailer` (`<=10.1.3`, High: 12 advisories including `GHSA-6vj9-mwq6-2f5v` TLS SNI/DNS cache reuse & parser DoS); `uuid` (`<11.1.1`, Moderate `GHSA-w5hq-g745-h8pq`). **Fix:** `nodemailer@10.6.1+` (major), `uuid@11.1.1+`/`14.0.3`. |
| **`log-service`** | *Unscanned* | — | — | — | — | No `package-lock.json` present in `log-service/`, so `npm audit` could not resolve lockfile graph (`requires_validation`). |

---

## E. Infrastructure & Deployment Findings

1. **Containers Run as `root`:** `Dockerfile`, `auth-service/Dockerfile`, and `log-service/Dockerfile` do not specify a non-root `USER` directive, so all Node.js processes execute as UID `0` inside containers.
2. **Default `NODE_ENV` & `npm install` in `auth-service`:** `auth-service/Dockerfile:6` runs `npm install` (including devDependencies if added) rather than `npm ci --omit=dev`; `auth-service` and `log-service` Dockerfiles do not set `ENV NODE_ENV=production`.
3. **Internal Network Isolation (Strength):** `docker-compose.yml` publishes only `app` (`3000:3000`); `mariadb`, `redis`, `minio`, `auth-service`, and `log-service` use `expose` only on the internal bridge network.
4. **Proxy & HTTPS Assumptions:** `backend/server.js:40` defaults `TRUST_PROXY` to `false`. In a remote Docker/Portainer deployment behind Nginx/Traefik/Cloudflare, `TRUST_PROXY=1` must be set explicitly so `req.ip`, `req.secure`, `req.protocol`, and `Set-Cookie: Secure` behave accurately.
5. **Git & Secret Hygiene:** `.gitignore` and `.dockerignore` properly exclude `.env` files; `git ls-files` confirmed `.env` and private keys are **not** tracked in Git.

---

## F. Security Strengths

1. **Parameterized SQL Everywhere:** Consistent `?` placeholders across all MariaDB queries (`auth-service`, `backend/src/controllers/*`, `middlewares/auth.js`, `utils/entitlement.js`), plus `LIKE` wildcard escaping and clamped pagination in `adminController`.
2. **Fail-Closed JWT Secret & Real-Time Revocation:** All JWT-verifying services fail to start if `JWT_SECRET` is missing or `< 32` chars; `auth.js` checks `revoked_tokens` (fail-closed `503` on DB error) and `token_version` (`tv`), and resolves user roles/entitlements from MariaDB on every request.
3. **Strong Stripe Webhook Security:** `/api/stripe` is mounted before `express.json()`, uses `express.raw()`, verifies cryptographic signatures via `stripe.webhooks.constructEvent`, enforces atomic `stripe_webhook_events` idempotency, and blocks `sk_live_` keys in `getStripe()`.
4. **Object-Level Authorization (IDOR Prevention):** Journals, folders, letters, lists, favorites, and private `journal-media` objects all enforce `usuario_id = req.usuarioId` ownership checks; `getJournalMedia` blocks `..`, `/`, `\` traversal and sets `X-Content-Type-Options: nosniff`.
5. **Constant-Time Internal Service Auth & Log Redaction:** `INTERNAL_LOG_SECRET` and `INTERNAL_AUTH_SECRET` use HMAC derivation and `crypto.timingSafeEqual`; `adminController.sanitizeMetadata` redacts sensitive keys before returning audit logs.
6. **Clean Frontend DOM Hygiene:** Zero `eval()`, `innerHTML`, `document.write()`, or `NEXT_PUBLIC_` secret variables found in `frontend/src`.

---

## G. Areas Requiring Further Validation

1. **Production `.env` & Portainer Runtime Config:** Verify non-default `DB_PASSWORD`, `MINIO_ROOT_USER`/`MINIO_ROOT_PASSWORD`, `REQUIRE_EMAIL_VERIFICATION=true`, `APP_URL=https://...`, and `TRUST_PROXY=1` in the live Portainer stack.
2. **Reverse Proxy Headers:** Confirm the production reverse proxy strips client-supplied `X-Forwarded-For`, `X-Forwarded-Host`, and `X-Forwarded-Proto` before forwarding to `app:3000`.
3. **`log-service` Dependency Audit:** Generate `log-service/package-lock.json` and run `npm audit` against its resolved dependency tree.
4. **External Provider Consoles:** Verify Google Cloud Console authorized redirect URIs, Stripe webhook event subscriptions, and Brevo SPF/DKIM/DMARC configuration.

---

## H. Remediation Roadmap

1. **Immediate (High Priority):**
   - **SEC-01:** Set `REQUIRE_EMAIL_VERIFICATION=true` and rotate `senha_hash` + `token_version` when linking `google_id` to an existing `local` account without a prior `google_id`.
   - **SEC-02:** Replace `cors({ origin: true, credentials: true })` with an explicit `APP_URL` allowlist; tighten `csrfProtection` to gate `x-forwarded-host` on `trust proxy` and require `Origin`/`Referer` on cookie-authenticated mutations.
   - **SEC-03:** Remove `token` from `/api/auth/{register,login,verify-code}` JSON bodies and OAuth redirect URLs; remove `localStorage`/`sessionStorage` token storage and `Authorization: Bearer` injection in `frontend/src/services/api.ts`.
2. **Short-Term (Medium Priority):**
   - **SEC-04:** Enforce `ALLOWED_APP_HOSTS` in `resolvePublicAppUrl` (`entitlement.js`).
   - **SEC-05:** Use `getSafeExtForMime(mimetype)` in `minioClient.uploadFile` for avatar uploads.
   - **SEC-06 & SEC-07:** Wrap `favoritesController` and `listsController` quota checks in transactions with `SELECT ... FOR UPDATE`, and enforce `filmes.length` quota in `createList`.
   - **SEC-08:** Rate-limit upload endpoints and validate notebook existence / per-user media quotas in `uploadJournalPhoto`.
   - **SEC-10, SEC-11, SEC-12:** Fix `auth-service` rate limiting, normalize aliased route buckets, make `/resend-code` non-enumerating, and move `reset_tokens` `SELECT ... FOR UPDATE` inside the transaction.
   - **SEC-09 & SEC-13:** Shorten access JWT TTL with rotating `HttpOnly` refresh tokens; avoid plaintext `localStorage` persistence of private journal/letter bodies across sessions.
   - **SEC-19:** Require non-default DB/MinIO credentials (`:?` in Compose) and use a least-privilege MariaDB user.
3. **Scheduled (Low Priority & Hardening):**
   - **SEC-14 to SEC-18, SEC-20:** Block `/admin.html`, remove admin email from frontend bundle, fail-closed role checks (`=== 'premium' || === 'admin'`), handle `paused` Stripe status + `subscriptions.retrieve` in webhook sync, add `stream.on('error')` in `getAvatar`, HTML-escape email `safeName`, pass `req` to `clearAuthCookie(res, req)`, upgrade vulnerable npm packages (`next`, `axios`, `proxy-addr`, `body-parser`, `nodemailer`), and add non-root `USER node` to all Dockerfiles.
