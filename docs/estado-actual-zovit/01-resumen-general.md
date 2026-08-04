# 01 — Resumen general del proyecto ZOVIT

**Fecha de auditoría:** 29 de julio de 2026  
**Commit revisado:** `06b27b5` (`06b27b5fc296358a912bbd40fde8b2a3687cdbe0`)  
**Paquete:** `zovit-web-v5-phase1` versión `5.0.0` (`package.json`)  
**Repositorio local:** `ZOVIT_Web_v5.0_Fase_1_Completa/ZOVIT_Web_v4.0_Produccion`  
**Nota:** En el working tree hay cambios locales sin commit (pagos, verificación, mapa, intranet, etc.). Este informe describe el código presente en disco en esa fecha.

---

## Qué es ZOVIT

ZOVIT es una plataforma web (marketplace) que conecta a **clientes** que necesitan un servicio con **profesionales** verificados. El pago del servicio se cobra por la plataforma y se **retiene** hasta que el cliente aprueba el trabajo; luego se libera el neto al profesional y ZOVIT registra su comisión.

Evidencia de posicionamiento:

- `app/layout.tsx` — título/descripción: “Solicita un servicio. Paga al aprobar.”
- `app/page.tsx` + `components/home/HomeHeroStory.tsx` — historia visual del flujo solicitud → match → pago protegido → aprobación.
- `docs/PAGOS.md` — modelo de escrow (retención en ledger interno).

**Stack real:** Next.js 15 + React 19 + Supabase (Auth, Postgres, Storage, Realtime) + MapLibre/OSM + Mercado Pago (HTTP) + OCR local Tesseract. Hosting previsto/documentado: Vercel (`vercel.json`, `docs/DEPLOY.md`, dominio zovit.cl).

---

## Qué problema busca resolver

Conectar demanda de servicios del hogar/oficios/profesionales con oferta verificada, reduciendo el riesgo de pagar sin resultado: el dinero queda retenido hasta aprobación del cliente (`docs/PAGOS.md`, RPCs `register_payment_received` / `approve_and_release_payment` en `supabase/SPRINT_5_PAGOS.sql`).

---

## Quiénes son sus usuarios

| Tipo | Existe en código | Nombre técnico |
|------|------------------|----------------|
| Visitante (sin cuenta) | Sí (páginas públicas) | — |
| Cliente | Sí | `role = client` + modo cliente |
| Profesional | Sí | `role = professional` + modo profesional |
| Administrador de plataforma | Sí | `role = admin` |
| Personal intranet ZOVIT | Sí | `intranet_role`: worker / supervisor / hr_admin / super_admin |
| Empresa (cuenta B2B) | **No** como rol de usuario | Solo emisor tributario en `lib/billing/company.ts` |

Evidencia roles: `lib/auth/roles.ts`, `lib/auth/intranetRoles.ts`.

---

## Cómo funciona actualmente (visión corta)

1. Persona se registra como cliente o profesional (`app/registro/page.tsx`).
2. Debe completar verificación de identidad / biométrica (carnet + selfie) antes de usar panel, solicitudes, trabajos y pagos (`middleware.ts` + `lib/verification/types.ts`).
3. Cliente publica solicitud o usa mapa/IA para encontrar profesionales.
4. Profesional envía cotización (`service_proposals`).
5. Cliente acepta → se crea orden de trabajo y pago (`work_orders`, `payments`).
6. Cliente paga (Mercado Pago en producción; mock en desarrollo).
7. Profesional ejecuta; cliente aprueba; se libera el neto a billetera interna (`wallets`).
8. Cliente puede calificar (`service_ratings`).

---

## Qué puede hacer realmente un cliente

**Implementado (con backend/DB):**

- Registro e inicio de sesión (`app/registro`, `app/login`).
- Recuperación de contraseña (`app/auth/restablecer-clave`).
- Completar perfil (`app/perfil`).
- Verificación de identidad / biometría (`app/registro/biometria`, `app/verificacion` vía APIs).
- Explorar categorías y perfiles públicos (`app/categorias`, `app/servicios`, `app/profesional/[id]`).
- Publicar solicitud (`app/solicitudes/nueva`).
- Ver detalle, chat, fotos, propuestas y pagos (`app/solicitudes/[id]`, `app/pagos`).
- Mapa de profesionales cercanos (`app/cliente/mapa`).
- Búsqueda asistida por reglas/IA local (`app/ia`).
- Aprobar trabajo, disputar/reembolsar vía APIs de pagos.
- Calificar tras pago liberado (`components/ServiceRatingForm.tsx`, `SPRINT_3_EXPERIENCIA.sql`).

