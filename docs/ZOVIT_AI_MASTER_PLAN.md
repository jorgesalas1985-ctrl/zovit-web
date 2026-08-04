# ZOVIT IA Master Plan

Fecha base: 31 de julio de 2026.

Documento principal de estrategia, gobernanza y crecimiento de ZOVIT IA.

## 1. Vision de ZOVIT IA

ZOVIT IA sera la siguiente gran etapa estrategica del Ecosistema ZOVIT. No sera una funcionalidad aislada, un chatbot simple ni una capa decorativa. Sera una inteligencia operativa propia del ecosistema, disenada para apoyar a Alumnos, Empresas, Instituciones, Clientes, Profesionales, Evaluadores, Administradores y SUPERADMIN.

Su objetivo sera convertir la informacion conectada de ZOVIT en orientacion, recomendaciones, analisis, alertas y acciones asistidas, respetando roles, permisos, consentimiento, privacidad, auditoria y seguridad.

## 2. Relacion con el Ecosistema ZOVIT

ZOVIT IA debe crecer sobre los principios ya definidos para el ecosistema:

- Identidad unica por persona.
- Roles multiples sobre una misma cuenta.
- Datos estructurados como fuente operativa.
- Documentos como evidencia.
- Certificacion separada de formacion academica.
- Competencias como nucleo del sistema.
- Estado operativo para habilitar, limitar o suspender acciones.
- SUPERADMIN protegido como autoridad maxima.

ZOVIT IA no reemplaza la arquitectura actual. La complementa.

## 3. Nivel pequeno: ZOVIT IA Pequena

Objetivo: crear un asistente inicial controlado que ayude a operar el ecosistema.

Funciones posibles:

- Responder preguntas sobre ZOVIT.
- Explicar estados del perfil.
- Consultar certificaciones autorizadas.
- Consultar oportunidades.
- Recomendar evaluaciones.
- Ayudar a Empresas a definir requisitos.
- Ayudar a Clientes a describir servicios.
- Apoyar a Evaluadores y Administradores.
- Consultar informacion estructurada autorizada.

Caracteristicas:

- Puede usar inicialmente modelos externos.
- No modifica datos sensibles sin confirmacion.
- No aprende automaticamente de cualquier conversacion.
- Trabaja con informacion estructurada.
- Usa documentos solo como evidencia.
- Minimiza OCR.
- Registra auditoria de acciones sensibles.

## 4. Nivel mediano: ZOVIT IA Mediana

Objetivo: convertir la IA en una capa operativa especializada.

Funciones posibles:

- Matching inteligente.
- Analisis de brechas.
- Recomendacion de certificaciones.
- Generacion asistida de evaluaciones.
- Deteccion de inconsistencias.
- Clasificacion de competencias.
- Apoyo documental.
- Recomendaciones para Empresas e Instituciones.
- Automatizacion de tareas administrativas autorizadas.
- Analitica predictiva controlada.

Caracteristicas:

- Usa el Banco de Conocimiento ZOVIT.
- Usa datasets revisados y anonimizados.
- Puede incorporar modelos especializados.
- Mantiene versionado.
- Compara resultados antes de publicar nuevas versiones.
- No se entrena con datos privados sin autorizacion.

## 5. Nivel grande: ZOVIT IA Grande

Objetivo: desarrollar una inteligencia especializada propia de ZOVIT.

Funciones posibles:

- Modelo especializado de competencias.
- Modelo especializado de certificaciones.
- Modelo especializado de empleabilidad.
- Modelo especializado de matching.
- Modelo especializado de evaluacion tecnica.
- Modelo especializado de analisis institucional.
- Apoyo estrategico al SUPERADMIN.
- Automatizacion avanzada bajo reglas.
- Sustitucion progresiva de dependencias externas.

Caracteristicas:

- Evolucion controlada.
- Entrenamiento offline.
- Dataset propio.
- Versiones auditadas.
- Evaluaciones antes de produccion.
- Posibilidad de modelos internos especializados.
- Propiedad estrategica de ZOVIT.

