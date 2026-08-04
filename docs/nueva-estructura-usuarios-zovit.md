# Nueva estructura de usuarios, roles, permisos y navegacion ZOVIT

Fecha de analisis: 2026-07-31

## 1. Resumen ejecutivo

ZOVIT hoy funciona como una plataforma Next.js + Supabase centrada en dos tipos publicos principales: `client` y `professional`, con un `admin` de plataforma y un segundo eje interno `intranet_role` para staff (`worker`, `supervisor`, `hr_admin`, `super_admin`). La nueva vision requiere pasar desde ese modelo de dos modos publicos hacia un ecosistema de ocho figuras: Alumno, Empresa, Institucion, Cliente, Profesional, Administrador, Evaluador y SUPERADMIN.

La prioridad principal de la arquitectura sera conservar la mayor cantidad posible de la estructura actual. La recomendacion ya no es disenar un sistema nuevo desde cero, sino extender el sistema existente con capas de compatibilidad: mantener `client`, `professional`, `admin`, `intranet_role`, `worker`, `supervisor`, `hr_admin` y `super_admin` mientras se agregan `student`, `company`, `institution` y `evaluator` de forma progresiva.

Cliente y Profesional deben seguir operativos durante toda la migracion. Pagos, wallet, solicitudes, certificados, mapas, verificacion, reputacion, autenticacion e intranet deben reutilizarse salvo que exista una razon tecnica concreta para no hacerlo.

Nota de alcance: el documento base "Proyecto ZOVIT.docx" no fue encontrado dentro del workspace. Este informe se basa en el texto de requerimiento adjunto, el codigo real del proyecto y la documentacion existente en `docs/estado-actual-zovit`.

## 1.1 Principio de conservacion

Regla principal: extender antes que reemplazar.

Antes de proponer una tabla, ruta, componente o funcion nueva, se debe responder:

- Por que no se puede reutilizar algo existente.
- Que problema resuelve.
- Que impacto tiene.
- Si puede implementarse como extension del sistema actual.

Decisiones de conservacion:

- Mantener Supabase Auth.
- Mantener `profiles` como tabla principal de identidad/perfil comun.
- Mantener `role`, `can_act_as_client`, `can_act_as_professional`, `active_mode` e `intranet_role` durante la transicion.
- Mantener `/panel`, `/cliente/mapa`, `/trabajos`, `/pagos`, `/pagos/profesional`, `/verificacion`, `/registro/trabajador` y rutas de intranet actuales.
- Agregar alias o rutas nuevas sin eliminar las existentes.
- Usar permisos minimos por rol en la primera etapa; dejar permisos granulares completos para una fase posterior.
- Evitar migraciones masivas y cambios destructivos.

## 2. Estado actual encontrado en el proyecto

Framework: Next.js 15 con App Router, React 19, TypeScript y Supabase.

Autenticacion: Supabase Auth por email/password, con callback en `app/auth/callback/route.ts`.

Modelo actual:

- `profiles.role`: `client`, `professional`, `admin`.
- `profiles.can_act_as_client`: capacidad para operar como cliente.
- `profiles.can_act_as_professional`: capacidad para operar como profesional.
- `profiles.active_mode`: `client` o `professional`.
- `profiles.intranet_role`: `worker`, `supervisor`, `hr_admin`, `super_admin` o null.

Proteccion actual:

- `middleware.ts` protege rutas privadas y redirige segun rol/modo.
- `RoleGuard` protege vistas de cliente/profesional/admin.
- `IntranetGuard` y `lib/auth/intranetRoles.ts` protegen intranet.
- El superadmin actual se reconoce por `intranet_role = 'super_admin'`.
- Hay protecciones parciales para no eliminar/rechazar al superadmin, pero no hay modelo completo de cuenta protegida con auditoria integral.

## 3. Roles actuales

| Figura actual | Campo tecnico | Estado |
| --- | --- | --- |
| Visitante | sin perfil | Existe |
| Cliente | `profiles.role = 'client'` | Existe |
| Profesional | `profiles.role = 'professional'` | Existe |
| Admin plataforma | `profiles.role = 'admin'` | Existe, demasiado amplio como concepto |
| Trabajador intranet | `intranet_role = 'worker'` | Existe |
| Supervisor intranet | `intranet_role = 'supervisor'` | Existe |
| Administrador RR.HH. | `intranet_role = 'hr_admin'` | Existe |
| Super admin | `intranet_role = 'super_admin'` | Existe parcialmente |

Roles solicitados que no existen como rol formal:

- Alumno.
- Empresa.
- Institucion.
- Evaluador.
- Administrador con permisos configurables por modulo/accion.
- SUPERADMIN protegido por identificador estable, no solo por email o UI.

## 4. Tablas actuales relacionadas con usuarios

Tablas centrales encontradas/documentadas:

- `profiles`: perfil principal, rol, datos personales, identidad, estado, ubicacion y campos de modo dual.
- `identity_documents`: documentos de identidad y verificacion.
- `worker_registrations`: onboarding de profesional/trabajador de servicios.
- `worker_credentials`: certificados, titulos o respaldos del profesional.
- `worker_service_authorizations`: autorizaciones por servicio.
- `worker_review_history`: historial de revision de profesionales.
- `worker_public_badges`: insignias publicas.
- `intranet_employee_files`: ficha interna.
- `intranet_payrolls`: liquidaciones/nomina.
- `intranet_benefits`: beneficios internos.
- `intranet_financial_snapshots`: indicadores financieros.
- `solicitudes_de_servicio`: solicitudes de clientes.
- `request_messages`, `request_photos`, `request_status_history`, `notifications`.
- `service_proposals`, `work_orders`, `payments`, `payment_events`, `wallets`, `wallet_transactions`, `payment_disputes`, `payout_requests`, `cancellation_fees`, `commission_risk_flags`.
- `issued_certificates`.
- `service_live_locations`.

Campos equivalentes ya presentes:

- `role`: existe.
- `intranet_role`: existe.
- `created_at` y `updated_at`: existen en varias tablas.
- `deleted_at`: no aparece como estandar global; hay eliminacion fisica en algunos flujos.
- `account_status`: no aparece como modelo unificado.
- `is_superadmin`, `is_protected`, `is_hidden_from_staff`, `created_by`, `updated_by`: no aparecen como contrato global.

## 5. Rutas actuales

Publicas y auth:

- `/`
- `/registro`
- `/login`
- `/auth/callback`
- `/auth/restablecer-clave`
- `/categorias`
- `/servicios`
- `/profesional/[id]`
- `/credencial/[id]`
- `/certificados/[folio]`
- `/legal/*`

Paneles y flujos actuales:

- `/panel`
- `/perfil`
- `/cliente/mapa`
- `/solicitudes/nueva`
- `/solicitudes/[id]`
- `/trabajos`
- `/experiencia`
- `/verificacion`
- `/pagos`
- `/pagos/profesional`

Administracion e intranet:

- `/admin/verificacion`
- `/admin/pagos`
- `/intranet`
- `/intranet/acceso`
- `/intranet/trabajador`
- `/intranet/supervisor`
- `/intranet/admin`
- `/intranet/admin/usuarios`
- `/intranet/admin/gestion-usuarios`
- `/intranet/admin/trabajadores`
- `/intranet/admin/verificacion`
- `/intranet/finanzas`
- `/intranet/equipo`
- `/intranet/liquidaciones`

## 6. Componentes actuales reutilizables

- `components/AuthProvider.tsx`: base para cargar perfil y sesion.
- `components/RoleGuard.tsx`: reutilizable si se generaliza a mas roles.
- `components/intranet/IntranetGuard.tsx`: base para proteccion de intranet.
- `components/intranet/IntranetShell.tsx`: base visual para portales internos.
- `components/intranet/IntranetUsersManager.tsx`: base para creacion de accesos internos.
- `components/intranet/PlatformUsersManager.tsx`: base para gestion de usuarios por SUPERADMIN.
- `components/verification/*`: base para identidad, biometria y documentos.
- `components/worker/WorkerOnboardingWizard.tsx`: base para Profesional y parte del futuro Alumno.
- `components/credential/*`: base para pasaporte/credencial.
- `components/payments/ProposalSection.tsx`: base para Cliente/Profesional/Empresa.
- `components/map/*`: base para servicios por ubicacion.

## 7. Funciones actuales reutilizables