**Limitado / no existe:**

- Eliminación de cuenta por el propio cliente: **no hay UI de autoeliminación**; solo superadmin puede borrar usuarios (`lib/intranet/platformUsers.ts`).
- Rol “empresa cliente” con multi-usuarios: **no existe**.

---

## Qué puede hacer realmente un profesional

**Implementado:**

- Registro como profesional + onboarding de trabajador (`app/registro/trabajador`, `components/worker/WorkerOnboardingWizard.tsx`).
- Verificación de identidad y carga de credenciales/certificados.
- Panel de trabajos (`app/trabajos`), experiencia (`app/experiencia`), pagos profesional (`app/pagos/profesional`).
- Enviar propuestas, iniciar/completar trabajo, ver billetera y solicitar payout (`app/api/payments/*`).
- Chat en la solicitud, publicar ubicación en vivo durante trabajo activo (`ProfessionalLiveLocationPublisher`).
- Credencial pública (`app/credencial/[id]`).

**Parcial / simulado:**

- “Biometría” real (match facial): UI + foto de desafío, **sin** comparación biométrica ML (`lib/verification/biometric.ts` según auditoría de código).
- Validación automática de títulos/credenciales de oficio: cola humana; “IA” de worker docs no aprueba (`lib/worker/aiDocumentValidation.ts` / batch → dudoso).
- Liquidaciones intranet del personal: demo (`app/intranet/liquidaciones/page.tsx`).

---

## Qué puede hacer un administrador

Hay dos capas:

1. **`role = admin` (plataforma):** acceso a `/admin/verificacion` (y rutas `/admin/*` excepto dinero).
2. **`intranet_role = super_admin`:** dinero (`/admin/pagos`), finanzas, gestión de todas las cuentas, payouts, disputas.
3. **`intranet_role = hr_admin`:** usuarios intranet, verificación, trabajadores — **sin** dinero.

Evidencia: `middleware.ts`, `lib/auth/intranetRoles.ts`, `FIX_MONEY_SUPER_ADMIN_ONLY.sql`.

---

## Qué puede hacer una empresa

**El rol de usuario “empresa” no existe** en `UserRole` ni en la base como tipo de cuenta.

Existe solo la **empresa emisora tributaria** de ZOVIT (Impresiones Getsemaní / Haulmer) en `lib/billing/company.ts`, usada para textos de boleta/comprobante. Emisión SII vía API Haulmer: **pendiente de cablear** (`docs/PAGOS.md`).

---

## Funcionalidades completas (alto nivel)

| Área | Estado |
|------|--------|
| Auth Supabase + perfiles + dual mode cliente/profesional | Implementado |
| Solicitudes + chat + fotos + notificaciones in-app | Implementado |
| Propuestas + pagos Mercado Pago + escrow ledger | Implementado (Fase A) |
| Calificaciones y experiencia verificable | Implementado |
| Verificación identidad con OCR local carnet | Implementado (parcial humano en dudosos) |
| Categorías browse + SEO | Implementado (datos en TypeScript) |
| Intranet RR.HH. / superadmin usuarios y verificación | Implementado (parcial UI) |
| Mapa + geocoding + nearby | Implementado |
| Certificados emitidos con folio/QR | Implementado |

---

## Funcionalidades incompletas

| Área | Estado |
|------|--------|
| Split Marketplace Mercado Pago (Fase B) | Pendiente (`docs/PAGOS.md`) |
| Webpay / Stripe / transferencia | Stubs (`lib/payments/providers/index.ts`) |
| Emisión DTE Haulmer | Pendiente |
| Auto-match: notifica, no asigna profesional | Parcial |
| Tracking GPS en vivo | Parcial (requiere migración + trabajo activo) |
| IA generativa / visión cloud | Desactivada (`lib/ai/provider.ts`) |
| Validación automática credenciales de oficio | Simulada → cola humana |
| Nómina / finanzas intranet | Visual / demo |
| Apps móviles | “Próximamente” (`components/SiteFooter.tsx`) |

---

