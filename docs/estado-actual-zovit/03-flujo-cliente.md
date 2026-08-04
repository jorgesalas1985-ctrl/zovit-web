# 03 — Flujo completo del cliente

Leyenda de estado: **Completo** · **Parcial** · **Simulado** · **Solo pantalla** · **No existe** · **NO DETERMINADO**

---

## Registro

| Aspecto | Detalle |
|---------|---------|
| Estado | Completo |
| Datos reales | Sí (Supabase Auth + `profiles`) |
| Archivos | `app/registro/page.tsx`, `lib/registration/validateRegistration.ts`, `lib/registration/finishRegistration.ts`, trigger `handle_new_user` |
| Tablas | `auth.users`, `profiles` |
| Notas | Exige 18+ (`SPRINT_19_AGE_OF_MAJORITY.sql`, `lib/registration/age.ts`). Tipo Cliente. |

---

## Inicio de sesión

| Aspecto | Detalle |
|---------|---------|
| Estado | Completo |
| Archivos | `app/login/page.tsx`, `app/login/LoginForm.tsx` |
| API | `supabase.auth.signInWithPassword` |
| Notas | Debe elegir tipo Cliente; mismatch de rol bloquea (salvo admin/superadmin). |

---

## Recuperación de contraseña

| Aspecto | Detalle |
|---------|---------|
| Estado | Completo (vía Supabase Auth) |
| Archivos | `app/auth/restablecer-clave/page.tsx`, `app/auth/callback/route.ts` |
| Datos | Email real de Supabase |

---

## Creación / edición del perfil

| Aspecto | Detalle |
|---------|---------|
| Estado | Completo |
| Archivos | `app/perfil/page.tsx` |
| Tablas | `profiles` (nombre, RUT, teléfono, dirección, comuna, avatar) |

---

## Verificación

| Aspecto | Detalle |
|---------|---------|
| Estado | Parcial (OCR real; biometría facial simulada) |
| Archivos | `app/registro/biometria/page.tsx`, `components/verification/*`, `app/api/verification/route.ts`, `lib/verification/*` |
| Tablas | `identity_documents`, columnas `identity_*` / `biometric_*` en `profiles` |
| Bucket | `identity-documents` (privado) |

---

## Búsqueda de profesionales

| Aspecto | Detalle |
|---------|---------|
| Estado | Completo (browse + RPC + IA reglas + mapa) |
| Archivos | `app/categorias/*`, `app/servicios/*`, `app/ia/*`, `app/api/ai/recommend/route.ts`, `app/api/services/professionals/route.ts`, `app/cliente/mapa` |
| Tablas/RPC | `search_professionals`, `search_nearby_professionals` |
| Datos | Reales de `profiles` filtrados; vacío si no hay pros |

---

## Selección de categorías

| Aspecto | Detalle |
|---------|---------|
| Estado | Completo |
| Origen | TypeScript `lib/categories.ts`, `lib/data/categories.ts` — **no** tabla de categorías |
| Uso en solicitud | Campo `category` texto en `solicitudes_de_servicio` |

---

## Publicación de solicitud

| Aspecto | Detalle |
|---------|---------|
| Estado | Completo |
| Archivos | `app/solicitudes/nueva/page.tsx`, `app/api/map/requests/route.ts` |
| Tablas | `solicitudes_de_servicio` |
| Restricciones | Modo cliente + biometría; bloqueo si hay fee de cancelación impaga |

---

## Descripción del trabajo

| Aspecto | Detalle |
|---------|---------|
| Estado | Completo |
| Campo | `description` en solicitud |

---

## Presupuesto

| Aspecto | Detalle |
|---------|---------|
| Estado | Parcial |
| Quién fija precio | El **profesional** en la propuesta (`service_proposals.amount`); el cliente no fija tarifa fija de plataforma |
| Cliente | Puede ver precios referenciales en categorías (`referencePrice` copy) |

---

## Fotografías

| Aspecto | Detalle |
|---------|---------|
| Estado | Completo |
| Archivos | Flujo en detalle solicitud; tabla `request_photos` |
| Bucket | `request-photos` (privado, participantes) |
| Tipos | before/after |

