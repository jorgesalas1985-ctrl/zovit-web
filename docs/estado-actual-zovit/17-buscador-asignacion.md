# 17 — Buscador, mapa y asignación de profesionales

---

## Cómo se buscan profesionales

| Canal | Mecanismo | Archivos |
|-------|-----------|----------|
| Browse categorías/servicios | Árbol TS + API/RPC pros por specialty | `app/categorias/**`, `app/servicios/**`, `app/api/services/professionals` |
| Buscador “IA” | Keywords → categoría → `search_professionals` | `lib/ai/parseQuery.ts`, `app/api/ai/recommend` |
| Mapa | `search_nearby_professionals` / fallback | `lib/map/nearbyProfessionals.ts` |
| Trabajos abiertos (lado pro) | `get_open_jobs_for_professionals` | SPRINT_18 |

---

## Filtros

| Filtro | ¿Existe? |
|--------|----------|
| Categoría / especialidad | Sí |
| Distancia / nearby | Sí (mapa) |
| Precio | No como filtro de búsqueda de pros (precio viene en propuesta) |
| Disponibilidad | Sí (API availability + señales) |
| Calificación | Vía stats en ranking SQL (parcial exposición UI) |
| Verificación / biometría | Sí (SPRINT_8B search) |
| Experiencia | Sí (`experience_level`) |

---

## Algoritmo de orden / recomendaciones

1. Parse de texto por puntuación de keywords (`serviceCatalog` + `parseQuery`) — **no LLM**.
2. RPC `search_professionals` ordena candidatos elegibles.
3. UI muestra badges junior/verified/expert (`AiRecommendations`).

Recomendaciones = ranking de reglas + datos reales de perfiles. Si no hay pros, lista vacía (no inventa personas).

---

## Asignación automática (¿Uber?)

| Pregunta | Respuesta |
|----------|-----------|
| ¿Asignación automática del trabajo? | **No** |
| ¿Qué hace auto-match? | Notifica hasta **8** profesionales; setea `auto_matched_at` |
| ¿El primero que acepta gana? | En flujo pagos: el cliente **elige propuesta**; no es race Uber pura |
| ¿Cliente elige? | **Sí** (acepta propuesta) |
| ¿Límites? | Cap 8 invites; fees cancelación; biometría; modo rol |

Archivos: `lib/automation/inviteProfessionals.ts`, `app/api/requests/[id]/auto-match/route.ts`, cron `runAutomationCycle.ts`.

---

## Pseudoflujos

### A) Cliente elige

```
Browse/IA/Mapa → Ver perfil → Crear solicitud
→ Pros envían propuestas → Cliente acepta una → Paga
```

### B) Auto-match (notificación)

```
Crear solicitud (mapa/API) → auto-match
→ notifications a N pros cercanos/categoría
→ Pros cotizan → Cliente elige
```

### C) Profesional busca trabajo

```
/trabajos → ve abiertos (dirección masked) → envía propuesta
```

---

## ¿Resultados simulados?

No hay lista hardcodeada de profesionales en el buscador principal.  
Excepciones de demo están en intranet liquidaciones, no en matching marketplace.