## Funcionalidades solo visuales

- Liquidaciones con `demoPayrolls` (`app/intranet/liquidaciones/page.tsx`).
- Partes de `/intranet/finanzas` con textos “próximamente”.
- Fichas intranet trabajador/beneficios “próximamente” (`app/intranet/trabajador/page.tsx`).
- Diálogo de seguridad del chat (copy) (`components/messaging/ChatSafetyDialogue.tsx`).

---

## Funcionalidades eliminadas o ausentes

No hay un registro formal de “features eliminadas” en el repo. Lo que **no aparece** como rol/flujo a pesar de búsquedas:

- Transporte de **personas** (sí existe **Transporte de carga**).
- Rol empresa, maestro, técnico, moderador, soporte como roles de sistema.
- Autoeliminación de cuenta por el usuario.

Código antiguo: backups SQL en `supabase/backups/`, scripts de prueba en `scripts/`.

---

## Partes antiguas o abandonadas

- `supabase/backups/*.sql` — copias históricas.
- Proveedores de pago stub (webpay, stripe, bank_transfer) preparados pero no integrados.
- Nombres de funciones “OpenAI” que en realidad usan OCR local (`analyzeCarnetWithOpenAI` → Tesseract).
- README aún describe “Fase 1” básica; el código supera ampliamente ese alcance (sprints 3–24 + mapa).

---

## Estado general actual

ZOVIT es un **marketplace funcional de servicios con pago retenido**, autenticación real, RLS, verificación de identidad con OCR, mapa y panel administrativo/intranet. No es solo un prototipo visual.

Limitaciones relevantes para producción:

1. Escrow es ledger ZOVIT con un solo collector MP (no split marketplace).
2. Biometría facial no es biometría real.
3. Muchas migraciones SQL deben estar aplicadas en el proyecto Supabase; el estado remoto exacto es **NO DETERMINADO** solo desde el código.
4. Hay cambios locales sin push respecto de `origin/main` al momento de la auditoría.

---

## Flujo real paso a paso (entrada → fin de servicio)

1. **Entra a** `/` (público) — ve propuesta de valor y CTAs.
2. **Explora** `/categorias` o `/servicios` o `/ia` (público browse; publicar requiere login).
3. **Si no tiene cuenta:** `/seguridad` o `/registro` → elige Cliente o Profesional → datos personales, RUT, fecha nacimiento (18+), email/clave → Supabase Auth + trigger `handle_new_user`.
4. **Biometría / identidad:** `/registro/biometria` — carnet + selfie; OCR local puede autoaprobar; si no, cola admin.
5. **Middleware** bloquea `/panel`, `/solicitudes/nueva`, `/cliente`, `/trabajos`, `/pagos` hasta identidad completa (salvo superadmin).
6. **Cliente** crea solicitud en `/solicitudes/nueva` o desde `/cliente/mapa` (API `map/requests` puede disparar auto-match = notificaciones).
7. **Profesionales** ven trabajos abiertos (`/trabajos` / RPCs) y envían propuesta con monto.
8. **Cliente** acepta propuesta → orden + pago `esperando_pago`.
9. **Cliente** paga en `/pagos` → Mercado Pago Checkout Pro → webhook → `pago_retenido` + `held_balance`.
10. **Profesional** inicia y completa trabajo vía APIs; opcionalmente emite ubicación en vivo.
11. **Cliente** aprueba → `pago_liberado` → neto a `available_balance` del profesional; comisión ZOVIT contabilizada.
12. **Cliente** califica; experiencia del profesional se actualiza.
13. **Profesional** puede pedir retiro (`payout_requests`) — procesamiento real de transferencia bancaria automática: **parcial/NO DETERMINADO** (existe RPC/API; integración bancaria plena no confirmada como automática fuera de MP).

---

## Archivos clave de este resumen

| Archivo | Por qué |
|---------|---------|
| `package.json` | Stack y versión |
| `middleware.ts` | Gates reales de acceso |
| `lib/auth/roles.ts` | Roles plataforma |
| `lib/auth/intranetRoles.ts` | Roles staff |
| `docs/PAGOS.md` | Modelo de dinero documentado en repo |
| `lib/billing/company.ts` | Emisor legal |
| `app/page.tsx` | Landing |
| `README.md` | Descripción Fase 1 (parcialmente desactualizada) |
