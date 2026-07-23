# ZOVIT Web v5.0 – Fase 1

Aplicación Next.js conectada a Supabase para gestión de solicitudes de servicio entre clientes y profesionales.

## Incluye

- Registro e inicio de sesión con Supabase Auth (roles: cliente y profesional).
- Perfil personal protegido.
- Creación, listado y detalle de solicitudes de servicio.
- Panel profesional para aceptar trabajos publicados.
- Chat en tiempo real por solicitud.
- Subida de fotos antes/después del trabajo.
- Notificaciones en campana con Realtime.
- Políticas RLS para que cada usuario acceda solo a sus datos autorizados.

## Requisitos

- Node.js 18+
- Proyecto Supabase configurado
- Variables de entorno (ver `.env.example`)

## Configuración de Supabase

Ejecutar los scripts **en este orden** en Supabase → **SQL Editor**:

| Orden | Script | Contenido |
|-------|--------|-----------|
| 1 | `supabase/schema_v4.sql` | Tablas base (`profiles`, `solicitudes_de_servicio`), trigger de registro, RLS inicial |
| 2 | `supabase/FASE_1_COMPLETA.sql` | Chat, fotos, notificaciones, RPC, storage, Realtime, políticas consolidadas |

Ambos scripts son **idempotentes**: no borran datos existentes y pueden re-ejecutarse de forma segura.

> **Nota:** Si solo ejecutas `schema_v4.sql`, funciones como `/trabajos`, chat, fotos y notificaciones no estarán disponibles.

Documentación detallada de los scripts: [`supabase/README.md`](supabase/README.md).

## Variables de entorno

1. Copia `.env.example` a `.env.local`.
2. Completa con los valores de tu proyecto Supabase (Settings → API):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Usa únicamente la clave pública (`anon` / `sb_publishable`). **Nunca** agregues una clave `service_role` o `sb_secret` al frontend.

## Activación local

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`.

## Publicar en zovit.cl (producción)

Guía completa: [`docs/DEPLOY.md`](docs/DEPLOY.md)

Resumen: GitHub → Vercel → DNS del dominio → Supabase Auth URLs.

## Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Servidor de producción |
| `npm run lint` | Verificación ESLint |

## Respaldo SQL

Copias de respaldo de los scripts originales (pre-Fase 0): `supabase/backups/`.
