# 19 — Inteligencia artificial

---

## Proveedor y modelo reales

| Aspecto | Valor en código |
|---------|-----------------|
| Provider activo | `local` |
| Modelo declarado | `tesseract-local` |
| OpenAI / Gemini packages | **No** en `package.json` |
| Vision cloud | **Desactivada** — `chatWithVision` lanza error |
| Claves OPENAI/GEMINI | No usadas (`lib/ai/provider.ts`) |

---

## Funciones que “usan IA” (inventario)

| Función | Realidad | Datos enviados | ¿Decide? | Lugar |
|---------|----------|----------------|----------|-------|
| Recommend professionals | Reglas keywords + RPC | Texto consulta usuario | Ordena candidatos DB | `/ia`, `/api/ai/recommend` |
| Parse query | Scoring keywords | Texto | Sugiere categoría | `lib/ai/parseQuery.ts` |
| Carnet OCR (`analyzeCarnetWithOpenAI` nombre legacy) | Tesseract local | Imágenes carnet | Puede autoaprobar identidad | verification pipelines |
| Worker documents AI | Stub → siempre dudoso | Meta docs | **No** aprueba | `lib/worker/aiDocumentValidation.ts` |
| Quick help | FAQ keywords | Pregunta usuario | Respuestas plantilla | `QuickHelpAssistant` |
| Intranet workers ai-validate | Dispara batch local/cola | docs | Humano | APIs intranet |

---

## Prompts

No hay prompts LLM activos (vision throw).  
OCR no usa prompt conversacional; usa reconocimiento óptico + reglas (`localCarnetOcr.ts`, `aiCarnetOcr.ts` tests).

---

## Resultados / UI

- `components/AiRecommendations.tsx` — lista pros con badges.
- Textos de ayuda pueden decir “IA revisa…” (`quickHelp.ts`) — **parcialmente cierto** (OCR), no LLM.

---

## ¿Activo? ¿Simulación?

| Pieza | Estado |
|-------|--------|
| Recommend/parse | Activo (no LLM) |
| OCR carnet | Activo local |
| Vision OpenAI | Inactivo |
| Worker AI approve | Simulado/cola |
| Costos API cloud | $0 por diseño actual (sin claves) |
| Límites Tesseract | Calidad imagen; CPU servidor |

---

## Riesgos técnicos

1. Naming “OpenAI” en funciones genera falsa expectativa.
2. Autoaprobación identidad por OCR puede fallar con fotos malas o fraude.
3. Copy de producto que promete “IA” generativa sin estarlo.
4. Si alguien reactivara vision cloud sin revisar privacidad, se enviarían cédulas a terceros — hoy bloqueado.

---

## Archivos clave

- `lib/ai/provider.ts`
- `lib/ai/parseQuery.ts`, `lib/ai/serviceCatalog.ts`
- `lib/verification/localCarnetOcr.ts`
- `lib/worker/aiDocumentValidation.ts`
- `app/api/ai/recommend/route.ts`
- `app/ia/**`
