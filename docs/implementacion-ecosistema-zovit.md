# Implementacion inicial del ecosistema ZOVIT

Fecha base: 31 de julio de 2026.

Este documento describe la primera capa tecnica para avanzar hacia el ecosistema ZOVIT sin romper la estructura actual.

## Principio central

ZOVIT mantiene una identidad unica por persona y calcula su capacidad operativa desde datos estructurados. Los documentos son evidencia; el sistema opera con estados, fechas, validaciones y decisiones reutilizables.

## Alcance de esta etapa

Esta etapa no modifica Supabase ni cambia tablas existentes. Agrega una capa de dominio pura para decidir si una persona puede operar dentro del ecosistema.

La capa inicial vive en:

- `lib/operational/status.ts`
- `lib/operational/status.test.ts`

## Estados operativos

Los estados base son:

- `habilitado`: puede aparecer y aceptar trabajo.
- `habilitado_con_supervision`: puede operar, pero requiere supervision.
- `pendiente_documentos`: faltan documentos o debe renovar dentro del semestre.
- `pendiente_revision`: hay documentos o identidad esperando revision.
- `suspendido_por_documentos`: documentos vencidos.
- `suspendido_por_riesgo`: bloqueo activo por riesgo.
- `no_habilitado`: rechazo documental o condicion que impide operar.

## Regla semestral documental

Los documentos deben renovarse dos veces al anio:

- Primer semestre: 1 de marzo al 31 de julio.
- Segundo semestre: 1 de agosto al 31 de diciembre.

Si una persona no renueva en el semestre activo, su estado operativo pasa a `pendiente_documentos`. Si el documento vence, pasa a `suspendido_por_documentos`.

## Motor de renovaciones semestrales

Se agrega una capa de dominio para controlar plazos, recordatorios, revision y suspension documental por semestre.

Archivos:

- `lib/operational/renewal.ts`
- `lib/operational/renewal.test.ts`

Reglas aplicadas:

- El primer semestre opera del 1 de marzo al 31 de julio.
- El segundo semestre opera del 1 de agosto al 31 de diciembre.
- Enero y febrero quedan fuera de la ventana operacional semestral.
- Si el documento ya fue renovado dentro del semestre activo, la renovacion queda completa.
- Si falta renovacion, se abre la ventana de renovacion.
- Si el plazo esta cerca de vencer, se debe enviar recordatorio.
- Si los documentos estan pendientes, se solicita revision manual.
- Si los documentos estan rechazados o vencidos, la cuenta queda sujeta a suspension.

El Pasaporte Digital muestra una vista conceptual del estado de renovacion semestral. La persistencia definitiva de fechas y eventos de renovacion queda para una etapa posterior.

## OCR gratuito y revision

El flujo recomendado es:

1. Subida o reemplazo de documento.
2. OCR local gratuito con Tesseract cuando corresponda.
3. Extraccion y guardado de datos estructurados.
4. Validacion por reglas internas.
5. Si hay dudas, revision manual.

No se considera obligatorio usar IA pagada. La IA externa debe permanecer desactivada salvo decision futura explicita.

## Siguiente conexion tecnica

La primera conexion ya queda disponible para trabajadores/profesionales:

- `lib/operational/worker.ts` traduce el estado actual de registro, credenciales y perfil principal a una decision operativa.
- `/api/intranet/workers` entrega `operational_decision` por trabajador sin agregar columnas nuevas.
- La intranet de trabajadores muestra el estado operativo junto al estado de revision.

Cuando se apruebe una etapa posterior, esta capa puede conectarse con:

- Registro de profesionales y alumnos.
- Cola de verificacion de intranet.
- Matching de clientes con profesionales/alumnos.
- Navegacion y permisos.
- Suspensiones automaticas por documentos.
- Pasaporte digital ZOVIT.

## Criterio de compatibilidad

La estructura actual de `client`, `professional`, `admin`, modo activo e intranet se conserva. El estado operativo no reemplaza los roles: los complementa.

## Capa puente de roles del ecosistema

Se agrega una capa de dominio para traducir los roles actuales al modelo futuro del ecosistema sin cambiar todavia la base de datos.

Archivos:

- `lib/ecosystem/roles.ts`
- `lib/ecosystem/roles.test.ts`
- `lib/ecosystem/navigation.ts`
- `lib/ecosystem/navigation.test.ts`
- `components/ecosystem/EcosystemAccessGrid.tsx`

Roles conceptuales:

- Alumno.
- Empresa.
- Institucion.
- Cliente.
- Profesional.
- Evaluador.
- Administrador.
- SUPERADMIN.

Reglas iniciales:

- `client` actual se traduce a Cliente.
- `professional` actual se traduce a Profesional.
- `primary_service_profile = in_training` se traduce tambien a Alumno.
- `intranet_role = supervisor` se traduce a Evaluador.
- `role = admin` o `intranet_role = hr_admin` se traduce a Administrador.
- `intranet_role = super_admin` se traduce a SUPERADMIN.

Permisos reservados:

- `govern_ai`, `govern_ocr`, `access_founder_vault` y `transfer_ownership` quedan reservados para SUPERADMIN.

Esta capa permite preparar navegacion, permisos y paneles futuros sin mezclar todos los conceptos directamente en `profiles.role`.

## Navegacion por rol del ecosistema

La navegacion del ecosistema queda modelada como una lista de accesos actuales y futuros.

Reglas:

- Solo se muestran rutas existentes y actuales por defecto.
- ZOVIT IA, ZOVIT OCR y Founder Vault quedan modelados como accesos futuros, pero no visibles en navegacion normal.
- Founder Vault permanece oculto incluso para SUPERADMIN salvo que una implementacion futura lo solicite explicitamente con controles adicionales.
- El panel principal usa `EcosystemAccessGrid` para mostrar accesos segun rol sin eliminar las tarjetas actuales.

Esto permite migrar gradualmente desde paneles manuales a una navegacion gobernada por permisos.

## Pasaporte Digital ZOVIT inicial

Se agrega una primera version privada del Pasaporte Digital ZOVIT sin crear tablas nuevas.

Archivos:

- `lib/passport/types.ts`
- `lib/passport/buildPassport.ts`
- `lib/passport/buildPassport.test.ts`
- `app/panel/pasaporte/page.tsx`

La pantalla inicial vive en:

- `/panel/pasaporte`

Contenido inicial:

- Identidad.
- Formacion.
- Competencias.
- Certificaciones ZOVIT.
- Experiencia.
- Estado operativo.
- Roles actuales dentro del ecosistema.

Esta primera version reutiliza campos existentes de `profiles`, verificacion y registro de trabajador/profesional. No reemplaza todavia un modelo definitivo de competencias ni certificaciones.

## Catalogo Maestro de Competencias inicial

Se agrega una base local del Catalogo Maestro de Competencias sin crear tablas nuevas.

Archivos:

- `lib/competencies/types.ts`
- `lib/competencies/catalog.ts`
- `lib/competencies/rules.ts`
- `lib/competencies/rules.test.ts`

Principios aplicados:

- Formacion academica no equivale a Certificacion ZOVIT.
- Aprobar modulo o registrar formacion no habilita automaticamente trabajo autonomo.
- Una competencia puede requerir supervision.
- Una competencia puede requerir licencia externa.
- Una competencia puede tener alcance de bajo o alto riesgo.
- Las reglas distinguen educacion, evaluacion ZOVIT, experiencia, licencia externa y revision manual.

El Pasaporte Digital muestra una vista inicial del catalogo como referencia, pero no afirma que el usuario posea esas competencias ni certificaciones.

## Certificacion Tecnica ZOVIT inicial

Se agrega una base de dominio para Certificacion Tecnica ZOVIT sin crear tablas nuevas.

Archivos:

- `lib/certifications/types.ts`
- `lib/certifications/rules.ts`
- `lib/certifications/rules.test.ts`

Reglas aplicadas:

- Una certificacion ZOVIT no nace automaticamente desde formacion academica.
- Una certificacion requiere identidad verificada.
- Una certificacion requiere evaluacion tecnica ZOVIT aprobada o licencia externa equivalente cuando aplique.
- Las competencias reguladas pueden exigir licencia externa o evaluacion adicional.
- El Pasaporte Digital muestra una vista explicativa de elegibilidad, pero no emite certificados reales.

Esta capa prepara el futuro flujo de evaluacion, emision, vigencia, suspension, revocacion y renovacion de certificaciones.

## Evaluacion Tecnica ZOVIT inicial

Se agrega una base de dominio para Evaluacion Tecnica ZOVIT sin crear tablas nuevas.

Archivos:

- `lib/evaluations/types.ts`
- `lib/evaluations/rules.ts`
- `lib/evaluations/rules.test.ts`

Reglas aplicadas:

- La evaluacion es distinta de la certificacion.
- Una evaluacion requiere evidencia verificada.
- Una evaluacion requiere puntaje suficiente.
- Una evaluacion aprobada puede habilitar certificacion.
- Una evaluacion puede aprobar con supervision cuando el riesgo lo exige.
- El Pasaporte Digital muestra el estado conceptual de evaluacion, sin inventar resultados reales.

Esta capa prepara el futuro modulo de Evaluador, evidencias, puntajes, alcances, supervision, auditoria y decision tecnica.

## Perfil base de Evaluador

Se agrega una base de dominio para Evaluador sin crear tablas nuevas.

Archivos:

- `lib/evaluators/types.ts`
- `lib/evaluators/rules.ts`
- `lib/evaluators/rules.test.ts`
- `app/intranet/supervisor/page.tsx`

Reglas aplicadas:

- El `intranet_role = supervisor` funciona como equivalente inicial de Evaluador.
- Un Evaluador debe estar activo.
- Un Evaluador solo puede evaluar dominios de competencia permitidos.
- Un Evaluador puede estar autorizado para alumnos, profesionales o ambos.
- Casos de alto riesgo pueden requerir segunda revision.
- El portal `/intranet/supervisor` se redefine visualmente como portal evaluador/supervisor, sin crear aun persistencia de evaluaciones.