## 6. Gobernanza exclusiva del SUPERADMIN

La gobernanza de ZOVIT IA pertenece exclusivamente al SUPERADMIN.

Solo el SUPERADMIN podra:

- Activar o desactivar ZOVIT IA.
- Cambiar modelos.
- Cambiar proveedores.
- Aprobar nuevas versiones.
- Aprobar datasets.
- Autorizar contenidos para entrenamiento.
- Autorizar prompts maestros.
- Crear o retirar herramientas.
- Cambiar reglas de seguridad.
- Cambiar limites de uso.
- Cambiar politicas de privacidad de IA.
- Autorizar fine-tuning.
- Autorizar entrenamiento interno.
- Autorizar publicacion de modelos.
- Revisar metricas globales.
- Revisar costos.
- Revisar auditoria.
- Suspender funciones de IA.
- Transferir la gobernanza mediante el flujo seguro de transferencia de propiedad.

Ningun Administrador, Evaluador, Empresa, Institucion, Cliente, Profesional o Alumno podra modificar modelos, datasets, reglas, prompts maestros, herramientas, limites, seguridad, politicas, versiones, entrenamientos ni proveedores.

## 7. Arquitectura general

ZOVIT IA debera operar como una capa sobre la arquitectura existente:

- Frontend: interfaces por rol.
- Backend: APIs y Server Actions protegidas.
- Supabase: datos estructurados, RLS, auditoria y storage.
- Banco de Conocimiento ZOVIT: fuente aprobada para consulta y entrenamiento.
- Motor de permisos: decide que puede ver o hacer cada rol.
- Motor de auditoria: registra consultas, herramientas, costos y acciones.
- Motor de evaluacion: compara versiones antes de publicar.
- Panel SUPERADMIN IA: control global en `/intranet/superadmin/ia`.

Ocultar botones no sera suficiente. Toda accion sensible debe estar protegida en frontend, backend, APIs, Server Actions, Supabase, RLS, SQL, Storage, configuracion, logs, auditoria, secretos, entrenamientos y publicacion.

## 8. Herramientas por rol

ZOVIT IA podra tener una familia de asistentes:

- ZOVIT Student AI.
- ZOVIT Company AI.
- ZOVIT Institution AI.
- ZOVIT Client AI.
- ZOVIT Professional AI.
- ZOVIT Evaluator AI.
- ZOVIT Admin AI.
- ZOVIT SuperAdmin AI.

Todos compartiran el Banco de Conocimiento, pero tendran herramientas, permisos, alcance y auditoria diferentes. ZOVIT SuperAdmin AI sera el unico con acceso estrategico global, siempre bajo control del SUPERADMIN.

## 9. Banco de conocimiento

El AI Knowledge Center sera el modulo conceptual que administre el conocimiento autorizado para ZOVIT IA.

Contenido:

- Arquitectura.
- Competencias.
- Certificaciones.
- Evaluaciones.
- Procesos.
- Reglas.
- Empresas.
- Instituciones.
- Casos.
- Preguntas frecuentes.
- Documentacion.
- Politicas.
- Dataset aprobado.
- Versiones de conocimiento.
- Historial de cambios.

Estados posibles:

- Borrador.
- En revision.
- Aprobado.
- Publicado.
- Disponible para consulta.
- Disponible para IA.
- Disponible para entrenamiento.
- Archivado.
- Rechazado.

Solo el SUPERADMIN podra aprobar contenido para entrenamiento.

## 10. Estrategia de aprendizaje

ZOVIT IA no debe aprender automaticamente en tiempo real de cada conversacion. No debe modificar su comportamiento por si sola.

Flujo correcto:

1. Se registran interacciones autorizadas.
2. Se eliminan datos personales y sensibles.
3. Se anonimizan los casos.
4. Se seleccionan ejemplos utiles.
5. Se revisan.
6. Se aprueban.
7. Se incorporan al Banco de Conocimiento.
8. Si corresponde, se incorporan al Dataset Oficial ZOVIT.
9. Se entrena offline.
10. Se crea una nueva version.
11. Se evalua.
12. Se compara con la version anterior.
13. El SUPERADMIN aprueba o rechaza.
14. Solo despues puede publicarse.

