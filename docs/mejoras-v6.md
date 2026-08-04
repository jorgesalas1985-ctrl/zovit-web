# ZOVIT — Plan de mejoras V6

Documento basado exclusivamente en el estado actual documentado en [docs/estado-actual-zovit/00-todo-en-uno.md](docs/estado-actual-zovit/00-todo-en-uno.md).

Este plan no modifica código, no ejecuta migraciones, no cambia la base de datos y no agrega nuevas funciones. Cuando una conclusión no puede demostrarse con el informe actual, se indica como "REQUIERE VERIFICACIÓN".

---

## 1. Mejoras críticas

### PAGO-001 — Escrow y liberación de fondos no están suficientemente garantizados para producción
1. Código identificador: PAGO-001
2. Problema detectado: El flujo de pago retenido y liberación al profesional depende de un estado de negocio complejo y no está suficientemente robusto para producción si falla un paso intermedio.
3. Evidencia del informe actual: El informe describe el modelo de escrow, el flujo de retención hasta aprobación del cliente, la liberación del neto al profesional y el registro de comisión. También señala que el modelo actual es un ledger interno de ZOVIT y que el split marketplace de Mercado Pago está pendiente.
4. Archivos probablemente relacionados: [docs/PAGOS.md](docs/PAGOS.md), [app/api/payments/webhook/[provider]/route.ts](app/api/payments/webhook/[provider]/route.ts), [app/api/payments/orders/[id]/approve/route.ts](app/api/payments/orders/[id]/approve/route.ts), [app/api/payments/orders/[id]/complete-work/route.ts](app/api/payments/orders/[id]/complete-work/route.ts), [lib/payments/confirmPayment.ts](lib/payments/confirmPayment.ts)
5. Riesgo para ZOVIT: Pérdida o bloqueo de fondos, disputas con clientes y profesionales, daño reputacional y riesgo regulatorio.
6. Solución recomendada: Fortalecer el motor de estados del flujo de pagos con idempotencia, auditoría de eventos, reconciliación automática y bloqueo de transiciones ambiguas.
7. Cambios que habría que realizar: Definir un estado de pago explícito por orden, registrar cada transición con marca de tiempo y actor, validar que la liberación solo ocurra tras aprobación válida, y agregar una revisión manual de excepciones.
8. Pruebas necesarias: Pruebas unitarias y de integración para los estados esperando_pago, pago_retenido, pago_liberado, cancelado y reembolsado, además de pruebas de reintento de webhook.
9. Requiere migración SQL: Sí, probablemente.
10. Puede afectar datos existentes: Sí, porque modificaría la lógica de estados y podría requerir normalización de registros previos.

### PAGO-002 — Webhooks de Mercado Pago y sincronización de estados pueden dejar órdenes incompletas
1. Código identificador: PAGO-002
2. Problema detectado: El procesamiento de pagos depende de webhooks y de la sincronización entre el proveedor y el estado interno; un fallo puede dejar un pago como pendiente o retenido sin pasar a estado final.
3. Evidencia del informe actual: El informe indica que el flujo de pago pasa por Mercado Pago Checkout Pro, webhook y luego a pago_retenido/held_balance. No se documenta una reconciliación o reintento robusto para eventos repetidos o perdidos.
4. Archivos probablemente relacionados: [app/api/payments/webhook/[provider]/route.ts](app/api/payments/webhook/[provider]/route.ts), [lib/payments/providers/index.ts](lib/payments/providers/index.ts), [lib/payments/providers/mock.ts](lib/payments/providers/mock.ts), [app/api/payments/orders/[id]/pay/route.ts](app/api/payments/orders/[id]/pay/route.ts)
5. Riesgo para ZOVIT: Órdenes a medias, pagos retenidos sin liberación, soporte masivo y pérdida de confianza del usuario.
6. Solución recomendada: Implementar procesamiento idempotente de webhooks, reintentos controlados y un proceso de reconciliación de pagos con estados internos.
7. Cambios que habría que realizar: Registrar IDs de evento del proveedor, evitar ejecuciones duplicadas, agregar una cola o proceso de reconciliación y mostrar al usuario un estado claro de fallo o recuperación.
8. Pruebas necesarias: Simular webhooks repetidos, webhooks incompletos y estados de proveedor inconsistentes.
9. Requiere migración SQL: REQUIERE VERIFICACIÓN.
10. Puede afectar datos existentes: Sí, si se necesitan campos nuevos para trazabilidad o reintentos.

