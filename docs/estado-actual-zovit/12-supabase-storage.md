# 12 — Supabase y almacenamiento

## Proyecto Supabase utilizado

- Variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (solo servidor).
- Ref de ejemplo en script: `scripts/configure-supabase-auth.mjs` menciona un `SUPABASE_PROJECT_REF` por defecto — **tratar como posible dato de entorno, no publicar**.
- Proyecto remoto exacto ligado a zovit.cl: **NO DETERMINADO** solo por código (depende de env en Vercel).

Clientes:

| Cliente | Archivo | Key |
|---------|---------|-----|
| Browser | `lib/supabase/client.ts` | anon |
| Server components/actions | `lib/supabase/server.ts` | anon + cookies |
| Middleware session | `lib/supabase/middleware.ts` | anon |
| Admin/service | `lib/supabase/admin.ts` | **service_role** |

---

## Autenticación

- Supabase Auth: email/password (`signUp`, `signInWithPassword`).
- Callback: `app/auth/callback/route.ts`.
- Templates email documentados: `supabase/AUTH_EMAIL_TEMPLATES.md`.
- Trigger DB crea `profiles`.

---

## Tablas y RLS

Ver `11-base-de-datos.md`. RLS habilitado en tablas de negocio; operaciones sensibles de pago vía RPC `service_role`.

---

## Buckets de Storage

| Bucket | Público | Límite | MIME | Fuente |
|--------|---------|--------|------|--------|
| `request-photos` | **No** | 5 MB | jpeg/png/webp | `FASE_1_COMPLETA.sql` |
| `identity-documents` | **No** | 10 MB | jpeg/png/webp/pdf | `SPRINT_7_VERIFICACION_IDENTIDAD.sql` |
| `profile-avatars` | **Sí** | 5 MB | jpeg/png/webp | `SPRINT_10_CREDENCIAL.sql` |
| `worker-credentials` | **No** | 10 MB | jpeg/png/webp/pdf/json | `SPRINT_12_WORKER_AI_VALIDATION.sql` |

### Políticas típicas

- **request-photos:** solo participantes de la solicitud (folder = requestId/userId).
- **identity-documents:** dueño o platform admin.
- **profile-avatars:** lectura pública anon/authenticated; escritura dueño.
- **worker-credentials:** dueño o intranet privilegiado.

---

## Tipos de archivo por uso

| Uso | Bucket | Privacidad |
|-----|--------|------------|
| Cédula / selfie | identity-documents | Privado |
| Certificados oficio | worker-credentials | Privado |
| Fotos trabajo before/after | request-photos | Privado (participantes) |
| Avatar perfil | profile-avatars | Público |
| Evidencias disputa | NO DETERMINADO bucket dedicado | — |
| Certificados emitidos PDF | Metadatos en `issued_certificates`; entrega email/share | Ver `lib/certificates/*` |

URLs firmadas: patrón típico Supabase para buckets privados (APIs admin file routes bajo `.../file/[documentId]`).

---

## Edge Functions

No hay carpeta `supabase/functions` inventariada en la exploración. La lógica “serverless” corre en **Next.js Route Handlers** (`app/api/**`), no en Edge Functions Supabase.  
Edge Functions Supabase adicionales: **NO DETERMINADO / no presentes en repo**.

---

## Realtime

Publicación Realtime (SQL Fase 1) para:

- `request_messages`
- (y otras tablas según `FASE_1_COMPLETA.sql` DO blocks)
- Canal live location en cliente mapa (`ClientMapPage`)

---

## Logs

- `payment_events`, `worker_review_history`, `request_status_history`.
- Logs de hosting Vercel / Supabase dashboard: fuera del repo.

---

## Anon key vs service role — riesgos

| Riesgo | Detalle |
|--------|---------|
| Anon en frontend | Esperado; seguridad depende de RLS |
| Service role en servidor | Correcto si nunca se expone con `NEXT_PUBLIC_` |
| Avatar público | Intencional; no poner docs de identidad ahí |
| Scripts locales con service role | `scripts/*.mjs` — riesgo si se commitea `.env.local` (no debe) |
| Buckets privados mal policy | Exposición PII (RUT scans) |

`.env.example` **no** lista `SUPABASE_SERVICE_ROLE_KEY` (sí aparece en `docs/DEPLOY.md`).
