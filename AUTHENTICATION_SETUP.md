# Authentication & Transactional Email Configuration Guide — Between Letters

This document describes the architecture and external configuration required for the **Between Letters** authentication system (`auth-service` + `backend` + `frontend/src/app/login`).

---

## 1. Architecture Overview

Between Letters uses its existing multi-service architecture without duplicating tables or services:

- **Database (`MariaDB`)**:
  - `usuarios`: Stores persistent user accounts (`id`, `nome`, `email`, `senha_hash`, `papel`, `email_verificado`, `foto_url`, `bio`, `auth_provider`, `google_id`, `ultimo_login`, `status_conta`, `criado_em`).
  - `reset_tokens`: Stores single-use, 30-minute expiring password recovery tokens hashed with `SHA-256` (`token`, `usuario_id`, `criado_em`, `expira_em`, `usado`).
  - `codigos_verificacao`: Stores 6-digit OTP verification codes when `REQUIRE_EMAIL_VERIFICATION=true`.
- **Auth Microservice (`auth-service/server.js`)**:
  - Handles `/register`, `/login`, `/oauth/google`, `/forgot-password`, `/validate-reset-token`, `/reset-password`, `/verify-code`, `/resend-code`, and `/me`.
  - Dispatches transactional emails (Welcome, Password Recovery, and Verification) through **Brevo** (supporting both Brevo v3 HTTP API and Brevo SMTP Relay).
- **Backend API Gateway (`backend/src/controllers/authController.js`)**:
  - Exposes `/api/auth/*`, manages `HttpOnly` `access_token` cookies, applies rate limiting and input validation, and orchestrates the **Google OAuth 2.0** authorization and callback redirects (`/api/auth/google` and `/api/auth/google/callback`).
- **Frontend Experience (`frontend/src/app/login/page.tsx` & `frontend/src/components/AuthCard.tsx`)**:
  - Full-screen blurred vintage trees-and-sky background with a central aged cream stationery sheet held by realistic brown kraft tape.
  - Supports unified **Sign In**, **Sign Up**, **Forgot Password**, **Reset Password**, and **Google OAuth**.

---

## 2. Values That Must Be Configured Manually by the Project Owner

### A. Google Cloud Console (Google OAuth 2.0)

> **Important Note:** Google authentication (`Continue with Google` / `Sign up with Google`) requires valid Google OAuth 2.0 credentials configured in `.env` or Portainer. Until `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are supplied, clicking the Google button safely redirects back to `/login` with an informative configuration notice.

1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project and go to **APIs & Services → OAuth consent screen**:
   - Choose **External** (or Internal for Workspace).
   - App name: `Between Letters`
   - Scopes: `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`.
3. Navigate to **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**
   - **Authorized JavaScript origins**:
     - Local development: `http://localhost:3000`
     - Production: `https://daniel-marcal-isw055.lapps.studio` (or your `APP_URL`)
   - **Authorized redirect URIs**:
     - Local development: `http://localhost:3000/api/auth/google/callback`
     - Production: `https://daniel-marcal-isw055.lapps.studio/api/auth/google/callback`
4. Copy the generated Client ID and Client Secret into your environment variables:
   ```env
   GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
   ```

---

### B. Brevo Transactional Emails (Welcome & Password Recovery)

`auth-service` supports two Brevo delivery methods automatically:

1. **Brevo Transactional HTTP API v3 (Recommended when `BREVO_API_KEY` is provided)**:
   - In your [Brevo Dashboard](https://app.brevo.com/), go to **Senders, Domains & Dedicated IPs → Senders** and verify your sender email address.
   - Go to **SMTP & API → API Keys** and generate a v3 API key (`xkeysib-...`).
   - Configure:
     ```env
     BREVO_API_KEY=xkeysib-...
     BREVO_SENDER_EMAIL=your_verified_sender@domain.com
     BREVO_SENDER_NAME="Between Letters"
     ```
2. **Brevo SMTP Relay (Automatically used when `MAIL_HOST` / `MAIL_USER` / `MAIL_PASS` are provided)**:
   - Uses `smtp-relay.brevo.com` on port `587`:
     ```env
     MAIL_HOST=smtp-relay.brevo.com
     MAIL_PORT=587
     MAIL_USER=your_brevo_login@smtp-brevo.com
     MAIL_PASS=xsmtpsib-...
     MAIL_FROM="Between Letters <your_verified_sender@domain.com>"
     ```

### C. Password Recovery & Application URL

Ensure `APP_URL` matches the public URL where users access the application so password recovery emails generate links pointing to `${APP_URL}/login?mode=reset&token=<token>`:
```env
APP_URL=http://localhost:3000
```
(In production/Portainer: `APP_URL=https://daniel-marcal-isw055.lapps.studio`)