### PAGO-003 — Liberación de fondos al profesional y retiros bancarios no están demostrados como operativamente seguros
1. Código identificador: PAGO-003
2. Problema detectado: La liberación al profesional y el proceso de retiros bancarios no se presentan como un flujo completo y plenamente controlado para producción.
3. Evidencia del informe actual: El informe señala que el neto se libera a la billetera interna del profesional y que el procesamiento real de transferencias bancarias está "parcial/NO DETERMINADO".
4. Archivos probablemente relacionados: [app/api/payments/payouts/route.ts](app/api/payments/payouts/route.ts), [app/api/payments/payouts/[id]/route.ts](app/api/payments/payouts/[id]/route.ts), [app/pagos/profesional/page.tsx](app/pagos/profesional/page.tsx), [lib/payments/confirmPayment.ts](lib/payments/confirmPayment.ts)
5. Riesgo para ZOVIT: Atrasos de pago, fraude, reclamos y problemas de cumplimiento financiero.
6. Solución recomendada: Definir un flujo de payouts con validación de identidad, límites, aprobación y trazabilidad completa antes de exponerlo a producción.
7. Cambios que habría que realizar: Restringir payouts según reglas de riesgo, registrar aprobaciones, validar datos bancarios y definir estados explícitos para pendiente, aprobado, rechazado y enviado.
8. Pruebas necesarias: Pruebas de flujo completo de payout, validación de montos, estados de rechazo y escalamiento de excepciones.
9. Requiere migración SQL: Sí, probablemente.
10. Puede afectar datos existentes: Sí, especialmente si se introducen nuevos estados y reglas de validación.

---

## 2. Mejoras de alta prioridad

### SEG-001 — Permisos administrativos y separación de dinero requieren refuerzo
1. Código identificador: SEG-001
2. Problema detectado: El acceso a dinero y a funciones administrativas parece estar dividido por roles, pero la separación debe verificarse de forma estricta para evitar accesos indebidos.
3. Evidencia del informe actual: El informe detalla que el dinero está reservado para super_admin y que existen roles de admin e intranet, pero también documenta que la vista superadmin puede simular permisos sin cambiar el rol real en base de datos.
4. Archivos probablemente relacionados: [middleware.ts](middleware.ts), [lib/auth/roles.ts](lib/auth/roles.ts), [lib/auth/intranetRoles.ts](lib/auth/intranetRoles.ts), [lib/auth/superAdminAccess.ts](lib/auth/superAdminAccess.ts), [supabase/FIX_MONEY_SUPER_ADMIN_ONLY.sql](supabase/FIX_MONEY_SUPER_ADMIN_ONLY.sql)
5. Riesgo para ZOVIT: Escalamiento de permisos, acceso no autorizado a finanzas y exposición de información sensible.
6. Solución recomendada: Reforzar el control de acceso en backend y en rutas, con reglas de menor privilegio y validación explícita por acción.
7. Cambios que habría que realizar: Revisar cada ruta de dinero y administración, agregar chequeos redundantes y eliminar cualquier lógica que dependa solo de la UI para decidir permisos.
8. Pruebas necesarias: Matriz de permisos para admin, super_admin, hr_admin, worker, client y professional.
9. Requiere migración SQL: REQUIERE VERIFICACIÓN.
10. Puede afectar datos existentes: Muy probablemente no, pero puede requerir ajustes de permisos en datos de perfil.

