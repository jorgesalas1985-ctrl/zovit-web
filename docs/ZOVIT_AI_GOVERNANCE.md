# ZOVIT IA Governance

Fecha base: 31 de julio de 2026.

## Principio

La gobernanza de ZOVIT IA corresponde exclusivamente al SUPERADMIN.

## Autoridad exclusiva

Solo el SUPERADMIN puede:

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
- Transferir gobernanza mediante flujo seguro de propiedad.

## Roles sin autoridad de gobierno

No pueden modificar gobierno de IA:

- Administrador.
- Evaluador.
- Empresa.
- Institucion.
- Cliente.
- Profesional.
- Alumno.

Estos roles solo pueden usar funciones autorizadas segun permisos.

## Panel exclusivo

Ruta conceptual:

`/intranet/superadmin/ia`

Secciones:

- Resumen.
- Estado de ZOVIT IA.
- Modelos.
- Proveedores.
- Prompts maestros.
- Herramientas.
- Banco de conocimiento.
- Dataset.
- Entrenamientos.
- Evaluaciones.
- Versiones.
- Costos.
- Metricas.
- Seguridad.
- Auditoria.
- Limites.
- Configuracion.
- Publicacion.
- Suspension de emergencia.

## Control tecnico requerido

La proteccion debe existir en:

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
- Publicacion de versiones.

Ocultar botones no basta.

## Transferencia de propiedad

La transferencia de gobernanza solo puede ocurrir mediante el flujo seguro de transferencia de propiedad del SUPERADMIN. No puede hacerse desde formularios administrativos comunes ni APIs generales.