- `lib/auth/roles.ts`: punto central actual de roles publicos.
- `lib/auth/intranetRoles.ts`: punto central de roles internos.
- `lib/auth/superAdminAccess.ts`: base de bypass/proteccion SUPERADMIN.
- `lib/intranet/apiAuth.ts`: base de autorizacion server-side interna.
- `lib/intranet/platformUsers.ts`: base para gestion global de usuarios.
- `lib/intranet/manageUsers.ts`: base para creacion de usuarios internos.
- `lib/registration/*`: base para registro publico.
- `lib/verification/*`: base de verificacion, documentos e IA.
- `lib/security/validation.ts`, `headers.ts`, `rateLimit.ts`, `csrf.ts`.
- `lib/payments/*`: base de pagos para Cliente/Profesional/Empresa.
- `lib/certificates/*` y `lib/credential/*`: base de certificaciones.

## 8. Funciones que deberan modificarse

- `USER_ROLES` y `UserRole` para incorporar `student`, `company`, `institution`, `client`, `professional`, y separar `admin`.
- `RoleMode` y `active_mode`, porque hoy solo aceptan `client/professional`.
- `canAccessRoute`, `isProtectedRoute`, `resolvePostLoginPath`.
- `AuthProvider.PROFILE_SELECT` y `UserProfile`.
- `RoleGuard` y cualquier guard client-side.
- `middleware.ts`.
- `app/registro/page.tsx` y `app/login/LoginForm.tsx`.
- APIs bajo `app/api/intranet/*` y `app/api/admin/*`.
- RLS y funciones SQL que hoy consultan `role = 'admin'` o `role in ('professional','admin')`.
- Busquedas profesionales y mapa para soportar alumnos disponibles.
- Panel `/panel`, que hoy mezcla vistas por modo.

## 9. Funciones que deberian mantenerse

- Login con Supabase Auth.
- Verificacion de identidad/biometria como requisito de confianza.
- Flujo Cliente actual: solicitudes, mapa, pagos, aprobacion, calificacion.
- Flujo Profesional actual: onboarding, credenciales, trabajos, wallet, experiencia.
- Storage privado para documentos.
- Uso de signed URLs para archivos privados.
- Separacion de dinero solo para SUPERADMIN.
- Sistema de certificados/credenciales como base del pasaporte digital.

## 10. Funciones que podrian quedar obsoletas

- `role = 'admin'` como rol publico de plataforma.
- `hr_admin` como nombre final si se adopta "Administrador".
- `worker/supervisor` si la intranet se redefine a Administrador/Evaluador/SUPERADMIN.
- Login con selector solo Cliente/Profesional.
- Panel unico `/panel` como destino final para todos.
- Simulacion de vistas del superadmin si se reemplaza por permisos reales por modulo.

## 11. Nueva matriz completa de roles y permisos

| Permiso / Modulo | Alumno | Empresa | Institucion | Cliente | Profesional | Administrador | Evaluador | SUPERADMIN |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Registro publico | Si | Si | Si | Si | Si | No | No | No |
| Perfil propio | Si | Si | Si | Si | Si | Si | Si | Si |
| Solicitar servicios | Opcional | Si | Opcional | Si | No en modo pro | Segun permiso | No | Si |
| Postular/ofrecer servicios | Segun autorizacion | No | No | No | Si | No | No | Si |
| Pasaporte digital | Si | No | Consulta autorizada | No | Adaptado | Consulta segun permiso | Consulta asignada | Total |
| Buscar alumnos | No | Si | Si/agregado | No | No | Segun permiso | Solo asignados | Si |
| Buscar profesionales | Si | Si | Si | Si | No | Segun permiso | No | Si |
| Evaluaciones | Rinde/consulta | Consulta autorizada | Reportes | No | Evidencias | Gestiona segun permiso | Gestiona asignadas | Total |
| Pagos | Segun servicios | Si | Segun convenio | Si | Recibe | Segun permiso limitado | No | Total |
| Gestion usuarios | No | No | No | No | No | Segun permiso | No | Total |
| Crear admin/evaluador | No | No | No | No | No | Solo si permiso expreso | No | Si |
| Ver datos SUPERADMIN | No | No | No | No | No | No privados | No privados | Si |
| Cambiar SUPERADMIN | No | No | No | No | No | No | No | Recuperacion segura |
| Auditoria | Propia limitada | Propia | Agregada | Propia | Propia | Segun permiso | Acciones propias | Total |

## 11.1 Estrategia compatible de roles

No se recomienda reemplazar el modelo actual en la primera fase. La estrategia de menor impacto es:

- Mantener `profiles.role` con los valores actuales y ampliarlo progresivamente para aceptar `student`, `company`, `institution`.
- Mantener `client` y `professional` sin cambios funcionales.
- Mantener `admin` como compatibilidad historica, pero evitar usarlo para permisos nuevos sensibles.
- Mantener `profiles.intranet_role` y agregar `evaluator` como nuevo valor interno, o mapearlo temporalmente a una capacidad interna mientras se valida el modelo.
- Mantener `hr_admin` como equivalente tecnico inicial de Administrador, con etiqueta visible "Administrador".
- Mantener `super_admin` como equivalente tecnico de SUPERADMIN, reforzandolo con proteccion por UUID y flags.

Compatibilidad propuesta:

| Figura nueva | Estrategia tecnica inicial | Impacto |
| --- | --- | --- |
| Cliente | conservar `role = 'client'` | Sin cambio funcional |
| Profesional | conservar `role = 'professional'` | Sin cambio funcional |
| Alumno | agregar `role = 'student'` y ampliar `profiles` + tabla academica solo si hace falta | Bajo/medio |
| Empresa | agregar `role = 'company'` y reutilizar `profiles` para cuenta representante | Medio |
| Institucion | agregar `role = 'institution'` y reutilizar `profiles` para cuenta representante | Medio |
| Administrador | conservar `intranet_role = 'hr_admin'` con nuevo nombre visible | Bajo |
| Evaluador | preferir `intranet_role = 'evaluator'` como extension minima | Bajo/medio |
| SUPERADMIN | conservar `intranet_role = 'super_admin'` + proteccion fuerte | Medio |

## 12. Arquitectura recomendada

Usar tres capas separadas, pero introducidas gradualmente:

1. Identidad de cuenta: `auth.users` + `profiles`.
2. Tipo de usuario principal: Alumno, Empresa, Institucion, Cliente, Profesional, Administrador, Evaluador, SUPERADMIN.
3. Permisos granulares: modulo + accion + alcance.

Modelo recomendado de bajo impacto:

- `profiles`: datos comunes y estado de cuenta.
- `profiles.role`: mantener y ampliar solo lo necesario.
- `profiles.intranet_role`: mantener y ampliar para `evaluator` si se aprueba.
- `account_invitations`: nueva tabla probable, porque el flujo de invitacion no existe como contrato formal.
- `audit_logs`: nueva tabla necesaria, porque la auditoria actual esta distribuida y no cubre acciones sensibles globales.
- Tablas especificas solo donde `profiles` no alcance sin duplicar datos: por ejemplo perfil academico del Alumno, perfil Empresa e Institucion.

Evitar en primera fase:

- Reemplazar `profiles` por un sistema nuevo.
- Crear `user_roles`, `role_permissions` y `user_permissions` si los permisos minimos pueden resolverse temporalmente con `role` + `intranet_role` + checks server-side.
- Duplicar Cliente y Profesional en tablas nuevas si sus flujos actuales ya funcionan.

No guardar permisos criticos solo en frontend. Todo permiso sensible debe validarse en API y RLS/SQL.

## 13. Propuesta de navegacion por rol

Publico:

- `/registro`
- `/login`

Paneles publicos:

- `/alumno`
- `/empresa`
- `/institucion`
- `/cliente`
- `/profesional`

Intranet:

- `/intranet`
- `/intranet/superadmin`
- `/intranet/administrador`
- `/intranet/evaluador`

Redireccion post-login:

- Alumno -> `/alumno`
- Empresa -> `/empresa`
- Institucion -> `/institucion`
- Cliente -> `/cliente`
- Profesional -> `/profesional`
- Administrador -> `/intranet/administrador`
- Evaluador -> `/intranet/evaluador`
- SUPERADMIN -> `/intranet/superadmin`

## 14. Diseno del registro publico

El registro publico debe mostrar cinco tarjetas:

- Alumno.
- Empresa.
- Institucion.
- Cliente.
- Profesional.

Reglas:

- No mostrar Administrador, Evaluador ni SUPERADMIN.
- Validar rol permitido en frontend, API y trigger SQL.
- Mantener biometria para personas naturales.
- Para Empresa e Institucion, agregar validacion de representante legal/autorizado.
- Para Alumno, capturar institucion, carrera, sede, jornada, semestre y documentos academicos.

