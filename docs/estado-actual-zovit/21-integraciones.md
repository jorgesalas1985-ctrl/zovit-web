# 21 — Variables de entorno e integraciones

**No se muestran valores de secretos.**

---

## Inventario de integraciones

| Integración | Finalidad | Archivos | Variables | Estado | Prod/Prueba | Incompleto | Riesgos | Costos aparentes |
|-------------|-----------|----------|-----------|--------|-------------|------------|---------|------------------|
| **Supabase** | Auth, DB, Storage, Realtime | `lib/supabase/*`, SQL | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Activa | Según proyecto | Migraciones deben aplicarse | Service role | Plan Supabase (NO DETERMINADO) |
| **Mercado Pago** | Checkout, webhooks, refunds | `lib/payments/providers/mercadopago.ts`, APIs payments | `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`, `ZOVIT_PAYMENT_PROVIDER` | Activa en código | TEST vs APP_USR | Split marketplace | Tokens | % MP documentados en docs/PAGOS |
| **Mock payments** | Simulación | `providers/mock.ts`, scripts | — | Dev only | Prueba | — | Si se habilita en prod | $0 |
| **Webpay/Transbank** | Stub | `providers/index.ts` | — | No integrado | — | Total | Confusión config | — |
| **Stripe** | Stub | idem | — | No | — | Total | — | — |
| **Haulmer** | POS/DTE SII (emisor) | `lib/billing/company.ts`, receiptCopy | (futuras API keys NO en .env.example) | Notas solo | — | Emisión no cableada | Fiscal | NO DETERMINADO |
| **MapLibre + OSM** | Mapa | `components/map/*` | ninguna key | Activa | Prod | Tiles públicos | ToS/uso | Infra tiles |
| **Nominatim** | Geocode | `app/api/map/geocode` | — | Activa | Prod | Rate limits | Abuso API | Política OSM |
| **OpenAI** | — | `lib/ai/provider.ts` desactiva | — | **No** | — | — | Naming legacy | $0 |
| **Gemini** | — | desactivado | — | **No** | — | — | — | $0 |
| **Tesseract.js** | OCR carnet | `localCarnetOcr.ts` | — | Activa | Prod | CPU | Fraude OCR | $0 licencia |
| **Resend** | Email certificados | `lib/certificates/delivery.ts` | `RESEND_API_KEY`, `RESEND_FROM`, `CERTIFICATE_EMAIL_FROM` | Opcional | Si key | Sin key no envía | Spoofing from | Plan Resend |
| **WhatsApp/SMS** | Deep links share | delivery.ts | — | Cliente OS | — | No API | — | $0 |
| **Vercel** | Hosting + cron | `vercel.json`, DEPLOY.md | `VERCEL_URL`, `CRON_SECRET` | Documentado | Prod zovit.cl | Cron secret | — | Plan Vercel |
| **Google Search Console** | SEO verify | `app/layout.tsx` | `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | Opcional | — | — | — | $0 |
| **Google Maps / Mapbox** | — | — | — | **No** | — | — | — | — |
| **Analytics** (GA/Pixel) | — | no hallado SDK | — | **No** / NO DETERMINADO | — | — | — | — |
| **Verificación identidad 3rd party** | — | no | — | **No** (OCR local) | — | — | — | — |

---

## Variables en `.env.example`

Documentadas: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`, comentarios para Google verification, `ZOVIT_PAYMENT_PROVIDER`, `MERCADOPAGO_ACCESS_TOKEN`.

Usadas en código pero no listadas ahí: `SUPABASE_SERVICE_ROLE_KEY`, `MERCADOPAGO_WEBHOOK_SECRET`, `CRON_SECRET`, `RESEND_*`, `ZOVIT_CERTIFICATE_PRICE_CLP`, etc.

---

## Dependencias npm relevantes

`next`, `react`, `@supabase/ssr`, `@supabase/supabase-js`, `maplibre-gl`, `tesseract.js`, `qrcode`, `lucide-react`.

Sin SDK oficial Mercado Pago / OpenAI.

---

## Configuración incompleta típica

1. Haulmer API.
2. Webpay.
3. Resend (opcional).
4. CRON_SECRET en Vercel.
5. Aplicar todos los SQL sprints en el proyecto Supabase.