Esta capa prepara futuras asignaciones Alumno-Evaluador, Profesional-Evaluador, evidencias, alcances y decisiones tecnicas auditadas.

## Automatizacion responsable del ecosistema

Se agrega una base de dominio para automatizacion del ecosistema sin ejecutar acciones sensibles automaticamente.

Archivos:

- `lib/ecosystem/automation.ts`
- `lib/ecosystem/automation.test.ts`

La capa convierte estados y decisiones en:

- Senales.
- Acciones sugeridas.
- Necesidad de aprobacion humana.
- Resumen operativo.

Senales iniciales:

- Identidad pendiente.
- Documentos pendientes.
- Revision manual requerida.
- Evaluacion tecnica pendiente.
- Certificacion bloqueada.
- Supervision requerida.
- Listo para bajo riesgo.
- Listo para trabajo autonomo.

Principio aplicado:

El sistema puede sugerir automatizaciones, pero acciones sensibles como matching autonomo, bloqueo sensible o revision manual deben quedar auditadas y requerir aprobacion humana cuando corresponda.

Esta capa prepara el futuro motor de confianza, matching responsable, renovacion documental, supervision automatizada y pulso operativo del ecosistema.

## Matching responsable inicial

Se agrega una base de dominio para matching responsable sin modificar APIs existentes ni base de datos.

Archivos:

- `lib/matching/types.ts`
- `lib/matching/responsibleMatching.ts`
- `lib/matching/responsibleMatching.test.ts`

Principio aplicado:

ZOVIT no debe recomendar solamente por cercania o categoria. El matching debe considerar:

- Estado operativo.
- Competencias requeridas.
- Certificaciones requeridas.
- Evaluacion tecnica.
- Riesgo del servicio.
- Supervision requerida.
- Distancia.
- Reputacion.
- Experiencia.

Reglas iniciales:

- Si el perfil no puede aceptar trabajo, queda bloqueado.
- Si falta competencia requerida, queda bloqueado.
- Si el servicio exige certificacion y no existe, queda bloqueado.
- Si el riesgo es alto y el perfil requiere supervision, queda bloqueado salvo reglas futuras especiales.
- Los candidatos elegibles se ordenan por puntaje.

El Pasaporte Digital muestra una vista conceptual de matching responsable, pero todavia no reemplaza el matching real de mapa ni las APIs actuales.

## Asignacion de evaluaciones tecnicas

Se agrega una base de dominio para asignar evaluaciones tecnicas a evaluadores sin modificar Supabase ni crear migraciones.

Archivos:

- `lib/evaluations/assignments.ts`
- `lib/evaluations/assignments.test.ts`

Flujo inicial de estados:

- `draft`
- `assigned`
- `accepted`
- `in_progress`
- `submitted`
- `reviewed`
- `completed`
- `cancelled`
- `expired`

Reglas aplicadas:

- Una evaluacion no puede saltar estados criticos.
- Una evaluacion completada, cancelada o expirada queda finalizada.
- La preparacion de una asignacion considera estado operativo del perfil, evaluador autorizado, evidencia y segunda revision.
- Si el evaluador no esta asignado o no tiene alcance suficiente, la evaluacion no queda lista.
- Casos de alto riesgo pueden quedar marcados para segunda revision.

El Pasaporte Digital muestra una vista conceptual de asignacion de evaluacion, sin inventar evaluador ni evidencia real.

## Auditoria tecnica de evaluaciones

Se agrega una base de dominio para auditar evaluaciones antes de permitir una certificacion ZOVIT.

Archivos:

- `lib/evaluations/audit.ts`
- `lib/evaluations/audit.test.ts`

Reglas aplicadas:

- Si la asignacion no esta lista, la certificacion no puede avanzar.
- Si falta evaluador, se solicita asignacion de evaluador.
- Si falta evidencia, se solicita evidencia tecnica verificable.
- Si la evaluacion tecnica es rechazada, la certificacion queda bloqueada.
- Si existe supervision o segunda revision, se exige control humano.
- Solo una asignacion lista y una evaluacion aprobada sin revision humana pendiente pueden avanzar a certificacion.

Esta capa funciona como semaforo de confianza antes de emitir certificaciones, activar matching responsable o automatizar decisiones sensibles.

## Cola operativa de revision

Se agrega una base de dominio para construir una cola unica de tareas operativas pendientes.

Archivos:

- `lib/operations/reviewQueue.ts`
- `lib/operations/reviewQueue.test.ts`

La cola reune senales provenientes de:

- Estado operativo.
- Renovacion semestral.
- Auditoria tecnica.
- Automatizacion del ecosistema.

Tipos iniciales de pendientes:

- Renovacion documental.
- Revision documental manual.
- Suspension de cuenta.
- Asignacion de evaluador.
- Segunda revision tecnica.
- Automatizacion sensible.

Reglas aplicadas:

- Las suspensiones documentales tienen prioridad critica.
- Las revisiones manuales y segundas revisiones tienen prioridad alta.
- Los recordatorios documentales quedan como seguimiento automatico.
- Las automatizaciones sensibles se marcan para aprobacion humana.
- Los pendientes se ordenan por prioridad y luego por fecha de vencimiento.

Esta capa prepara un futuro Centro de Control ZOVIT en intranet, donde el equipo pueda revisar en una sola bandeja lo que requiere accion humana o seguimiento automatico.

## Centro de Control ZOVIT

Se agrega una base de dominio para consolidar multiples colas operativas en una vista ejecutiva del ecosistema.

Archivos:

- `lib/operations/controlCenter.ts`
- `lib/operations/controlCenter.test.ts`

El Centro de Control calcula:

- Total de perfiles evaluados.
- Total de pendientes operativos.
- Cantidad de pendientes con accion humana.
- Mayor prioridad activa.
- Metricas por prioridad.
- Metricas por tipo de pendiente.
- Lista superior de pendientes ordenada por prioridad y fecha.

Reglas aplicadas:

- Las alertas criticas quedan siempre primero.
- A igualdad de prioridad, se ordena por fecha de vencimiento.
- Los perfiles sin pendientes no generan ruido operativo.
- El resumen distingue entre estado limpio, alerta critica, accion humana y seguimiento automatico.

Esta capa prepara la futura pantalla de intranet donde ZOVIT pueda ver la salud operacional del ecosistema completo antes de automatizar suspensiones, asignaciones, recordatorios o revisiones.

Primera pantalla conectada:

- `/intranet/admin/centro-control`

La pantalla inicial usa perfiles reales desde `profiles` y genera colas operativas en memoria con las reglas de dominio existentes. En una etapa posterior debe alimentarse con colas reales persistidas en Supabase, historiales de eventos y estados auditables.

Adaptador agregado:

- `lib/operations/controlCenterProfiles.ts`
- `lib/operations/controlCenterProfiles.test.ts`

## Plan de accion operativo

Se agrega una capa de dominio para convertir pendientes de la cola operativa en acciones sugeridas.

Archivos:

- `lib/operations/actionPlan.ts`
- `lib/operations/actionPlan.test.ts`

Modos de ejecucion:

- `automatic`: puede ejecutarse automaticamente con registro de auditoria.
- `manual`: requiere accion humana.
- `superadmin_approval`: requiere aprobacion SUPERADMIN antes de ejecutar.

Acciones iniciales:

- Enviar recordatorio documental.
- Revisar documentos.
- Aplicar suspension documental.
- Asignar evaluador.
- Realizar segunda revision tecnica.
- Aprobar automatizacion sensible.

El Centro de Control ZOVIT muestra conteos del plan de accion para separar seguimiento automatico, trabajo humano y aprobaciones sensibles.

## Politica de ejecucion operativa

Se agrega una capa de dominio para decidir si una accion sugerida puede ejecutarse ahora o debe quedar retenida.

Archivos:

- `lib/operations/executionPolicy.ts`
- `lib/operations/executionPolicy.test.ts`

Estados de ejecucion:

- `executable`: puede ejecutarse ahora con auditoria.
- `requires_manual_action`: espera accion humana.
- `requires_superadmin_approval`: espera aprobacion SUPERADMIN.
- `blocked`: queda bloqueada por politica operativa.

Reglas aplicadas:

- Las acciones automaticas pueden ejecutarse si no estan bloqueadas.
- Las acciones manuales nunca se ejecutan solas.
- Las automatizaciones sensibles requieren aprobacion SUPERADMIN.
- Una accion bloqueada no puede ejecutarse aunque originalmente sea automatica.

El Centro de Control muestra un resumen de politica para separar lo ejecutable de lo retenido antes de que existan APIs que escriban cambios reales.

## Auditoria operativa

Se agrega una capa de dominio para convertir la politica de ejecucion en eventos auditables.

Archivos:

- `lib/operations/auditTrail.ts`
- `lib/operations/auditTrail.test.ts`

Eventos iniciales:

- `action_ready`: accion lista para ejecucion auditada.
- `action_retained_manual`: accion retenida para revision humana.
- `action_retained_superadmin`: accion retenida para aprobacion SUPERADMIN.
- `action_blocked`: accion bloqueada por politica operativa.

Reglas aplicadas:

- Cada evento conserva el `queueItemId`, tipo de accion, estado de politica, razones y fecha.
- Las acciones automaticas listas quedan asociadas al sistema.
- Las acciones manuales quedan asociadas a un humano.
- Las acciones sensibles quedan asociadas a SUPERADMIN.
- Las acciones bloqueadas conservan metadata para explicar por que no pueden ejecutarse.

El Centro de Control muestra un resumen de eventos listos, retenidos y bloqueados. La persistencia definitiva de estos eventos queda para una etapa posterior.

## Pulso operacional ZOVIT

Se agrega una capa de dominio para resumir la salud operacional del ecosistema.

Archivos:

- `lib/operations/healthPulse.ts`
- `lib/operations/healthPulse.test.ts`

Estados del pulso:

- `healthy`: ecosistema operativo sin pendientes relevantes.
- `watch`: existen pendientes, pero no hay alerta critica.
- `risk`: existen senales de riesgo que requieren gestion.
- `critical`: existen alertas criticas o bloqueos relevantes.

Reglas aplicadas:

- Parte desde un score de 100.
- Las prioridades criticas reducen fuertemente el score.
- Los eventos bloqueados reducen fuertemente el score.
- Las aprobaciones SUPERADMIN pendientes reducen el score.
- Las revisiones humanas pendientes reducen el score.
- Los seguimientos automaticos reducen levemente el score.

El Centro de Control muestra el pulso, puntaje y senales activas para entregar una lectura ejecutiva rapida del estado operacional de ZOVIT.

## Recomendaciones ejecutivas operacionales

Se agrega una capa de dominio para transformar el pulso, la politica de ejecucion y el Centro de Control en recomendaciones priorizadas.

Archivos:

- `lib/operations/executiveRecommendations.ts`
- `lib/operations/executiveRecommendations.test.ts`

Tipos iniciales:

- Resolver acciones bloqueadas.
- Atender alertas criticas.
- Solicitar aprobacion SUPERADMIN.
- Procesar revisiones humanas.
- Ejecutar acciones automaticas.
- Monitorear pulso operacional.

Reglas aplicadas:

- Los bloqueos tienen prioridad critica.
- Las alertas criticas deben priorizarse antes de acciones automaticas.
- Las aprobaciones SUPERADMIN se separan del trabajo humano normal.
- Si no hay pendientes, la recomendacion es monitorear.
- La salida puede limitarse para mantener una vista ejecutiva simple.

El Centro de Control muestra el numero de recomendaciones, la mayor prioridad ejecutiva, un resumen y la recomendacion principal.

## Snapshot operacional

Se agrega una capa de composicion para construir una fotografia completa del estado operacional.

Archivos:

- `lib/operations/operationalSnapshot.ts`
- `lib/operations/operationalSnapshot.test.ts`

El snapshot consolida:

- Centro de Control.
- Plan de accion.
- Politica de ejecucion.
- Auditoria operativa.
- Pulso operacional.
- Recomendaciones ejecutivas.

Reglas aplicadas:

- Se genera desde perfiles existentes sin crear tablas nuevas.
- Incluye metadata de esquema: `zovit.operational_snapshot`.
- Version inicial del esquema: `1.0.0`.
- Fuente inicial: `in_memory_profiles`.
- Respeta limites para pendientes principales y recomendaciones.
- Incluye `generatedAt` para trazabilidad futura.
- Centraliza el ensamblaje que antes vivia en la pagina del Centro de Control.

Esta capa prepara futuras APIs, persistencia de snapshots, reportes ejecutivos y comparacion historica del estado operacional de ZOVIT.

## API interna del snapshot operacional

Se agrega una API interna de solo lectura para exponer el snapshot operacional a futuras pantallas, automatizaciones y reportes.

Archivos:

- `lib/operations/loadOperationalSnapshot.ts`
- `app/api/intranet/operations/snapshot/route.ts`

Ruta:

- `GET /api/intranet/operations/snapshot`

Reglas aplicadas:

- Acceso restringido a `hr_admin` y `super_admin`.
- No modifica datos.
- Usa perfiles existentes desde `profiles`.
- Devuelve `snapshot` y `profileCount`.
- Devuelve `schemaVersion` para validacion rapida del cliente.
- Responde con `Cache-Control: no-store`.

Esta API permite que el Centro de Control y futuros procesos consuman la misma fuente operacional sin duplicar logica.

## Comparacion de snapshots operacionales

Se agrega una capa de dominio para comparar dos fotografias operacionales y detectar tendencia.

Archivos:

- `lib/operations/snapshotComparison.ts`
- `lib/operations/snapshotComparison.test.ts`

Metricas comparadas:

- Puntaje del pulso operacional.
- Total de pendientes.
- Acciones humanas.
- Acciones bloqueadas.
- Pendientes criticos.

Tendencias:

- `improved`: el estado operacional mejora.
- `stable`: el estado se mantiene estable.
- `worsened`: el estado operacional empeora.

Esta capa prepara reportes historicos, alertas de deterioro, tableros semanales y comparacion de salud operacional por semestre.

## Reporte ejecutivo de tendencia

Se agrega una capa de dominio para convertir la comparacion de snapshots en un reporte ejecutivo legible.

Archivos:

- `lib/operations/trendReport.ts`
- `lib/operations/trendReport.test.ts`

El reporte incluye:

- Titulo ejecutivo.
- Resumen de tendencia.
- Indicadores destacados.
- Severidad por indicador.
- Foco recomendado.

Severidades:

- `positive`: cambio favorable.
- `neutral`: sin cambio relevante.
- `warning`: cambio desfavorable.

Esta capa prepara futuros informes semanales, correos internos, paneles historicos y reportes por semestre.

## Politica de archivo y retencion de snapshots

Se agrega una capa de dominio para decidir como guardar snapshots operacionales cuando exista persistencia.

Archivos:

- `lib/operations/snapshotArchivePolicy.ts`
- `lib/operations/snapshotArchivePolicy.test.ts`

Cadencias iniciales:

- `daily`: captura diaria.
- `weekly`: captura semanal.
- `semester_close`: cierre semestral.
- `manual`: captura manual o reservada.

Niveles de retencion:

- `short_term`: retencion corta.
- `semester`: hasta el cierre del semestre.
- `annual`: retencion anual extendida.
- `founder_archive`: archivo fundador sin fecha de eliminacion.

Reglas aplicadas:

- Los snapshots diarios se retienen 45 dias.
- Los snapshots semanales se retienen hasta el cierre del semestre activo.
- Los snapshots de cierre semestral se retienen por 5 anios.
- Los snapshots manuales saludables no se persisten por defecto.
- Los snapshots manuales con riesgo pueden reservarse para archivo fundador.

Esta capa no crea tablas ni escribe archivos todavia. Define la politica para una futura persistencia historica ordenada y auditable.

## Manifiesto de snapshot operacional

Se agrega una capa de dominio para crear un indice liviano de cada snapshot operacional.

Archivos:

- `lib/operations/snapshotManifest.ts`
- `lib/operations/snapshotManifest.test.ts`

El manifiesto incluye:

- Clave de archivo.
- Nombre y version de esquema.
- Fecha de generacion.
- Fuente del snapshot.
- Estado y puntaje del pulso.
- Total de perfiles.
- Total de pendientes.
- Pendientes criticos.
- Acciones humanas.
- Acciones bloqueadas.
- Nivel de retencion.
- Fecha de retencion.
- Decision de persistencia.

Esta capa permite listar, buscar y auditar snapshots historicos sin cargar el contenido completo de cada fotografia operacional.

## Catalogo de manifiestos operacionales

Se agrega una capa de dominio para consultar historiales livianos de snapshots mediante sus manifiestos.

Archivos:

- `lib/operations/snapshotManifestCatalog.ts`
- `lib/operations/snapshotManifestCatalog.test.ts`

Filtros iniciales:

- Version de esquema.
- Estado del pulso operacional.
- Nivel de retencion.
- Decision de persistencia.
- Rango de fechas de generacion.

Resumen calculado:

- Total de manifiestos filtrados.
- Total devuelto segun limite.
- Persistentes y no persistentes.
- Snapshots criticos.
- Snapshots en advertencia.
- Puntaje promedio de salud operacional.
- Fecha del snapshot mas reciente.

Esta capa prepara una futura vista historica del Centro de Control, donde ZOVIT pueda revisar snapshots archivados, detectar deterioros por semestre y auditar decisiones sin cargar datos completos innecesariamente.

## Linea de tiempo operacional

Se agrega una capa de dominio para convertir manifiestos historicos en eventos operacionales legibles.

Archivos:

- `lib/operations/snapshotTimeline.ts`
- `lib/operations/snapshotTimeline.test.ts`

Eventos iniciales:

- Snapshot operacional registrado.
- Cambio de pulso operacional.
- Variacion de pendientes criticos.
- Variacion de acciones bloqueadas.
- Cambio de retencion historica.

Reglas aplicadas:

- Los manifiestos se ordenan cronologicamente para detectar cambios entre capturas.
- La linea de tiempo se devuelve desde el evento mas reciente al mas antiguo.
- Cada evento queda asociado a semestre operacional.
- Las mejoras se marcan como positivas.
- Los aumentos de criticos o bloqueos se marcan como eventos criticos.
- El paso a archivo fundador se marca como advertencia para revision ejecutiva.

Esta capa prepara paneles historicos, bitacoras ejecutivas y auditorias semestrales sin depender todavia de una tabla fisica de snapshots.

## Resumen semestral operacional

Se agrega una capa de dominio para resumir el comportamiento operacional de un semestre completo usando manifiestos historicos.

Archivos:

- `lib/operations/operationalSemesterSummary.ts`
- `lib/operations/operationalSemesterSummary.test.ts`

Semestres soportados:

- `S1`: 1 de marzo al 31 de julio.
- `S2`: 1 de agosto al 31 de diciembre.

Metricas calculadas:

- Total de snapshots del semestre.
- Primer y ultimo snapshot del periodo.
- Puntaje inicial y final del pulso operacional.
- Variacion del puntaje de salud.
- Estado de salud mas reciente.
- Eventos criticos y advertencias.
- Variacion de pendientes criticos.
- Variacion de acciones bloqueadas.
- Tendencia semestral.
- Estado de preparacion para cierre.
- Foco recomendado.

Reglas aplicadas:

- Solo se consideran manifiestos generados dentro del semestre seleccionado.
- El resumen usa la linea de tiempo operacional para detectar eventos criticos y advertencias.
- Un semestre limpio puede quedar listo para cierre si no existen eventos criticos, pendientes criticos ni acciones bloqueadas al ultimo snapshot.
- La recomendacion prioriza primero eventos criticos, luego bloqueos, luego pendientes criticos y finalmente advertencias.

Esta capa prepara cierres semestrales auditables, reportes ejecutivos y control de cumplimiento documental antes de suspender cuentas por falta de renovacion.