## 15. Diseno de la intranet

La intranet debe tener entrada unica y shells diferenciados:

- SUPERADMIN: control total.
- Administrador: modulos segun permisos.
- Evaluador: evaluaciones asignadas.

Debe evitarse que una ruta se proteja solo por ocultar links. Cada ruta y API debe tener guard server-side.

## 16. Diseno del panel SUPERADMIN

Modulos:

- Resumen global.
- Usuarios.
- Agregar usuario.
- Roles y permisos.
- Verificaciones.
- Evaluadores.
- Evaluaciones.
- Empresas.
- Instituciones.
- Alumnos.
- Clientes.
- Profesionales.
- Pagos y wallets.
- Auditoria.
- Configuracion critica.
- Recuperacion de cuenta.

El SUPERADMIN debe estar protegido por id interno estable y flags de proteccion.

## 17. Diseno del boton "Agregar usuario"

Ubicacion: visible en `/intranet/superadmin/usuarios` y/o dashboard SUPERADMIN.

Flujo:

1. Elegir tipo de usuario: Alumno, Empresa, Institucion, Cliente, Profesional, Administrador, Evaluador.
2. Ingresar datos basicos.
3. Definir permisos iniciales si aplica.
4. Definir estado inicial: activo, pendiente, suspendido.
5. Elegir crear cuenta directa o enviar invitacion.
6. Si es cuenta directa, definir si debe cambiar contrasena.
7. Registrar `created_by`, fecha/hora y evento de auditoria.

Restriccion: no debe permitir crear SUPERADMIN.

## 18. Diseno del panel Administrador

Debe ser modular:

- Usuarios segun permisos.
- Validacion documental.
- Gestion de alumnos.
- Gestion de empresas.
- Gestion de instituciones.
- Gestion de clientes.
- Gestion de profesionales.
- Solicitudes e incidencias.
- Soporte.
- Reportes.

Cada modulo debe tener permisos: ver, crear, editar, suspender, bloquear, aprobar, rechazar, exportar.

## 19. Diseno del panel Evaluador

Modulos:

- Mis alumnos asignados.
- Evaluaciones pendientes.
- Evaluacion teorica.
- Evaluacion practica.
- Evidencias.
- Competencias.
- Observaciones.
- Resultados.
- Historial asignado.

No debe ver pagos, permisos, usuarios no asignados ni datos privados del SUPERADMIN.

## 20. Diseno del pasaporte digital del Alumno

Se recomienda estructurarlo en secciones:

- Identidad verificada.
- Datos academicos.
- Institucion, carrera, sede, jornada.
- Semestre y avance curricular.
- Asignaturas aprobadas.
- Competencias academicas inferidas desde formacion.
- Evaluaciones teoricas.
- Evaluaciones practicas.
- Evidencias.
- Certificaciones ZOVIT obtenidas solo mediante evaluacion tecnica aprobada.
- Cursos externos.
- Licencias.
- Disponibilidad laboral.
- Disponibilidad para servicios.
- Consentimientos.
- Historial de experiencia.
- Vista publica autorizada.
- Vista privada.

Debe reutilizar `issued_certificates`, `credential` y componentes de experiencia, separando claramente formacion academica de Certificacion ZOVIT.

## 21. Diseno del portal Empresa

Modulos:

- Perfil empresarial.
- Representantes.
- Validacion de empresa.
- Publicar oportunidades/servicios/practicas.
- Buscar alumnos.
- Buscar profesionales.
- Filtros por carrera, semestre, competencia, comuna y disponibilidad.
- Invitar candidatos.
- Evaluar desempeno.
- Retroalimentacion y brechas.
- Historial de contrataciones/practicas.
- Pagos o beneficios, si aplica.

## 22. Diseno del portal Institucion

Modulos:

- Perfil institucional.
- Carreras y sedes.
- Alumnos autorizados.
- Reportes agregados.
- Resultados promedio.
- Brechas formativas.
- Competencias demandadas por empresas.
- Empleabilidad.
- Evaluaciones empresariales.
- Consentimientos.

Separar:

- Estadistica anonima/agregada.
- Datos identificables.
- Datos con consentimiento.
- Datos nunca compartibles.

## 23. Adaptacion del Cliente actual

Mantener:

- Registro como Cliente.
- Solicitudes.
- Mapa.
- Pagos protegidos.
- Confirmacion de ejecucion.
- Calificaciones.
- Historial.

Cambiar:

- Ruta destino a `/cliente`.
- `role`/permisos al nuevo modelo.
- Revisar textos "Particular" si aparecen; la decision es usar siempre "Cliente".

## 24. Adaptacion del Profesional actual

Mantener:

- Onboarding de servicios.
- Credenciales.
- Verificacion de identidad y estudios.
- Trabajos.
- Propuestas.
- Wallet.
- Experiencia y reputacion.
- Perfil publico.

Cambiar:

- Ruta destino a `/profesional`.
- Separar perfil profesional de perfil alumno si una misma persona puede tener ambos.
- Usar permisos granulares en vez de asumir `professional`.

## 25. Cambios necesarios en Supabase

No ejecutar todavia. Cambios propuestos:

- Ampliar modelo de roles.
- Agregar estado unificado de cuenta.
- Agregar protecciones de SUPERADMIN.
- Crear tablas de perfiles especificos.
- Crear tablas de permisos.
- Crear invitaciones.
- Crear auditoria.
- Actualizar triggers de `handle_new_user`.
- Actualizar funciones `is_platform_admin`, `current_intranet_role` y RPCs que dependen de roles antiguos.
- Reescribir RLS por permisos y alcance.

## 26. Tablas nuevas propuestas

La nueva regla es no crear tablas si una tabla actual puede ampliarse de forma segura. Por eso las tablas se clasifican asi:

Tablas nuevas probablemente necesarias:

| Tabla | Por que no basta lo actual | Problema que resuelve | Impacto | Extension posible |
| --- | --- | --- | --- | --- |
| `audit_logs` | La auditoria actual esta repartida en historiales parciales | Registro global de acciones sensibles | Medio | No conviene mezclarla con historiales existentes |
| `account_invitations` | Hoy existe creacion directa de usuarios internos, no invitacion formal | Invitar usuarios y obligar password inicial | Medio | Puede reutilizar Supabase Auth |
| `ownership_transfers` | No existe flujo seguro para venta/transferencia | Transferencia controlada del SUPERADMIN | Medio | Debe ser modulo especial |

Tablas nuevas que podrian evitarse inicialmente:

| Tabla propuesta antes | Alternativa conservadora |
| --- | --- |
| `roles` | Mantener enums/checks actuales y ampliar `profiles.role` / `profiles.intranet_role` |
| `permissions` | Usar permisos minimos codificados en `lib/auth/intranetRoles.ts` durante fase 1 |
| `role_permissions` | Postergar hasta que existan permisos complejos reales |
| `user_roles` | Postergar; usar un rol principal compatible |
| `user_permissions` | Postergar; evitar excepciones por usuario en primera fase |
| `client_profiles` | Evitar; Cliente ya funciona con `profiles` |
| `professional_profiles` | Evitar inicialmente; Profesional ya usa `profiles`, `worker_registrations`, `worker_credentials` |
| `sensitive_access_logs` | Integrar en `audit_logs` con `resource_type = 'sensitive_data'` |
| `account_recovery_requests` | Puede ser parte de `ownership_transfers` o `audit_logs` al inicio |

Tablas nuevas posibles solo si `profiles` se vuelve insuficiente:

- `student_profiles`: datos academicos que no pertenecen a Cliente/Profesional.
- `student_academic_records`: avance curricular, asignaturas, competencias.
- `student_evaluations`: evaluaciones teoricas/practicas si no se modelan dentro de certificados actuales.
- `evaluation_assignments`: asignacion Alumno-Evaluador.
- `evaluation_evidence`: evidencias de evaluacion.
- `company_profiles`: datos de empresa y representante.
- `company_opportunities`: practicas, trabajos parciales o solicitudes empresariales.
- `institution_profiles`: datos institucionales.
- `institution_programs`: carreras, sedes, jornadas.
- `institution_student_links`: vinculo Alumno-Institucion con consentimiento.
- `consents`: consentimiento explicito para compartir datos identificables.

La decision final debe tomarse caso a caso, priorizando ampliar tablas actuales cuando no haya duplicacion de datos ni mezcla riesgosa de dominios.

