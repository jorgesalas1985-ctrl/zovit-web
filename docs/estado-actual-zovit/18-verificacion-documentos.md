# 18 — Documentos, certificados y validación

---

## Qué documentos se solicitan

| Documento | Usuario | Obligatoriedad |
|-----------|---------|----------------|
| Carnet (frente/reverso según UI) | Cliente y Profesional | Gate biométrico middleware |
| Selfie / prueba de vida (foto challenge) | Ambos | Gate |
| Certificados/licencias de oficio | Profesional (regulados) | Para autorizar especialidad |
| Certificado de estudios (cols sprint 9) | Profesional (flujo) | Según onboarding |
| Avatar | Opcional | Credencial |

Antecedentes penales como documento tipado: **no encontrado**.

---

## Formatos y tamaño

| Bucket | MIME | Máx |
|--------|------|-----|
| identity-documents | jpeg/png/webp/pdf | 10 MB |
| worker-credentials | + json | 10 MB |
| profile-avatars | imágenes | 5 MB |
| request-photos | imágenes | 5 MB |

---

## Almacenamiento y privacidad

- Identidad y credenciales: **privados**.
- Avatares: **públicos**.
- Acceso admin vía APIs `.../file/[documentId]` (signed/proxy).

---

## Quién revisa / aprueba / rechaza

| Actor | Acción |
|-------|--------|
| OCR local automático | Puede autoaprobar identidad si RUT + fecha coinciden |
| Admin plataforma / hr_admin / super | Revisión humana cola verificación |
| Superadmin | No puede ser rechazado (`SPRINT_24`) |
| Worker docs “IA” | No aprueba; deja dudoso → humano |

Estados: `identity_status`, flags biometric, `authorization_status` (`blocked|pending|authorized|revoked`), AI verdicts (`approved|rejected|dudoso|pending|processing`).

---

## Vencimiento / renovación

- Flujo formal de vencimiento de licencias: **NO DETERMINADO / no evidente** como scheduler de expiración.
- Renovación: re-subir / re-review humano.

---

## Validación SEC / títulos / identidad

| Validación | Realidad |
|------------|----------|
| Identidad (carnet) | OCR Tesseract real + reglas; humano si duda |
| Biometría facial match | **Simulada** (no CV match) |
| SEC / gas / electricidad | **No** consulta API SEC; solo marca especialidad regulada y bloquea hasta autorización humana de credencial subida |
| Títulos universitarios | Carga archivo + revisión humana |

---

## Certificados emitidos por ZOVIT

- Tabla `issued_certificates`, folio, QR, páginas `/certificados/*`.
- Precio opcional `ZOVIT_CERTIFICATE_PRICE_CLP`.
- Entrega: link + Resend opcional + share WA/SMS.

Esto es **certificado ZOVIT de experiencia/identidad**, no título SEC estatal.

---

## Automatización

- Cron diario `/api/cron/automate` (Vercel cron 13:00 UTC).
- Ciclo: auto-match, reconcile payments, etc. (`lib/automation/*`).
- OCR identidad en batch admin (`ai-validate` routes).

---

## Conclusión

Hay **carga real + OCR de carnet real + aprobación humana**.  
No hay **verificación gubernamental automatizada** ni **biometría facial verdadera**.  
Gran parte de “IA de documentos de oficio” es **cola humana con nombre de IA**.
