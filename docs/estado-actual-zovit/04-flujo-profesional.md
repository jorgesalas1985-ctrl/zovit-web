# 04 — Flujo completo del profesional

Leyenda: **Completo** · **Parcial** · **Simulado** · **Solo pantalla** · **No existe**

---

## Registro

| Estado | Completo |
|--------|----------|
| Archivos | `app/registro/page.tsx` (tipo Profesional), opcionalmente `/registro/trabajador` |
| Efecto | `role=professional`, flags de modo, `intranet_role=null` |

---

## Selección de categoría / tipo / experiencia

| Etapa | Estado | Evidencia |
|-------|--------|-----------|
| Categorías/especialidades | Completo | `WorkerOnboardingWizard.tsx`, `worker_service_authorizations` |
| Tipo de profesional | Completo (comunidad vs regulado) | `lib/worker/regulatedServices.ts`, `lib/worker/profiles.ts` |
| Experiencia (años/nivel) | Parcial → Completo vía trabajos pagados | `experience_level`, `professional_experience`, `SPRINT_3` |
| Títulos / certificados | Parcial | Carga real a `worker_credentials` + bucket; aprobación humana |
| Validación IA títulos | Simulado | Batch → `dudoso` / cola humana |

---

## Verificación de identidad

| Etapa | Estado | Notas |
|-------|--------|-------|
| Cédula / carnet | Completo (upload + OCR) | Tesseract local |
| Selfie / prueba de vida | Parcial/Simulado | Captura + challenge; sin match facial ML |
| Antecedentes penales | **No existe** flujo dedicado en código | NO DETERMINADO si se pide en PDFs genéricos |
| Autoaprobación | Parcial | Si OCR RUT + fecha coinciden |

Archivos: `lib/verification/*`, `app/api/verification/route.ts`, `SPRINT_7`–`SPRINT_21`.

---

## Datos bancarios

| Estado | Parcial |
|--------|---------|
| Evidencia | Campos en `payout_requests` (`SPRINT_5B_PAYOUTS_DISPUTES_REFUNDS.sql`); UI profesional de pagos/payouts |
| Retiro automático a banco | NO DETERMINADO / parcial — existe `request_payout` / `process_payout`; no hay integración bancaria chilena completa visible como proveedor |

---

## Disponibilidad / horarios / ubicación / radio

| Etapa | Estado | Evidencia |
|-------|--------|-----------|
| Disponibilidad mapa | Completo | `app/api/map/availability/route.ts` |
| Horarios semanales estructurados | Parcial / NO DETERMINADO | No hay tabla clara `schedules` en inventario SQL auditado |
| Ubicación perfil | Completo | Geo cols en profiles (`SPRINT_MAP`) |
| Radio de trabajo | Completo (búsqueda nearby) | `haversine_km`, `search_nearby_professionals` |

---

## Recepción de solicitudes

| Estado | Completo |
|--------|----------|
| Vías | `/trabajos`, RPC `get_open_jobs_for_professionals`, notificaciones auto-match |
| Auto-asignación Uber-style | **No** — auto-match solo notifica (hasta 8), no setea `professional_id` |

Archivos: `lib/automation/inviteProfessionals.ts`, `app/api/requests/[id]/auto-match/route.ts`.

---

## Aceptación / rechazo / cotización

| Etapa | Estado |
|-------|--------|
| Cotización (propuesta) | Completo — profesional fija `amount` |
| Aceptar trabajo clásico (sin pago) | Completo vía RPCs Fase 1 `accept_service_request` (convive con flujo de pago) |
| Rechazo explícito de solicitud | Parcial — puede no enviar propuesta / retirar propuesta |

---

## Chat

Completo — mismos canales que cliente (`request_messages` + Realtime). Filtro anti-contacto externo.

---

## Inicio / seguimiento / finalización

| Etapa | Estado | API |
|-------|--------|-----|
| Start work | Completo | `/api/payments/orders/[id]/start-work` |
| Complete work | Completo | `.../complete-work` |
| Live location | Parcial | `ProfessionalLiveLocationPublisher` + `service_live_locations` |

---

## Cobro / comisión / retiro

| Etapa | Estado | Detalle |
|-------|--------|---------|
| Cobro | Completo (retenido → liberado) | Wallet ledger |
| Comisión | Completo cálculo | 10% + IVA 19% sobre fee (`calculateBreakdown`) |
| Quién paga comisión | Descontada del bruto del servicio (no es cargo aparte al cliente por comisión ZOVIT; sí puede haber fee MP cuotas) | `docs/PAGOS.md` |
| Retiro | Parcial | `payout_requests` + APIs |

---

## Calificaciones / reclamos / suspensiones

| Etapa | Estado |
|-------|--------|
| Recibe calificaciones | Completo |
| Reclamos/disputas | Completo (participa como parte) |
| Suspensiones de cuenta | Parcial — bloqueo de **servicios autorizados** (`authorization_status`); suspensión global de login: NO DETERMINADO |

---

## Historial / edición de perfil

| Etapa | Estado | Archivos |
|-------|--------|----------|
| Historial trabajos/experiencia | Completo | `/experiencia`, `/trabajos` |
| Edición perfil | Completo | `/perfil` |
| Credencial pública | Completo | `/credencial/[id]` |

---

## Qué está funcionando vs incompleto (síntesis)

**Funciona:** registro, onboarding documentos, identidad OCR, propuestas, trabajo pagado, chat, wallet, ratings, mapa/nearby, certificados emitidos.

**Incompleto/simulado:** biometría facial real, IA de títulos, split MP, DTE Haulmer, horarios formales, auto-asignación, liquidaciones staff (otro rol).