## 27. Columnas nuevas propuestas

En `profiles` o tabla equivalente:

- `account_type`
- `account_status`
- `is_superadmin`
- `is_protected`
- `is_hidden_from_staff`
- `created_by`
- `updated_by`
- `deleted_at`
- `suspended_at`
- `blocked_at`
- `status_reason`
- `must_change_password`
- `primary_role_id`

Decision pendiente: si `account_type` vive en `profiles` o si todo pasa por `user_roles`.

## 28. Relaciones

- `profiles.id` -> `auth.users.id`.
- `student_profiles.profile_id` -> `profiles.id`.
- `company_profiles.profile_id` -> `profiles.id`.
- `institution_profiles.profile_id` -> `profiles.id`.
- `professional_profiles.profile_id` -> `profiles.id`.
- `client_profiles.profile_id` -> `profiles.id`.
- `user_roles.user_id` -> `profiles.id`.
- `user_roles.role_id` -> `roles.id`.
- `role_permissions.role_id` -> `roles.id`.
- `audit_logs.actor_user_id` -> `profiles.id`.
- `audit_logs.target_user_id` -> `profiles.id`.
- `account_invitations.created_by` -> `profiles.id`.

## 29. Politicas RLS

Principios:

- El usuario ve su propio perfil.
- Roles internos ven solo lo permitido por modulo/accion.
- Evaluador ve solo alumnos/evaluaciones asignadas.
- Institucion ve datos identificables solo con consentimiento.
- Empresa ve perfiles autorizados.
- SUPERADMIN ve todo salvo mecanismos de recuperacion que requieran flujo especial.
- SUPERADMIN no puede ser modificado por politicas normales.
- Los documentos privados deben requerir ownership, asignacion o permiso explicito.

Crear funciones SQL:

- `current_user_roles()`
- `has_permission(module text, action text, scope text)`
- `is_superadmin()`
- `is_protected_user(user_id uuid)`
- `can_access_student(target_student_id uuid)`
- `can_access_sensitive_document(path text)`

## 30. APIs o Server Actions necesarias

- `POST /api/intranet/superadmin/users`
- `POST /api/intranet/superadmin/invitations`
- `PATCH /api/intranet/superadmin/users/[id]`
- `POST /api/intranet/superadmin/users/[id]/suspend`
- `POST /api/intranet/superadmin/users/[id]/block`
- `DELETE /api/intranet/superadmin/users/[id]`
- `GET/PATCH /api/intranet/superadmin/roles`
- `GET/PATCH /api/intranet/superadmin/permissions`
- `GET /api/intranet/audit`
- `POST /api/evaluations`
- `PATCH /api/evaluations/[id]`
- `GET /api/student/passport`
- `GET /api/company/candidates`
- `GET /api/institution/reports`
- `POST /api/consents`

## 31. Sistema de invitaciones

Debe soportar:

- Invitacion por email.
- Token de un solo uso.
- Expiracion.
- Rol/tipo preasignado.
- Permisos preasignados.
- Obligar cambio de contrasena.
- Estado: pendiente, aceptada, expirada, revocada.
- Auditoria de creacion, reenvio, aceptacion y revocacion.

No usar solo `admin.createUser` con password manual como flujo final para todos los casos.

## 32. Sistema de auditoria

Tabla `audit_logs` append-only:

- `id`
- `actor_user_id`
- `actor_role_snapshot`
- `action`
- `resource_type`
- `resource_id`
- `target_user_id`
- `occurred_at`
- `ip_address`
- `user_agent`
- `result`
- `reason`
- `before_data`
- `after_data`
- `metadata`

Eventos minimos:

- Login/logout.
- Creacion de usuarios.
- Invitaciones.
- Cambios de roles.
- Cambios de permisos.
- Suspension/bloqueo/eliminacion.
- Recuperacion.
- Validacion documental.
- Evaluaciones.
- Certificaciones.
- Cambios de configuracion.
- Acceso a datos sensibles.
- Intentos contra SUPERADMIN.
- Acciones administrativas fallidas.

## 33. Proteccion tecnica del SUPERADMIN

Requisitos tecnicos:

- Identificador estable del SUPERADMIN principal, idealmente `profiles.id`, no email.
- Flag `is_superadmin = true`.
- Flag `is_protected = true`.
- Flag `is_hidden_from_staff = true`.
- Constraint para impedir mas de un SUPERADMIN principal.
- Triggers `before update/delete` que bloqueen cambios prohibidos.
- RLS que impida que Administrador/Evaluador lean datos privados.
- APIs con validacion explicita del target.
- Auditoria obligatoria de intentos fallidos.
- Flujo especial de recuperacion, fuera del formulario comun.

No basta con deshabilitar botones.

Regla principal actualizada:

El SUPERADMIN solo puede ser modificado por el propio SUPERADMIN, mediante secciones seguras y flujos especiales. Ningun Administrador, Evaluador, API comun, formulario comun, proceso normal o usuario externo puede modificarlo, eliminarlo, suspenderlo, bloquearlo, cambiar su correo, cambiar sus permisos, ver sus datos privados, desactivar su proteccion, transferir propiedad ni crear otro SUPERADMIN.

Capas obligatorias:

- Frontend: ocultar/deshabilitar acciones comunes contra SUPERADMIN y mostrar secciones especiales.
- Middleware: impedir acceso a rutas administrativas comunes que intenten actuar sobre SUPERADMIN.
- APIs/Server Actions: rechazar cualquier `targetUserId` protegido salvo flujos especiales y actor = SUPERADMIN actual.
- Supabase SQL: trigger `before update/delete` sobre `profiles` y tablas de proteccion.
- RLS: bloquear lectura de datos privados del SUPERADMIN para staff.
- Storage: impedir signed URLs de documentos privados del SUPERADMIN para Administrador/Evaluador.
- Auditoria: registrar intentos fallidos y exitosos.

### 33.1 Seccion segura `/intranet/superadmin/mi-cuenta`

El SUPERADMIN podra modificar su propia cuenta solo desde una seccion especial:

- Cambiar datos personales.
- Cambiar correo con verificacion segura.
- Cambiar contrasena.
- Configurar autenticacion de dos factores.
- Revisar sesiones activas.
- Cerrar otras sesiones.
- Revisar intentos de acceso.
- Actualizar datos del propietario.
- Iniciar transferencia de propiedad.

Estas acciones deben requerir reautenticacion. Las operaciones criticas deben solicitar contrasena actual, segundo factor si esta habilitado, confirmacion explicita y auditoria.

### 33.2 Transferencia de propiedad

Ruta propuesta: `/intranet/superadmin/transferir-propiedad`.

La transferencia solo puede iniciarla el SUPERADMIN actual. No puede hacerse desde "Agregar usuario", desde un formulario administrativo comun ni desde una API comun.

Flujo:

1. SUPERADMIN actual ingresa a `/intranet/superadmin/transferir-propiedad`.
2. Selecciona o invita al nuevo propietario.
3. El sistema verifica identidad del nuevo propietario.
4. SUPERADMIN actual confirma la transferencia.
5. Se exige reautenticacion y segundo factor.
6. El nuevo propietario acepta.
7. El sistema cambia la cuenta protegida.
8. El nuevo propietario pasa a ser el unico SUPERADMIN protegido.
9. La cuenta anterior pierde `super_admin` y queda con rol definido o desactivada.
10. Todo queda registrado en auditoria.

Reglas:

- No pueden existir dos SUPERADMIN activos permanentes.
- Puede existir estado transitorio controlado de transferencia pendiente.
- La transferencia puede cancelarse antes de la aceptacion.
- Debe existir constraint/trigger para impedir doble SUPERADMIN activo.
- Debe registrarse `initiated_by`, `accepted_by`, fechas, IP, user-agent y resultado.

## 34. Riesgos de seguridad

- `role = admin` es demasiado amplio y aparece en multiples SQL/RPC.
- Algunas operaciones usan service role en API; deben validar permisos antes de ejecutar.
- Cambios de rol sin auditoria pueden escalar privilegios.
- Storage privado depende de RLS y signed URLs.
- Datos bancarios y RUT requieren controles estrictos.
- Superadmin protegido solo parcialmente por `intranet_role`.
- Eliminacion fisica puede borrar evidencia o romper auditoria.

## 35. Riesgos de privacidad

