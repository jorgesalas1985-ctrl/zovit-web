# Mapa de profesionales (cliente)

Ruta: `/cliente/mapa`

## Qué hace

- Muestra profesionales cercanos en un mapa MapLibre + OpenStreetMap.
- Pide geolocalización del navegador (o búsqueda de dirección con Nominatim).
- Filtra por categoría, especialidad, radio, calificación, verificación y certificación.
- Permite solicitar un servicio al profesional seleccionado.
- Escucha solicitudes activas y ubicación en vivo (`service_live_locations`) vía Supabase Realtime.

## Configuración requerida

1. Variables de entorno (ya usadas por ZOVIT):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_URL=https://zovit.cl
```

No se necesita API key de Google Maps.

2. Ejecutar en Supabase SQL Editor:

`supabase/SPRINT_MAP_CLIENT_NEARBY.sql`

Eso agrega:

- columnas geo en `profiles` y `solicitudes_de_servicio`
- tabla `service_live_locations` + RLS
- función `search_nearby_professionals`
- función `haversine_km`

3. En Dashboard Supabase → Database → Replication: asegúrate de que `service_live_locations` (y preferiblemente `solicitudes_de_servicio`) estén en la publication `supabase_realtime`.

## Profesionales visibles en el mapa

Deben cumplir:

- rol profesional / `can_act_as_professional`
- `public_profile` activo
- `latitude` / `longitude` no nulos
- `availability_status` distinto de `offline` (`available`, `busy`, `on_the_way`)

**En producción:** el profesional activa “Estoy disponible” en `/panel` o `/trabajos` (pide GPS y llama a `POST /api/map/availability`). Mientras está disponible, hay heartbeat cada ~45s.

Durante un servicio activo (`aceptada` / `en_camino` / `en_ejecucion`), el detalle `/solicitudes/[id]` publica GPS automáticamente vía `POST /api/map/live-location`.

Ejemplo SQL solo para cuentas de prueba:

```sql
update public.profiles
set
  latitude = -33.4489,
  longitude = -70.6693,
  availability_status = 'available',
  location_updated_at = now(),
  public_profile = true
where id = '<uuid-profesional>';
```

No hay seeds automáticos en producción.

## Cómo probar

1. Aplicar el SQL del sprint (RPC debe ser `SECURITY DEFINER`).
2. Como profesional: `/panel` → “Estoy disponible” → permitir ubicación.
3. Como cliente: `/cliente/mapa` → ver marcador → solicitar → confirmar (pantalla de éxito).
4. Al aceptar el servicio, el profesional abre `/solicitudes/[id]` y el GPS en vivo se publica solo.
5. El cliente ve el seguimiento en el mapa cuando el estado entra a `aceptada`+.

## APIs

| Método | Ruta | Uso |
|--------|------|-----|
| POST | `/api/map/professionals` | Profesionales cercanos |
| GET | `/api/map/geocode?q=` | Proxy Nominatim |
| POST | `/api/map/requests` | Crear solicitud desde mapa |
| GET/POST | `/api/map/availability` | Disponibilidad del profesional en el mapa |
| GET/POST | `/api/map/live-location` | Leer / publicar ubicación en vivo |

## Privacidad

- La ubicación en vivo solo es visible a cliente y profesional del servicio, y solo en estados activos.
- No se expone la dirección exacta del profesional en el mapa (solo punto + comuna pública).
- Al terminar/cancelar, se detiene el seguimiento en la UI y se limpian suscripciones.