## Decision de cierre semestral

Se agrega una capa de dominio para decidir si un semestre puede cerrarse operacionalmente.

Archivos:

- `lib/operations/semesterCloseDecision.ts`
- `lib/operations/semesterCloseDecision.test.ts`

Estados de cierre:

- `ready`: semestre listo para cierre operacional.
- `ready_with_observations`: puede cerrarse, pero debe documentar advertencias o eventos historicos.
- `blocked`: cierre bloqueado por riesgos criticos abiertos.
- `insufficient_data`: no hay snapshots suficientes para decidir.

Checklist inicial:

- Existen snapshots del semestre.
- El ultimo pulso no esta critico.
- No hay pendientes criticos abiertos.
- No hay acciones bloqueadas abiertas.
- No se detectaron eventos criticos en el semestre.
- La tendencia semestral no empeoro.

Reglas aplicadas:

- Sin snapshots no se permite cerrar.
- Si el ultimo estado es critico, existen pendientes criticos o acciones bloqueadas abiertas, el cierre queda bloqueado.
- Si los riesgos actuales estan resueltos pero existieron eventos criticos o advertencias, el cierre puede avanzar con observaciones.
- Un cierre bloqueado requiere revision SUPERADMIN.

Esta capa prepara el futuro flujo formal de cierre semestral, donde ZOVIT pueda auditar renovaciones documentales, suspensiones, bloqueos y mejoras antes de iniciar el siguiente semestre operacional.

## Reporte de cierre semestral

Se agrega una capa de dominio para convertir el resumen y la decision de cierre en una salida ejecutiva lista para UI, PDF o archivo futuro.

Archivos:

- `lib/operations/semesterCloseReport.ts`
- `lib/operations/semesterCloseReport.test.ts`

Contenido del reporte:

- Titulo del cierre operacional.
- Periodo evaluado.
- Estado legible del cierre.
- Tono visual sugerido.
- Resumen ejecutivo.
- Metricas principales.
- Checklist de cierre.
- Secciones de resultado, trazabilidad y gobernanza.
- Foco recomendado.

Reglas aplicadas:

- Un cierre limpio se presenta como listo.
- Un cierre con observaciones conserva advertencias y eventos para auditoria.
- Un cierre bloqueado destaca riesgos abiertos y revision SUPERADMIN.
- Un cierre sin datos informa que no existe base suficiente para decidir.

Esta capa prepara reportes administrativos, generacion futura de PDF y trazabilidad formal de cada cierre semestral del ecosistema ZOVIT.

## Paquete de cierre semestral

Se agrega una capa de composicion para construir el cierre semestral completo desde manifiestos historicos.

Archivos:

- `lib/operations/semesterClosePackage.ts`
- `lib/operations/semesterClosePackage.test.ts`

El paquete incluye:

- Resumen semestral operacional.
- Decision de cierre semestral.
- Reporte ejecutivo de cierre.
- Acciones recomendadas de cierre.
- Resumen de acciones recomendadas.
- Politica de ejecucion de acciones de cierre.
- Auditoria de cierre semestral.

Reglas aplicadas:

- Recibe manifiestos historicos, anio y semestre.
- Reutiliza las capas existentes sin duplicar reglas.
- Devuelve una salida unica lista para UI, API interna, PDF futuro o archivo ejecutivo.
- Mantiene separadas las responsabilidades de calculo, decision y presentacion.
- Incluye acciones recomendadas sin ejecutar cambios reales.
- Resume las acciones por prioridad y responsable.
- Decide si una accion queda lista para preparacion, requiere trabajo humano o aprobacion SUPERADMIN.
- Convierte la politica de ejecucion en eventos auditables.

Esta capa deja preparado el punto de entrada principal para conectar el cierre semestral al Centro de Control ZOVIT cuando exista persistencia historica de manifiestos.

## Acciones recomendadas de cierre semestral

Se agrega una capa de dominio para transformar las razones de la decision de cierre en tareas operativas concretas.

Archivos:

- `lib/operations/semesterCloseActionItems.ts`
- `lib/operations/semesterCloseActionItems.test.ts`

Acciones iniciales:

- Generar snapshot operacional.
- Revisar pulso critico.
- Resolver pendientes criticos.
- Desbloquear acciones operativas.
- Documentar observaciones.
- Revisar deterioro semestral.
- Solicitar revision SUPERADMIN.
- Formalizar cierre semestral.

Reglas aplicadas:

- Las acciones criticas quedan primero.
- Los cierres bloqueados generan tareas correctivas y revision SUPERADMIN cuando corresponde.
- Los cierres limpios generan accion de formalizacion.
- Los cierres sin datos generan accion para crear snapshot.
- Las acciones se deduplican por tipo para evitar ruido operativo.

Esta capa prepara una futura bandeja de tareas de cierre semestral sin ejecutar automaticamente decisiones sensibles.

## Resumen de acciones de cierre semestral

Se agrega una capa de dominio para resumir las acciones recomendadas de cierre.

Archivos:

- `lib/operations/semesterCloseActionSummary.ts`
- `lib/operations/semesterCloseActionSummary.test.ts`

Metricas calculadas:

- Total de acciones.
- Acciones por prioridad.
- Acciones por responsable.
- Mayor prioridad activa.
- Resumen ejecutivo.

Reglas aplicadas:

- Las acciones criticas dominan la lectura ejecutiva.
- Las acciones SUPERADMIN se separan de Operaciones.
- Un cierre limpio muestra accion de preparacion o formalizacion.
- Un cierre sin acciones queda sin ruido operativo.

Esta capa permite que el Centro de Control muestre carga de trabajo semestral antes de listar el detalle de tareas.

## Politica de ejecucion de cierre semestral

Se agrega una capa de dominio para clasificar las acciones recomendadas de cierre antes de cualquier ejecucion real.

Archivos:

- `lib/operations/semesterCloseExecutionPolicy.ts`
- `lib/operations/semesterCloseExecutionPolicy.test.ts`

Estados iniciales:

- `ready_for_preparation`: accion lista para preparacion controlada.
- `requires_manual_action`: accion que requiere trabajo humano.
- `requires_superadmin_approval`: accion retenida para SUPERADMIN.

Reglas aplicadas:

- Ninguna accion de cierre se ejecuta automaticamente.
- Generar snapshot y documentar observaciones quedan como preparacion controlada.
- Resolver criticos, bloqueos o deterioros requiere trabajo humano.
- Acciones SUPERADMIN quedan retenidas para aprobacion superior.

Esta capa evita automatizar cierres sensibles y prepara una futura ejecucion auditada.

## Auditoria de cierre semestral

Se agrega una capa de dominio para convertir la politica de ejecucion de cierre en eventos auditables.

Archivos:

- `lib/operations/semesterCloseAuditTrail.ts`
- `lib/operations/semesterCloseAuditTrail.test.ts`

Eventos iniciales:

- `close_action_prepared`: accion lista para preparacion controlada.
- `close_action_retained_manual`: accion retenida para trabajo humano.
- `close_action_retained_superadmin`: accion retenida para SUPERADMIN.

Reglas aplicadas:

- Cada evento conserva accion, estado, razones y fecha.
- Las acciones de preparacion quedan asociadas a Operaciones.
- Las acciones manuales quedan asociadas a humano.
- Las acciones SUPERADMIN quedan asociadas a SUPERADMIN.
- La auditoria no ejecuta ni persiste cambios todavia.

Esta capa prepara trazabilidad formal del cierre semestral antes de incorporar escritura de eventos en base de datos.

## Resolutor de periodo de cierre semestral

Se agrega una capa de dominio para determinar automaticamente que semestre debe monitorearse o cerrarse segun la fecha actual.

Archivos:

- `lib/operations/semesterCloseTarget.ts`
- `lib/operations/semesterCloseTarget.test.ts`

Modos iniciales:

- `active_semester`: existe un semestre operacional activo y todavia no esta cerca del cierre.
- `closing_window`: faltan 15 dias o menos para el cierre del semestre activo.
- `out_of_semester`: enero o febrero, periodo sin semestre operacional activo.

Reglas aplicadas:

- Entre marzo y julio se evalua `S1`.
- Entre agosto y diciembre se evalua `S2`.
- En los ultimos 15 dias de julio o diciembre se prepara cierre.
- En enero y febrero se revisa el cierre pendiente del `S2` del anio anterior.
- El resolutor devuelve anio, semestre, fechas del periodo, modo y recomendacion operacional.

Esta capa permite que futuras automatizaciones, pantallas o reportes seleccionen el semestre correcto sin depender de decisiones manuales.

## Cierre semestral actual

Se agrega una capa de composicion para construir automaticamente el cierre que corresponde segun la fecha actual.

Archivos:

- `lib/operations/currentSemesterClose.ts`
- `lib/operations/currentSemesterClose.test.ts`

El cierre actual incluye:

- Periodo objetivo resuelto por fecha.
- Paquete completo de cierre semestral.
- Recomendacion operacional segun modo y estado del cierre.

Reglas aplicadas:

- Si el semestre esta activo y no esta cerca del cierre, recomienda monitoreo.
- Si faltan 15 dias o menos para el cierre, prepara el paquete formal del semestre activo.
- Si es enero o febrero, evalua el cierre pendiente del `S2` del anio anterior.
- Si el paquete esta bloqueado, prioriza correcciones criticas.
- Si faltan datos, solicita generar snapshots historicos antes de decidir.

Esta capa queda como punto de entrada natural para una futura API del Centro de Control, tareas programadas de cierre semestral y reportes administrativos automaticos.

## Vista previa de cierre semestral actual

Se agrega una capa de composicion para generar un cierre semestral preliminar usando el snapshot operacional actual.

Archivos:

- `lib/operations/currentSemesterClosePreview.ts`
- `lib/operations/currentSemesterClosePreview.test.ts`

La vista previa incluye:

- Snapshot operacional actual.
- Decision de archivo del snapshot.
- Manifiesto derivado del snapshot.
- Cierre semestral actual.
- Reporte ejecutivo preliminar.