- RUT, carnet, selfie y documentos academicos son datos sensibles.
- Datos de alumnos pueden involucrar menores o jovenes en formacion.
- Instituciones no deben ver datos identificables sin consentimiento.
- Empresas no deben navegar datos privados de alumnos.
- Evaluadores solo deben ver asignaciones.
- Administradores no deben ver datos privados del SUPERADMIN.
- Reportes institucionales deben ser agregados por defecto.

## 36. Riesgos de migracion

- Drift entre SQL del repo y Supabase produccion.
- Rutas actuales dependen de `client/professional`.
- Middleware puede bloquear usuarios nuevos si `isUserRole` no se actualiza.
- Trigger `handle_new_user` puede rechazar o normalizar mal roles nuevos.
- RLS antiguas pueden permitir o bloquear indebidamente.
- Panel unico `/panel` puede quedar inconsistente durante la transicion.
- Usuarios actuales deben conservar acceso.

## 37. Archivos que probablemente deberan modificarse

- `lib/auth/roles.ts`
- `lib/auth/intranetRoles.ts`
- `lib/auth/superAdminAccess.ts`
- `middleware.ts`
- `components/AuthProvider.tsx`
- `components/RoleGuard.tsx`
- `components/intranet/IntranetGuard.tsx`
- `components/intranet/IntranetShell.tsx`
- `components/intranet/IntranetUsersManager.tsx`
- `components/intranet/PlatformUsersManager.tsx`
- `app/registro/page.tsx`
- `app/login/LoginForm.tsx`
- `app/panel/page.tsx`
- `app/intranet/**`
- `app/admin/**`
- `app/api/intranet/**`
- `app/api/admin/**`
- `app/api/verification/**`
- `app/api/payments/**`
- `lib/intranet/**`
- `lib/registration/**`
- `lib/verification/**`
- `lib/payments/**`
- `supabase/*.sql`

## 38. Orden de implementacion

1. Congelar esquema actual y comparar repo vs Supabase produccion.
2. Definir taxonomia final de roles y permisos.
3. Crear capa de permisos sin cambiar UI.
4. Agregar auditoria.
5. Agregar proteccion fuerte de SUPERADMIN.
6. Migrar Cliente/Profesional al nuevo modelo sin cambiar experiencia.
7. Agregar Alumno.
8. Agregar Evaluador.
9. Agregar Empresa.
10. Agregar Institucion.
11. Separar paneles y rutas.
12. Activar invitaciones.
13. Endurecer RLS.
14. QA completo.

## 39. Plan dividido en fases

Fase 0: auditoria tecnica

- Inventario real de Supabase produccion.
- Confirmar SUPERADMIN actual por UUID.
- Backups.

Fase 1: base de roles

- Nuevo modelo de roles/permisos.
- Compatibilidad con roles actuales.
- No romper Cliente/Profesional.

Fase 2: seguridad

- SUPERADMIN protegido.
- Auditoria.
- Account status.
- Soft delete.

Fase 3: paneles

- `/cliente`, `/profesional`.
- `/intranet/superadmin`, `/intranet/administrador`, `/intranet/evaluador`.
- Redirecciones post-login.

Fase 4: Alumno y Evaluador

- Perfil alumno.
- Pasaporte digital.
- Evaluaciones y asignaciones.

Fase 5: Empresa e Institucion

- Portales.
- Consentimientos.
- Reportes agregados.

Fase 6: limpieza

- Retirar rutas obsoletas.
- Migrar nombres `hr_admin`, `worker`, `supervisor`.
- Documentar operaciones.

## 40. Pruebas necesarias antes de produccion

Unitarias:

- Validacion de roles.
- Permisos por modulo/accion.
- Redireccion post-login.
- Proteccion SUPERADMIN.
- Consentimientos.

Integracion:

- Registro de los cinco usuarios publicos.
- Login de cada rol.
- Acceso correcto a panel.
- Bloqueo por URL manipulada.
- Creacion/invitacion desde SUPERADMIN.
- Evaluador solo ve asignados.
- Empresa solo ve autorizados.
- Institucion solo ve agregado o consentido.
- Cliente y Profesional actuales siguen funcionando.

Seguridad:

- Intento de crear SUPERADMIN desde registro.
- Intento de editar/eliminar SUPERADMIN desde API.
- Intento de acceder a documentos privados.
- RLS por tabla.
- Signed URLs.
- Auditoria de acciones fallidas.

Migracion:

- Usuarios actuales `client`, `professional`, `admin`.
- Cuentas duales.
- Pagos pendientes.
- Solicitudes activas.
- Documentos existentes.

## 41. Actualizacion de bajo impacto

### 41.1 Partes actuales que se conservaran sin cambios funcionales

- Supabase Auth con email/password.
- `profiles` como fuente principal del perfil comun.
- Cliente actual: solicitudes, mapa, pagos, historial y evaluaciones.
- Profesional actual: onboarding, trabajos, propuestas, credenciales, wallet y reputacion.
- Buckets privados y signed URLs.
- Certificados y credenciales como base del pasaporte.
- Intranet actual como punto de partida.
- Middleware como primera barrera de rutas.
- APIs server-side como punto obligatorio para operaciones sensibles.

### 41.2 Partes con modificaciones minimas

- `lib/auth/roles.ts`: ampliar roles publicos sin romper `client/professional`.
- `lib/auth/intranetRoles.ts`: mantener roles actuales y agregar/matchear Evaluador.
- `AuthProvider`: seleccionar nuevos campos de perfil cuando existan.
- `middleware.ts`: agregar rutas nuevas y mantener rutas actuales.
- `app/registro/page.tsx`: ampliar selector de tipo de usuario.
- `app/login/LoginForm.tsx`: ampliar selector o simplificar deteccion automatica.
- `PlatformUsersManager`: agregar "Agregar usuario" y bloquear SUPERADMIN con reglas fuertes.
- SQL de `profiles`: ampliar checks/constraints sin migracion destructiva.

### 41.3 Partes que realmente necesitan modulos nuevos

- Auditoria global append-only.
- Invitaciones formales.
- Transferencia de propiedad.
- Perfil academico del Alumno.
- Evaluaciones y asignaciones del Evaluador.
- Portal Empresa si requiere oportunidades/candidatos.
- Portal Institucion si requiere reportes agregados y consentimientos.
- Consentimientos para compartir datos identificables.

### 41.4 Tablas nuevas que pueden evitarse

- `client_profiles`: evitar inicialmente.
- `professional_profiles`: evitar inicialmente.
- `roles`, `permissions`, `role_permissions`, `user_roles`, `user_permissions`: postergar hasta que los permisos minimos ya no alcancen.
- `sensitive_access_logs`: integrar en `audit_logs`.
- Tablas duplicadas de contacto o identidad: reutilizar `profiles`.

### 41.5 Rutas actuales que seguiran funcionando

- `/registro`
- `/login`
- `/panel`
- `/perfil`
- `/cliente/mapa`
- `/solicitudes/nueva`
- `/solicitudes/[id]`
- `/trabajos`
- `/experiencia`
- `/verificacion`
- `/pagos`
- `/pagos/profesional`
- `/admin/verificacion`
- `/admin/pagos`
- `/intranet`
- `/intranet/acceso`
- `/intranet/admin`
- `/intranet/admin/gestion-usuarios`
- `/intranet/admin/verificacion`
- `/intranet/finanzas`

Las rutas nuevas deben agregarse como alias o paneles nuevos sin eliminar las anteriores durante las primeras fases.

### 41.6 Archivos que deberan tocarse obligatoriamente

- `lib/auth/roles.ts`
- `lib/auth/intranetRoles.ts`
- `lib/auth/superAdminAccess.ts`
- `middleware.ts`
- `components/AuthProvider.tsx`
- `components/RoleGuard.tsx`
- `components/intranet/IntranetGuard.tsx`
- `components/intranet/PlatformUsersManager.tsx`
- `app/registro/page.tsx`
- `app/login/LoginForm.tsx`
- `app/api/intranet/platform-users/**`
- `app/api/intranet/users/**`
- SQL de Supabase relacionado con `profiles`, RLS, triggers, invitaciones, auditoria y SUPERADMIN.

### 41.7 Archivos que no sera necesario modificar al inicio

- Flujos de pagos que ya funcionan, salvo checks de rol en APIs.
- Componentes de mapa, salvo permisos de acceso.
- Componentes de certificados/credenciales, salvo extensiones para Alumno.
- Paginas publicas legales.
- Landing y paginas SEO.
- Componentes de solicitudes si Cliente se conserva igual.
- Componentes de Profesional si se mantiene `professional` compatible.

