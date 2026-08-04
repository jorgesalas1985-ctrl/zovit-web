# 02 — Mapa completo de usuarios y roles

**Evidencia principal:** `lib/auth/roles.ts`, `lib/auth/intranetRoles.ts`, `lib/auth/superAdminAccess.ts`, `middleware.ts`, `components/AuthProvider.tsx`, `components/RoleGuard.tsx`, `components/intranet/IntranetGuard.tsx`, SQL `FIX_DUAL_ACCOUNT.sql`, `SPRINT_6_INTRANET.sql`, `FIX_SECURITY_HARDENING.sql`.

---

## Sistemas de roles (dos ejes ortogonales)

```
profiles.role              → client | professional | admin
profiles.can_act_as_*      → capacidades duales
profiles.active_mode       → client | professional (UI/API actuales)
profiles.intranet_role     → null | worker | supervisor | hr_admin | super_admin
```

No son lo mismo un **profesional del marketplace** y un **trabajador intranet (staff ZOVIT)**.

---

## Roles que SÍ existen

### 1. Visitante (sin autenticación)

| Campo | Valor |
|-------|-------|
| Nombre técnico | — (sin fila en `profiles`) |
| Nombre visible | Visitante / público |
| Cómo se crea | No se crea |
| Cómo inicia sesión | No aplica |
| Páginas | `/`, `/categorias`, `/servicios`, `/profesional/[id]`, `/credencial/[id]`, `/ia`, `/login`, `/registro`, legales, `/intranet` y `/intranet/acceso` (entrada), etc. |
| Acciones | Navegar, ver perfiles públicos, iniciar registro/login |
| Restricciones | Rutas protegidas → redirect `/login` (`middleware.ts` + `isProtectedRoute`) |
| Frontend-only | CTAs de publicar redirigen a `/seguridad` o registro (`getRequestServiceHref`) |
| Backend | RLS: sin `auth.uid()` no lee datos privados |

---

### 2. Cliente — `client`

| Campo | Valor |
|-------|-------|
| Nombre técnico | `client` |
| Nombre visible | Cliente |
| Creación | `/registro` eligiendo Cliente → `signUp` + trigger `handle_new_user` (`signup_source: public`). No puede autoasignarse `admin`. |
| Login | `/login` con tipo Cliente; valida `profiles.role` |
| Páginas clave | `/panel`, `/perfil`, `/solicitudes/*`, `/cliente/mapa`, `/pagos`, `/ia` |
| Acciones | Publicar solicitudes, aceptar propuestas, pagar, chatear, aprobar, calificar, cancelar (con reglas de fee) |
| Datos modificables | Perfil propio; mensajes; solicitudes propias; ratings |
| Lectura | Sus solicitudes, pagos, notificaciones; perfiles profesionales públicos vía RPC |
| Restricciones | Debe completar identidad/biometría; debe estar en `active_mode = client` para publicar |
| No posee | Panel profesional, envío de propuestas, wallet de cobro como pro |
| Frontend | `RoleGuard`, `canPublishServiceRequest` |
| Backend/DB | Middleware + RLS `requests_insert_client` + APIs de pagos con `requireAuthenticatedUser` |

Archivos: `app/registro/page.tsx`, `app/login/LoginForm.tsx`, `lib/registration/*`.

---

### 3. Profesional — `professional`

| Campo | Valor |
|-------|-------|
| Nombre técnico | `professional` |
| Nombre visible | Profesional |
| Creación | Registro público como Profesional; o activación de modo profesional (`/api/profile/activate-mode`); onboarding `/registro/trabajador` |
| Login | `/login` tipo Profesional |
| Páginas | `/trabajos`, `/experiencia`, `/verificacion`, `/pagos/profesional`, `/registro/trabajador`, credencial |
| Acciones | Propuestas, aceptar trabajos (flujo RPC), ejecutar, completar, ubicación live, payout, subir documentos |
| Datos | Perfil, worker_registrations, credentials, propuestas |
| Restricciones | Modo profesional + biometría; servicios regulados bloqueados hasta autorización |
| No posee | Publicar solicitud en modo profesional (salvo dual mode cambiado a cliente) |

Archivos: `app/trabajos/page.tsx`, `app/api/worker/registration/route.ts`, `lib/worker/*`.

---

### 4. Dual mode (no es rol nuevo)

Usuario con `can_act_as_client` y `can_act_as_professional` puede cambiar `active_mode` vía RPC/API.

- Archivos: `FIX_DUAL_ACCOUNT.sql`, `app/api/profile/activate-mode/route.ts`, `components/profile/AccountModeControls.tsx` (si existe), `RoleModeBanner`.

---

### 5. Administrador plataforma — `admin`