Reglas aplicadas:

- No requiere historial persistido.
- No escribe archivos ni modifica base de datos.
- Usa perfiles reales o entradas operacionales actuales.
- Permite evaluar el cierre con el estado disponible en el momento.
- Puede usarse como base para una futura API o pantalla de pre-cierre.

Esta capa permite que ZOVIT vea anticipadamente si el semestre cerraria limpio, con observaciones o bloqueado aun antes de implementar la persistencia historica completa.

## API interna de vista previa de cierre semestral

Se agrega una API interna de solo lectura para exponer la vista previa de cierre semestral actual.

Archivos:

- `lib/operations/loadCurrentSemesterClosePreview.ts`
- `app/api/intranet/operations/semester-close/preview/route.ts`

Ruta:

- `GET /api/intranet/operations/semester-close/preview`

Parametros opcionales:

- `cadence`: `daily`, `weekly`, `semester_close` o `manual`.
- `now`: fecha ISO para evaluar un periodo especifico.

Reglas aplicadas:

- Acceso restringido a `hr_admin` y `super_admin`.
- No modifica datos.
- No persiste snapshots ni manifiestos.
- Usa perfiles existentes desde `profiles`.
- Devuelve `preview`, `profileCount` y `schemaVersion`.
- Responde con `Cache-Control: no-store`.

Esta API permite que el Centro de Control ZOVIT consuma una vista preliminar del cierre semestral antes de implementar historiales persistidos o reportes PDF formales.

## Centro de Control con pre-cierre semestral

Se conecta la vista previa de cierre semestral actual a la pantalla del Centro de Control.

Archivo actualizado:

- `app/intranet/admin/centro-control/page.tsx`

Informacion mostrada:

- Estado del cierre del semestre objetivo.
- Periodo que corresponde evaluar.
- Decision de cierre.
- Puntaje final del pulso usado para el pre-cierre.
- Recomendacion operacional.
- Checklist de cierre con condiciones aprobadas, observadas o criticas.
- Metricas ejecutivas del reporte de cierre.
- Secciones ejecutivas de resultado, trazabilidad y gobernanza.
- Acciones recomendadas de cierre con prioridad y responsable.
- Resumen de acciones recomendadas por prioridad y responsable.
- Politica de ejecucion de cierre con preparacion, trabajo humano y retencion SUPERADMIN.
- Auditoria de cierre con eventos preparados, retenidos y SUPERADMIN.
- Resumen de historial persistido cuando existan snapshots o cierres archivados.

Reglas aplicadas:

- La pantalla reutiliza el snapshot generado por la vista previa.
- No ejecuta cierres reales.
- No persiste snapshots ni reportes.
- Mantiene el Centro de Control como vista operacional de lectura y preparacion.
- El checklist usa las reglas del reporte de cierre, sin duplicar logica en la interfaz.
- Las metricas se leen desde el reporte de cierre, manteniendo una sola fuente de presentacion ejecutiva.
- Las secciones ejecutivas tambien provienen del reporte, por lo que la pantalla no inventa narrativas propias.
- Las acciones recomendadas provienen del paquete de cierre y no ejecutan cambios reales desde la interfaz.
- El resumen de acciones permite revisar carga critica, operativa y SUPERADMIN antes del detalle.
- La politica de ejecucion semestral explicita que la pantalla prepara decisiones, pero no ejecuta cierres sensibles.
- La auditoria de cierre muestra trazabilidad preliminar sin persistir eventos.
- El historial persistido se muestra como bloque informativo y no bloquea la vista si las tablas aun no fueron aplicadas.

Esta conexion permite que administracion vea el estado semestral junto al pulso, acciones, auditoria y politica operativa del ecosistema.

## Persistencia operacional inicial

Se agrega una primera propuesta de persistencia para snapshots, cierres semestrales y auditoria operacional.

Archivos:

- `supabase/SPRINT_25_OPERATIONAL_PERSISTENCE.sql`
- `lib/operations/operationalPersistence.ts`
- `lib/operations/operationalPersistence.test.ts`

Tablas propuestas:

- `operational_snapshots`: historial de snapshots y manifiestos.
- `semester_close_records`: registro formal de cierres semestrales.
- `operational_audit_events`: eventos auditables de snapshots y cierres.

Reglas aplicadas:

- El SQL queda versionado, pero no se aplica automaticamente.
- Las tablas usan RLS.
- La lectura e insercion quedan restringidas a `hr_admin` y `super_admin`.
- Los snapshots conservan contenido completo y manifiesto liviano.
- Los cierres conservan resumen, decision, reporte, acciones, politica y auditoria.

Esta capa inicia el paso desde previsualizacion en memoria hacia historial persistente auditable.

## Persistencia de corridas automaticas

Se agrega una propuesta de persistencia para registrar corridas del ciclo automatico de ZOVIT.

Archivos:

- `supabase/SPRINT_27_AUTOMATION_RUNS.sql`
- `lib/automation/automationRunPersistence.ts`
- `lib/automation/automationRunPersistence.test.ts`
- `lib/automation/automationRunHistory.ts`
- `lib/automation/automationRunHistory.test.ts`
- `app/api/intranet/operations/automation-runs/route.ts`

Tabla propuesta:

- `operational_automation_runs`: historial de corridas automaticas, manuales, ticker o sistema.

Reglas aplicadas:

- El SQL queda versionado, pero no se aplica automaticamente.
- La tabla usa RLS.
- La lectura e insercion quedan restringidas a `hr_admin` y `super_admin`.
- Cada corrida conserva `summary` ejecutivo y `result` completo para auditoria.
- Se guardan fuentes de error, fuentes de revision humana, acciones ejecutadas y acciones documentales.
- El resumen de cada corrida calcula `operationalPriority`, `primarySource` y `nextAction`.
- La prioridad puede ser `normal`, `attention` o `urgent` segun errores, riesgo documental critico, suspensiones preparadas o carga humana.
- `operational_priority`, `primary_source` y `next_action` quedan como columnas livianas en `operational_automation_runs`.
- El historial de automatizacion lee esas columnas sin cargar el payload completo.
- El historial consolida conteos recientes de prioridad `normal`, `attention` y `urgent`.
- Si esas columnas aun no existen, el historial usa lectura legacy y deriva prioridad basica para no romper el Centro de Control.
- El Centro de Control muestra la prioridad persistida de la ultima corrida junto a la accion recomendada.
- El resumen local del ticker muestra esa prioridad ejecutiva en el navegador del panel.
- El cron protegido y el ticker intranet intentan persistir la corrida en modo best-effort.
- Si la migracion no fue aplicada, falta configuracion admin o la escritura lanza una excepcion, la automatizacion no falla: el resultado devuelve `automationRun.error`.
- La lectura historica es liviana y no carga el `result` completo de cada corrida.
- La lectura consolida metricas de corridas recientes: limpias, con atencion, con errores, acciones, revisiones humanas y errores totales.
- Si la tabla no existe, devuelve error controlado para no romper futuras pantallas.
- El Centro de Control consume esta lectura y muestra corridas archivadas, ultima corrida persistida, acciones, revisiones humanas y errores cuando la migracion exista.
- La lectura calcula frescura operacional de automatizacion: `fresh`, `stale` o `missing`.
- Por defecto, una corrida queda `stale` si la ultima ejecucion archivada supera 26 horas.
- El Centro de Control muestra resumen de frescura y accion recomendada para validar cron o ejecutar ticker manual.
- Si la migracion no fue aplicada, el Centro de Control muestra aviso controlado y mantiene el resto de la vista funcionando.
- `GET /api/intranet/operations/automation-runs` expone la lectura liviana con `limit` y `staleAfterHours` opcionales.
- La API queda restringida a `hr_admin` y `super_admin`, con cache deshabilitada.

Esta capa prepara auditoria historica del comportamiento automatico antes de activar persistencia real de cada corrida.

## Perfiles publicos del nuevo ecosistema

Se habilita un MVP visible para perfiles publicos del ecosistema ZOVIT.

Archivos:

- `app/registro/page.tsx`
- `app/alumno/page.tsx`
- `app/empresa/page.tsx`
- `components/AuthProvider.tsx`
- `lib/auth/roles.ts`
- `supabase/SPRINT_28_ECOSYSTEM_ACCOUNT_KIND.sql`

Reglas aplicadas:

- El registro publico muestra cuatro perfiles: Cliente, Profesional, Alumno y Empresa.
- Para compatibilidad con la base actual, `student` se registra con `role = professional` y `account_kind = student`.
- Para compatibilidad con la base actual, `company` se registra con `role = client` y `account_kind = company`.
- Alumno deriva a completar formacion/documentos y puede usar Pasaporte Digital.
- Empresa deriva a `/empresa` como panel MVP.
- `AuthProvider` lee `account_kind` con fallback legacy si la migracion aun no fue aplicada.
- El SQL versionado agrega `account_kind` y actualiza `handle_new_user` para persistir el tipo de cuenta ecosistemico.

Esta capa hace visible el nuevo ecosistema sin romper los roles historicos `client`, `professional` y `admin`.

## API interna de archivo de cierre semestral

Se agrega una API interna para archivar la vista previa actual de cierre semestral.

Archivo:

- `app/api/intranet/operations/semester-close/archive/route.ts`

Ruta:

- `POST /api/intranet/operations/semester-close/archive`

Body opcional:

- `cadence`: `daily`, `weekly`, `semester_close` o `manual`.
- `now`: fecha ISO para evaluar un periodo especifico.

Reglas aplicadas:

- Acceso restringido a `hr_admin` y `super_admin`.
- Construye la vista previa actual.
- Persiste snapshot operacional y registro de cierre.
- No ejecuta suspensiones, aprobaciones ni cambios sensibles.
- Devuelve ids persistidos, periodo objetivo y decision.

Esta API prepara archivado controlado desde el Centro de Control o tareas programadas futuras.

## Historial operacional persistido

Se agrega una capa de lectura para consultar snapshots y cierres semestrales persistidos.