### 41.8 Nuevo plan por fases con menor impacto posible

Fase 0: congelar y respaldar

- Confirmar esquema real de Supabase produccion.
- Confirmar UUID del SUPERADMIN actual.
- Identificar scripts SQL ya aplicados.
- No cambiar usuarios existentes.

Fase 1: compatibilidad de roles

- Ampliar `UserRole` y checks para aceptar `student`, `company`, `institution`.
- Mantener `client` y `professional` intactos.
- Mantener `hr_admin` como Administrador visible.
- Agregar Evaluador como extension de `intranet_role` si se aprueba.

Fase 2: proteccion SUPERADMIN

- Agregar proteccion por UUID.
- Bloquear modificacion por terceros en API, SQL, RLS y UI.
- Crear `/intranet/superadmin/mi-cuenta`.
- Auditar intentos contra SUPERADMIN.

Fase 3: "Agregar usuario" conservador

- Extender `PlatformUsersManager`.
- Crear/invitar Alumno, Empresa, Institucion, Cliente, Profesional, Administrador y Evaluador.
- No crear SUPERADMIN desde ese flujo.

Fase 4: rutas nuevas como alias

- Crear `/cliente` apuntando o envolviendo el panel cliente actual.
- Crear `/profesional` apuntando o envolviendo el panel profesional actual.
- Agregar `/alumno`, `/empresa`, `/institucion` con MVP.
- Mantener `/panel` como compatibilidad.

Fase 5: Alumno y Evaluador MVP

- Perfil academico minimo.
- Evaluaciones asignadas.
- Evidencias.
- Consentimientos basicos.

Fase 6: Empresa e Institucion MVP

- Perfil Empresa.
- Perfil Institucion.
- Busqueda autorizada.
- Reportes agregados.

Fase 7: permisos granulares solo si son necesarios

- Crear tablas `roles/permissions` solo si las reglas por `role + intranet_role` ya no alcanzan.
- Migrar gradualmente sin romper compatibilidad.

## Cinco decisiones que requieren aprobacion antes de implementar

1. Confirmar que la primera implementacion mantendra `role + intranet_role` y postergara tablas granulares de permisos.
2. Confirmar el UUID interno estable del SUPERADMIN principal.
3. Aprobar que el SUPERADMIN solo pueda ser modificado por si mismo en `/intranet/superadmin/mi-cuenta`.
4. Aprobar el flujo especial de transferencia de propiedad en `/intranet/superadmin/transferir-propiedad`.
5. Definir si Alumno puede tambien actuar como Cliente/Profesional o si sera inicialmente un rol separado.

## 42. Principio de informacion conectada

Principio obligatorio:

TODA LA INFORMACION DE ZOVIT DEBE CONVERSAR ENTRE SI.

ZOVIT no debe evolucionar como una suma de paneles aislados. Debe funcionar como un ecosistema integrado donde Alumno, Empresa, Institucion, Cliente, Profesional, Evaluador, Administrador y SUPERADMIN consumen informacion relacionada segun permisos, autorizaciones y consentimientos.

Reglas:

- Cada dato debe tener una fuente clara.
- Cada dato debe tener una fuente unica de verdad cuando sea posible.
- No duplicar informacion por panel.
- Las vistas deben leer datos relacionados, no copiar datos manualmente.
- Un cambio autorizado debe reflejarse en los modulos relacionados.
- La informacion compartida debe tener trazabilidad, vigencia, estado y consentimiento asociado cuando corresponda.
- Antes de crear un modulo nuevo, revisar si puede extenderse una tabla, API, componente o flujo actual.

Ejemplo central:

1. La Institucion valida carrera, sede, jornada, semestre y avance curricular del Alumno.
2. Esa informacion alimenta automaticamente el pasaporte digital.
3. Empresa usa esos datos para encontrar alumnos compatibles.
4. Evaluador usa carrera/competencias para asignar evaluaciones.
5. SUPERADMIN supervisa el dato, la fuente, el consentimiento y la trazabilidad.

## 43. Diagrama textual del ecosistema completo

```
Institucion
  -> valida datos academicos
  -> alimenta pasaporte del Alumno
  -> recibe reportes agregados de empleabilidad y brechas

Alumno
  -> recibe datos academicos validados
  -> construye pasaporte digital
  -> postula a oportunidades de Empresa
  -> puede prestar servicios autorizados a Cliente
  -> recibe evaluaciones de Evaluador, Empresa y Cliente

Empresa
  -> publica oportunidades/practicas/trabajos/servicios
  -> busca alumnos y profesionales autorizados
  -> conversa con Alumno
  -> solicita evaluaciones
  -> evalua desempeno y brechas

Evaluador
  -> revisa alumnos asignados
  -> registra evaluaciones, evidencias y competencias tecnicas demostradas
  -> alimenta pasaporte, certificaciones ZOVIT solo si se aprueba evaluacion tecnica y reportes agregados

Cliente
  -> solicita servicios
  -> contrata Profesional o Alumno autorizado
  -> paga, confirma y evalua
  -> alimenta experiencia y reputacion

Profesional
  -> conserva flujo actual
  -> recibe solicitudes, envia propuestas, ejecuta trabajos
  -> acumula experiencia, pagos, reputacion y certificados

Administrador
  -> gestiona modulos autorizados
  -> valida documentos, usuarios e incidencias segun permiso
  -> no accede a datos privados del SUPERADMIN

SUPERADMIN
  -> supervisa todo
  -> protege arquitectura, permisos, auditoria y transferencias
```

## 44. Fuente unica de verdad por tipo de dato

| Dato | Fuente unica recomendada | Tablas actuales reutilizables | Modulos que consumen |
| --- | --- | --- | --- |
| Identidad basica | `profiles` | `profiles`, `identity_documents` | Todos los paneles autorizados |
| Rol/tipo de cuenta | `profiles.role`, `profiles.intranet_role` | `profiles` | Auth, middleware, intranet |
| Verificacion identidad | `profiles.identity_*`, `identity_documents` | `profiles`, `identity_documents` | Cliente, Profesional, Alumno, Admin |
| Datos academicos | Extension Alumno | `profiles` parcialmente, `worker_credentials` parcialmente | Alumno, Institucion, Empresa, Evaluador |
| Certificados/documentos | Storage privado + metadata | `identity_documents`, `worker_credentials`, `issued_certificates` | Pasaporte, verificaciones, evaluaciones |
| Solicitud de servicio | `solicitudes_de_servicio` | `solicitudes_de_servicio`, `request_*` | Cliente, Profesional, Alumno autorizado |
| Mensajes | Sistema actual de request messages extendido o tabla contextual | `request_messages`, `notifications` | Conversaciones autorizadas |
| Notificaciones | `notifications` | `notifications` | Todos |
| Pagos | Sistema actual de pagos | `payments`, `wallets`, `wallet_transactions`, `payment_events` | Cliente, Profesional, Empresa, SUPERADMIN |
| Reputacion | Ratings/experiencia | `service_ratings`, `professional_experience`, `worker_public_badges` | Cliente, Profesional, Alumno, Empresa |
| Auditoria | `audit_logs` nueva | `payment_events`, `worker_review_history`, `request_status_history` como fuentes parciales | SUPERADMIN, Administrador autorizado |
| Consentimientos | Tabla nueva minima `consents` si no puede integrarse seguro | No hay equivalente completo | Alumno, Empresa, Institucion |

## 45. Matriz de intercambio de informacion