## 11. Estrategia de datasets

Los datasets deben ser tratados como activos estrategicos. Cada dataset debe tener:

- Nombre.
- Objetivo.
- Fuente.
- Responsable.
- Fecha de creacion.
- Version.
- Estado.
- Nivel de sensibilidad.
- Consentimiento aplicable.
- Metodo de anonimizacion.
- Resultado de evaluacion.
- Aprobacion del SUPERADMIN.

No se usaran datasets privados, sensibles o identificables sin autorizacion explicita.

## 12. Estrategia de anonimizacion

No alimentar automaticamente IA con:

- RUT.
- Correos.
- Telefonos.
- Direcciones.
- Fotografias.
- Documentos completos.
- Datos bancarios.
- Antecedentes.
- Informacion medica.
- Contrasenas.
- Secretos.
- Conversaciones privadas.
- Informacion de menores.
- Datos de Empresas sin autorizacion.
- Datos de Instituciones sin autorizacion.

El entrenamiento debe usar informacion anonimizada, autorizada y revisada.

## 13. Estrategia de modelos

ZOVIT IA podra comenzar con modelos externos y evolucionar hacia modelos especializados. Cada modelo debe tener:

- Proveedor.
- Nombre.
- Version.
- Proposito.
- Roles autorizados.
- Herramientas disponibles.
- Politica de datos.
- Costos estimados.
- Limites.
- Evaluaciones.
- Fecha de aprobacion.
- Responsable.

## 14. Estrategia de proveedores

Los proveedores externos seran dependencias controladas, no el centro estrategico de ZOVIT IA. Deben evaluarse por:

- Costo.
- Privacidad.
- Seguridad.
- Disponibilidad.
- Latencia.
- Calidad.
- Capacidad de auditoria.
- Posibilidad de salida.
- Cumplimiento legal.
- Control de datos.

## 15. Estrategia de costos

ZOVIT IA debe tener limites de uso, alertas y auditoria de costos desde el inicio.

Registrar:

- Tokens.
- Costo estimado.
- Modelo.
- Usuario.
- Rol.
- Herramienta.
- Fecha.
- Resultado.

El SUPERADMIN debe poder suspender funciones costosas o cambiar limites.

## 16. Estrategia de seguridad

ZOVIT IA debe respetar:

- RLS.
- Roles.
- Permisos.
- Consentimiento.
- Separacion de funciones.
- Minimizacion de datos.
- Auditoria obligatoria.
- Bloqueo de acciones no autorizadas.
- Proteccion especial del SUPERADMIN.

La IA no puede saltarse permisos del sistema.

## 17. Auditoria

Registrar:

- Usuario.
- Rol.
- Consulta.
- Herramienta utilizada.
- Datos consultados.
- Resultado.
- Accion propuesta.
- Confirmacion.
- Accion ejecutada.
- Modelo.
- Version.
- Tokens.
- Costo.
- Fecha.
- Hora.
- Errores.
- Bloqueos.
- Intentos no autorizados.
- Cambios realizados por el SUPERADMIN.

## 18. Versionado

Versionar:

- Prompts maestros.
- Herramientas.
- Datasets.
- Banco de conocimiento.
- Modelos.
- Politicas.
- Evaluaciones.
- Publicaciones.

Ninguna version nueva debe reemplazar produccion sin evaluacion y aprobacion del SUPERADMIN.

## 19. Evaluacion

Antes de publicar una version:

- Comparar contra version anterior.
- Medir exactitud.
- Medir seguridad.
- Medir filtracion de datos.
- Medir sesgos.
- Medir costo.
- Medir utilidad por rol.
- Validar casos criticos.
- Validar limites legales.

## 20. Publicacion

Solo el SUPERADMIN podra publicar una version de ZOVIT IA.

La publicacion debe registrar:

- Version publicada.
- Motivo.
- Cambios.
- Riesgos.
- Evaluacion.
- Fecha.
- Usuario SUPERADMIN.

## 21. Suspension de emergencia

Debe existir suspension de emergencia para:

- Desactivar ZOVIT IA completa.
- Desactivar un asistente.
- Desactivar una herramienta.
- Desactivar un proveedor.
- Bloquear un modelo.
- Congelar entrenamiento.
- Congelar publicacion.

Esta accion solo corresponde al SUPERADMIN.

## 22. Transferencia de propiedad

La gobernanza de ZOVIT IA debe transferirse solo mediante el flujo seguro de transferencia de propiedad de SUPERADMIN.

No debe existir transferencia desde formularios comunes, APIs comunes ni gestion administrativa normal.

## 23. Riesgos

Riesgos principales:

- Filtracion de datos personales.
- Uso de datos sin consentimiento.
- Dependencia excesiva de proveedores.
- Costos no controlados.
- Respuestas incorrectas.
- Automatizacion indebida.
- Sesgos en matching o evaluaciones.
- Acceso indebido por rol.
- Entrenamiento con datos sensibles.
- Modificacion no autorizada de prompts, herramientas o modelos.

## 24. MVP

MVP recomendado:

- Panel conceptual `/intranet/superadmin/ia`.
- Registro de configuracion de ZOVIT IA.
- Banco de Conocimiento en modo documental.
- Asistente pequeno de consulta controlada.
- Auditoria basica de interacciones.
- Sin entrenamiento propio.
- Sin fine-tuning.
- Sin modificaciones sensibles automaticas.
- OCR local y revision manual para documentos.

## 25. Fases futuras

Fase 1: ZOVIT IA Pequena.

Fase 2: Banco de Conocimiento con estados y aprobaciones.

Fase 3: Matching inteligente y analisis de brechas.

Fase 4: Dataset oficial anonimizado.

Fase 5: Modelos especializados.

Fase 6: ZOVIT IA Grande con propiedad estrategica interna.

## 26. Componentes actuales reutilizables

Reutilizar:

- Roles actuales `client`, `professional`, `admin`.
- `intranet_role = super_admin`.
- Protecciones de SUPERADMIN.
- Verificacion de identidad.
- OCR local existente.
- Estados operativos.
- Registro de trabajador/profesional.
- Documentacion maestra existente.
- Auditorias parciales como `worker_review_history`.
- Flujos de intranet.

## 27. Dependencias externas

Dependencias posibles en etapas iniciales:

- Modelos externos.
- Hosting actual.
- Supabase.
- Servicios de correo.
- OCR local con librerias existentes.

Toda dependencia externa debe ser reemplazable o reducible a futuro.

## 28. Criterios para reducir dependencias externas

Reducir dependencia cuando:

- El costo sea alto.
- Exista riesgo de privacidad.
- La calidad no sea estable.
- La disponibilidad afecte operaciones criticas.
- ZOVIT pueda construir un modelo especializado interno.
- El dato sea estrategico.
- El proveedor limite auditoria o control.

## 29. Limites legales y de privacidad

ZOVIT IA no debe:

- Decidir automaticamente sobre personas sin revision cuando exista impacto relevante.
- Usar datos sensibles sin base legal y consentimiento.
- Entrenar con documentos completos sin autorizacion.
- Exponer datos privados entre roles.
- Crear perfiles discriminatorios.
- Reemplazar evaluaciones reguladas sin control humano.
- Usar informacion de menores.

## 30. Decisiones que requieren aprobacion del SUPERADMIN

Requieren aprobacion:

- Activar ZOVIT IA.
- Cambiar proveedor.
- Cambiar modelo.
- Crear herramienta nueva.
- Modificar prompt maestro.
- Aprobar dataset.
- Autorizar entrenamiento.
- Autorizar fine-tuning.
- Publicar version.
- Cambiar limites de uso.
- Cambiar politica de privacidad.
- Suspender o reactivar funciones.
- Transferir propiedad.

