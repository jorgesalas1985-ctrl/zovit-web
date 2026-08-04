# Founder Vault Master Plan

Fecha base: 1 de agosto de 2026.

Documento tecnico maestro para el modulo futuro **FOUNDER VAULT** de ZOVIT.

Esta etapa es solo documental. No implementa codigo, no ejecuta SQL, no crea migraciones, no cambia Supabase, no instala librerias, no configura autenticacion productiva, no crea claves reales, no guarda secretos reales y no publica rutas.

## 1. Resumen ejecutivo

Founder Vault sera una boveda privada, confidencial y oculta dentro de ZOVIT, destinada a conservar la declaracion de autoria, fundacion, historia, evolucion tecnica y evidencias historicas del proyecto.

La boveda reconocera como fundador historico y creador de la idea original de ZOVIT a:

- Jorge Andres Salas Guzman.
- RUT 16.032.189-K.
- Idea original nacida en 2023 a partir de su experiencia como alumno.
- Inicio formal del proyecto: 30 de julio de 2025.
- Evolucion continua desde el 30 de julio de 2025 hasta la actualidad.

Founder Vault no debe aparecer en menus normales, buscadores internos, sitemap, enlaces publicos ni componentes visibles para otros roles. La ocultacion no es seguridad suficiente: el acceso debe estar protegido por rol, UUID oficial del SUPERADMIN fundador, reautenticacion, frase secreta, controles de sesion, auditoria, rate limiting y cifrado.

## 2. Objetivo

Conservar de forma confidencial:

- Declaracion oficial de autoria.
- Historia del origen de ZOVIT.
- Cronologia del proyecto.
- Arquitectura conceptual original.
- Decisiones estrategicas.
- Evolucion del proyecto.
- Documentos privados del fundador.
- Evidencias historicas.
- Versiones del documento fundacional.
- Informacion de transferencia de propiedad.
- Auditoria de accesos.
- Firmas y anexos.
- Documentos relacionados con ZOVIT IA y ZOVIT OCR.
- Registro de la vision original del ecosistema.

## 3. Alcance historico

La documentacion debe establecer que:

- Jorge Andres Salas Guzman es el fundador historico.
- Es el creador de la idea original.
- Es el autor de la vision conceptual inicial.
- La incorporacion futura de socios, inversionistas, desarrolladores o colaboradores no modifica la autoria historica.
- Los aportes posteriores se registran como contribuciones a la evolucion del proyecto.
- Una transferencia futura de propiedad operativa no cambia quien fue el fundador original.

## 4. Riesgos

Riesgos principales:

- Exposicion del RUT u otros datos personales del fundador.
- Acceso de Administradores o usuarios no autorizados.
- Filtracion por logs, errores o metadatos visibles.
- Almacenamiento sin cifrar.
- Uso de una frase secreta debil o guardada en texto plano.
- Ruta oculta tratada como unica proteccion.
- Borrado accidental del historial fundacional.
- Transferencia de propiedad que intente alterar la autoria historica.
- Recuperacion insegura.
- Dependencia de claves mal gestionadas.

Mitigaciones:

- Cifrado autenticado.
- Hash seguro de frase secreta.
- Reautenticacion.
- Proteccion por UUID oficial.
- RLS y APIs con defensa en profundidad.
- Auditoria completa.
- Versionado inmutable.
- Eliminacion logica, no fisica por defecto.
- Backups y exportacion firmable.

## 5. Arquitectura propuesta

Ruta conceptual futura:

`/intranet/superadmin/founder-vault`

La ruta no debe publicarse ni enlazarse en navegacion normal.

Componentes conceptuales:

- Frontend oculto para acceso seguro.
- Backend/API exclusiva de Founder Vault.
- Middleware con rechazo temprano.
- Server Actions protegidas si se usan.
- Supabase Auth para sesion y reautenticacion.
- RLS especifica.
- Storage privado para contenido cifrado.
- Servicio de cifrado del lado servidor.
- Hash de frase secreta.
- Auditoria dedicada.
- Versionado de documentos.
- Flujo de transferencia.
- Flujo de recuperacion.
- Exportacion controlada.

Estructura conceptual:

```text
Founder Vault
  -> Acceso seguro
  -> Documento fundacional
  -> Historia de ZOVIT
  -> Cronologia
  -> Arquitectura original
  -> ZOVIT IA
  -> ZOVIT OCR
  -> Versiones
  -> Evidencias historicas
  -> Firmas
  -> Anexos
  -> Transferencia
  -> Recuperacion
  -> Auditoria
```

## 6. Flujo de acceso

