# 14 — Mapas y geolocalización

**Doc interna:** `docs/MAPA_CLIENTE.md`  
**SQL:** `supabase/SPRINT_MAP_CLIENT_NEARBY.sql`

---

## Proveedor de mapas

| Pieza | Tecnología |
|-------|------------|
| Render mapa | **MapLibre GL** (`maplibre-gl`) |
| Tiles | **OpenStreetMap** |
| Geocoding | **Nominatim** (OSM) vía proxy `app/api/map/geocode/route.ts` |
| Google Maps / Mapbox | **No** usados como dependencia |

No requiere API key de mapas (comentado en `.env.example`).

---

## Cómo se obtiene la ubicación

1. Permiso del navegador (`lib/geo/locationPermission.ts`).
2. Coordenadas normalizadas (`lib/geo/coordinates.ts`).
3. Distancia Haversine (`lib/geo/distance.ts` + RPC `haversine_km`).
4. Geocode texto → coords (Nominatim proxy con User-Agent ZOVIT).

---

## Qué ve cada rol

| Rol | Qué ve |
|-----|--------|
| Cliente | Mapa `/cliente/mapa`: profesionales cercanos, crear solicitud, tracking si hay pro en trabajo activo |
| Profesional | Publica live location durante trabajo (`ProfessionalLiveLocationPublisher`) |
| Visitante | No accede a `/cliente/*` (protegido) |

Dirección de servicio puede enmascararse a no autorizados (`mask_service_address`, SPRINT_18).

---

## Cuándo se activa / desactiva

| Función | Activación |
|---------|------------|
| Nearby search | Cliente autenticado en mapa / APIs professionals |
| Live tracking | Trabajo en estados activos + POST `live-location` + Realtime subscribe |
| Desactivación | Policies delete; fin de servicio — detalle exacto de TTL: ver SQL live_loc |

---

## Seguimiento en tiempo real

**Parcial — implementado en código**, depende de:

1. Migración `SPRINT_MAP_CLIENT_NEARBY.sql` aplicada.
2. Profesional con app abierta publicando.
3. Cliente en mapa suscrito.

Tabla: `service_live_locations` (unique por service/request).

---

## ¿Se guarda la ubicación? ¿Historial?

| Dato | Persistencia |
|------|--------------|
| Geo en perfil / solicitud | Columnas en profiles/solicitudes (sprint mapa) |
| Live point | Upsert en `service_live_locations` |
| Historial trayectoria completo | **No** encontrado como tabla de breadcrumbs; solo punto actual |

Tiempo de retención: **NO DETERMINADO** más allá de delete policies.

---

## Radio / ETA / ruta

| Feature | Estado |
|---------|--------|
| Radio búsqueda nearby | Sí (haversine / search_nearby) |
| ETA llegada | **No** implementado como producto |
| Ruta turn-by-turn | **No** (no OSRM/Google Directions en deps) |
| Datos simulados | No por defecto; mapa vacío si no hay pros/geo |

---

## APIs

| Ruta | Función |
|------|---------|
| `/api/map/geocode` | Geocoding Nominatim |
| `/api/map/professionals` | Nearby pros |
| `/api/map/availability` | Disponibilidad |
| `/api/map/requests` | Crear solicitud desde mapa (+ auto-match) |
| `/api/map/live-location` | Upsert ubicación pro |

---

## Riesgos técnicos

1. Nominatim: rate limits / ToS — proxy con UA correcto.
2. Exposición prematura de domicilio sin mask.
3. Live GPS = dato sensible; bucket/tabla deben mantener RLS estricto.
4. Sin API key no implica “sin costo operativo” (tráfico tiles OSM).
5. Si SQL no aplicado: APIs fallan — estado prod **NO DETERMINADO**.

---

## Archivos relacionados

- `components/map/*`
- `app/cliente/mapa/page.tsx`
- `lib/geo/*`, `lib/map/*`, `lib/location/*`
- `app/api/map/*`
- `docs/MAPA_CLIENTE.md`
