# SEG-001 — Informe de cambios de permisos y separación de dinero

Fecha de revisión: 2026-07-29
Alcance: solo los cambios que tienen evidencia directa de reforzar permisos administrativos, acceso intranet, visibilidad de cuentas sensibles y separación de dinero.

> Nota: este informe se basa en el working tree actual del repositorio y en el contenido de los archivos presentes. No se realizaron nuevas correcciones ni nuevos commits durante esta revisión.

## 1) Archivos modificados

| Archivo | Función(es) afectadas | Resumen del cambio | Motivo exacto | ¿Pertenece a SEG-001? | ¿Fue solo para compilación/typecheck? |
|---|---|---|---|---|---|
| [middleware.ts](../../middleware.ts) | `middleware` | Se agregaron guardas para intranet, rutas financieras y bypass real de super admin. | Evitar que usuarios sin rol intranet real o sin permisos de dinero entren a áreas sensibles. | Sí | No |
| [lib/auth/roles.ts](../../lib/auth/roles.ts) | `isFinancialAdminRoute`, `isProtectedRoute`, `canAccessRoute`, `canPublishServiceRequest`, `canAccessProfessionalFeatures` | Se reforzó la política de acceso por ruta y modo, bloqueando rutas de dinero y restringiendo accesos por rol. | Reforzar la separación entre clientes, profesionales, admins y finanzas. | Sí | No |
| [lib/auth/requirePlatformAdmin.ts](../../lib/auth/requirePlatformAdmin.ts) | `requirePlatformAdmin` | Se centralizó el chequeo de acceso de admins de plataforma mediante el helper de super admin. | Garantizar que solo admins reales o super admins puedan usar APIs administrativas. | Sí | No |
| [lib/auth/superAdminAccess.ts](../../lib/auth/superAdminAccess.ts) | `hasUnrestrictedSuperAdminAccess` | Se añadió un helper explícito para otorgar acceso total al super admin real. | Evitar depender de la UI o de permisos simulados para decidir acceso irrestricto. | Sí | No |
| [components/RoleGuard.tsx](../../components/RoleGuard.tsx) | `hasRequiredAccess`, `RoleGuard` | Se incorporó el bypass del super admin real y se alineó la UI con la política de backend. | Evitar que la interfaz permita ver contenido restringido aunque el backend no lo haga. | Sí | No |
| [components/intranet/IntranetGuard.tsx](../../components/intranet/IntranetGuard.tsx) | `IntranetGuard` | Se añadió la lógica de super admin real y el manejo de roles efectivos frente al paseo simulado. | Proteger el intranet contra accesos indebidos y roles simulados. | Sí | No |
| [lib/intranet/accessVisibility.ts](../../lib/intranet/accessVisibility.ts) | `isHiddenFromNonSuperAdmins`, `canViewerSeeIntranetAccount`, `canViewerSeePlatformAccount`, `roleForAccessGate` | Se configuró visibilidad especial para cuentas sensibles y permisos irrestrictos del super admin. | Mantener ocultas las cuentas del super admin para otros roles y proteger dinero/admin. | Sí | No |
| [lib/intranet/platformUsers.ts](../../lib/intranet/platformUsers.ts) | `canDeletePlatformUser`, `canVerifyPlatformUser`, `isSuperAdminAccount`, `updatePlatformUser`, `reviewPlatformUserVerification` | Se añadieron protecciones para no borrar ni rechazar al super admin y para validar revisión de cuentas. | Evitar acciones críticas sobre cuentas privilegiadas. | Sí | No |
| [lib/intranet/verificationQueue.ts](../../lib/intranet/verificationQueue.ts) | `listPendingVerificationUsers` | Se filtró al super admin de la cola de revisión humana. | Evitar que el super admin aparezca como un usuario normal a revisar. | Sí | No |
| [app/admin/pagos/page.tsx](../../app/admin/pagos/page.tsx) | `AdminPaymentsPage` | Se restringió la vista del panel de dinero a super admin y se mostró un bloqueo claro para RR.HH. | Proteger el tablero financiero y evitar accesos no autorizados. | Sí | No |
| [app/admin/verificacion/page.tsx](../../app/admin/verificacion/page.tsx) | `AdminVerificationPage` | Se reforzó el flujo de revisión de identidad con guardas de rol y el uso de APIs administrativas. | Mantener la revisión de identidad en el canal admin correcto. | Sí | No |
| [app/api/payments/dashboard/admin/route.ts](../../app/api/payments/dashboard/admin/route.ts) | `GET` | Se añadió una validación de super admin real antes de exponer datos de pagos, disputas y retiros. | Evitar que roles de intranet no autorizados lean datos financieros. | Sí | No |
| [app/api/intranet/platform-users/[id]/verify/route.ts](../../app/api/intranet/platform-users/[id]/verify/route.ts) | `POST` | Se bloqueó el endpoint de verificación a través de un guard de super admin. | Proteger la revisión de cuentas internas. | Sí | No |
| [app/api/intranet/workers/ai-validate/route.ts](../../app/api/intranet/workers/ai-validate/route.ts) | `GET`, `POST` | Se añadió el chequeo de HR admin / super admin para procesar revisiones de worker con IA. | Limitar la lógica de revisión de trabajadores a roles internos autorizados. | Sí | No |
| [app/api/admin/verification/[profileId]/route.ts](../../app/api/admin/verification/[profileId]/route.ts) | `POST`, `GET` | Se reforzó la autorización de revisión de identidad con `requirePlatformAdmin` y protección explícita del super admin. | Evitar que cualquier admin de UI o ruta no autorizada apruebe/rechace identidades. | Sí | No |
| [app/api/intranet/verification/[profileId]/route.ts](../../app/api/intranet/verification/[profileId]/route.ts) | `GET`, `POST` | Se agregó validación de permisos intranet, visibilidad de cuentas ocultas y protección del super admin. | Asegurar que la revisión intranet no sea accesible a perfiles equivocados. | Sí | No |