Para abrir la boveda deben cumplirse todas las condiciones:

1. Sesion valida.
2. Rol SUPERADMIN.
3. Usuario coincide con el UUID oficial del SUPERADMIN fundador protegido.
4. Reautenticacion reciente.
5. Frase secreta adicional correcta.
6. Controles de seguridad superados.
7. No estar bloqueado por intentos fallidos.
8. Acceso registrado en auditoria.

Mensaje generico ante error:

`Acceso no autorizado o credenciales invalidas.`

No se debe revelar si fallo rol, sesion, UUID, reautenticacion o frase secreta.

## 7. Reautenticacion

Antes de mostrar contenido, el sistema debe exigir reautenticacion compatible con Supabase Auth.

Opciones futuras:

- Confirmar contrasena actual.
- Exigir segundo factor si Supabase MFA esta habilitado.
- Validar sesion reciente.
- Confirmacion explicita para acciones criticas.
- Codigo de recuperacion para flujos excepcionales.
- Validacion de dispositivo si se implementa.

La reautenticacion debe comprobar que la sesion pertenece realmente al SUPERADMIN protegido.

## 8. Frase secreta

La frase secreta debe:

- Ser distinta de la contrasena normal.
- No guardarse en texto plano.
- No guardarse en localStorage.
- No incluirse en el frontend.
- No aparecer en logs.
- No incluirse en documentacion.
- No guardarse junto al contenido cifrado.

Su finalidad es agregar una segunda barrera local de acceso a la boveda.

## 9. Hash seguro

Estrategia recomendada:

- Argon2id preferentemente.
- Salt unico por configuracion.
- Parametros de memoria/tiempo adecuados al entorno productivo.
- Pepper opcional guardado fuera de la base de datos.
- Comparacion en tiempo constante.
- Rotacion controlada si cambian parametros.

Alternativas si Argon2id no esta disponible:

- bcrypt con costo alto y revision periodica.
- scrypt con parametros robustos.

No se debe documentar ni crear una frase real en esta etapa.

## 10. Cifrado

La informacion de Founder Vault debe permanecer cifrada.

Contenido a cifrar:

- Documento fundacional.
- Versiones.
- Anexos.
- Imagenes.
- Firmas.
- Notas privadas.
- Metadatos sensibles.
- Historial privado.
- Documentos de transferencia.

Estrategia recomendada:

- Cifrado autenticado tipo AES-256-GCM o equivalente moderno.
- IV/nonce unico por objeto cifrado.
- AAD para vincular contexto, version y documento.
- Verificacion de integridad antes de descifrar.
- Nunca guardar clave junto al contenido cifrado.

## 11. Gestion de claves

La clave de cifrado no debe quedar:

- En frontend.
- En repositorio.
- En tablas publicas.
- En logs.
- En variables expuestas al cliente.
- Dentro del documento.

Estrategia futura:

- Clave maestra en gestor de secretos del proveedor.
- Claves de datos por documento o version.
- Envoltorio de claves: data key cifrada con master key.
- Rotacion planificada.
- Registro de version de clave sin exponer la clave.
- Separacion de clave de cifrado y hash de frase secreta.

No configurar claves reales en esta etapa.

## 12. RLS

RLS debe impedir:

- Lectura por Administradores.
- Lectura por Evaluadores.
- Lectura por staff.
- Lectura por usuarios publicos.
- Listado de documentos por cualquier no SUPERADMIN protegido.
- Acceso a metadatos privados.
- Escritura, modificacion o eliminacion por terceros.

Las politicas futuras deben validar:

- `auth.uid()` coincide con UUID oficial protegido.
- Rol SUPERADMIN real.
- Reautenticacion reciente registrada.
- Sesion no bloqueada.
- Accion permitida.

RLS no reemplaza el cifrado; ambas capas son necesarias.

## 13. APIs

APIs futuras sugeridas:

- `POST /api/intranet/superadmin/founder-vault/access`
- `POST /api/intranet/superadmin/founder-vault/reauth`
- `GET /api/intranet/superadmin/founder-vault/documents`
- `POST /api/intranet/superadmin/founder-vault/documents`
- `GET /api/intranet/superadmin/founder-vault/documents/[id]`
- `POST /api/intranet/superadmin/founder-vault/documents/[id]/versions`
- `POST /api/intranet/superadmin/founder-vault/export`
- `POST /api/intranet/superadmin/founder-vault/transfer`
- `POST /api/intranet/superadmin/founder-vault/recovery`

Todas deben:

- Rechazar por defecto.
- Validar UUID protegido.
- Validar reautenticacion.
- Validar frase secreta cuando corresponda.
- Auditar resultado.
- No revelar contenido ni metadatos en errores.

## 14. Storage

Storage futuro:

- Bucket privado dedicado o prefijo privado especial.
- Objetos cifrados antes de subir.
- Signed URLs solo luego de pasar acceso completo.
- Nombres opacos, no descriptivos.
- No guardar RUT ni nombre del fundador en path visible.
- No exponer metadatos sensibles.

No guardar documentos fundacionales sin cifrar.

## 15. Auditoria

Eventos a registrar:

- Intento de acceso.
- Acceso exitoso.
- Acceso fallido.
- Reautenticacion.
- Cambio de frase secreta.
- Apertura de documento.
- Creacion.
- Modificacion.
- Nueva version.
- Firma.
- Exportacion.
- Descarga.
- Eliminacion logica.
- Recuperacion.
- Transferencia de propiedad.
- Rollback.
- Cambio de configuracion.

Cada evento debe registrar:

- Actor.
- UUID.
- Rol.
- Accion.
- Documento afectado.
- Fecha.
- Hora.
- IP si esta disponible y es legalmente tratable.
- Dispositivo o user agent.
- Resultado.
- Motivo.
- Version.
- Hash del archivo.
- Metadatos minimos necesarios.

La auditoria no debe revelar contenido cifrado.

## 16. Versionado

Nunca sobrescribir silenciosamente el documento fundacional.

Ejemplos:

- `FOUNDER_CERTIFICATE v1.0`
- `FOUNDER_CERTIFICATE v1.1`
- `FOUNDER_CERTIFICATE v2.0`

Cada version debe registrar:

- Fecha.
- Autor.
- Motivo.
- Hash.
- Relacion con version anterior.
- Estado.
- Firma.
- Resumen de cambios.

El historial completo debe conservarse.

## 17. Firma

El diseno debe permitir:

- Firma simple interna.
- Exportacion a PDF.
- Firma electronica externa.
- Firma electronica avanzada.
- Protocolizacion notarial.
- Registro como obra documental o tecnica.
- Vinculacion a comprobante externo.
- Conservacion de hash de version firmada.

Founder Vault no reemplaza por si sola una firma electronica avanzada, protocolizacion notarial ni registro oficial de propiedad intelectual.

## 18. Exportacion

La exportacion debe:

- Requerir reautenticacion.
- Requerir frase secreta.
- Auditarse.
- Generar hash.
- Incluir version.
- Permitir PDF para respaldo externo.
- Evitar exponer rutas internas.
- Marcar estado de documento: borrador, vigente, exportado, firmado, protocolizado o archivado.

## 19. Transferencia

La autoria historica no se transfiere.

La gobernanza y propiedad operativa podrian transferirse.

Flujo especial:

1. SUPERADMIN abre transferencia.
2. Reautentica identidad.
3. Ingresa frase secreta.
4. Selecciona o invita al nuevo propietario.
5. Se verifica identidad del nuevo propietario.
6. Se genera solicitud de transferencia.
7. Nuevo propietario acepta.
8. Fundador confirma por segunda vez.
9. Sistema cambia SUPERADMIN protegido.
10. Evento queda auditado.
11. La boveda conserva permanentemente el reconocimiento del fundador historico.

El nuevo propietario no debe poder cambiar ni eliminar el reconocimiento historico de Jorge Andres Salas Guzman como creador y fundador original.

## 20. Recuperacion

No usar preguntas de seguridad simples.

Mecanismos recomendados:

- Codigos de recuperacion.
- Segundo factor.
- Respaldo offline.
- Proceso extraordinario.
- Retraso de seguridad.
- Alertas.
- Revision manual.
- Bloqueo de acciones criticas durante recuperacion.

La recuperacion debe documentarse sin exponer secretos reales.

## 21. Privacidad

El RUT y datos personales del fundador son informacion sensible.

No deben aparecer:

- En frontend publico.
- En logs generales.
- En mensajes de error.
- En endpoints publicos.
- En busquedas.
- En metadatos visibles.
- En archivos sin cifrar.

El documento fundacional puede contenerlos dentro del contenido cifrado.

## 22. Proteccion del SUPERADMIN

Solo el SUPERADMIN podra:

- Crear documentos en la boveda.
- Leerlos.
- Modificarlos.
- Versionarlos.
- Firmarlos.
- Exportarlos.
- Descargar copias.
- Iniciar transferencia.
- Revisar auditoria.
- Cambiar frase secreta.
- Cerrar sesiones.
- Recuperar acceso.

