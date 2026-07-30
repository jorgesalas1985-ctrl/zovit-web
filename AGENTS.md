# AGENTS.md

## Cursor Cloud specific instructions

Single full-stack **Next.js 15 / React 19** app (App Router + `app/api/*` routes) named `zovit-web-v5-phase1`. Package manager is **npm** (`package-lock.json`). Backend is **Supabase** (Postgres + Auth + Storage + Realtime). Standard scripts are in `package.json` / `README.md`: `npm run dev` (port 3000), `npm run build`, `npm run start`, `npm run lint`. `npm test` does not exist (no automated test suite).

### Node version
`package.json` `engines` requests Node `24.x`. The base VM's default `node` (on `PATH` via `/exec-daemon`) is Node 22, which also runs the app, but to match `engines` install/use Node 24: `nvm install 24` then prepend it to `PATH` (`export PATH="$HOME/.nvm/versions/node/v24.18.1/bin:$PATH"`). `npm install` (the update script) works on either.

### Supabase is mandatory and CSP-gated (the key gotcha)
The Supabase client throws at import if `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are unset, so the app will not boot without them. Critically, the app's own CSP in `lib/security/headers.ts` restricts `connect-src` to `'self' https://*.supabase.co wss://*.supabase.co ...`. **The browser can therefore only reach Supabase at an `https://<something>.supabase.co` host on port 443** — plain `http://127.0.0.1:54321` is blocked by the browser and login silently fails with "Failed to fetch". Do not edit the CSP; instead point the app at a `*.supabase.co` HTTPS URL. Two supported ways to run:

**(A) Cloud Supabase — canonical / simplest.** Put a real project's values in `.env.local` (or as injected env vars): `NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co`, `NEXT_PUBLIC_SUPABASE_ANON_KEY=...` (and `SUPABASE_SERVICE_ROLE_KEY` for payment/admin/intranet server routes). Apply the SQL in `supabase/` via the Supabase SQL Editor (see order below). No proxy/cert tricks needed.

**(B) Fully local, offline, no secrets.** Run Supabase in Docker and expose it over HTTPS under a `*.supabase.co` host so the CSP passes. This is what was used to validate the environment:
- Docker must be running (installed with `storage-driver: fuse-overlayfs` and `containerd-snapshotter: false` for Docker 29). `supabase` CLI + `psql` are used.
- `supabase start` (from repo root; needs `supabase/config.toml`, committed). It prints local `ANON_KEY` / `SERVICE_ROLE_KEY` and runs the API at `http://127.0.0.1:54321`, Studio `:54323`, Mailpit `:54324`.
- Expose it as `https://local.supabase.co` (matches `*.supabase.co`): add `127.0.0.1 local.supabase.co` to `/etc/hosts`; create a browser-trusted cert with `mkcert -install` + `mkcert local.supabase.co`; run a reverse proxy on `:443` (Caddy: `tls <cert> <key>` + `reverse_proxy 127.0.0.1:54321`). Set `NEXT_PUBLIC_SUPABASE_URL=https://local.supabase.co`.
- **Node does not use the system/OS CA store.** The dev server (and any Node process that talks to Supabase, e.g. middleware/server components) MUST be started with `NODE_EXTRA_CA_CERTS=$(mkcert -CAROOT)/rootCA.pem`. Without it, server-side `auth.getUser()` fails TLS → HTTP 500 and an infinite "Redirigiendo…" loop after an otherwise-successful login. (Client-side works because Chrome trusts the mkcert CA — restart Chrome once after `mkcert -install`.)

### Migrations / SQL ordering
Base: `schema_v4.sql` then `FASE_1_COMPLETA.sql`. Then `SPRINT_3` … `SPRINT_18` roughly in numeric order, then the `FIX_*` scripts. Non-obvious: `SPRINT_5B_PAYOUTS_DISPUTES_REFUNDS.sql` must run **after** `SPRINT_6_INTRANET.sql` (it references `profiles.intranet_role`, added by Sprint 6). Scripts are idempotent.

### Auth / identity gate when testing
Local auth email confirmations are off (`enable_confirmations = false`). New users hit a biometric identity gate (middleware forces `/registro/biometria`, which needs a live camera). To test panel/request flows headlessly, seed a user via the Auth admin API and set `profiles.identity_status = 'approved'` (plus `can_act_as_client`, `active_mode`) so the gate passes.

### Misc
- `GET /favicon.ico` returns 500 ("conflicting public file and page") — pre-existing and harmless.
- Don't start a second `npm run dev`; it will silently take port 3001 and confuse testing.
- `.env.local` is gitignored; never commit real keys.