| Relacion | Quien crea | Quien ve | Quien modifica | Quien valida | Modulos actualizados | Consentimiento | Reutilizacion actual |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Alumno-Institucion | Institucion o Alumno | Alumno, Institucion, autorizados | Institucion/Alumno segun fuente | Institucion/Admin | Pasaporte, filtros Empresa, reportes | Si para identificable | `profiles`, documentos privados, certificados |
| Alumno-Empresa | Empresa crea oportunidad; Alumno postula | Ambas partes, Admin autorizado | Empresa/Alumno segun etapa | Admin/Evaluador si aplica | Postulaciones, mensajes, evaluaciones | Si para pasaporte identificable | Solicitudes como patron, notificaciones |
| Alumno-Evaluador | Admin asigna; Evaluador registra | Alumno, Evaluador, Admin, SUPERADMIN | Evaluador | Evaluador/Admin | Pasaporte, competencias tecnicas demostradas y certificaciones ZOVIT solo tras evaluacion aprobada | Segun evaluacion | `worker_review_history` como patron, certificados |
| Alumno-Cliente | Cliente solicita; Alumno autorizado responde | Cliente, Alumno, Admin | Partes segun servicio | Sistema/Admin | Solicitud, pago, reputacion, experiencia | Si para mostrar datos del Alumno | `solicitudes_de_servicio`, pagos, ratings |
| Cliente-Profesional | Cliente solicita; Pro envia propuesta | Partes, Admin segun permiso | Partes segun flujo | Sistema/Admin | Solicitud, mensajes, pagos, reputacion | Flujo contractual actual | Tablas actuales completas |
| Empresa-Institucion | Empresa genera demanda; Institucion consume reportes | Institucion agregada, SUPERADMIN | Sistema/Admin | Sistema/Admin | Reportes, brechas, carreras | Identificable requiere consentimiento | Agregaciones nuevas sobre datos existentes |
| Empresa-Evaluador | Empresa solicita competencia; Admin asigna | Empresa ve resultado autorizado | Evaluador/Admin | Evaluador | Evaluacion, pasaporte, reportes | Si involucra Alumno identificable | Patron de verificaciones + notificaciones |
| Administrador-Usuarios | Admin gestiona segun permiso | Admin autorizado | Admin autorizado | SUPERADMIN o politica | Estados, verificaciones, soporte | No para gestion interna legitima, si datos sensibles | `PlatformUsersManager`, APIs intranet |
| SUPERADMIN-Todo | Sistema/SUPERADMIN | SUPERADMIN | SUPERADMIN | SUPERADMIN | Auditoria global | No aplica, pero auditable | Intranet actual + protecciones nuevas |

## 46. Flujos de comunicacion entre usuarios

La comunicacion debe estar vinculada a un contexto. No debe existir mensajeria privada indiscriminada.

Contextos permitidos:

- Oportunidad.
- Postulacion.
- Servicio.
- Evaluacion.
- Documento.
- Incidencia.
- Soporte.

Flujos:

- Alumno-Empresa: invitacion, postulacion, entrevista, resultado, retroalimentacion.
- Alumno-Cliente: solo cuando existe servicio u oportunidad autorizada.
- Profesional-Cliente: conservar flujo actual de solicitud/propuesta/trabajo.
- Institucion-Alumno: validacion documental, observaciones academicas y autorizaciones.
- Evaluador-Alumno: evaluacion asignada, evidencias, correcciones y resultado.
- Administrador-Usuario: soporte, correccion documental, incidencia.

Estrategia conservadora:

- Reutilizar `request_messages` como patron de mensajes ligados a un recurso.
- Si `request_messages` queda demasiado especifica para solicitudes de servicio, crear una capa minima tipo `conversation_contexts` y asociar mensajes al contexto.
- Reutilizar `notifications` para avisar actividad nueva.

## 47. Notificaciones conectadas

Reutilizar el sistema actual `notifications` como base.

Eventos que deben generar notificacion:

- Empresa invita a Alumno.
- Alumno postula.
- Empresa responde postulacion.
- Institucion valida documento academico.
- Institucion rechaza o pide correccion.
- Evaluador asignado a Alumno.
- Evaluador publica resultado.
- Certificacion emitida.
- Cliente solicita servicio.
- Profesional acepta o envia propuesta.
- Alumno autorizado acepta servicio.
- Pago confirmado.
- Pago liberado.
- Documento proximo a vencer.
- SUPERADMIN crea o invita usuario.
- Administrador solicita correccion.
- Intento bloqueado contra SUPERADMIN.
- Transferencia de propiedad iniciada, aceptada, cancelada o fallida.

Cada notificacion debe incluir recurso relacionado, destinatario, estado de lectura y ruta de accion.

## 48. Historial y trazabilidad

Toda informacion compartida debe registrar:

- Quien creo el dato.
- Quien lo modifico.
- Quien lo valido.
- Fecha y hora.
- Fuente.
- Estado.
- Vigencia.
- Usuarios o roles autorizados.
- Consentimiento asociado.
- Relacion con Alumno, Empresa, Institucion, Cliente, Profesional, Evaluador o servicio.

No duplicar historial si ya existe tabla ampliable:

- `request_status_history` se conserva para solicitudes.
- `payment_events` se conserva para pagos.
- `worker_review_history` se conserva como antecedente de revisiones.
- `audit_logs` debe cubrir acciones transversales que hoy no tienen registro unico.

## 49. Reglas de sincronizacion

- Los paneles no deben guardar copias manuales de datos compartidos.
- Los paneles deben consultar por relaciones: alumno, oportunidad, evaluacion, solicitud, documento o consentimiento.
- Un cambio academico validado debe actualizar vistas de pasaporte, filtros de Empresa y reportes institucionales.
- Una evaluacion tecnica ZOVIT aprobada debe actualizar competencias certificadas, certificaciones y busquedas autorizadas.
- Una experiencia de servicio debe actualizar historial, reputacion e indicadores.
- Un consentimiento revocado debe retirar visibilidad futura de datos identificables.
- La informacion agregada institucional debe recalcularse o consultarse desde fuente viva, evitando snapshots inconsistentes salvo reportes historicos versionados.

## 50. Reglas de consentimiento y privacidad

- Alumno controla datos identificables compartidos con Empresa e Institucion cuando la ley o convenio lo requiera.
- Institucion puede ver datos agregados por defecto.
- Empresa ve solo perfil autorizado, competencias, disponibilidad y datos necesarios para la oportunidad.
- Evaluador ve solo alumnos/evaluaciones asignadas.
- Cliente ve solo datos autorizados para contratar un servicio.
- Administrador ve datos segun modulo y permiso.
- SUPERADMIN ve todo, pero sus accesos tambien deben auditarse.
- Datos privados del SUPERADMIN no son visibles para Administrador ni Evaluador.
- RUT, documentos, certificados, antecedentes, ubicacion precisa y datos financieros requieren control especial.

## 51. Riesgos de informacion duplicada o inconsistente

Riesgos:

- Copiar carrera/semestre en perfil Alumno, postulacion y oportunidad sin relacion.
- Crear mensajeria separada por cada panel.
- Crear notificaciones paralelas para Empresa/Alumno/Institucion.
- Duplicar certificados en varias tablas.
- Crear reputacion distinta para Alumno y Profesional sin modelo comun.
- Guardar reportes institucionales como datos identificables permanentes sin consentimiento.
- Mantener estados de evaluacion en mas de una tabla sin fuente unica.

Prevencion:

- Usar IDs de relacion.
- Mantener `profiles` como identidad comun.
- Extender tablas actuales primero.
- Centralizar auditoria.
- Definir ownership y fuente de cada dato.
- Versionar datos validados cuando sea necesario conservar historico.

## 52. Relaciones nuevas minimas necesarias

Relaciones minimas, evitando reconstruir:

- Alumno-Institucion: vinculo academico con estado y consentimiento.
- Alumno-Empresa: postulacion/invitacion a oportunidad.
- Alumno-Evaluador: asignacion de evaluacion.
- Empresa-Oportunidad: oportunidad laboral, practica o servicio.
- Evaluacion-Competencia: resultado medible asociado al Alumno.
- Consentimiento-Recurso: autorizacion para compartir dato identificable.
- Auditoria-Recurso: accion sensible asociada a cualquier entidad.
- Transferencia-SUPERADMIN: flujo especial de propiedad.

Estas relaciones pueden implementarse primero como tablas pequenas de enlace, no como reemplazo de los modulos actuales.

## 53. Estrategia para mantener informacion conectada sin reconstruir

1. Mantener modulos actuales vivos.
2. Agregar campos o tablas de relacion pequenas donde falte conexion.
3. Reutilizar `profiles` para identidad comun.
4. Reutilizar solicitudes, mensajes, notificaciones, pagos, certificados y storage.
5. Crear nuevas fuentes solo para dominios que no existen: oportunidades, postulaciones, evaluaciones academicas, consentimientos, auditoria y transferencia.
6. Hacer que las nuevas rutas lean datos existentes mediante adaptadores.
7. Mantener `/panel` y rutas actuales como compatibilidad.
8. Agregar paneles nuevos como vistas especializadas, no como sistemas paralelos.
9. Implementar RLS por relacion y consentimiento.
10. Auditar toda accion sensible desde el inicio de la migracion.

## 54. Evaluacion tecnica y coincidencia inteligente

Regla fundamental:

Aprobar un modulo, asignatura o semestre NO entrega una Certificacion ZOVIT.