Archivos:

- `lib/operations/operationalHistory.ts`
- `lib/operations/operationalHistory.test.ts`

Datos consultados:

- Snapshots operacionales recientes.
- Cierres semestrales recientes.
- Ultimo snapshot archivado.
- Ultimo cierre persistido.
- Conteos recientes.

Reglas aplicadas:

- La consulta es liviana y no carga JSON completo de snapshots.
- Si las tablas aun no existen, devuelve error controlado y listas vacias.
- El limite por defecto es 5 y el maximo es 20.

Esta capa permite que el Centro de Control lea historial real cuando el sprint SQL de persistencia sea aplicado.

## API interna de historial operacional

Se agrega una API interna de solo lectura para exponer historial operacional persistido.

Archivo:

- `app/api/intranet/operations/history/route.ts`

Ruta:

- `GET /api/intranet/operations/history`

Parametro opcional:

- `limit`: cantidad de registros recientes a devolver.

Reglas aplicadas:

- Acceso restringido a `hr_admin` y `super_admin`.
- No modifica datos.
- Devuelve historial y errores controlados si falta la migracion.
- Responde con `Cache-Control: no-store`.

Esta API prepara paneles historicos, auditorias y futuras comparaciones persistidas.

## Persistencia documental semestral

Se agrega una propuesta de persistencia para documentos operativos y eventos documentales por semestre.

Archivos:

- `supabase/SPRINT_26_DOCUMENT_RENEWAL.sql`
- `lib/operations/documentRenewalPersistence.ts`
- `lib/operations/documentRenewalPersistence.test.ts`

Tablas propuestas:

- `operational_documents`: evidencia documental semestral, datos extraidos y estado de revision.
- `operational_document_events`: eventos auditables del ciclo documental.

Eventos iniciales:

- Documento ingresado.
- Documento reemplazado.
- OCR solicitado.
- OCR completado.
- Revision manual solicitada.
- Documento aprobado.
- Documento rechazado.
- Documento vencido.
- Suspension semestral lista.

Reglas aplicadas:

- Los documentos quedan asociados a perfil, tipo, semestre y ruta de storage.
- Enero y febrero se asocian al `S2` del anio anterior.
- La evidencia conserva datos extraidos y resumen de validacion en JSON.
- Los eventos permiten trazabilidad sin reprocesar el documento.
- El SQL queda versionado, pero no se aplica automaticamente.

Esta capa prepara OCR local, revision manual, renovacion semestral y suspensiones por documentos sin usar IA pagada.

## API interna de eventos documentales

Se agrega una API interna para registrar eventos auditables sobre documentos operativos.

Archivo:

- `app/api/intranet/operations/documents/events/route.ts`

Ruta:

- `POST /api/intranet/operations/documents/events`

Body esperado:

- `profileId`: perfil afectado.
- `documentId`: documento asociado, opcional si el evento es previo al registro.
- `eventType`: tipo de evento documental.
- `summary`: resumen opcional.
- `metadata`: metadata opcional.

Reglas aplicadas:

- Acceso restringido a `hr_admin`, `supervisor` y `super_admin`.
- No procesa OCR por si misma.
- No aprueba ni rechaza documentos directamente.
- Registra trazabilidad para OCR, revision manual y auditoria.

Esta API prepara una futura bandeja documental y el flujo gratuito de OCR local con escalamiento manual.

## Registro documental desde subida de trabajador

Se conecta la subida de documentos de trabajador con la persistencia documental semestral.

Archivo actualizado:

- `app/api/worker/documents/route.ts`

Reglas aplicadas:

- La subida al bucket `worker-credentials` sigue siendo la operacion principal.
- Luego de subir el archivo, se intenta registrar `operational_documents`.
- Tambien se intenta registrar evento `submitted`.
- El tipo documental se infiere desde la carpeta de subida.
- Si la migracion documental aun no fue aplicada, la subida no falla: retorna advertencia en `operationalDocument.warning`.

Esta conexion inicia el flujo real de evidencia documental semestral sin romper el proceso actual de carga de archivos.

## Cola de OCR local documental

Se agrega una capa de lectura para construir una cola de documentos pendientes de OCR local gratuito.

Archivos:

- `lib/operations/localOcrQueue.ts`
- `lib/operations/localOcrQueue.test.ts`

Estados considerados:

- `submitted`
- `ocr_pending`
- `needs_manual_review`

Prioridades:

- `critical`: documentos que ya requieren revision manual.
- `high`: identidad y licencias.
- `medium`: credenciales y alumno regular.
- `low`: otros documentos.
- Cada item incluye `actionLabel` para distinguir OCR local, revision manual o decision humana.
- La cola separa carga humana (`humanActionRequired`) de candidatos automaticos (`automaticCandidates`).

Reglas aplicadas:

- La cola no procesa OCR directamente.
- La cola ordena por prioridad y antiguedad.
- Si la tabla documental aun no existe, devuelve error controlado.
- El limite por defecto es 20 y el maximo es 100.

Esta capa permite ejecutar OCR local solo cuando un documento nuevo o dudoso lo necesita, evitando costos y reprocesamiento.

## API interna de cola OCR local

Se agrega una API interna de solo lectura para exponer la cola de OCR documental.

Archivo:

- `app/api/intranet/operations/documents/ocr-queue/route.ts`

Ruta:

- `GET /api/intranet/operations/documents/ocr-queue`

Parametro opcional:

- `limit`: cantidad maxima de documentos.

Reglas aplicadas:

- Acceso restringido a `hr_admin`, `supervisor` y `super_admin`.
- No procesa archivos.
- No llama IA externa.
- Devuelve cola y errores controlados si falta la migracion.

Esta API prepara un worker local futuro con Tesseract y revision manual cuando existan dudas.

## Solicitud de OCR local documental

Se agrega una capa para marcar documentos como pendientes de OCR local y registrar trazabilidad.

Archivos:

- `lib/operations/localOcrRequest.ts`
- `lib/operations/localOcrRequest.test.ts`
- `app/api/intranet/operations/documents/request-ocr/route.ts`

Ruta:

- `POST /api/intranet/operations/documents/request-ocr`

Body esperado:

- `documentId`: documento operacional a procesar.

Reglas aplicadas:

- Acceso restringido a `hr_admin`, `supervisor` y `super_admin`.
- Solo documentos en `submitted` u `ocr_pending` pueden solicitar OCR.
- El documento pasa a `ocr_pending`.
- Se registra evento `ocr_requested`.
- El evento `ocr_requested` usa el semestre del documento operacional.
- No procesa el archivo ni llama IA externa.

Esta capa prepara el paso controlado entre cola documental y worker OCR local gratuito.

## Procesamiento OCR local documental

Se agrega una capa para procesar documentos con OCR local gratuito cuando el archivo es una imagen.

Archivos:

- `lib/operations/localOcrProcessor.ts`
- `lib/operations/localOcrProcessor.test.ts`
- `app/api/intranet/operations/documents/process-local-ocr/route.ts`

Ruta:

- `POST /api/intranet/operations/documents/process-local-ocr`

Body esperado:

- `documentId`: documento operacional a procesar.

Reglas aplicadas:

- Acceso restringido a `hr_admin`, `supervisor` y `super_admin`.
- Usa Tesseract local para imagenes.
- No usa IA externa.
- Guarda texto extraido, RUT, fecha de nacimiento, confianza, riesgo y razones.
- Si la confianza es baja o el riesgo no es bajo, solicita revision manual.
- Los PDF quedan temporalmente en revision manual hasta incorporar conversion local de PDF a imagen.
- Registra evento `ocr_completed` o `manual_review_requested`.
- Los eventos OCR usan el semestre del documento operacional procesado, no la fecha de ejecucion del OCR.

Esta capa completa el primer ciclo gratuito: cola OCR, solicitud OCR y procesamiento local para imagenes.

## Centro de Control con cola OCR local

Se conecta la cola OCR documental al Centro de Control.

Archivo actualizado:

- `app/intranet/admin/centro-control/page.tsx`

Informacion mostrada:

- Total de documentos en cola OCR local.
- Documentos criticos o con revision manual.
- Documentos de alta prioridad.
- Documentos de prioridad media.
- Conteo de documentos con accion humana y candidatos a OCR automatico.
- Top de documentos pendientes con tipo, razon, accion sugerida, prioridad y semestre.

Reglas aplicadas:

- La pantalla solo lee la cola.
- No procesa OCR desde la interfaz.
- Si la migracion documental no fue aplicada, muestra aviso controlado.
- Mantiene OCR como flujo local gratuito y sin IA externa.

Esta conexion permite que Operaciones vea carga documental pendiente antes de activar un worker local de OCR.

## Procesamiento OCR local por lotes

Se agrega una capa batch para procesar varios documentos pendientes con OCR local gratuito en una sola ejecucion controlada.

Archivos:

- `lib/operations/localOcrBatch.ts`
- `lib/operations/localOcrBatch.test.ts`
- `app/api/intranet/operations/documents/process-local-ocr-batch/route.ts`

Ruta:

- `POST /api/intranet/operations/documents/process-local-ocr-batch`

Body opcional:

- `limit`: cantidad maxima de documentos a tomar de la cola. El sistema limita internamente a 5 por ejecucion.

Reglas aplicadas:

- Acceso restringido a `hr_admin`, `supervisor` y `super_admin`.
- Procesa documentos en `submitted` u `ocr_pending`.
- Omite documentos que ya estan en `needs_manual_review`.
- Ejecuta el procesamiento de forma secuencial para no saturar memoria ni CPU.
- Usa el procesador OCR local existente basado en Tesseract.
- No llama IA externa ni servicios pagados.
- Devuelve resumen con documentos completados, derivados a revision manual, fallidos y omitidos.
- Cada item procesado incluye `actionLabel` con el siguiente paso operativo.

Esta capa permite avanzar hacia automatizacion operativa: un boton interno, un cron controlado o un worker local podran ejecutar lotes pequenos durante el dia sin depender de costos externos.

