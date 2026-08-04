# 20 — Seguridad y permisos

Auditoría **estática** del código. Sin pentest runtime. Secretos: solo nombres / fragmentos censurados.

---

## Controles positivos observados

- Middleware de sesión + gates de rol/modo/biometría.
- RLS en tablas sensibles.
- Privilege lock trigger anti-escalada de `role` / `intranet_role`.
- Signup no puede crear `admin` desde metadata.
- Pagos money path limitado a `super_admin`.
- `register_payment_received` service_role only.
- Wallet summary IDOR fix (`FIX_WALLET_SUMMARY_IDOR.sql`).
- Webhook MP con firma HMAC en producción.
- Filtro de contacto en chat (anti-evasión).
- Security headers (`lib/security/headers.ts`).
- CSRF helper (`lib/security/csrf.ts`) en APIs sensibles (revisar cobertura por ruta).
- Rate limit en webhook.
- Mask de dirección y RUT en superficies públicas.

---

## Hallazgos y riesgos

| Código | Descripción | Nivel | Área | Efecto | Repro | Archivo | Posible solución | ¿Bloquea prod? |
|--------|-------------|-------|------|--------|-------|---------|------------------|----------------|
| SEC-01 | Biometría facial no es match real | Alto | Verificación | Falsa sensación de KYC fuerte | Completar onboarding con fotos | `lib/verification/biometric.ts` | Integrar vendor KYC o no llamar “biometría” | No técnico; sí compliance |
| SEC-02 | Escrow solo ledger, un collector MP | Alto | Pagos | Riesgo operativo/fondos | Flujo pago completo | `docs/PAGOS.md` | Marketplace split / cuentas segregadas | Depende negocio |
| SEC-03 | Service role en servidor | Medio | Ops | Si se filtra, bypass RLS | Filtrar env | `lib/supabase/admin.ts` | Secret manager, rotación | Si se expone: crítico |
| SEC-04 | Avatar bucket público | Bajo/Medio | Storage | Fotos perfil públicas | Ver URL avatar | SPRINT_10 | OK si solo avatar | No |
| SEC-05 | Scripts E2E con emails/pass defaults | Medio | Repo scripts | Credenciales de prueba en código | Leer `scripts/e2e-*.mjs` | scripts | Quitar defaults, usar solo env | No si no son prod |
| SEC-06 | Project ref hardcodeado en script | Bajo | Scripts | Enumeración proyecto | Leer configure-supabase-auth | scripts | Solo env | Bajo |
| SEC-07 | RoleGuard admin amplio vs money | Bajo | Authz | Confusión UI | Login admin sin super | `RoleGuard.tsx` | Alinear mensajes | No (middleware cubre dinero) |
| SEC-08 | OCR auto-approve identity | Medio | Fraud | Documentos falsos/OCR engañado | Subir carnet manipulado | localCarnetOcr | Umbral + humano siempre / liveness real | Parcial |
| SEC-09 | Nominatim proxy abuso | Medio | API | Rate/cost/ToS | Spam geocode | `app/api/map/geocode` | Auth+rate limit estricto | Parcial |
| SEC-10 | Cron automate sin secret mal config | Alto | Automation | Si `CRON_SECRET` ausente/mal | Llamar `/api/cron/automate` | `lib/automation/cronAuth.ts` | Exigir secret en prod | Si abierto: sí |
| SEC-11 | Haulmer DTE no cableado | Medio | Fiscal | Comprobantes vs SII | Emitir boleta | billing/company | Integrar API | Compliance |
| SEC-12 | Validaciones solo frontend en partes de forms | Medio | UX | Bypass campos UI | API directa | varios | Validar siempre server/SQL | Parcial |
| SEC-13 | Dependencias vulnerables | NO DETERMINADO | Supply chain | — | `npm audit` no ejecutado en esta auditoría | package-lock | Auditar | NO DETERMINADO |

---

## Temas pedidos — estado

| Tema | Hallazgo |
|------|----------|
| Secretos expuestos en repo | No se reportan valores; riesgo si `.env.local` se versiona (debe estar gitignored) |
| Claves en frontend | Solo `NEXT_PUBLIC_*` (anon, app url) — esperado |
| RLS ausente | Tablas nuevas deben traer policies; drift posible |
| Admin inseguro | Dinero endurecido; verificación sí admin |
| Buckets públicos | Solo avatars |
| IDOR | Mitigaciones históricas (wallet); nuevas rutas deben revisarse caso a caso |
| XSS | React escapa por defecto; `dangerouslySetInnerHTML` — NO DETERMINADO exhaustivo |
| SQLi | Uso cliente Supabase parametrizado; SQL en migraciones admin |
| APIs sin auth | Webhooks (firma), cron (secret), algunos recommend/geocode — revisar cada una |
| CORS | Next defaults; NO DETERMINADO custom |
| Rate limiting | Webhook sí; no global API gateway |
| Sesiones | Cookies Supabase SSR |
| Roles manipulables | Trigger privilege lock |
| Rutas solo visualmente protegidas | Middleware real en prefijos protegidos |
| Logs sensibles | Evitar loguear tokens; revisar runtime |

---

## Variables sensibles (nombres)

`SUPABASE_SERVICE_ROLE_KEY`, `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`, `CRON_SECRET`, `RESEND_API_KEY`, `SUPABASE_ACCESS_TOKEN` (scripts).

Valores: **omitidos**.