Ningun Administrador podra:

- Listar documentos.
- Conocer nombres.
- Leer metadatos privados.
- Acceder al contenido.
- Cambiar permisos.
- Cambiar hash de frase.
- Consultar claves.
- Transferir propiedad.
- Eliminar boveda.

## 23. Componentes actuales reutilizables

Reutilizar:

- Supabase Auth.
- `intranet_role = super_admin`.
- Proteccion por UUID propuesta en documentacion maestra.
- Middleware actual como base.
- Intranet como superficie interna.
- Supabase Storage privado.
- RLS.
- Historias de auditoria existentes como patron.
- Documentacion ZOVIT IA.
- Documentacion ZOVIT OCR.
- Estados y principios de datos estructurados/evidencia.

## 24. Nuevos componentes minimos

Propuestas conceptuales, no implementadas:

- `founder_vault_documents`
- `founder_vault_versions`
- `founder_vault_access_logs`
- `founder_vault_settings`
- `founder_vault_recovery`
- `ownership_transfer_requests`

Por que no basta reutilizar tablas actuales:

- Los documentos de identidad/worker son evidencias operativas, no boveda fundacional.
- Auditorias actuales son parciales y no cubren cifrado, frase secreta, exportacion y transferencia.
- Configuraciones actuales no contemplan hash de frase ni version de clave.
- Transferencias de propiedad requieren flujo especial separado.

## 25. Panel futuro

Ruta conceptual:

`/intranet/superadmin/founder-vault`

Secciones:

- Acceso seguro.
- Documento fundacional.
- Historia.
- Cronologia.
- Versiones.
- Evidencias.
- Anexos.
- Firmas.
- Exportaciones.
- Auditoria.
- Transferencia.
- Recuperacion.
- Seguridad.
- Configuracion.

El panel solo sera visible despues de superar todas las capas de acceso.

## 26. Defensa en profundidad

Seguridad requerida en:

- Frontend.
- Backend.
- Middleware.
- Server Actions.
- APIs.
- Supabase.
- SQL.
- RLS.
- Storage.
- Cifrado.
- Control de sesion.
- Reautenticacion.
- Hash de frase secreta.
- Auditoria.
- Rate limiting.
- Gestion de errores.
- Gestion de claves.

No basta con ocultar botones, ocultar la ruta, comprobar rol en navegador, usar contrasena en JavaScript, guardar secreto en localStorage o guardar documentos sin cifrar.

## 27. Intentos fallidos

Reglas:

- Contar intentos.
- Aplicar espera progresiva.
- Bloqueo temporal.
- Alerta al SUPERADMIN.
- Cierre de sesion si riesgo alto.
- Registro de IP y dispositivo cuando sea legal y tecnicamente posible.
- Auditoria del intento.
- Mensajes genericos.

Mensaje recomendado:

`Acceso no autorizado o credenciales invalidas.`

## 28. Plan por fases

Fase 0: documentacion y aprobacion.

Fase 1: confirmar UUID oficial del SUPERADMIN fundador.

Fase 2: disenar modelo de datos y RLS sin aplicar.

Fase 3: prototipo local no productivo.

Fase 4: cifrado y gestion de claves.

Fase 5: panel oculto con reautenticacion.

Fase 6: auditoria completa.

Fase 7: exportacion PDF y firma externa.

Fase 8: transferencia y recuperacion.

Fase 9: pruebas de seguridad.

Fase 10: aprobacion productiva.

## 29. Pruebas de seguridad

Probar:

- Usuario no autenticado.
- Cliente con URL conocida.
- Profesional con URL conocida.
- Administrador con URL conocida.
- SUPERADMIN no protegido.
- SUPERADMIN protegido sin reautenticacion.
- SUPERADMIN protegido con frase incorrecta.
- Intentos repetidos.
- Metadatos invisibles.
- Storage inaccesible.
- RLS bloqueando consultas directas.
- Logs sin contenido sensible.
- Exportacion auditada.
- Transferencia auditada.
- Rollback de versiones.

## 30. Cinco decisiones que debes aprobar antes de implementar

1. Confirmar el UUID oficial del SUPERADMIN fundador que podra abrir la boveda.
2. Aprobar la ruta conceptual `/intranet/superadmin/founder-vault` y que no aparezca en navegacion normal.
3. Aprobar estrategia de cifrado y gestion de claves para produccion.
4. Aprobar mecanismo de reautenticacion y frase secreta.
5. Aprobar si el certificado fundacional se exportara luego a PDF, firma electronica avanzada, notaria o registro externo.

