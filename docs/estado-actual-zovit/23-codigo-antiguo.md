# 23 — Archivos antiguos, duplicados o sin uso

**No se eliminó nada.** Lista orientativa basada en inspección estática; “sin uso” exacto requeriría análisis de bundle/dead-code (**parcial**).

---

## Backups y versiones anteriores

| Path | Nota |
|------|------|
| `supabase/backups/schema_v4.sql` | Copia histórica |
| `supabase/backups/FASE_1_COMPLETA.sql` | Copia histórica |
| `Desktop/Backups_ZOVIT/...` (fuera de este repo) | Backups locales del usuario — no parte del git activo |

---

## Rutas / superficies duplicadas

| Duplicado | Detalle |
|-----------|---------|
| `/categorias/**` vs `/servicios/**` | Dos árboles de browse |
| `/admin/verificacion` vs `/intranet/admin/verificacion` | Misma capacidad, dos entradas |
| `/legal/seguridad` vs `/seguridad` | Legal vs marketing/educativo |

---

## Stubs / reemplazados

| Elemento | Estado |
|----------|--------|
| Payment providers webpay/stripe/bank_transfer | Stubs |
| `chatWithVision` OpenAI/Gemini | Desactivado |
| Nombres `*OpenAI*` en OCR/worker | Legacy naming → Tesseract/cola |
| README Fase 1 claims | Desactualizado vs sprints |

---

## Datos ficticios / prueba

| Path | Uso |
|------|-----|
| `app/intranet/liquidaciones/page.tsx` | `demoPayrolls` |
| `scripts/simulate-mock-payment.mjs` | Simulación |
| `scripts/mock-pay-now.mjs` | Simulación |
| `scripts/create-test-professional.mjs` | Test |
| `scripts/e2e-*.mjs` | E2E |
| `lib/payments/providers/mock.ts` | Dev |

---

## Carpetas temporales

| Path | Nota |
|------|------|
| `supabase/.temp/` | Artefactos CLI Supabase |
| `tsconfig.tsbuildinfo` | Build cache |
| `.cursor/` | Config agente (untracked) |
| `.next/` | Build (si existe) |

---

## Posibles componentes con bajo enlace

Sin grafo de imports completo. Candidatos a revisar (no afirmar dead code):

- Superficies intranet shell con “próximamente”.
- Tour `superAdminView` (sí se usa para UI tour).
- Certificados premium components nuevos (untracked en git status al auditar) — **en uso potencial** en credencial.

---

## Migraciones contradictorias

Múltiples scripts recrean policies (`requests_insert_client`, wallets select, etc.). La última aplicación gana. Riesgo de drift si se ejecutan parcialmente.

---

## Funciones reemplazadas conceptualmente

| Antes (nombre) | Ahora |
|----------------|-------|
| Vision cloud | OCR local |
| Accept request simple | + flujo pagos con propuesta |
| Admin money por role=admin | Solo super_admin |

---

## Código comentado

Hay comentarios de producto/TODO en docs y algunas páginas “próximamente”. Barrido exhaustivo de bloques comentados grandes: **NO DETERMINADO**.
