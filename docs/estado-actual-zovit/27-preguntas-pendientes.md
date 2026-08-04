# 27 — Preguntas que el código no responde

Solo preguntas **no resolubles** revisando el repositorio. Si el código ya responde algo, no se incluye.

---

## Negocio y legal

1. ¿La comisión del **10% + IVA** es la definitiva comercial/legal o puede cambiar por contrato/SII?
2. ¿Quién es el responsable legal frente al cliente si el profesional falla (¿ZOVIT intermediario o parte del servicio)?
3. ¿Se permitirá cobro o pago **fuera de la plataforma** y qué sanción real se aplicará (más allá del filtro de chat)?
4. ¿La empresa jurídica operadora frente a usuarios es siempre Impresiones Getsemaní E.I.R.L., o habrá otra razón social “ZOVIT”?
5. ¿Cuál es la **política de reembolso** contractual definitiva (plazos, excepciones, fuerza mayor)?
6. ¿Qué categorías o servicios estarán **prohibidos** por política (más allá de regulados bloqueados hasta credencial)?
7. ¿Habrá Términos específicos para oficios regulados (SEC, salud) firmados aparte?

---

## Pagos y dinero

8. ¿Mercado Pago habilitará **Marketplace / split / escrow nativo** (Fase B) con la cuenta actual?
9. ¿Los fondos en `held_balance` están segregados bancariamente o solo son contabilidad interna?
10. ¿Quién aprueba payouts en la operación diaria y con qué SLA?
11. ¿Las tasas MP referenciadas en `docs/PAGOS.md` siguen vigentes en la cuenta real?

---

## Verificación y compliance

12. ¿Se exigirán **antecedentes penales** u otros documentos no modelados?
13. ¿Qué estándar de “biometría” se venderá al público vs lo implementado?
14. ¿Habrá integración con registros SEC / colegios profesionales?
15. ¿Política de retención y borrado de imágenes de cédula (plazos exactos)?

---

## Producto

16. ¿Existirá rol **empresa / multi-usuario** en el roadmap?
17. ¿El auto-match debe pasar a asignación automática tipo Uber?
18. ¿Habrá apps nativas (el footer dice “próximamente” sin fecha)?
19. ¿Precio y obligatoriedad del certificado de experiencia (`ZOVIT_CERTIFICATE_PRICE_CLP`)?

---

## Operación / infraestructura

20. ¿Todas las migraciones SQL del repo están aplicadas en el Supabase de producción?
21. ¿Cuál es el project ref / entorno canónico de producción vs staging?
22. ¿Están configurados en Vercel: `CRON_SECRET`, `MERCADOPAGO_WEBHOOK_SECRET`, `RESEND_API_KEY`?
23. ¿Quiénes son los usuarios `super_admin` seed actuales?

---

## Explicitamente NO preguntadas (porque el código sí responde)

- ¿Existe rol empresa? → No.
- ¿Cuál es el % de comisión en código? → 10% + IVA 19% sobre la comisión.
- ¿Hay chat? → Sí, in-app.
- ¿Proveedor de mapas? → MapLibre + OSM + Nominatim.
- ¿OpenAI activo? → No.
- ¿Emisor boleta declarado? → Impresiones Getsemaní / Haulmer (emisión API pendiente).