## 2) Funciones modificadas por cambio

### [middleware.ts](../../middleware.ts)
- `middleware`

### [lib/auth/roles.ts](../../lib/auth/roles.ts)
- `isFinancialAdminRoute`
- `isProtectedRoute`
- `canAccessRoute`
- `canPublishServiceRequest`
- `canAccessProfessionalFeatures`

### [lib/auth/requirePlatformAdmin.ts](../../lib/auth/requirePlatformAdmin.ts)
- `requirePlatformAdmin`

### [lib/auth/superAdminAccess.ts](../../lib/auth/superAdminAccess.ts)
- `hasUnrestrictedSuperAdminAccess`

### [components/RoleGuard.tsx](../../components/RoleGuard.tsx)
- `hasRequiredAccess`
- `RoleGuard`

### [components/intranet/IntranetGuard.tsx](../../components/intranet/IntranetGuard.tsx)
- `IntranetGuard`

### [lib/intranet/accessVisibility.ts](../../lib/intranet/accessVisibility.ts)
- `isHiddenFromNonSuperAdmins`
- `canViewerSeeIntranetAccount`
- `canViewerSeePlatformAccount`
- `roleForAccessGate`

### [lib/intranet/platformUsers.ts](../../lib/intranet/platformUsers.ts)
- `canDeletePlatformUser`
- `canVerifyPlatformUser`
- `isSuperAdminAccount`
- `updatePlatformUser`
- `reviewPlatformUserVerification`

### [lib/intranet/verificationQueue.ts](../../lib/intranet/verificationQueue.ts)
- `listPendingVerificationUsers`

### [app/admin/pagos/page.tsx](../../app/admin/pagos/page.tsx)
- `AdminPaymentsPage`

### [app/admin/verificacion/page.tsx](../../app/admin/verificacion/page.tsx)
- `AdminVerificationPage`

### [app/api/payments/dashboard/admin/route.ts](../../app/api/payments/dashboard/admin/route.ts)
- `GET`

### [app/api/intranet/platform-users/[id]/verify/route.ts](../../app/api/intranet/platform-users/[id]/verify/route.ts)
- `POST`

### [app/api/intranet/workers/ai-validate/route.ts](../../app/api/intranet/workers/ai-validate/route.ts)
- `GET`
- `POST`

### [app/api/admin/verification/[profileId]/route.ts](../../app/api/admin/verification/[profileId]/route.ts)
- `POST`
- `GET`

### [app/api/intranet/verification/[profileId]/route.ts](../../app/api/intranet/verification/[profileId]/route.ts)
- `GET`
- `POST`

## 3) Diff resumido por cambio