Los modulos aprobados acreditan formacion academica. La Certificacion ZOVIT solo puede obtenerse despues de aprobar una evaluacion tecnica realizada bajo estandares ZOVIT.

Separacion obligatoria:

| Concepto | Quien lo origina | Que significa | Habilita trabajo autonomo |
| --- | --- | --- | --- |
| Modulo/asignatura aprobada | Institucion | Formacion academica cursada y aprobada | No por si sola |
| Resultado de aprendizaje | Institucion | Contenido o aprendizaje esperado del modulo | No por si solo |
| Competencia academica | Institucion/ZOVIT por mapeo | Capacidad inferida desde formacion | No por si sola |
| Evaluacion tecnica ZOVIT | Evaluador ZOVIT | Prueba teorica/practica bajo estandar ZOVIT | Solo si aprueba |
| Certificacion ZOVIT | ZOVIT | Competencia tecnica certificada | Si, dentro del alcance certificado |

### 54.1 Flujo correcto

```
Institucion
  -> Alumno aprueba modulo
  -> Institucion informa avance academico
  -> ZOVIT identifica modulos, resultados, contenidos, competencias academicas y herramientas aprendidas
  -> Alumno puede postular a oportunidades relacionadas
  -> Empresa encuentra al Alumno por formacion academica
  -> Si el trabajo requiere certificacion, ZOVIT agenda evaluacion tecnica
  -> Evaluador realiza prueba teorica, practica, evidencias y seguridad
  -> Si aprueba, ZOVIT certifica la competencia
  -> Alumno queda habilitado solo para trabajos relacionados con esa competencia certificada
```

La Institucion entrega y valida formacion. ZOVIT evalua competencia tecnica. ZOVIT certifica solo cuando existe evaluacion tecnica aprobada.

### 54.2 Necesidades de Empresa

Cuando una Empresa publique una oportunidad, no debe limitarse al nombre de la carrera. Podra solicitar:

- Carrera.
- Institucion.
- Semestre minimo.
- Modulos aprobados.
- Competencias tecnicas.
- Competencias transversales.
- Aptitudes.
- Actitudes laborales.
- Herramientas que debe dominar.
- Certificaciones ZOVIT.
- Nivel de experiencia.
- Trabajo con o sin supervision.
- Licencias.
- Disponibilidad.
- Horario.
- Ubicacion.
- Nivel de riesgo.

ZOVIT debe distinguir oportunidades que aceptan formacion academica de oportunidades que exigen Certificacion ZOVIT.

### 54.3 Informacion consultada para matching

Al publicar una oportunidad, ZOVIT debe consultar informacion conectada desde fuentes unicas:

- Avance academico.
- Modulos aprobados.
- Resultados de aprendizaje.
- Contenidos del modulo.
- Competencias academicas relacionadas.
- Evaluaciones tecnicas ZOVIT.
- Certificaciones ZOVIT vigentes.
- Experiencia.
- Historial laboral.
- Reputacion.
- Disponibilidad.
- Ubicacion.
- Restricciones.
- Necesidad de supervision.

El resultado del matching debe clasificar al Alumno, por ejemplo:

- Cumple formacion academica.
- Cumple experiencia.
- Certificacion ZOVIT pendiente.
- Autorizado solo bajo supervision.
- Autorizado para trabajo autonomo dentro de competencias certificadas.

### 54.4 Ejemplo: electricidad automotriz

Empresa necesita "Tecnico en electricidad automotriz".

Requisitos:

- Manejo de multimetro.
- Circuitos electricos.
- Ley de Ohm.
- Diagnostico basico.
- Fusibles.
- Reles.
- Interpretacion de diagramas.
- Seguridad electrica.

ZOVIT detecta que el Alumno:

- Aprobo Electricidad Automotriz.
- Aprobo Electronica Basica.
- Realizo talleres practicos.
- Declara/conoce uso de multimetro segun formacion.
- Aprobo diagnostico electrico academico.

Pero tambien detecta:

- Aun no posee Certificacion ZOVIT.

Resultado:

| Dimension | Estado |
| --- | --- |
| Formacion academica | Cumple |
| Certificacion ZOVIT | Pendiente |
| Trabajo autonomo | No autorizado |
| Trabajo bajo supervision | Permitido si la Empresa lo acepta y el marco legal/operativo lo permite |

La Empresa podra decidir:

- Contratarlo como practicante.
- Contratarlo como ayudante.
- Solicitar que primero obtenga Certificacion ZOVIT.

### 54.5 Evaluacion tecnica ZOVIT

La certificacion debe considerar:

- Prueba teorica.
- Evaluacion practica.
- Seguridad.
- Resolucion de problemas.
- Calidad del procedimiento.
- Uso correcto de herramientas.
- Tiempo de ejecucion.
- Cumplimiento de protocolo.
- Evidencias.

La Certificacion ZOVIT solo puede emitirse si todas las condiciones minimas son aprobadas. El resultado debe indicar alcance, vigencia, restricciones y si habilita trabajo autonomo o solo bajo supervision.

### 54.6 Informacion conectada despues de aprobar

Cuando el Alumno aprueba una evaluacion tecnica ZOVIT, actualizar automaticamente:

- Pasaporte Digital.
- Perfil del Alumno.
- Perfil Profesional, si existe.
- Competencias certificadas.
- Certificaciones ZOVIT.
- Servicios autorizados.
- Coincidencias con Empresas.
- Coincidencias con Clientes.
- Experiencia.
- Reputacion.
- Historial.
- Auditoria.
- Notificaciones.

No debe existir duplicacion de informacion. La evaluacion aprobada es la fuente del certificado; el certificado se muestra en los paneles relacionados.

### 54.7 Principio de ciclo de vida

La informacion se ingresa una sola vez y desde ese momento la plataforma conversa automaticamente:

- La Institucion entrega la formacion.
- ZOVIT interpreta la formacion para matching.
- ZOVIT evalua la competencia.
- ZOVIT certifica la competencia solo si la evaluacion tecnica es aprobada.
- Las Empresas encuentran al Alumno por formacion, experiencia y certificaciones.
- Los Clientes encuentran prestadores autorizados segun alcance permitido.
- Los Evaluadores generan evidencias.
- La experiencia alimenta nuevamente el Pasaporte Digital.
- La informacion permanece conectada durante toda la vida del usuario, desde Alumno hasta Profesional.

## 55. Cierre recomendado de la propuesta

La recomendacion final es conservar la plataforma actual como base operativa y evolucionarla con compatibilidad, no con reemplazo. El modelo de roles debe seguir siendo un sistema de capas: identidad, tipo de cuenta y permisos. Esto permite que Cliente y Profesional sigan funcionando con riesgo bajo, mientras se agregan Alumno, Empresa, Institucion, Evaluador y SUPERADMIN con protecciones reales y trazabilidad.

El punto critico para no romper produccion es no introducir una arquitectura nueva de permisos completa en la primera fase. La primera etapa debe centrarse en:

1. ampliar `profiles.role` e `profiles.intranet_role` sin romper flujo actual;
2. definir cuenta protegida y auditoria global;
3. crear rutas nuevas como alias temporales;
4. validar usuarios con estados de cuenta y consentimientos;
5. mantener `profiles` como fuente unica de identidad y `audit_logs` como fuente unica de acciones sensibles.

## 56. Proximo bloque de trabajo ejecutable

El siguiente paso inmediato no debe ser una migracion completa. Debe ser una fase de aislamiento y compatibilidad:

- revisar el esquema real de Supabase en produccion;
- confirmar el UUID estable del SUPERADMIN actual;
- congelar reglas de acceso actuales; 
- ampliar `lib/auth/roles.ts` y `lib/auth/intranetRoles.ts` con compatibilidad hacia `student`, `company` e `institution`;
- integrar `audit_logs` y proteccion del SUPERADMIN antes de abrir nuevas rutas internas;
- preparar `/intranet/superadmin/mi-cuenta` y `/intranet/superadmin/transferir-propiedad` como secciones seguras;
- dejar la UI nueva solo como alias de los paneles actuales en la primera etapa.

## 57. Resumen ejecutivo final

La arquitectura correcta para ZOVIT no es reemplazar lo que ya existe. La arquitectura correcta es construir un ecosistema conectado sobre una base viva y ya operativa, extensible por capas de compatibilidad, permisos y trazabilidad.

Si se sigue esta linea, la plataforma puede pasar de un esquema dual Cliente/Profesional a un ecosistema completo de usuarios sin interrumpir el negocio ni romper la experiencia actual de pago, autenticacion, verificacion y operacion.