---

## Dirección / ubicación / mapa

| Aspecto | Detalle |
|---------|---------|
| Estado | Completo / parcial (live) |
| Solicitud | `address` (+ geo cols en `SPRINT_MAP_CLIENT_NEARBY.sql`) |
| Mapa | `/cliente/mapa` MapLibre + Nominatim |
| Enmascarado | `mask_service_address` (`SPRINT_18_HARDENING.sql`) para no exponer dirección completa prematuramente |

---

## Recepción de ofertas

| Aspecto | Detalle |
|---------|---------|
| Estado | Completo |
| Tabla | `service_proposals` |
| UI | `components/payments/ProposalSection.tsx`, `app/solicitudes/[id]/page.tsx` |

---

## Comparación de profesionales

| Aspecto | Detalle |
|---------|---------|
| Estado | Parcial |
| Cómo | Cliente ve varias propuestas + perfiles públicos + ratings; no hay pantalla “comparador A/B” dedicada |

---

## Selección / contratación

| Aspecto | Detalle |
|---------|---------|
| Estado | Completo |
| API | `app/api/payments/proposals/[id]/accept/route.ts` → RPC `accept_service_proposal` |
| Efecto | Crea `work_orders` + `payments` en `esperando_pago` |

---

## Chat

| Aspecto | Detalle |
|---------|---------|
| Estado | Completo (in-app Realtime) |
| Tabla | `request_messages` |
| Filtro | `lib/messaging/contactFilter.ts` + sanitize SQL (anti-evasión de comisión) |

---

## Pago

| Aspecto | Detalle |
|---------|---------|
| Estado | Completo en prod con MP; mock en dev |
| Archivos | `app/pagos/page.tsx`, `app/api/payments/orders/[id]/pay/route.ts`, webhook |
| Tabla | `payments` |

---

## Seguimiento

| Aspecto | Detalle |
|---------|---------|
| Estado | Parcial |
| Estados | Status de solicitud + payment status badges |
| GPS live | Si profesional publica y migración aplicada (`service_live_locations`) |

---

## Finalización / confirmación

| Aspecto | Detalle |
|---------|---------|
| Estado | Completo |
| API | `complete-work` (pro) + `approve` (cliente) |
| RPC | `complete_paid_work`, `approve_and_release_payment` |

---

## Calificación

| Aspecto | Detalle |
|---------|---------|
| Estado | Completo (tras pago liberado) |
| Archivos | `components/ServiceRatingForm.tsx`, RPC `submit_service_rating` |
| Tabla | `service_ratings` |

---

## Reclamo / disputa

| Aspecto | Detalle |
|---------|---------|
| Estado | Completo (flujo API + tabla) |
| API | `app/api/payments/orders/[id]/dispute/route.ts`, resolve admin |
| Tabla | `payment_disputes` |

---

## Cancelación

| Aspecto | Detalle |
|---------|---------|
| Estado | Completo con reglas |
| API | `app/api/requests/[id]/cancel`, `post-payment-cancel` |
| Fees | `cancellation_fees` (`SPRINT_15`, `SPRINT_16`) |

---

## Reembolso

| Aspecto | Detalle |
|---------|---------|
| Estado | Completo (código) |
| Archivos | `lib/payments/refundPayment.ts`, API refund |
| Condición | Depende de estado y proveedor |

---

## Historial

| Aspecto | Detalle |
|---------|---------|
| Estado | Completo |
| Dónde | `/panel`, `/pagos`, listados de solicitudes |

---

## Eliminación de cuenta

| Aspecto | Detalle |
|---------|---------|
| Estado | **No existe** para el cliente |
| Alternativa | Superadmin elimina vía `PlatformUsersManager` / `deleteUser` |

---

## Pseudoflujo resumido

```
Registro → Login → Biometría OK → Nueva solicitud
→ (opcional) auto-match notifica pros → Propuestas
→ Aceptar → Pagar MP → Trabajo → Aprobar → Calificar
```