- [middleware.ts](../../middleware.ts): se añadió una barrera de acceso a caminos de intranet y dinero, con excepción explícita para el super admin real.
- [lib/auth/roles.ts](../../lib/auth/roles.ts): se movieron las reglas de acceso a un modelo más estricto por ruta y rol, en vez de dejar abiertas las rutas sensibles.
- [lib/auth/requirePlatformAdmin.ts](../../lib/auth/requirePlatformAdmin.ts): se centralizó el control de acceso para APIs de admin de plataforma.
- [lib/auth/superAdminAccess.ts](../../lib/auth/superAdminAccess.ts): se creó un helper único para el bypass del super admin real.
- [components/RoleGuard.tsx](../../components/RoleGuard.tsx): la UI ahora respeta la misma regla de super admin en vez de depender solo del perfil visible.
- [components/intranet/IntranetGuard.tsx](../../components/intranet/IntranetGuard.tsx): el guard intranet ahora distingue entre rol real y rol simulado/paseo.
- [lib/intranet/accessVisibility.ts](../../lib/intranet/accessVisibility.ts): se añadieron reglas para ocultar cuentas sensibles y preservar permisos irrestrictos del super admin.
- [lib/intranet/platformUsers.ts](../../lib/intranet/platformUsers.ts): se añadió protección a operaciones de gestión de usuarios y verificación.
- [lib/intranet/verificationQueue.ts](../../lib/intranet/verificationQueue.ts): la cola de revisión humana ya excluye al super admin.
- [app/admin/pagos/page.tsx](../../app/admin/pagos/page.tsx): el panel de finanzas ahora se renderiza solo para el super admin real.
- [app/admin/verificacion/page.tsx](../../app/admin/verificacion/page.tsx): la UI de verificación quedó atada a la ruta administrativa correcta y a la revisión con permisos.
- [app/api/payments/dashboard/admin/route.ts](../../app/api/payments/dashboard/admin/route.ts): el endpoint de datos financieros quedó protegido por un gate de super admin.
- [app/api/intranet/platform-users/[id]/verify/route.ts](../../app/api/intranet/platform-users/[id]/verify/route.ts): la revisión de cuentas internas quedó protegida por el guard de intranet.
- [app/api/intranet/workers/ai-validate/route.ts](../../app/api/intranet/workers/ai-validate/route.ts): la cola de revisión de workers quedó limitada a roles internos autorizados.
- [app/api/admin/verification/[profileId]/route.ts](../../app/api/admin/verification/[profileId]/route.ts): la revisión de identidad pasó a usar un guard explícito de admin de plataforma.
- [app/api/intranet/verification/[profileId]/route.ts](../../app/api/intranet/verification/[profileId]/route.ts): la revisión intranet quedó protegida y filtrada por visibilidad de cuenta.

## 4) Motivo exacto de cada modificación

- Se buscó reforzar el principio de menor privilegio en rutas de administración y dinero.
- Se buscó impedir que los permisos dependieran solo de la UI o del rol visible en el front-end.
- Se buscó separar de forma más clara los permisos de dinero, intranet y verificación.
- Se buscó bloquear operaciones sensibles sobre cuentas privilegiadas como el super admin.

## 5) ¿Cada cambio pertenece realmente a SEG-001?

Sí, con una salvedad importante: los archivos listados arriba tienen evidencia directa de estar alineados con el objetivo de SEG-001 (permisos administrativos y separación de dinero). Los cambios de pago genéricos que no involucran acceso ni privilegios no se incluyeron en este informe.

## 6) ¿Algún cambio fue realizado únicamente para corregir errores de compilación?

No hay evidencia suficiente para afirmar que los cambios listados arriba fueron hechos únicamente para que el proyecto compilara. Todos parecen responder a una intención de seguridad y control de acceso, no a una corrección de tipado o compilación.

## 7) Confirmación sobre [lib/ai/deepseek.test.ts](../../lib/ai/deepseek.test.ts)

No, no se puede confirmar que [lib/ai/deepseek.test.ts](../../lib/ai/deepseek.test.ts) haya sido modificado solo para permitir que typecheck terminara correctamente. Ese archivo es un test nuevo para el helper de DeepSeek y no forma parte del alcance de SEG-001 ni del refuerzo de permisos. Su presencia es ajena al objetivo de esta mejora.

## 8) Conclusión

El cambio más claro de SEG-001 está concentrado en:
- la protección de rutas administrativas y financieras,
- el uso de helpers de super admin real,
- la restricción de APIs de revisión y gestión,
- y la ocultación/filtrado de cuentas sensibles en el intranet.

No se hicieron nuevas correcciones ni nuevos commits durante esta revisión.
