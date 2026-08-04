# 16 — Sistema de calificaciones

**SQL:** `supabase/SPRINT_3_EXPERIENCIA.sql`  
**UI:** `components/ServiceRatingForm.tsx`, perfiles `app/profesional/[id]/page.tsx`, experiencia/credencial.

---

## Quién puede calificar

- El **cliente** de la solicitud, vía RPC `submit_service_rating`.
- Policy: `ratings_insert_client`.

---

## Cuándo puede calificar

- Tras el flujo de trabajo pagado: la experiencia verificable / rating está acoplada a **`pago_liberado`** (documentado en `docs/PAGOS.md` y lógica SPRINT_3 + pagos).
- Calificar sin contratación real pagada: **bloqueado por diseño** (requiere request/pago elegible). Detalle exacto de checks: función SQL `submit_service_rating`.

---

## Escala y comentarios

| Campo | Valor |
|-------|-------|
| Escala | 1–5 (`service_ratings.rating`) |
| Comentarios | Sí (columna comentario en tabla sprint) |
| Promedio | Agregado en `get_professional_stats` / UI perfil |
| Respuestas del profesional | **No** hallado modelo de reply a rating |
| Denuncias de reseña | **No** hallado |
| Moderación | **No** panel dedicado |
| Eliminación | NO DETERMINADO UI |

---

## Datos de prueba

No hay seed fijo de ratings en el código auditado. En entornos de prueba pueden existir filas reales de E2E (`scripts/e2e-*.mjs`).

---

## Efecto en ranking / búsqueda

- Stats y `experience_level` se refrescan (`refresh_professional_experience_level`).
- `search_professionals` (SPRINT_4 / 8B) usa señales de perfil/verificación/experiencia — el peso exacto está en la función SQL.
- No es un “score ML”; es ranking por reglas SQL.

---

## Tablas y archivos

| Recurso | Path |
|---------|------|
| Tabla | `service_ratings` |
| Relacionada | `professional_experience` |
| Form | `components/ServiceRatingForm.tsx` |
| RPC | `submit_service_rating`, `get_professional_stats` |
