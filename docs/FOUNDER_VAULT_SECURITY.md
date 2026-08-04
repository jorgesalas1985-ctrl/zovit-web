# Founder Vault Security

Fecha base: 1 de agosto de 2026.

Documento de seguridad conceptual para la futura Founder Vault de ZOVIT.

## 1. Principio

Founder Vault debe tratarse como un modulo de maxima sensibilidad. No debe depender de ocultar una ruta ni de validaciones en el navegador. La seguridad debe existir en todas las capas.

## 2. Acceso permitido

Solo podra acceder:

- Sesion valida.
- Rol SUPERADMIN.
- UUID oficial protegido del fundador o propietario autorizado.
- Reautenticacion reciente.
- Frase secreta correcta.
- Sin bloqueo por intentos fallidos.
- Acceso auditado.

## 3. Acceso prohibido

No deben acceder:

- Alumno.
- Empresa.
- Institucion.
- Cliente.
- Profesional.
- Evaluador.
- Administrador.
- Staff interno no SUPERADMIN.
- SUPERADMIN no protegido por UUID oficial.

## 4. Frase secreta

La frase secreta debe:

- Ser distinta de la contrasena.
- Guardarse solo como hash.
- Usar Argon2id preferentemente.
- Nunca aparecer en frontend, logs o repositorio.
- No almacenarse en texto plano.
- No usarse como clave directa de cifrado sin derivacion segura.

## 5. Cifrado

Estrategia recomendada:

- AES-256-GCM o equivalente.
- Cifrado del lado servidor.
- Nonce unico por objeto.
- Integridad autenticada.
- Claves fuera del contenido cifrado.
- Metadatos sensibles cifrados.

## 6. Gestion de claves

La clave no debe estar:

- En frontend.
- En repositorio.
- En tablas publicas.
- En logs.
- En variables expuestas al cliente.
- Dentro del documento.

Produccion debe usar gestor de secretos y rotacion.

## 7. RLS y APIs

RLS y APIs deben rechazar por defecto. El backend debe validar rol, UUID, reautenticacion, frase secreta cuando aplique, bloqueo de intentos y auditoria.

## 8. Storage

Storage debe contener solo objetos cifrados con nombres opacos. No usar paths con nombre, RUT, documento o datos sensibles.

## 9. Intentos fallidos

Reglas:

- Contador de intentos.
- Espera progresiva.
- Bloqueo temporal.
- Alerta al SUPERADMIN.
- Cierre de sesion si riesgo alto.
- Auditoria.
- Mensajes genericos.

Mensaje recomendado:

`Acceso no autorizado o credenciales invalidas.`

## 10. Auditoria segura

Auditar acciones sin revelar contenido cifrado. Registrar solo metadatos minimos necesarios.

## 11. Pruebas

Probar acceso denegado para todos los roles no autorizados, intento con URL directa, intento de listar Storage, intento de leer metadatos, frase incorrecta, sesion expirada, reautenticacion ausente y bloqueo por fuerza bruta.

