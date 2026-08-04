# 10 — Pagos y movimiento de dinero

**Documento canónico en repo:** `docs/PAGOS.md`  
**Código:** `lib/payments/**`, `app/api/payments/**`, SQL `SPRINT_5*.sql`, `SPRINT_15`–`17`, `FIX_MONEY_*`, `FIX_WALLET_*`.

---

## Proveedor utilizado

| Proveedor | Estado |
|-----------|--------|
| **Mercado Pago** (Checkout Pro, HTTP) | Implementado — default producción |
| **mock** | Implementado — solo no-producción |
| webpay (Transbank) | Stub “aún no está integrado” |
| stripe | Stub |
| bank_transfer | Stub |
| Haulmer | **No es proveedor de checkout**; es POS/DTE para boleta SII |

Archivo registry: `lib/payments/providers/index.ts`, adapter `mercadopago.ts`.

---

## Estado de la integración MP

- Creación de preferencia / redirect checkout.
- Webhook firmado (`MERCADOPAGO_WEBHOOK_SECRET` obligatorio en prod).
- Sync manual `/api/payments/mercadopago/sync`.
- Refunds vía API MP.
- Reconciliación en automation (`lib/automation/reconcilePayments.ts`).

Claves: variables de entorno (nombres). **No se documentan valores.**  
Producción vs prueba: token `TEST-…` vs `APP_USR-…` (comentado en `.env.example`).

---

## Flujo completo del pago

```
Propuesta aceptada
  → work_order + payment (esperando_pago)
  → Cliente POST /api/payments/orders/[id]/pay
  → Redirect Mercado Pago
  → Webhook / sync → register_payment_received (service_role)
  → pago_retenido + wallet.held_balance += amount_net
  → Pro start-work → trabajo_en_ejecucion
  → Pro complete-work → trabajo_finalizado / esperando_aprobacion_cliente
  → Cliente approve → pago_liberado
  → held → available + comisión en ledger
```

---

## Quién recibe el dinero / retención

| Pregunta | Respuesta según código |
|----------|------------------------|
| ¿Quién recibe el cobro del cliente? | Cuenta Mercado Pago del comercio ZOVIT (un collector) |
| ¿ZOVIT retiene fondos? | Sí, lógicamente en `held_balance` hasta aprobación |
| ¿MP retiene (escrow nativo)? | No como Marketplace split; Fase B pendiente |
| ¿División de pagos automática MP? | No (Fase A) |
| ¿Liberación posterior? | Sí, al aprobar el cliente |
| ¿Reembolso? | Sí (`refundPayment.ts`, RPC `refund_held_payment`) |
| ¿Disputa? | Sí (`payment_disputes`, resolve release/refund) |
| ¿Comisión automática? | Sí, al liberar (breakdown 10%+IVA) |

---

## Webhooks

- Ruta: `app/api/payments/webhook/[provider]/route.ts`
- Validación firma MP: sí (falla en prod si falta secret)
- Rate limiting: sí (mencionado en implementación)
- Idempotencia: unique provider refs (`SPRINT_5_PAGOS_SECURITY.sql`) + lógica confirm
- Mock webhook: 404 en producción

---

## Pagos de prueba

- Provider mock + scripts `scripts/simulate-mock-payment.mjs`, `scripts/mock-pay-now.mjs`
- Botón mock en UI pagos si `NODE_ENV !== production` (`app/pagos/page.tsx`)

---

## Tablas relacionadas

`service_proposals`, `work_orders`, `payments`, `payment_events`, `wallets`, `wallet_transactions`, `payment_disputes`, `payout_requests`, `cancellation_fees`, `commission_risk_flags`.

---

## Estados de pago

`pendiente` · `esperando_pago` · `pago_recibido` · `pago_retenido` · `trabajo_en_ejecucion` · `trabajo_finalizado` · `esperando_aprobacion_cliente` · `pago_liberado` · `reembolsado` · `cancelado` · `en_disputa`

Fuente: `lib/payments/types.ts`.

---

## Funciones backend / RPC clave

| RPC / lib | Rol |
|-----------|-----|
| `calculate_payment_breakdown` | Comisión |
| `create_service_proposal` / `accept_service_proposal` | Cotización |
| `register_payment_received` | Confirmar pago (service_role) |
| `start_paid_work` / `complete_paid_work` | Ciclo trabajo |
| `approve_and_release_payment` | Liberar |
| `refund_held_payment` / `open_payment_dispute` | Reverso/disputa |
| `request_payout` / `process_payout` | Retiros |
| `confirmPayment.ts` | Orquestación webhook |

---

## Fees cancelación

Tras ciertas cancelaciones se genera `cancellation_fees` (ZVT-CFEE-*); debe pagarse o ser waived por superadmin. Bloquea nuevas solicitudes si impaga.

---

## Riesgos / inconsistencias técnicas

1. Escrow contable ≠ fondos segregados legalmente en MP Marketplace.
2. Emisión boleta Haulmer no cableada — comprobante UI puede adelantarse al DTE real.
3. Dependencia de `SUPABASE_SERVICE_ROLE_KEY` en servidor para confirmar pagos.
4. Si webhook falla y no hay sync, pagos pueden quedar colgados (hay cron reconcile — verificar `CRON_SECRET` en Vercel).
5. Stubs webpay/stripe pueden confundir si se setea `ZOVIT_PAYMENT_PROVIDER` incorrecto.
6. Valores exactos de tasas MP son referenciales y pueden desactualizarse (`mercadopagoFees.ts` / docs).

**Secretos:** no se listan valores; solo nombres `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`.