## OCR local dentro del ciclo automatico

Se conecta el lote OCR local al ciclo automatico existente de ZOVIT.

Archivo actualizado:

- `lib/automation/runAutomationCycle.ts`

Ruta existente:

- `GET/POST /api/cron/automate`

Reglas aplicadas:

- La ruta mantiene proteccion con `CRON_SECRET`.
- El ciclo automatico ejecuta OCR local con limite pequeno por defecto.
- Si la migracion documental o variables servidor faltan, el OCR devuelve error controlado sin tumbar todo el ciclo.
- El procesamiento sigue usando Tesseract local y revision manual.
- No agrega IA pagada ni servicios externos para lectura documental.
- La respuesta del ciclo incluye `summary` ejecutivo para saber si la corrida fue limpia, requiere atencion o tuvo errores.
- El resumen consolida acciones ejecutadas, acciones documentales, errores de automatizacion y revisiones humanas pendientes.
- El resumen identifica `errorSources` para ubicar el subsistema afectado sin revisar todo el payload.
- El resumen identifica `humanReviewSources` para saber que carga humana quedo pendiente despues de la corrida.
- El `AutomationTicker` guarda en `sessionStorage` un resumen sanitizado de la ultima corrida local, sin datos personales ni documentos.
- `AutomationLastSummary` muestra ese resumen local en Administracion y Centro de Control cuando existe.
- El Centro de Control ejecuta el ticker silencioso con cooldown para refrescar la ultima corrida al entrar al panel operativo.
- Las pantallas futuras del Centro de Control deben usar este resumen como lectura rapida, manteniendo los subresultados completos para auditoria.

Esta conexion permite que ZOVIT avance documentos pendientes automaticamente cuando el cron este activo, manteniendo el principio de costo cero para OCR.

## Cumplimiento documental semestral

Se agrega una capa de dominio para evaluar si un perfil cumplio con los documentos requeridos del semestre.

Archivos:

- `lib/operations/documentSemesterCompliance.ts`
- `lib/operations/documentSemesterCompliance.test.ts`

Reglas aplicadas:

- Cada semestre exige un conjunto de documentos requeridos.
- S1 cubre desde el 1 de marzo hasta el 31 de julio.
- S2 cubre desde el 1 de agosto hasta el 31 de diciembre.
- Si faltan documentos dentro del plazo, la cuenta queda abierta o con aviso proximo a vencer.
- Si existen documentos pendientes, la cuenta queda en revision manual.
- Si existen documentos rechazados o vencidos, queda lista para suspension documental.
- En enero y febrero se evalua el S2 del anio anterior; si no fue cumplido antes del 31 de diciembre, la cuenta queda lista para suspension.

Esta capa formaliza la regla operativa de reingreso documental dos veces al anio sin depender de lectura OCR repetida: se usan los estados estructurados ya guardados por semestre.

## Panel de cumplimiento documental

Se conecta el cumplimiento documental semestral al Centro de Control.

Archivos:

- `lib/operations/documentComplianceDashboard.ts`
- `lib/operations/documentComplianceDashboard.test.ts`
- `app/intranet/admin/centro-control/page.tsx`

Reglas aplicadas:

- Se evalúan perfiles operativos aunque no tengan documentos cargados.
- Por defecto se exigen `identity` y `credential`.
- El tablero muestra perfiles completos, pendientes, por vencer, en revision manual y listos para suspension.
- El dominio separa `profiles` como lista operativa completa y `topProfiles` como resumen visual.
- Los batches y cron documentales usan `profiles`, no `topProfiles`, para no limitar recordatorios, suspensiones o cierres de avisos a los primeros perfiles visibles del panel.
- El Centro de Control destaca `pendingReview` como carga humana documental para priorizar OCR dudoso, aprobaciones o rechazos.
- Los perfiles sin documentos aparecen como pendientes o listos para suspension segun el plazo semestral.
- La pantalla mantiene errores controlados si la migracion documental aun no fue aplicada.

Esta vista convierte la regla documental semestral en una herramienta operativa diaria para administrar renovaciones, avisos y suspensiones sin reprocesar documentos.

## Preparacion auditable de suspensiones documentales

Se agrega una capa para preparar eventos de suspension documental cuando un perfil no cumplio el plazo semestral.

Archivos:

- `lib/operations/documentSuspensionPreparation.ts`
- `lib/operations/documentSuspensionPreparation.test.ts`
- `app/api/intranet/operations/documents/prepare-suspensions/route.ts`

Ruta:

- `POST /api/intranet/operations/documents/prepare-suspensions`

Reglas aplicadas:

- Acceso restringido a `hr_admin` y `super_admin`.
- No suspende cuentas automaticamente.
- Detecta perfiles con cumplimiento `suspension_ready`.
- Registra eventos `semester_suspension_ready`.
- El evento usa el semestre evaluado por cumplimiento documental, no la fecha de ejecucion del servidor.
- Deduplica por perfil, semestre y tipo de evento para evitar ruido operativo.
- Guarda metadata con documentos faltantes, pendientes, rechazados, vencidos, plazo y razones.

Esta pieza convierte el incumplimiento documental en trazabilidad accionable, manteniendo la suspension real como decision humana o SUPERADMIN.

## Suspensiones documentales dentro del ciclo automatico

Se conecta la preparacion auditable de suspensiones documentales al ciclo automatico existente.

Archivo actualizado:

- `lib/automation/runAutomationCycle.ts`

Ruta existente:

- `GET/POST /api/cron/automate`

Reglas aplicadas:

- La ruta mantiene proteccion con `CRON_SECRET`.
- El ciclo automatico prepara eventos `semester_suspension_ready` cuando existen perfiles con incumplimiento documental vencido.
- No suspende cuentas automaticamente.
- La deduplicacion evita crear eventos repetidos para el mismo perfil y semestre.
- Si las tablas documentales no existen o hay error de datos, devuelve error controlado sin detener el resto del ciclo.

Esta conexion permite que ZOVIT avance de forma autonoma hasta la trazabilidad previa a suspension, dejando la accion sensible final bajo control humano.

## API interna de cumplimiento documental

Se expone el panel de cumplimiento documental como API interna de solo lectura.

Archivo:

- `app/api/intranet/operations/documents/compliance/route.ts`

Ruta:

- `GET /api/intranet/operations/documents/compliance`

Query opcional:

- `limit`: cantidad maxima de perfiles operativos a evaluar.

Reglas aplicadas:

- Acceso restringido a `hr_admin`, `supervisor` y `super_admin`.
- Usa la sesion del usuario intranet y respeta RLS.
- Devuelve periodo evaluado, resumen, conteos y perfiles principales.
- Mantiene cache deshabilitada para lectura operacional.

Esta API permite que futuras pantallas, botones internos o tareas de monitoreo consuman el mismo estado documental que ve el Centro de Control.

## Bandeja de eventos documentales

Se agrega una bandeja operativa para leer eventos documentales recientes y hacer visibles los eventos preparados por automatizacion.

Archivos:

- `lib/operations/documentEventInbox.ts`
- `lib/operations/documentEventInbox.test.ts`
- `app/api/intranet/operations/documents/events/route.ts`
- `app/intranet/admin/centro-control/page.tsx`

Ruta:

- `GET /api/intranet/operations/documents/events`

Query opcional:

- `limit`: cantidad maxima de eventos.
- `eventType`: tipo de evento documental a filtrar.

Reglas aplicadas:

- Acceso restringido a `hr_admin`, `supervisor` y `super_admin`.
- El `POST` existente mantiene la creacion manual de eventos documentales.
- El nuevo `GET` devuelve bandeja con perfil, evento, resumen, semestre, actor, metadata, prioridad y accion sugerida.
- Cada evento indica si requiere accion humana o si corresponde a seguimiento automatico.
- La bandeja consolida conteos de acciones humanas documentales y seguimientos automaticos.
- Los eventos `semester_suspension_ready` se muestran como criticos.
- El Centro de Control muestra resumen, top de eventos recientes y siguiente accion documental.
- El resumen ejecutivo del ciclo automatico usa la carga humana documental para calcular atencion requerida.

Esta bandeja evita que la automatizacion documental quede oculta en la base de datos: Operaciones puede ver los eventos generados por OCR, revision manual y preparacion de suspension.

## Observabilidad documental del cron

Se agrega la bandeja documental reciente al resultado del ciclo automatico.

Archivo actualizado:

- `lib/automation/runAutomationCycle.ts`

Reglas aplicadas:

- Despues de preparar suspensiones documentales, el cron carga los ultimos eventos documentales.
- El resultado de `/api/cron/automate` incluye `documentEvents`.
- La lectura se ejecuta despues de la preparacion para reflejar eventos recien creados.
- Si falla la lectura de eventos, devuelve error controlado sin fallar el ciclo completo.

Esta salida permite revisar rapidamente que dejo preparado la automatizacion documental sin entrar directamente a la base de datos.

## Decision manual de documentos operativos

Se agrega una capa para aprobar o rechazar documentos operativos despues de OCR local o revision humana.

Archivos:

- `lib/operations/documentManualDecision.ts`
- `lib/operations/documentManualDecision.test.ts`
- `app/api/intranet/operations/documents/decide/route.ts`
- `lib/operations/documentRenewalPersistence.ts`

Ruta:

- `POST /api/intranet/operations/documents/decide`

Body:

- `documentId`: documento operacional.
- `action`: `approve` o `reject`.
- `reason`: requerido al rechazar.
- `notes`: notas internas opcionales.

Reglas aplicadas:

- Acceso restringido a `hr_admin`, `supervisor` y `super_admin`.
- Solo documentos en `submitted`, `ocr_pending`, `ocr_completed` o `needs_manual_review` pueden decidirse.
- Al aprobar, el documento queda en `approved`.
- Al rechazar, el documento queda en `rejected` y conserva razon.
- Registra `reviewed_by`, `reviewed_at`, `validation_summary` y evento auditable.
- El evento usa el semestre del documento, no la fecha actual.
- La misma regla aplica a OCR solicitado, OCR completado y revision manual derivada desde OCR.
- La respuesta incluye `summary` y `actionLabel` para indicar el resultado y siguiente paso operativo.

