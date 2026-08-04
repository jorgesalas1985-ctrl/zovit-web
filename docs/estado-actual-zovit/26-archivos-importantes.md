# 26 — Inventario de archivos importantes

Importancia: **Crítica** · **Alta** · **Media**

| Ruta | Finalidad | Funciones principales | Dependencias | Datos | Rol | Estado | Importancia |
|------|-----------|----------------------|--------------|-------|-----|--------|-------------|
| `package.json` | Manifest | scripts/deps | npm | — | — | OK | Crítica |
| `middleware.ts` | Gate global | auth, roles, biometría, intranet | supabase, roles | session | todos | OK | Crítica |
| `lib/auth/roles.ts` | Roles plataforma | canAccessRoute, modes | verification types | profiles fields | client/pro/admin | OK | Crítica |
| `lib/auth/intranetRoles.ts` | Roles staff | permissions matrix | — | intranet_role | staff | OK | Crítica |
| `lib/auth/superAdminAccess.ts` | Bypass super | unrestricted checks | intranetRoles | intranet_role | super | OK | Alta |
| `components/AuthProvider.tsx` | Sesión UI | load profile | supabase | profiles | todos | OK | Crítica |
| `components/RoleGuard.tsx` | Guard UI | redirect sin permiso | roles | profile | — | OK | Alta |
| `app/registro/page.tsx` | Signup | signUp | registration lib | auth+profiles | visitante | OK | Crítica |
| `app/login/LoginForm.tsx` | Login | signIn | roles | auth | — | OK | Crítica |
| `lib/registration/*` | Validación signup | age, finish | supabase | PII | — | OK | Alta |
| `app/solicitudes/nueva/page.tsx` | Crear job | insert request | supabase | solicitudes | client | OK | Crítica |
| `app/solicitudes/[id]/page.tsx` | Hub job | chat, photos, proposals | realtime | multi | partes | OK | Crítica |
| `components/payments/ProposalSection.tsx` | Cotizar/aceptar | proposals UI | payments API | proposals | client/pro | OK | Crítica |
| `lib/payments/types.ts` | Modelo pagos | breakdown, statuses | — | money | — | OK | Crítica |
| `lib/payments/providers/mercadopago.ts` | Adapter MP | checkout, webhook verify | fetch env | — | — | OK | Crítica |
| `lib/payments/confirmPayment.ts` | Confirmar cobro | RPC register | admin supabase | payments | system | OK | Crítica |
| `app/api/payments/**` | APIs dinero | pay/approve/refund… | lib/payments | payments | roles | OK | Crítica |
| `docs/PAGOS.md` | Spec pagos | documentación | — | — | — | OK | Alta |
| `lib/billing/company.ts` | Emisor SII | datos Getsemaní | — | issuer | fiscal | Parcial DTE | Alta |
| `supabase/schema_v4.sql` | Schema base | profiles, solicitudes | — | core | — | OK | Crítica |
| `supabase/FASE_1_COMPLETA.sql` | Chat/fotos/notif | RLS+storage | — | — | — | OK | Crítica |
| `supabase/SPRINT_5_PAGOS.sql` | Pagos | tablas+RPC | — | money | — | OK | Crítica |
| `supabase/SPRINT_7_VERIFICACION_IDENTIDAD.sql` | KYC | docs+bucket | — | PII | — | OK | Crítica |
| `supabase/SPRINT_MAP_CLIENT_NEARBY.sql` | Geo | nearby+live | — | geo | — | OK | Alta |
| `lib/verification/*` | Identidad | OCR, submit, types | tesseract | identity | user/admin | Parcial bio | Crítica |
| `lib/ai/provider.ts` | IA policy | fuerza local | — | — | — | OK | Alta |
| `lib/ai/serviceCatalog.ts` | Catálogo IA | keywords | — | — | — | OK | Media |
| `lib/data/categories.ts` | Taxonomía UI | CATEGORY_TREE | slugify | — | público | OK | Alta |
| `lib/worker/regulatedServices.ts` | Oficios regulados | requiresCredential | — | — | pro | OK | Alta |
| `components/worker/WorkerOnboardingWizard.tsx` | Onboarding pro | multi-step | worker APIs | worker_* | pro | OK | Alta |
| `app/cliente/mapa` + `components/map/*` | Mapa | MapLibre | geo APIs | locations | client | Parcial | Alta |
| `lib/automation/*` | Cron ciclos | match, reconcile | cronAuth | — | system | Parcial | Alta |
| `lib/intranet/platformUsers.ts` | CRUD cuentas | delete/update | admin client | profiles | super | OK | Alta |
| `app/admin/pagos/page.tsx` | Dinero admin | dashboard | payments API | money | super | OK | Alta |
| `vercel.json` | Deploy/cron | cron automate | Vercel | — | — | OK | Media |
| `.env.example` | Env template | nombres vars | — | — | ops | Incompleto vs real | Media |
| `README.md` | Intro | setup | — | — | — | Desactualizado | Media |

---

## Carpetas de alto valor

- `app/api/payments/` · `app/api/verification/` · `app/api/intranet/` · `app/api/map/`
- `lib/payments/` · `lib/auth/` · `lib/verification/` · `lib/worker/`
- `supabase/SPRINT_*.sql` · `supabase/FIX_*.sql`