| Campo | Valor |
|-------|-------|
| Nombre técnico | `admin` |
| Nombre visible | Administrador |
| Creación | **No** por registro público. Asignación vía superadmin / service_role (`platformUsers`). Bootstrap del primero: **NO DETERMINADO** (comentario SQL de seed). |
| Login | `/login` (admin pasa chequeo de tipo de cuenta) |
| Páginas | `/admin/verificacion`; **no** `/admin/pagos` salvo también `super_admin` |
| Acciones | Revisión verificación (según APIs `requirePlatformAdmin`) |
| Restricción clave | Dinero solo super_admin (`middleware.ts`, `FIX_MONEY_SUPER_ADMIN_ONLY.sql`) |

---

### 6. Intranet — `worker` (staff)

| Campo | Valor |
|-------|-------|
| Nombre técnico | `intranet_role = worker` |
| Nombre visible | Trabajador ZOVIT |
| Creación | RR.HH./superadmin: `createIntranetUser` → Auth admin + profile con `role: client` + `intranet_role` |
| Login | `/intranet/acceso` |
| Home | `/intranet/trabajador` |
| Permisos | Ver ficha propia, beneficios, liquidación propia |
| Realidad UI | Mucho “próximamente” |

---

### 7. Intranet — `supervisor`

| Campo | Valor |
|-------|-------|
| Visible | Supervisor |
| Home | `/intranet/supervisor` |
| Permisos | + ver fichas del equipo |
| Archivos | `lib/auth/intranetRoles.ts`, `app/intranet/supervisor/page.tsx` |

---

### 8. Intranet — `hr_admin`

| Campo | Valor |
|-------|-------|
| Visible | Administrador (RR.HH.) |
| Home | `/intranet/admin` |
| Permisos | Usuarios intranet, verificación, trabajadores; **sin** dinero ni `gestion-usuarios` (solo super) |
| Puede asignar | `worker`, `supervisor` (no `super_admin` salvo reglas en manageUsers) |

---

### 9. Intranet — `super_admin`

| Campo | Valor |
|-------|-------|
| Visible | Super administrador |
| Home | `/intranet/finanzas` |
| Permisos | Dinero, todas las cuentas, payouts, disputas, flags de comisión |
| Bypass | Biometría, RoleGuard, modo (`hasUnrestrictedSuperAdminAccess`) |
| Tour UI | `superAdminView.ts` — simula vistas **sin** cambiar rol real en DB |

---

## Roles buscados que NO existen como roles de sistema

| Rol buscado | Resultado |
|-------------|-----------|
| Maestro | No es rol; texto de oficio en `lib/worker/profiles.ts` (“Maestro de terminaciones”) |
| Técnico | No es rol; especialidad “Soporte técnico PC” |
| Empresa | No existe como `UserRole` |
| Moderador | No existe |
| Soporte | No existe como rol; copy de contacto / `QuickHelpAssistant` |
| Superadministrador (plataforma aparte) | Existe solo como `intranet_role = super_admin` |
| Usuario bloqueado | No hay enum `blocked` en profiles; sí `authorization_status = blocked` en servicios de worker |
| Usuario pendiente de validación | Sí hay estados de identidad: `identity_status` / biometric flags (`lib/verification/types.ts`) — no es un “rol” sino un estado |

---

## Matriz frontend vs backend

| Control | Dónde |
|---------|-------|
| Ocultar menús / botones | Frontend (`AuthProvider`, guards) |
| Redirigir rutas | **Middleware** (fuerte) |
| Mutar pagos / wallets | API + RPC `service_role` / super_admin |
| Autoescalar a admin | Bloqueado por trigger `protect_profile_privileges` (`FIX_SECURITY_HARDENING.sql`) |
| RLS | Cada tabla con policies |

**Riesgo:** `RoleGuard` trata `role === admin` como acceso amplio en UI; el dinero sigue protegido por middleware. Un admin histórico sin `super_admin` no entra a `/admin/pagos`.

---

## Archivos relacionados (índice)

| Tema | Archivos |
|------|----------|
| Roles plataforma | `lib/auth/roles.ts` |
| Roles intranet | `lib/auth/intranetRoles.ts` |
| Superadmin | `lib/auth/superAdminAccess.ts`, `lib/auth/superAdminView.ts` |
| Middleware | `middleware.ts` |
| Guards | `components/RoleGuard.tsx`, `components/intranet/IntranetGuard.tsx` |
| API auth | `lib/auth/requirePlatformAdmin.ts`, `lib/intranet/apiAuth.ts` |
| Staff CRUD | `lib/intranet/manageUsers.ts` |
| Platform users | `lib/intranet/platformUsers.ts` |