Esta capa cierra el ciclo gratuito: documento ingresado, OCR local cuando aplica, revision humana si corresponde y estado estructurado final reutilizable por cumplimiento, suspensiones y Centro de Control.

## Detalle operativo de documento

Se agrega una lectura de detalle para revisar un documento operativo antes de aprobarlo o rechazarlo.

Archivos:

- `lib/operations/documentDetail.ts`
- `lib/operations/documentDetail.test.ts`
- `app/api/intranet/operations/documents/detail/route.ts`

Ruta:

- `GET /api/intranet/operations/documents/detail?documentId=...`

Reglas aplicadas:

- Acceso restringido a `hr_admin`, `supervisor` y `super_admin`.
- Usa la sesion intranet y respeta RLS.
- Devuelve estado, archivo, semestre, datos extraidos, resumen de validacion, OCR, revision y eventos recientes.
- Devuelve `reviewHint` y `canDecide` para orientar revision humana sin automatizar la decision.
- Devuelve `extractedFields` como lista legible de campos OCR relevantes, manteniendo el JSON completo como respaldo tecnico.
- No reprocesa el archivo.
- No expone decision automatica: solo entrega contexto para revision humana.

Esta ruta prepara una futura pantalla de revision manual donde Operaciones pueda ver evidencia estructurada, historial y luego decidir aprobar o rechazar el documento.

## Efectos posteriores a decision documental

Se agrega una capa best-effort para sincronizar el ecosistema despues de aprobar o rechazar un documento operativo.

Archivos:

- `lib/operations/documentDecisionEffects.ts`
- `lib/operations/documentDecisionEffects.test.ts`
- `app/api/intranet/operations/documents/decide/route.ts`
- `app/intranet/admin/documentos/page.tsx`

Reglas aplicadas:

- La API de decision documental recalcula el cumplimiento semestral del perfil afectado.
- Si el cumplimiento queda `complete` o `pending_review`, se cierran avisos documentales internos pendientes.
- Si la sincronizacion posterior falla, la decision manual no se revierte ni falla.
- La respuesta de la API devuelve `effects` con estado de cumplimiento, avisos cerrados, error controlado y resumen.
- La pantalla documental muestra el resumen de decision junto al resumen de sincronizacion.
- Si los efectos posteriores fallan, se intenta registrar evento `post_decision_sync_failed` para auditoria operacional.
- El Centro de Control trata ese evento como alta prioridad y accion humana requerida.

Esta capa evita que una aprobacion o rechazo deje avisos viejos activos y mantiene conectados revision manual, cumplimiento semestral y notificaciones internas sin usar servicios pagados.

## Pantalla de revision documental operativa

Se agrega una pantalla intranet para revisar documentos semestrales y ejecutar decisiones manuales.

Archivos:

- `app/intranet/admin/documentos/page.tsx`
- `app/intranet/admin/page.tsx`
- `app/intranet/admin/centro-control/page.tsx`
- `app/api/intranet/operations/documents/file/route.ts`

Ruta:

- `/intranet/admin/documentos`

Reglas aplicadas:

- Acceso restringido a `hr_admin`, `supervisor` y `super_admin`.
- Lista documentos en cola OCR/local o revision manual.
- Incluye documentos con OCR completado y listos para decision humana.
- Muestra detalle del documento, archivo, OCR, datos extraidos, validacion y eventos.
- Muestra una pista de revision calculada por dominio para reducir interpretacion manual de JSON.
- Muestra campos OCR legibles antes del JSON crudo.
- Permite abrir el archivo original mediante URL firmada temporal.
- Permite aprobar o rechazar usando la API documental.
- Usa el resumen devuelto por la API como mensaje posterior a la decision.
- Al rechazar exige motivo.
- Refresca cola y detalle despues de cada decision.
- No reprocesa archivos ni llama IA externa.
- El Centro de Control incluye acceso directo para resolver documentos pendientes.

Ruta de archivo:

- `GET /api/intranet/operations/documents/file?documentId=...`

Reglas de archivo:

- Acceso restringido a `hr_admin`, `supervisor` y `super_admin`.
- Valida que la ruta de Storage pertenezca al perfil del documento.
- Devuelve URL firmada por tiempo limitado.
- No hace publico el bucket ni el archivo.

Esta pantalla convierte el flujo documental en una herramienta usable: Operaciones puede resolver casos pendientes y dejar estados estructurados finales para cumplimiento semestral, suspensiones y Centro de Control.

## Recordatorios documentales semestrales

Se agrega una capa para preparar recordatorios documentales cuando el plazo semestral esta proximo a vencer.

Archivos:

- `lib/operations/documentRenewalReminderPreparation.ts`
- `lib/operations/documentRenewalReminderPreparation.test.ts`
- `app/api/intranet/operations/documents/prepare-reminders/route.ts`
- `lib/automation/runAutomationCycle.ts`
- `lib/operations/documentRenewalPersistence.ts`
- `supabase/SPRINT_26_DOCUMENT_RENEWAL.sql`

Ruta:

- `POST /api/intranet/operations/documents/prepare-reminders`

Reglas aplicadas:

- Acceso restringido a `hr_admin`, `supervisor` y `super_admin`.
- Detecta perfiles con cumplimiento `due_soon`.
- Registra eventos `semester_renewal_reminder`.
- El evento usa el semestre evaluado por cumplimiento documental, no la fecha de ejecucion del servidor.
- Deduplica por perfil, semestre y tipo de evento.
- Guarda metadata con documentos faltantes, pendientes, plazo, dias restantes y razones.
- No envia correos ni notificaciones externas todavia.
- El cron protegido `/api/cron/automate` tambien prepara estos recordatorios.

Esta capa permite automatizar el aviso previo al vencimiento sin costo externo: primero queda la trazabilidad operacional, y luego se podran conectar canales reales de notificacion.

## Notificaciones internas documentales

Se agrega un puente gratuito entre eventos documentales y la campana interna de ZOVIT.

Archivos:

- `lib/operations/documentNotificationBridge.ts`
- `lib/operations/documentNotificationBridge.test.ts`
- `app/api/intranet/operations/documents/notify-events/route.ts`
- `lib/automation/runAutomationCycle.ts`

Ruta:

- `POST /api/intranet/operations/documents/notify-events`

Reglas aplicadas:

- Acceso restringido a `hr_admin`, `supervisor` y `super_admin`.
- Convierte eventos `semester_renewal_reminder` y `semester_suspension_ready` en filas de `notifications`.
- No usa correo, SMS, WhatsApp ni servicios pagados.
- Deduplica por usuario, titulo y semestre detectado en el cuerpo para evitar avisos repetidos aunque cambien faltantes o plazo.
- Los campos de semestre se usan solo para deduplicacion y no se insertan como columnas extra en `notifications`.
- El cron protegido ejecuta el puente despues de preparar recordatorios y suspensiones.
- Las notificaciones aparecen en la campana existente del usuario.
- Al tocar una notificacion documental, la campana dirige a `/registro/trabajador` para renovar o regularizar documentos.
- El panel profesional muestra una alerta cuando existen notificaciones documentales sin leer.

Esta capa entrega avisos internos de costo cero: la automatizacion documental ya puede advertir vencimientos y cuentas pendientes dentro de ZOVIT sin salir de la plataforma.

## Estado documental propio del usuario

Se agrega una lectura para que cada usuario vea su cumplimiento documental semestral desde el registro de trabajador.

Archivos:

- `lib/operations/ownDocumentCompliance.ts`
- `lib/operations/ownDocumentCompliance.test.ts`
- `app/api/worker/document-compliance/route.ts`
- `components/worker/WorkerOnboardingWizard.tsx`

Ruta:

- `GET /api/worker/document-compliance`

Reglas aplicadas:

- Requiere usuario autenticado.
- Evalua solo documentos del propio perfil.
- Usa la misma regla de cumplimiento semestral que el Centro de Control.
- Devuelve estado, semestre, plazo, faltantes, pendientes, rechazados y vencidos.
- Devuelve `nextStep` y `actionLabel` para orientar al usuario sin que deba interpretar estados internos.
- Si la migracion documental no existe, devuelve aviso controlado.
- El registro de trabajador muestra el estado documental antes del progreso del formulario.
- El registro de trabajador muestra la accion documental recomendada junto al resumen del semestre.

Esta capa completa el destino de las notificaciones internas: el usuario no solo llega a renovar, tambien ve que documentos debe regularizar y cual es el plazo del semestre.

## Cierre automatico de avisos documentales resueltos

Se agrega una capa para cerrar notificaciones documentales cuando el usuario ya regularizo o ingreso documentos para revision.

Archivos:

- `lib/operations/documentNotificationCleanup.ts`
- `lib/operations/documentNotificationCleanup.test.ts`
- `lib/operations/documentNotificationCleanupBatch.ts`
- `lib/operations/documentNotificationCleanupBatch.test.ts`
- `app/api/worker/document-compliance/route.ts`
- `lib/automation/runAutomationCycle.ts`

Reglas aplicadas:

- Si el cumplimiento queda `complete`, se marcan como leidas las notificaciones documentales sin leer.
- Si el cumplimiento queda `pending_review`, tambien se cierran porque el usuario ya ingreso documentos y espera revision.
- No se cierran avisos cuando el estado sigue `open`, `due_soon` o `suspension_ready`.
- Cuando existe contexto semestral, el cierre filtra por el texto `semestre anio-S1/S2` para no cerrar avisos de otro periodo.
- La API propia de cumplimiento ejecuta limpieza para el usuario autenticado.
- El cron protegido ejecuta limpieza en lote para perfiles operativos.
- La decision manual de documentos tambien ejecuta esta limpieza despues de recalcular cumplimiento.

Esta capa reduce ruido operacional: los avisos de renovacion dejan de perseguir al usuario cuando ya hizo la accion requerida.
