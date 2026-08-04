# ZOVIT OCR Master Plan

Fecha base: 31 de julio de 2026.

Documento tecnico maestro para incorporar formalmente el modulo futuro ZOVIT OCR al ecosistema ZOVIT. Esta etapa es solo documental: no implementa codigo, no instala librerias, no ejecuta migraciones, no cambia Supabase, no descarga modelos y no crea servicios productivos.

## 1. Resumen ejecutivo

ZOVIT OCR sera un modulo local y propio de ZOVIT para leer documentos, extraer texto y transformar evidencia documental en datos estructurados reutilizables por el ecosistema.

La vision no es entrenar un OCR desde cero en la primera etapa. La estrategia correcta es comenzar con un modelo abierto y preentrenado, ejecutarlo localmente, revisar resultados, corregir errores, construir un dataset propio y realizar fine-tuning progresivo bajo control exclusivo del SUPERADMIN.

ZOVIT OCR debe crecer en tres niveles:

- ZOVIT OCR Pequeno: OCR local preentrenado, extraccion simple, revision humana y guardado de correcciones.
- ZOVIT OCR Mediano: fine-tuning con documentos propios, mejor reconocimiento de documentos chilenos y modelos por tipo documental.
- ZOVIT OCR Avanzado: modelos especializados, extraccion estructurada avanzada, comparacion de versiones, rollback e integracion completa con ZOVIT IA.

## 2. Principio fundamental

El OCR no debe aprender automaticamente de cada documento. Cada ejemplo debe pasar por revision, correccion, aprobacion y versionado antes de alimentar un dataset.

Flujo correcto:

1. El usuario carga un documento.
2. ZOVIT identifica el tipo de archivo.
3. Primero intenta extraccion directa de texto si el PDF ya contiene texto.
4. Luego intenta leer QR o codigos de verificacion.
5. Solo si es necesario, utiliza ZOVIT OCR.
6. El OCR extrae texto y campos.
7. Un usuario autorizado revisa el resultado.
8. Corrige errores.
9. La correccion se guarda como ground truth.
10. El ejemplo queda pendiente de aprobacion.
11. Solo el SUPERADMIN puede aprobarlo para entrenamiento.
12. Se crea un dataset versionado.
13. El entrenamiento se ejecuta offline.
14. Se genera una nueva version del modelo.
15. Se compara con la version actual.
16. Solo el SUPERADMIN puede publicar la nueva version.
17. Debe existir rollback a la version anterior.

## 3. Arquitectura propuesta

Arquitectura futura recomendada:

1. Servicio OCR local separado.
2. API interna segura entre Next.js y el servicio OCR.
3. Cola de procesamiento.
4. Panel de revision humana.
5. Panel exclusivo SUPERADMIN.
6. Almacenamiento de documentos.
7. Almacenamiento de recortes.
8. Dataset versionado.
9. Entrenamiento offline.
10. Evaluacion de modelos.
11. Registro de metricas.
12. Versionado.
13. Rollback.
14. Auditoria.
15. Anonimizacion.
16. Seguridad.
17. Limites de recursos.
18. Gestion de errores.
19. Reprocesamiento controlado.

Flujo de alto nivel:

```text
Documento nuevo
  -> clasificacion de archivo
  -> API/QR/texto PDF/metadatos
  -> ZOVIT OCR local solo si hace falta
  -> datos extraidos
  -> revision humana si hay duda
  -> datos estructurados operativos
  -> ejemplo corregido opcional
  -> aprobacion SUPERADMIN para dataset
  -> entrenamiento offline
  -> evaluacion
  -> publicacion o rechazo
```

## 4. Prioridad para procesar documentos

El sistema debe seguir este orden:

1. Integracion directa o API de la institucion.
2. QR o codigo de verificacion.
3. Texto ya presente en el PDF.
4. Metadatos.
5. ZOVIT OCR local.
6. Vision con IA solo si el OCR local no es suficiente.
7. Revision humana.

Objetivo:

- Minimizar costo.
- Minimizar uso de IA externa.
- Minimizar OCR innecesario.
- Evitar procesamiento repetido.
- Evitar almacenamiento duplicado.

## 5. Principio documental

Los documentos son evidencia. Los datos estructurados son la fuente operativa.

Cada documento debe procesarse una sola vez, salvo:

- Reemplazo.
- Inconsistencia.
- Auditoria.
- Revision especial.
- Nueva version del OCR aprobada para reprocesamiento controlado.

No debe ejecutarse OCR cada vez que alguien consulte un perfil.

## 6. Tecnologia recomendada

### Recomendacion principal

Para ZOVIT OCR futuro, la recomendacion tecnica es:

- Python.
- PaddleOCR como opcion principal.
- Modelos OCR abiertos y preentrenados.
- Servicio local separado del frontend Next.js.
- API interna segura.
- Procesamiento offline para entrenamientos.
- Dataset versionado.
- Almacenamiento seguro.
- Auditoria.

### Por que Python

Python es el ecosistema mas maduro para OCR, vision computacional, datasets, entrenamiento y evaluacion de modelos. Permite separar el servicio especializado del frontend Next.js, mantener dependencias pesadas fuera de la aplicacion principal y preparar el camino para fine-tuning.

### Por que PaddleOCR

PaddleOCR conviene para ZOVIT porque:

- Tiene modelos preentrenados potentes.
- Soporta deteccion de texto y reconocimiento.
- Puede trabajar con documentos complejos.
- Tiene mejor ruta para fine-tuning que Tesseract.
- Permite evolucionar hacia modelos especializados.
- Es mas adecuado para documentos escaneados, layouts variables y campos estructurados.

## 7. Comparacion de librerias OCR

| Opcion | Ventajas | Limitaciones | Uso recomendado en ZOVIT |
| --- | --- | --- | --- |
| PaddleOCR | Modelos modernos, deteccion + reconocimiento, buen soporte para entrenamiento, flexible para documentos complejos | Mas pesado, requiere Python, mas consumo de recursos | Opcion principal para ZOVIT OCR mediano y avanzado |
| Tesseract | Gratis, simple, ya presente en el proyecto via `tesseract.js`, bueno para casos basicos | Menor rendimiento en documentos complejos, layout y campos; fine-tuning menos amigable | Mantener para OCR pequeno y carnet/simple donde ya funciona |
| EasyOCR | Facil de usar, Python, buen arranque para muchos idiomas | Menos completo para pipeline empresarial y fine-tuning avanzado que PaddleOCR | Alternativa de prueba o respaldo, no primera opcion estrategica |

Conclusion: mantener Tesseract para lo existente y avanzar hacia PaddleOCR cuando ZOVIT OCR requiera mejor extraccion, campos, datasets y fine-tuning.

## 8. Componentes actuales reutilizables

ZOVIT ya tiene piezas utiles:

- Next.js.
- Supabase.
- Supabase Storage.
- Sistema de documentos actual.
- Verificacion de identidad.
- OCR local con Tesseract para carnet.
- Intranet.
- Roles y permisos.
- SUPERADMIN.
- Auditorias parciales como `worker_review_history`.
- Estados operativos.
- ZOVIT IA como capa estrategica futura.
- Datos estructurados existentes.

Estos componentes deben reutilizarse. ZOVIT OCR no debe reemplazar lo que funciona; debe extenderlo.

## 9. Nuevos componentes minimos

Para un MVP futuro:

- Servicio local OCR.
- Endpoint interno protegido.
- Cola de documentos a procesar.
- Registro de resultados OCR.
- Registro de campos extraidos.
- Panel de revision/correccion.
- Tabla conceptual de ground truth.
- Dataset versionado.
- Panel SUPERADMIN OCR.
- Auditoria de procesamiento.
- Sistema de metricas.
- Politica de reprocesamiento.

## 10. Requisitos de hardware

### Desarrollo y OCR pequeno

Minimo recomendado:

- CPU: 4 nucleos.
- RAM: 8 GB.
- Disco: 20 GB libres.
- GPU: no obligatoria.

Uso: pruebas, OCR de bajo volumen, Tesseract o PaddleOCR liviano.

### OCR mediano

Recomendado:

- CPU: 8 nucleos.
- RAM: 16 a 32 GB.
- Disco: 100 GB libres.
- GPU: opcional, recomendable para entrenamiento.

Uso: procesamiento por lotes, datasets, evaluaciones, primeros fine-tuning.

### OCR avanzado

Recomendado:

- CPU: 12+ nucleos.
- RAM: 32 a 64 GB.
- Disco: 250 GB+.
- GPU NVIDIA con CUDA para entrenamiento.

Uso: fine-tuning serio, modelos especializados, comparacion de versiones, datasets grandes.

## 11. Crecimiento por etapas

### Nivel 1: ZOVIT OCR Pequeno

- Modelo OCR preentrenado.
- Ejecucion local.
- Lectura de documentos simples.
- Extraccion de texto.
- Deteccion basica de campos.
- Revision humana.
- Guardado de correcciones.
- Sin entrenamiento automatico.

### Nivel 2: ZOVIT OCR Mediano

- Fine-tuning con documentos propios.
- Mejor reconocimiento de documentos chilenos.
- Mejor lectura de RUT, fechas, carreras e instituciones.
- Modelos especializados por tipo de documento.
- Mejor deteccion de campos.
- Panel de metricas.
- Dataset aprobado por el SUPERADMIN.

### Nivel 3: ZOVIT OCR Avanzado

- Modelos especializados por institucion y documento.
- Deteccion de zonas y estructura documental.
- Extraccion estructurada avanzada.
- Deteccion de inconsistencias.
- Comparacion entre versiones.
- Mejora continua controlada.
- Integracion completa con ZOVIT IA.
- Menor dependencia de servicios externos.

## 12. Documentos iniciales

Prioridad inicial:

- Certificado de Alumno Regular.
- Certificado de egreso.
- Certificado de titulo.
- Licencia de conducir.
- Certificados tecnicos.
- Documentos academicos.
- Certificados emitidos por instituciones chilenas.

## 13. Campos iniciales

Campos que ZOVIT OCR debe aprender a reconocer:

- Nombre completo.
- RUT.
- Institucion.
- Carrera.
- Sede.
- Jornada.
- Estado academico.
- Fecha de emision.
- Fecha de vencimiento.
- Codigo de verificacion.
- Folio.
- Tipo de certificado.
- Firma.
- QR.
- Texto principal.
- Vigencia.

## 14. Datos de entrenamiento

Estructura conceptual para cada ejemplo:

- Imagen original.
- Recorte de texto.
- Texto detectado.
- Texto corregido.
- Campos detectados.
- Campos corregidos.
- Tipo de documento.
- Institucion emisora.
- Calidad de imagen.
- Idioma.
- Fecha.
- Usuario revisor.
- Usuario aprobador.
- Estado de aprobacion.
- Dataset asociado.
- Version del modelo utilizada.
- Nivel de confianza.
- Resultado de validacion.
- Fecha de inclusion en el dataset.
- Version de entrenamiento en la que fue utilizado.

## 15. Estados de los ejemplos

Estados recomendados:

- Pendiente.
- Procesado.
- Requiere correccion.
- Corregido.
- Pendiente de aprobacion.
- Aprobado para entrenamiento.
- Rechazado.
- Anonimizado.
- Incluido en dataset.
- Usado en entrenamiento.
- Archivado.

## 16. Estrategia de entrenamiento

ZOVIT OCR no debe entrenarse con documentos sin revisar. La estrategia debe ser:

1. Ejecutar modelo base preentrenado.
2. Guardar resultado y confianza.
3. Permitir correccion humana autorizada.
4. Guardar ground truth.
5. Anonimizar cuando corresponda.
6. Enviar ejemplo a aprobacion.
7. SUPERADMIN aprueba o rechaza.
8. Construir dataset versionado.
9. Entrenar offline.
10. Evaluar contra conjunto separado.
11. Comparar contra modelo actual.
12. Publicar solo con aprobacion SUPERADMIN.

No se permite aprendizaje automatico en tiempo real.

## 17. Estrategia de datasets

Cada dataset debe registrar:

- Nombre.
- Version.
- Objetivo.
- Tipos documentales incluidos.
- Cantidad de ejemplos.
- Fuentes.
- Metodo de anonimizacion.
- Responsable.
- Fecha.
- Estado.
- Modelo objetivo.
- Metricas asociadas.
- Aprobacion SUPERADMIN.

Los datasets deben separarse en:

- Entrenamiento.
- Validacion.
- Prueba.

El conjunto de prueba debe permanecer separado y no usarse para entrenamiento.

## 18. Privacidad y anonimizacion

Reglas:

- Ocultar RUT cuando no sea necesario para entrenamiento.
- Ocultar correos.
- Ocultar telefonos.
- Ocultar direcciones.
- Ocultar fotografias.
- Separar documento operativo de ejemplo de entrenamiento.
- Usar recortes cuando sea posible.
- Mantener trazabilidad sin exponer informacion personal.
- Impedir uso de documentos de menores sin autorizacion expresa.
- Controlar quien puede acceder al dataset.

El dataset completo solo debe estar disponible para SUPERADMIN o procesos autorizados por SUPERADMIN.

## 19. Seguridad

La proteccion debe existir en:

- Frontend.
- Backend.
- APIs.
- Server Actions.
- Supabase.
- RLS.
- Storage.
- Servicio local.
- Entrenamiento.
- Publicacion de modelos.
- Acceso al dataset.
- Logs.
- Secretos.

No debe bastar con ocultar botones.

El OCR no puede exponer documentos ni datos extraidos a roles no autorizados.

## 20. Metricas

Medir:

- Precision de caracteres.
- Precision de palabras.
- Precision por campo.
- Deteccion correcta de RUT.
- Deteccion correcta de fechas.
- Deteccion correcta de institucion.
- Deteccion correcta de carrera.
- Deteccion correcta de vigencia.
- Tasa de documentos enviados a revision humana.
- Tiempo de procesamiento.
- Uso de CPU.
- Uso de memoria.
- Errores por tipo de documento.
- Mejora entre versiones.

## 21. Evaluacion de modelos

Antes de publicar una nueva version:

1. Usar un conjunto de prueba separado.
2. Comparar modelo candidato con modelo actual.
3. Verificar que no empeore documentos existentes.
4. Medir precision general y por campo.
5. Revisar errores criticos.
6. Revisar consumo de recursos.
7. Registrar resultados.
8. SUPERADMIN aprueba o rechaza.

Nunca sobrescribir el modelo anterior.

## 22. Versionado

Versiones sugeridas:

- ZOVIT OCR 0.1.
- ZOVIT OCR 0.2.
- ZOVIT OCR 0.5.
- ZOVIT OCR 1.0.
- ZOVIT OCR 2.0.

Cada version debe registrar:

- Modelo base.
- Dataset utilizado.
- Parametros.
- Fecha.
- Metricas.
- Documentos compatibles.
- Limitaciones.
- Responsable.
- Estado.
- Motivo de publicacion o rechazo.

## 23. Rollback

Debe existir rollback a una version anterior cuando:

- Baje la precision.
- Aumente el error critico.
- Aumente excesivamente el consumo de recursos.
- Se detecten problemas de privacidad.
- Se detecte extraccion incorrecta de campos sensibles.
- SUPERADMIN suspenda la version.

Rollback debe registrar:

- Version retirada.
- Version restaurada.
- Motivo.
- Fecha.
- Usuario SUPERADMIN.
- Impacto.

## 24. Panel SUPERADMIN

Ruta futura propuesta:

`/intranet/superadmin/ocr`

Secciones:

- Estado del OCR.
- Cola de documentos.
- Documentos revisados.
- Ejemplos pendientes.
- Dataset.
- Entrenamientos.
- Modelos.
- Comparacion de versiones.
- Metricas.
- Errores.
- Auditoria.
- Privacidad.
- Configuracion.
- Publicar version.
- Rollback.
- Suspension de emergencia.

## 25. Control exclusivo del SUPERADMIN

La gobernanza de ZOVIT OCR sera exclusiva del SUPERADMIN.

Solo el SUPERADMIN podra:

- Aprobar ejemplos para entrenamiento.
- Rechazar ejemplos.
- Crear datasets.
- Versionar datasets.
- Iniciar entrenamientos.
- Detener entrenamientos.
- Cambiar parametros.
- Comparar modelos.
- Publicar modelos.
- Retirar modelos.
- Volver a una version anterior.
- Acceder al dataset completo.
- Acceder a metricas completas.
- Eliminar ejemplos de entrenamiento.
- Autorizar documentos sensibles.
- Cambiar reglas del OCR.
- Cambiar el modelo base.
- Cambiar la infraestructura.
- Activar o desactivar ZOVIT OCR.

Administradores autorizados podran:

- Revisar documentos.
- Corregir textos.
- Corregir campos.
- Marcar inconsistencias.
- Enviar ejemplos a revision.

Administradores no podran:

- Aprobar datasets.
- Entrenar modelos.
- Publicar versiones.
- Modificar parametros.
- Acceder a toda la informacion del dataset.
- Cambiar la gobernanza del OCR.

## 26. Integracion con ZOVIT

ZOVIT OCR debe reutilizar:

- Next.js como interfaz y orquestacion web.
- Supabase para datos estructurados, permisos y auditoria.
- Supabase Storage para documentos y recortes.
- Sistema de documentos actual.
- Sistema de verificacion.
- Intranet.
- Notificaciones.
- Roles.
- SUPERADMIN.
- ZOVIT IA.
- Estados operativos.

ZOVIT OCR debe entregar datos estructurados al ecosistema:

- Campos extraidos.
- Confianza.
- Estado de validacion.
- Evidencia asociada.
- Version del OCR.
- Revision humana.
- Resultado final aprobado.

No debe entregar solo texto bruto.

## 27. Integracion con ZOVIT IA

ZOVIT OCR y ZOVIT IA deben trabajar separados pero conectados:

- ZOVIT OCR lee documentos y produce datos estructurados.
- ZOVIT IA consulta datos estructurados autorizados.
- ZOVIT IA no debe volver a leer documentos si ya existe dato validado.
- ZOVIT IA puede sugerir inconsistencias, pero no entrenar OCR ni publicar modelos.
- SUPERADMIN gobierna ambos modulos.

ZOVIT OCR puede reducir el costo de ZOVIT IA al evitar vision externa innecesaria.

## 28. Costos aproximados

Costos de licencia:

- Tesseract: gratis.
- PaddleOCR: open source.
- EasyOCR: open source.

Costos reales:

- CPU/RAM para procesamiento.
- Disco para documentos, recortes y datasets.
- Tiempo humano de revision.
- GPU si se realiza fine-tuning avanzado.
- Mantencion del servicio OCR.
- Monitoreo y auditoria.

En etapa pequena, el costo puede mantenerse bajo si se usa OCR local y revision manual.

## 29. Riesgos

Riesgos principales:

- Lectura incorrecta de RUT o fechas.
- Autoaprobacion indebida.
- Uso de documentos sensibles en entrenamiento.
- Filtracion de datos personales.
- Dataset con errores.
- Sesgo por instituciones sobrerrepresentadas.
- Modelo nuevo peor que anterior.
- Costos de recursos no controlados.
- Reprocesamiento masivo innecesario.
- Acceso indebido al dataset.

Mitigaciones:

- Human-in-the-loop.
- Aprobacion SUPERADMIN.
- Datasets versionados.
- Evaluacion antes de publicar.
- Rollback.
- Anonimizacion.
- Auditoria.

## 30. MVP recomendado

MVP futuro recomendado:

- Mantener Tesseract donde ya funciona.
- Agregar concepto de ZOVIT OCR local separado en arquitectura.
- Procesar solo documentos nuevos.
- Extraer texto y campos basicos.
- Guardar resultado estructurado.
- Enviar dudas a revision humana.
- Permitir correccion y ground truth.
- No entrenar todavia.
- No publicar modelos propios todavia.
- Preparar dataset pendiente de aprobacion SUPERADMIN.

## 31. Fases del proyecto

FASE 1: OCR local preentrenado.

FASE 2: Panel de revision y correccion.

FASE 3: Construccion del dataset propio.

FASE 4: Primer fine-tuning ZOVIT.

FASE 5: Modelos especializados por documento.

FASE 6: ZOVIT OCR mediano.

FASE 7: ZOVIT OCR avanzado integrado con ZOVIT IA.

## 32. Cinco decisiones que debe aprobar el SUPERADMIN antes de implementar

1. Aprobar si ZOVIT OCR pequeno parte manteniendo Tesseract o inicia piloto con PaddleOCR.
2. Aprobar la ruta y alcance del panel `/intranet/superadmin/ocr`.
3. Aprobar que tipos de documentos iniciales entran al flujo OCR.
4. Aprobar politica de dataset, anonimizacion y acceso.
5. Aprobar requisitos de hardware y si habra entrenamiento local, servidor dedicado o procesamiento externo controlado.

