# ZOVIT IA Security

Fecha base: 31 de julio de 2026.

## Principio

ZOVIT IA no puede saltarse la seguridad del ecosistema. Debe respetar roles, permisos, consentimiento, privacidad, auditoria y RLS.

## Capas de proteccion

La seguridad debe cubrir:

- Frontend.
- Backend.
- APIs.
- Server Actions.
- Supabase.
- RLS.
- SQL.
- Storage.
- Configuracion.
- Logs.
- Auditoria.
- Gestion de secretos.
- Entrenamientos.
- Publicacion.

## Datos prohibidos para alimentacion automatica

No utilizar automaticamente:

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

## Acciones sensibles

La IA no debe ejecutar sin confirmacion:

- Cambios de estado operativo.
- Aprobaciones o rechazos.
- Publicacion de certificados.
- Modificacion de roles.
- Cambios de permisos.
- Cambios en modelos, datasets o prompts.
- Acciones sobre SUPERADMIN.
- Acciones financieras.
- Acciones legales o disciplinarias.

## Auditoria obligatoria

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

## Suspension de emergencia

El SUPERADMIN debe poder suspender:

- Toda ZOVIT IA.
- Un asistente.
- Una herramienta.
- Un proveedor.
- Un modelo.
- Un entrenamiento.
- Una publicacion.

