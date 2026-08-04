# 06 — Panel administrativo

ZOVIT tiene **dos superficies admin**:

1. **`/admin/*`** — admin de plataforma (`role=admin`) + pagos solo `super_admin`.
2. **`/intranet/*`** — personal interno con `intranet_role`.

---

## Pantallas existentes

| Ruta | Quién | Función real |
|------|-------|--------------|
| `/admin/verificacion` | admin / staff vía APIs | Cola verificación identidad |
| `/admin/pagos` | **solo super_admin** | Dashboard dinero |
| `/intranet` | público entrada | Hub |
| `/intranet/acceso` | login staff | Auth |
| `/intranet/admin` | hr_admin, super_admin | Hub RR.HH. |
| `/intranet/admin/usuarios` | hr_admin, super_admin | Usuarios intranet |
| `/intranet/admin/gestion-usuarios` | **solo super_admin** | Todas las cuentas plataforma |
| `/intranet/admin/trabajadores` | hr_admin, super_admin | Worker registrations / credenciales |
| `/intranet/admin/verificacion` | hr_admin, super_admin | Verificación identidad |
| `/intranet/finanzas` | super_admin | Hub + links; KPIs “próximamente” |
| `/intranet/liquidaciones` | intranet roles | **Datos demo** |
| `/intranet/supervisor` | supervisor | Shell |
| `/intranet/trabajador` | worker | Shell “próximamente” |
| `/intranet/equipo` | supervisor+ | Shell |

---

## Gestión de usuarios

| Capacidad | Estado | Archivos |
|-----------|--------|----------|
| Listar/editar cuentas plataforma | Completo | `PlatformUsersManager.tsx`, `lib/intranet/platformUsers.ts`, APIs `platform-users` |
| Verificar / cambiar roles | Completo (superadmin) | `.../verify`, updates protegidos |
| Eliminar usuario | Completo (superadmin) | `deleteUser` + `FIX_PLATFORM_USER_DELETE.sql` |
| Crear usuarios intranet | Completo | `IntranetUsersManager.tsx`, `manageUsers.ts` |

---

## Gestión de profesionales / verificación documentos

| Capacidad | Mutación real | Archivos |
|-----------|---------------|----------|
| Aprobar/rechazar identidad | Sí | `app/api/admin/verification/*`, `app/api/intranet/verification/*` |
| OCR IA carnet (local) | Sí | `ai-validate` routes, `lib/verification/localCarnetOcr.ts` |
| Revisar workers / autorizar servicios | Sí | `app/api/intranet/workers/*` |
| “IA” documentos worker | Casi no (siempre dudoso) | `ai-validate` workers |

**Nota:** `SPRINT_24_SUPERADMIN_NO_REJECT.sql` — no se puede rechazar identidad de un super_admin.

---

## Categorías / servicios

No hay CRUD admin de categorías en DB. Las categorías viven en TypeScript (`lib/data/categories.ts`). **No hay pantalla admin de taxonomía.**

---

## Solicitudes / trabajos / pagos / comisiones

| Capacidad | Estado | Archivos |
|-----------|--------|----------|
| Dashboard pagos admin | Completo | `AdminPaymentsDashboard`, `/api/payments/dashboard/admin` |
| Disputas resolver | Completo | `/api/payments/disputes/[id]/resolve` |
| Flags comisión chat | Completo | `/api/payments/commission-flags/[id]` |
| Waive cancellation fee | Completo | `.../cancellation-fees/[id]/waive` |
| Payouts procesar | Parcial/Completo API | `/api/payments/payouts` |

Protección: `FIX_MONEY_SUPER_ADMIN_ONLY.sql` + middleware `/admin/pagos`.

---

## Reclamos / disputas / reportes / bloqueos

| Capacidad | Estado |
|-----------|--------|
| Disputas de pago | Implementado |
| Reportes analíticos globales | Parcial / no hay BI completo |
| Bloqueo login usuario | NO DETERMINADO (no UI clara) |
| Bloqueo servicio profesional | Implementado (`authorization_status`) |

---

## Certificados / ubicaciones / contenido / estadísticas

| Capacidad | Estado | Evidencia |
|-----------|--------|-----------|
| Certificados emitidos | Completo (emisión + validación pública) | `issued_certificates`, `/certificados/*` |
| Ubicaciones admin | No hay panel GIS admin dedicado | — |
| CMS contenido | No | Copy hardcodeado en páginas |
| Estadísticas financieras | Solo visual / próximamente | `/intranet/finanzas` |
| Snapshots financieros tabla | Existe SQL `intranet_financial_snapshots` | Uso UI: débil |

---

## Notificaciones / auditoría / seguridad

| Capacidad | Estado |
|-----------|--------|
| Notificaciones in-app a usuarios | Completo (tabla `notifications`) |
| Panel admin de notificaciones masivas | No encontrado |
| Auditoría pagos | `payment_events` |
| Auditoría worker | `worker_review_history` |
| Privilege lock | Trigger perfiles |

---

## Botones / datos simulados

| Elemento | Problema |
|----------|----------|
| `demoPayrolls` en liquidaciones | Datos ficticios — no mutan DB real de nómina operativa |
| Finanzas “próximamente” | No calcula KPIs reales |
| Tour superadmin | Cambia vista UI, no permisos reales (sigue siendo superadmin) |

---

## Protección de accesos

| Capa | Mecanismo |
|------|-----------|
| Middleware | Sesión + intranet_role + super_admin pagos |
| `IntranetGuard` | Roles por path |
| APIs | `requireIntranetSuperAdmin`, `requireIntranetManager`, `requirePlatformAdmin` |
| RLS | Policies por tabla |

---

## Archivos por función (índice)

| Función | Archivos |
|---------|----------|
| Verificación | `app/admin/verificacion/page.tsx`, `app/intranet/admin/verificacion/page.tsx`, APIs verification |
| Trabajadores | `app/intranet/admin/trabajadores/page.tsx` |
| Usuarios | `components/intranet/PlatformUsersManager.tsx`, `IntranetUsersManager.tsx` |
| Pagos | `app/admin/pagos/page.tsx`, `components/payments/AdminPaymentsDashboard.tsx` |
| Shell | `components/intranet/IntranetShell.tsx` |
