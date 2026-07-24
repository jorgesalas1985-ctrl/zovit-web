# ZOVIT — Módulo de Pagos (Sprint 5)

Arquitectura escalable, segura y preparada para Chile. Ejecutar **después** de `SPRINT_4_IA.sql`.

## Tablas

| Tabla | Propósito |
|-------|-----------|
| `service_proposals` | Propuestas del profesional sobre una solicitud |
| `work_orders` | Orden de trabajo generada al aceptar propuesta |
| `payments` | Registro central de pagos (sin datos de tarjeta) |
| `payment_events` | Auditoría e historial de cada transición |
| `wallets` | Billetera interna por usuario |
| `wallet_transactions` | Libro mayor auditado |
| `payment_disputes` | Disputas y resoluciones |

## Flujo del dinero

```
Cliente publica solicitud (publicada)
        ↓
Profesional envía propuesta (service_proposals)
        ↓
Cliente acepta propuesta → work_orders + payments (esperando_pago)
        ↓
Cliente paga vía proveedor → pago_recibido → pago_retenido (escrow ZOVIT)
        ↓
Profesional ejecuta → trabajo_en_ejecucion → trabajo_finalizado
        ↓
Cliente aprueba → esperando_aprobacion_cliente → pago_liberado
        ↓
Wallet profesional: +amount_net | Comisión ZOVIT registrada
        ↓
Calificación + experiencia verificable (requiere pago_liberado)
```

## Estados de pago

`pendiente` · `esperando_pago` · `pago_recibido` · `pago_retenido` · `trabajo_en_ejecucion` · `trabajo_finalizado` · `esperando_aprobacion_cliente` · `pago_liberado` · `reembolsado` · `cancelado` · `en_disputa`

## Proveedores preparados (stubs)

- `mock` — desarrollo y pruebas
- `webpay` — Transbank Webpay Plus
- `mercadopago` — Mercado Pago Chile
- `stripe` — Stripe (internacional)
- `bank_transfer` — Transferencia bancaria manual

## Componentes frontend

- `components/payments/PaymentStatusBadge.tsx`
- `components/payments/PaymentHistoryList.tsx`
- `components/payments/WalletSummary.tsx`
- `components/payments/ProposalSection.tsx`
- `components/payments/AdminPaymentsDashboard.tsx`

## Rutas

| Ruta | Rol |
|------|-----|
| `/pagos` | Cliente / Admin |
| `/pagos/profesional` | Profesional |
| `/admin/pagos` | Admin |

## API

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/payments/proposals` | POST | Crear propuesta |
| `/api/payments/proposals/[id]/accept` | POST | Aceptar propuesta |
| `/api/payments/orders/[id]/pay` | POST | Iniciar pago |
| `/api/payments/orders/[id]/approve` | POST | Cliente aprueba trabajo |
| `/api/payments/orders/[id]/complete-work` | POST | Profesional marca finalizado |
| `/api/payments/dashboard/client` | GET | Panel cliente |
| `/api/payments/dashboard/professional` | GET | Panel profesional |
| `/api/payments/dashboard/admin` | GET | Panel admin |
| `/api/payments/webhook/[provider]` | POST | Webhook proveedor |

## Próximos pasos

1. Integrar SDK Webpay Plus (Transbank) en `lib/payments/providers/webpay.ts`
2. ~~Integrar Mercado Pago Checkout Pro~~ (base implementada)
3. Configurar webhooks en producción con dominio público
4. Facturación electrónica (SII) sobre comisiones
5. Retiros bancarios automáticos para profesionales

---

## Mercado Pago — back_urls (Checkout Pro)

### Variables `.env.local`

```env
NEXT_PUBLIC_APP_URL=https://tu-dominio-publico.cl
MERCADOPAGO_ACCESS_TOKEN=TEST-xxxxxxxx
MERCADOPAGO_WEBHOOK_SECRET=...
SUPABASE_SERVICE_ROLE_KEY=...
ZOVIT_PAYMENT_PROVIDER=mercadopago
```

Antes de producción, ejecuta `supabase/SPRINT_5_PAGOS_SECURITY.sql` en Supabase (validación de montos, firma webhook, RPC solo vía `service_role`).

Mercado Pago **no acepta localhost** en `back_urls`. Usa ngrok, staging o producción.

### URLs que ZOVIT genera automáticamente

| MP `back_urls` | Ruta ZOVIT |
|----------------|------------|
| `success` | `/pagos/retorno/success?payment=ZVT-...` |
| `failure` | `/pagos/retorno/failure?payment=ZVT-...` |
| `pending` | `/pagos/retorno/pending?payment=ZVT-...` |

Además:
- `external_reference` = `payments.public_id`
- `auto_return` = `approved`
- `notification_url` = `/api/payments/webhook/mercadopago`

### Flujo

1. Cliente → **Pagar con Mercado Pago** en `/pagos`
2. Backend crea preferencia → redirige a `init_point`
3. Cliente paga en MP
4. MP redirige a `back_url` con `payment_id`, `status`, `external_reference`
5. `/pagos/retorno/[status]` sincroniza vía `/api/payments/mercadopago/sync`
6. Webhook confirma pagos pending/offline

### Probar con ngrok

```bash
ngrok http 3000
```

```env
NEXT_PUBLIC_APP_URL=https://xxxx.ngrok-free.app
MERCADOPAGO_ACCESS_TOKEN=TEST-...
```

Reinicia `npm run dev` y prueba desde `/pagos`.