### SEG-002 — Políticas RLS y seguridad de APIs requieren una auditoría de cumplimiento real
1. Código identificador: SEG-002
2. Problema detectado: El informe menciona RLS y hardening de seguridad, pero no permite asumir que todas las tablas y endpoints están protegidos de forma completa.
3. Evidencia del informe actual: El informe señala que la plataforma usa RLS y que existe un SQL de hardening, pero además advierte que el estado remoto exacto no está determinado solo desde el código.
4. Archivos probablemente relacionados: [supabase/FIX_SECURITY_HARDENING.sql](supabase/FIX_SECURITY_HARDENING.sql), [lib/security/csrf.ts](lib/security/csrf.ts), [lib/security/rateLimit.ts](lib/security/rateLimit.ts), [app/api/verification/route.ts](app/api/verification/route.ts), [app/api/payments/**](app/api/payments)
5. Riesgo para ZOVIT: Fuga de datos, acceso indebido a solicitudes, pagos o documentos y exposición ante incidentes de seguridad.
6. Solución recomendada: Auditar todas las políticas RLS, los endpoints y los permisos de storage con una matriz de acceso por tabla y rol.
7. Cambios que habría que realizar: Revisar políticas y funciones RPC, validar que los permisos de lectura/escritura correspondan al flujo real y eliminar accesos excesivos.
8. Pruebas necesarias: Pruebas de autorización por rol, pruebas de acceso a documentos privados y pruebas de endpoints sensibles.
9. Requiere migración SQL: Sí, probablemente.
10. Puede afectar datos existentes: Sí, si se cambian políticas de acceso y se requiere reautorización o reindexación de permisos.

### PRIV-001 — Protección de cédulas, selfies y documentos sensibles no está suficientemente garantizada en el plan actual
1. Código identificador: PRIV-001
2. Problema detectado: El sistema maneja documentos sensibles para verificación de identidad, pero el informe no demuestra que exista una protección completa y auditada de esos datos.
3. Evidencia del informe actual: El informe menciona verificación de identidad con OCR local, carnet, selfie, cola administrativa y documentos cargados. También menciona el uso de storage y verificación manual.
4. Archivos probablemente relacionados: [app/api/verification/route.ts](app/api/verification/route.ts), [lib/verification/aiCarnetOcr.ts](lib/verification/aiCarnetOcr.ts), [lib/verification/types.ts](lib/verification/types.ts), [app/registro/biometria/page.tsx](app/registro/biometria/page.tsx), [app/api/worker/documents/route.ts](app/api/worker/documents/route.ts)
5. Riesgo para ZOVIT: Violación de privacidad, fuga de datos personales, incumplimiento legal y efecto negativo sobre la confianza del usuario.
6. Solución recomendada: Asegurar cifrado, control de acceso estricto, URLs firmadas, retención limitada y registro de accesos a documentos sensibles.
7. Cambios que habría que realizar: Revisar políticas de storage, agregar trazabilidad a accesos y aplicar controles por rol antes de exponer documentos a administradores o procesos automáticos.
8. Pruebas necesarias: Pruebas de acceso no autorizado, validación de URLs firmadas y verificación de retención de documentos.
9. Requiere migración SQL: REQUIERE VERIFICACIÓN.
10. Puede afectar datos existentes: Sí, si se cambia la forma de almacenar o exponer documentos.

### PRIV-002 — Eliminación de cuenta y derechos de datos no están implementados como proceso de usuario
1. Código identificador: PRIV-002
2. Problema detectado: No existe una ruta de autoeliminación de cuenta para el usuario, lo que deja un vacío de cumplimiento y control del usuario sobre sus datos.
3. Evidencia del informe actual: El informe indica que la eliminación de cuenta por el propio cliente no existe y que solo un superadmin puede borrar usuarios.
4. Archivos probablemente relacionados: [app/perfil/page.tsx](app/perfil/page.tsx), [app/api/profile/activate-mode/route.ts](app/api/profile/activate-mode/route.ts), [lib/intranet/platformUsers.ts](lib/intranet/platformUsers.ts)
5. Riesgo para ZOVIT: Riesgo legal, pérdida de confianza y dificultad para atender solicitudes de eliminación o portabilidad.
6. Solución recomendada: Implementar un flujo de autoeliminación con confirmación, cierre de sesiones y proceso de borrado o anonimización según política.
7. Cambios que habría que realizar: Crear una vista de configuración de cuenta, un endpoint seguro de eliminación y un proceso de limpieza de datos relacionados.
8. Pruebas necesarias: Flujo completo de eliminación, verificación de revocación de sesiones y chequeo de que no queden datos activos tras el proceso.
9. Requiere migración SQL: Sí, probablemente.
10. Puede afectar datos existentes: Sí, porque cambiaría la manera de tratar cuentas y datos relacionados.

### PRIV-003 — Consentimientos y privacidad del flujo de verificación no están claramente expresados para el usuario
1. Código identificador: PRIV-003
2. Problema detectado: El flujo de verificación y biometría implica datos sensibles, pero el informe no demuestra que exista un consentimiento explícito, granular y auditable.
3. Evidencia del informe actual: El informe menciona la carga de documentos, selfie y verificación de identidad, pero no documenta consentimientos ni políticas de tratamiento específicas en el flujo.
4. Archivos probablemente relacionados: [app/registro/biometria/page.tsx](app/registro/biometria/page.tsx), [app/verificacion/page.tsx](app/verificacion/page.tsx), [lib/verification/types.ts](lib/verification/types.ts)
5. Riesgo para ZOVIT: Riesgo legal y reputacional si el tratamiento de datos no es suficientemente transparentes o consentido.
6. Solución recomendada: Incorporar consentimientos claros, opciones de revocación y registro de aceptación en el proceso de verificación.
7. Cambios que habría que realizar: Agregar pantallas y backend para consentimiento, guardar versión y fecha, y permitir revocación de consentimiento según política.
8. Pruebas necesarias: Validación del flujo de aceptación, revocación y persistencia del registro.
9. Requiere migración SQL: Sí, probablemente.
10. Puede afectar datos existentes: Sí, porque implicará almacenar metadatos de consentimiento.

### VER-001 — Verificación de profesionales y biometría facial son parciales o no reales
1. Código identificador: VER-001
2. Problema detectado: El informe describe la verificación de identidad como un flujo con OCR y selfie, pero también deja claro que la biometría real no está implementada.
3. Evidencia del informe actual: El informe señala que la “biometría” real no existe y que la UI de challenge selfie está presente, pero no hay comparación biométrica ML real.
4. Archivos probablemente relacionados: [lib/verification/biometric.ts](lib/verification/biometric.ts), [app/registro/biometria/page.tsx](app/registro/biometria/page.tsx), [lib/verification/types.ts](lib/verification/types.ts)
5. Riesgo para ZOVIT: Fraude, pérdida de confianza y exposición a reclamaciones por verificación insuficiente.
6. Solución recomendada: Ajustar la comunicación del producto y, si el objetivo es una verificación real, implementar un pipeline de validación serio o deshabilitar temporalmente la promesa.
7. Cambios que habría que realizar: Revisar la experiencia de onboarding, separar “verificación de identidad” de “biometría real” y agregar controles de riesgo para casos dudosos.
8. Pruebas necesarias: Flujos de aprobación y rechazo, validación de identidad y manejo de casos de fraude.
9. Requiere migración SQL: REQUIERE VERIFICACIÓN.
10. Puede afectar datos existentes: Sí, porque podrían cambiarse reglas de estado o visibilidad de perfiles.

### REG-001 — Servicios regulados requieren una protección más estricta en todos los flujos
1. Código identificador: REG-001
2. Problema detectado: Los servicios regulados tienen reglas especiales, pero el informe sugiere que la validación es parcial y depende de flujos manuales o de inspección humana.
3. Evidencia del informe actual: El informe indica que los servicios regulados se bloquean hasta autorización y que la validación de credenciales de oficio es un proceso manual y dudoso.
4. Archivos probablemente relacionados: [lib/worker/aiDocumentValidation.ts](lib/worker/aiDocumentValidation.ts), [lib/worker/validation.ts](lib/worker/validation.ts), [app/registro/trabajador/page.tsx](app/registro/trabajador/page.tsx), [app/api/worker/registration/route.ts](app/api/worker/registration/route.ts)
5. Riesgo para ZOVIT: Problemas legales, multas, reclamos y operación insegura para profesionales y clientes.
6. Solución recomendada: Centralizar la verificación de servicios regulados en una regla de negocio compartida y auditable.
7. Cambios que habría que realizar: Agregar un guard global por categoría/especialidad, bloquear publicaciones o propuestas no autorizadas y registrar aprobaciones de forma explícita.
8. Pruebas necesarias: Casos de servicios regulados aprobados, rechazados y pendientes, con validaciones por rol y perfil.
9. Requiere migración SQL: REQUIERE VERIFICACIÓN.
10. Puede afectar datos existentes: Sí, especialmente si cambian estados o visibilidad de perfiles.

---

## 3. Mejoras medias

### IA-001 — Funciones simuladas o desactivadas deben dejar de presentarse como funcionales
1. Código identificador: IA-001
2. Problema detectado: El informe documenta varias capacidades que son simuladas o no están activas, pero podrían dar una impresión de funcionamiento real.
3. Evidencia del informe actual: El informe señala que la IA generativa/visión cloud está desactivada, que la validación automática de credenciales es simulada y que la biometría real no está implementada.
4. Archivos probablemente relacionados: [lib/ai/provider.ts](lib/ai/provider.ts), [lib/worker/aiDocumentValidation.ts](lib/worker/aiDocumentValidation.ts), [app/ia/page.tsx](app/ia/page.tsx)
5. Riesgo para ZOVIT: Daño a la confianza del usuario y mala experiencia si el producto promete capacidades que no están operativas.
6. Solución recomendada: Ajustar copy, desactivar flujos promocionales o etiquetarlos claramente como en desarrollo.
7. Cambios que habría que realizar: Revisar mensajes públicos, pantallas y textos de soporte vinculados a funciones no reales.
8. Pruebas necesarias: Revisión UX de las pantallas afectadas y pruebas de flujos de onboarding.
9. Requiere migración SQL: No.
10. Puede afectar datos existentes: No.

### SQL-001 — Migraciones SQL críticas podrían no estar aplicadas en el entorno remoto
1. Código identificador: SQL-001
2. Problema detectado: El informe deja en evidencia que el estado remoto exacto no está determinado y que varias migraciones podrían no haber sido aplicadas.
3. Evidencia del informe actual: El informe advierte explícitamente que muchas migraciones SQL deben estar aplicadas en Supabase y que el estado remoto exacto es no determinado desde el código.
4. Archivos probablemente relacionados: [supabase/](supabase), [supabase/FIX_DUAL_ACCOUNT.sql](supabase/FIX_DUAL_ACCOUNT.sql), [supabase/SPRINT_5_PAGOS.sql](supabase/SPRINT_5_PAGOS.sql), [supabase/SPRINT_6_INTRANET.sql](supabase/SPRINT_6_INTRANET.sql), [supabase/FIX_SECURITY_HARDENING.sql](supabase/FIX_SECURITY_HARDENING.sql)
5. Riesgo para ZOVIT: Desajuste entre código y base de datos, errores en runtime y flujos incompletos en producción.
6. Solución recomendada: Crear un inventario de migraciones y compararlas con el estado real del proyecto Supabase antes de cualquier lanzamiento.
7. Cambios que habría que realizar: Revisar el historial de migraciones, aplicar pendientes y documentar la versión de la base de datos desplegada.
8. Pruebas necesarias: Smoke tests contra el entorno de staging o producción, con validación de tablas, funciones RPC y permisos.
9. Requiere migración SQL: Sí, por definición.
10. Puede afectar datos existentes: Sí, aunque las migraciones deberían ser idempotentes.

### FLOW-001 — El auto-match no completa el flujo de asignación de profesional
1. Código identificador: FLOW-001
2. Problema detectado: El auto-match notifica, pero el informe indica que no asigna el profesional de forma automática al trabajo.
3. Evidencia del informe actual: El informe señala que el auto-match notifica pero no asigna profesional.
4. Archivos probablemente relacionados: [app/api/requests/[id]/auto-match/route.ts](app/api/requests/[id]/auto-match/route.ts), [app/api/map/requests/route.ts](app/api/map/requests/route.ts), [app/solicitudes/[id]/page.tsx](app/solicitudes/[id]/page.tsx)
5. Riesgo para ZOVIT: Flujo cliente-profesional incompleto y pérdida de conversion en solicitudes urgentes.
6. Solución recomendada: Completar el flujo de asignación y definir las reglas de aceptación del profesional o del cliente.
7. Cambios que habría que realizar: Ajustar la lógica de auto-match para crear la relación correcta entre solicitud y profesional y notificar el estado resultante.
8. Pruebas necesarias: Pruebas end-to-end para una solicitud nueva, un profesional que responde y la asignación resultante.
9. Requiere migración SQL: REQUIERE VERIFICACIÓN.
10. Puede afectar datos existentes: Sí, si se modifican relaciones o estados del flujo.

---

## 4. Mejoras de baja prioridad

### OPS-001 — Vistas intranet y finanzas con contenido demo pueden generar confusión operativa
1. Código identificador: OPS-001
2. Problema detectado: Algunas páginas de intranet y finanzas siguen presentadas como demo o próximamente, lo que puede confundir a usuarios internos y a administradores.
3. Evidencia del informe actual: El informe menciona liquidaciones demo, finanzas próximas y contenido “próximamente” en varias vistas internas.
4. Archivos probablemente relacionados: [app/intranet/liquidaciones/page.tsx](app/intranet/liquidaciones/page.tsx), [app/intranet/finanzas/page.tsx](app/intranet/finanzas/page.tsx), [app/intranet/trabajador/page.tsx](app/intranet/trabajador/page.tsx)
5. Riesgo para ZOVIT: Confusión operativa y percepción de producto incompleto.
6. Solución recomendada: Ocultar o marcar claramente estas vistas como no productivas hasta que estén listas.
7. Cambios que habría que realizar: Reemplazar contenido demo por estados de desarrollo o deshabilitar accesos si no están listos.
8. Pruebas necesarias: Verificación visual de navegación y estados de carga en intranet.
9. Requiere migración SQL: No.
10. Puede afectar datos existentes: No.

### DOC-001 — Documentación de despliegue y alcance no está alineada con la realidad del producto
1. Código identificador: DOC-001
2. Problema detectado: El README y parte de la documentación aún reflejan una fase anterior, mientras el código ya supera ese alcance.
3. Evidencia del informe actual: El informe indica que el README aún describe una “Fase 1” básica y que el código supera ampliamente ese alcance.
4. Archivos probablemente relacionados: [README.md](README.md), [docs/DEPLOY.md](docs/DEPLOY.md), [docs/PAGOS.md](docs/PAGOS.md)
5. Riesgo para ZOVIT: Malentendidos de despliegue, operación y alcance, especialmente en una etapa de lanzamiento.
6. Solución recomendada: Actualizar la documentación operativa y de lanzamiento para que refleje el estado real del producto.
7. Cambios que habría que realizar: Revisar la documentación de despliegue, pagos, seguridad y verificación y alinearla con el estado actual del código.
8. Pruebas necesarias: Revisión documental y validación de instrucciones de despliegue con un entorno de prueba.
9. Requiere migración SQL: No.
10. Puede afectar datos existentes: No.

---

## Resumen ejecutivo

- Cantidad de problemas críticos: 3
- Cantidad de problemas altos: 6
- Cantidad de problemas medios: 3
- Cantidad de problemas bajos: 2

### Los cinco primeros problemas que deberían corregirse
1. PAGO-001 — Escrow y liberación de fondos.
2. PAGO-002 — Webhooks de Mercado Pago y estados inconsistentes.
3. PAGO-003 — Liberación de fondos y retiros bancarios.
4. SEG-001 — Permisos administrativos y separación de dinero.
5. SEG-002 — Auditoría de RLS y seguridad de APIs.
