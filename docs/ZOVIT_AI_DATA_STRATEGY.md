# ZOVIT IA Data Strategy

Fecha base: 31 de julio de 2026.

## Principio de datos estructurados

Los datos estructurados son la fuente operativa. Los documentos son evidencia.

ZOVIT IA debe consultar datos estructurados autorizados antes de pedir lectura documental.

## Uso de documentos y OCR

El OCR solo se utilizara:

- Al ingresar un documento nuevo.
- Cuando sea una imagen sin texto.
- Cuando no exista QR o codigo de verificacion.
- Cuando exista una inconsistencia.
- Durante una auditoria.
- Cuando el SUPERADMIN o usuario autorizado solicite revision.

Un documento no debe procesarse repetidamente.

## Dataset Oficial ZOVIT

El Dataset Oficial ZOVIT debe construirse solo con informacion:

- Autorizada.
- Revisada.
- Anonimizada.
- Versionada.
- Evaluada.
- Aprobada por el SUPERADMIN.

## Anonimizacion

Antes de usar casos o interacciones:

1. Eliminar identificadores.
2. Eliminar datos sensibles.
3. Generalizar ubicaciones.
4. Separar documentos originales.
5. Reemplazar nombres por etiquetas neutras.
6. Revisar manualmente.
7. Aprobar para dataset.

## Datos que no alimentan automaticamente IA

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

## Versionado de datos

Cada dataset debe tener:

- Version.
- Fuente.
- Fecha.
- Responsable.
- Metodo de anonimizacion.
- Estado.
- Evaluacion.
- Aprobacion SUPERADMIN.

## Criterio de entrenamiento

ZOVIT IA no aprende en tiempo real de cada conversacion. El entrenamiento debe ser offline, revisado, comparado y aprobado.

