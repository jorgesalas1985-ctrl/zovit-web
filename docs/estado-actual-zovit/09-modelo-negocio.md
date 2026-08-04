# 09 — Modelo de negocio real (según el código)

## Quién contrata a quién

- El **cliente** publica una necesidad y **acepta una propuesta** de un **profesional**.
- ZOVIT intermedia el pago (cobra al cliente vía Mercado Pago y lleva un ledger).
- Evidencia: flujo en `docs/PAGOS.md`, tablas `service_proposals` → `work_orders` → `payments`.

No hay contratación “empresa → trabajador staff” en el marketplace (eso es intranet RR.HH., otro dominio).

---

## Quién fija el precio

| Actor | ¿Fija precio? | Evidencia |
|-------|---------------|-----------|
| Profesional | **Sí** — propone `amount` en CLP | `service_proposals`, `ProposalSection` |
| Cliente | No fija tarifa de plataforma; puede aceptar/rechazar | accept proposal API |
| ZOVIT | No fija precio del servicio; fija **comisión** | `calculateBreakdown` |

Precios “referenciales” en categorías son copy, no tarifas obligatorias (`referencePrice` en `lib/data/categories.ts`).

---

## Cotización

**Sí existe:** propuestas (`create_service_proposal` / API `/api/payments/proposals`).  
También trabajo adicional: `proposal_kind` / `client_create_additional_payment` (`SPRINT_13`).

---

## Comisión

Código (`lib/payments/types.ts`):

```ts
platformFee = round(amount * 0.1)      // 10%
taxAmount   = round(platformFee * 0.19) // IVA sobre la comisión
amountNet   = amount - platformFee - taxAmount
```

- **Quién “paga” la comisión:** se descuenta del monto bruto del servicio antes de liberar al profesional (el neto es lo que llega a su wallet).
- Además, **Mercado Pago** cobra tarifas al comercio; cuotas pueden aumentar lo cobrado al cliente (`client_charged_amount`, `provider_financing_fee`) sin cambiar el neto del profesional (`SPRINT_17`, `mercadopagoFees.ts`).

---

## Suscripción / planes / membresías / publicidad / destacado / pago por contacto

| Mecanismo | ¿Existe en código? |
|-----------|-------------------|
| Suscripción mensual | **No** encontrado |
| Planes free/paid SaaS | **No** |
| Membresías | **No** |
| Publicidad | **No** ad network |
| Servicios destacados (pago) | Campo `featured` en nodos de categoría (UI), no pay-to-feature de pros |
| Pago por contacto | **No** — el contacto es chat dentro de solicitud; hay filtro anti-evasión de comisión |

---

## Saldo / billetera / retiro

| Mecanismo | Estado |
|-----------|--------|
| Wallet interna `wallets` | Implementado (`held_balance`, `available_balance`) |
| Retiro `payout_requests` | Implementado a nivel app/SQL |
| Transferencia bancaria automática | Parcial / NO DETERMINADO fuera del proceso de payout |

---

## ¿El pago está implementado realmente?

**Sí, en código de producción el default es Mercado Pago** (`getDefaultPaymentProvider`: prod → `mercadopago`, dev → `mock`).

- Mock **deshabilitado en production** (`isMockPaymentsAllowed`).
- Escrow Fase A: un collector + ledger ZOVIT.
- Fase B Marketplace split: documentada como pendiente (`docs/PAGOS.md`).

Simulación: `scripts/simulate-mock-payment.mjs`, `MockPaymentProvider`.

---

## Emisor / boleta

- Emisor: Impresiones Getsemaní (`lib/billing/company.ts`).
- Comisión/servicio ZOVIT = ítem de venta del emisor.
- Financiamiento cuotas tarjeta = **no** es ítem ZOVIT (`HAULMER_INTEGRATION_NOTES`).
- Emisión SII Haulmer: **pendiente de cablear**.

---

## Ejemplo numérico (código)

Servicio $100.000 CLP:

- Comisión ZOVIT: $10.000  
- IVA comisión: $1.900  
- Neto profesional: $88.100  

(Más fees MP según medio/cuotas, aparte.)

---

## Archivos evidencia

- `lib/payments/types.ts`
- `docs/PAGOS.md`
- `supabase/SPRINT_5_PAGOS.sql`
- `lib/billing/company.ts`
- `lib/messaging/commissionRisk.ts` (supervisión evasión)
- `lib/certificates/pricing.ts` (`ZOVIT_CERTIFICATE_PRICE_CLP` — precio certificado experiencia, producto aparte)
