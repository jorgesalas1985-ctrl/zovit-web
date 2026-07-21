# Scripts SQL — ZOVIT Web v5.0

## Orden de ejecución

Ejecutar **siempre en este orden** en Supabase → SQL Editor:

```
1. schema_v4.sql
2. FASE_1_COMPLETA.sql
```

No inviertas el orden: Fase 1 depende de tablas, funciones y perfiles creados en el script base.

## Qué hace cada script

### 1. `schema_v4.sql` (base)

- Extensión `pgcrypto`
- Tabla `profiles` (perfil de usuario vinculado a `auth.users`)
- Tabla `solicitudes_de_servicio`
- Row Level Security (RLS) en `profiles` y `solicitudes_de_servicio`
- Políticas iniciales de acceso
- Función y trigger `handle_new_user` (crea perfil al registrarse)
- Sincronización de perfiles para usuarios existentes
- Política de eliminación de solicitudes propias

### 2. `FASE_1_COMPLETA.sql` (extensión Fase 1)

- Tablas: `request_messages`, `request_photos`, `request_status_history`, `notifications`
- Elimina políticas legacy duplicadas de `solicitudes_de_servicio` (de schema_v4)
- Políticas RLS consolidadas para solicitudes, mensajes, fotos, historial y notificaciones
- Funciones RPC: `accept_service_request`, `change_service_request_status`
- Función auxiliar: `is_request_participant`
- Triggers de notificación: `notify_request_activity`
- Bucket de storage `request-photos` con políticas
- Publicación Realtime para `request_messages`, `notifications`, `solicitudes_de_servicio`

## Idempotencia

Ambos scripts usan `create table if not exists`, `add column if not exists`, `drop policy if exists` y `create or replace function`. Pueden re-ejecutarse sin perder datos.

## Respaldo

Copias originales antes de modificaciones de Fase 0: [`backups/`](backups/).

| Archivo de respaldo | Origen |
|---------------------|--------|
| `backups/schema_v4.sql` | `schema_v4.sql` |
| `backups/FASE_1_COMPLETA.sql` | `FASE_1_COMPLETA.sql` |

## Tablas resultantes

| Tabla | Uso en la app |
|-------|---------------|
| `profiles` | Perfil, roles, panel |
| `solicitudes_de_servicio` | Solicitudes y trabajos |
| `request_messages` | Chat por solicitud |
| `request_photos` | Fotos antes/después |
| `request_status_history` | Auditoría de estados (solo BD) |
| `notifications` | Campana de notificaciones |

## Storage

| Bucket | Uso |
|--------|-----|
| `request-photos` | Imágenes de evidencia del trabajo |

## Funciones RPC

| Función | Descripción |
|---------|-------------|
| `accept_service_request(request_id)` | Profesional acepta un trabajo publicado |
| `change_service_request_status(request_id, new_status)` | Cambio de estado del flujo de servicio |
