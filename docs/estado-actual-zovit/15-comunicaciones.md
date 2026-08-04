# 15 — Chat, mensajes y notificaciones

---

## Matriz de canales

| Canal | Proveedor | Estado real | Evidencia |
|-------|-----------|-------------|-----------|
| Chat in-app | Supabase Realtime + tabla `request_messages` | **Implementado** | `FASE_1_COMPLETA.sql`, `app/solicitudes/[id]/page.tsx` |
| Notificaciones in-app | Tabla `notifications` + Realtime | **Implementado** | Fase 1, campana UI |
| Correo transaccional Auth | Supabase Auth emails | **Implementado** (config proyecto) | `AUTH_EMAIL_TEMPLATES.md` |
| Correo certificados | **Resend** si hay `RESEND_API_KEY` | **Parcial** | `lib/certificates/delivery.ts` |
| SMS | Deep link `sms:` en share certificados | **No gateway** | delivery.ts |
| WhatsApp | Deep link `wa.me` | **No Business API** | delivery.ts |
| Push móviles (FCM/APNs) | — | **No** encontrado | Footer “próximamente” apps |
| IA help | Keywords FAQ | **Parcial** (no LLM) | `lib/support/quickHelp.ts`, `/api/support/quick` |

---

## Chat — detalle

| Aspecto | Detalle |
|---------|---------|
| Alcance | Por solicitud, participantes (cliente + profesional asignado/flujo) |
| Adjuntos en chat | Fotos van por `request_photos` (no necesariamente multipart chat genérico) |
| Historial | Filas en `request_messages` |
| Eliminación mensajes | NO DETERMINADO UI de borrado |
| Moderación | Filtro contacto (`contactFilter.ts`) + sanitize SQL; flags comisión (`commission_risk_flags`) |
| Bloqueo usuario chat | NO DETERMINADO global; filtro bloquea envío si detecta teléfono/RRSS |
| Reporte | Vía disputa/pago / flags superadmin — no “report message” dedicado hallado |
| Copy seguridad | `ChatSafetyDialogue.tsx` (visual/educativo) |

---

## Notificaciones in-app

- Creación: trigger `notify_request_activity` + inserts desde auto-match.
- Lectura: `read_at` update own.
- No hay panel admin de broadcast masivo genérico.

---

## Plantillas / confirmaciones / alertas

| Tipo | Estado |
|------|--------|
| Email confirmación signup | Supabase templates |
| Alertas cambio estado solicitud | notifications |
| Confirmación pago | UI pagos + webhook |
| Mensajes automáticos marketing | No CRM hallado |

---

## Datos almacenados

Cuerpos de mensaje, títulos de notificación, metadatos de flags de comisión, emails en Auth.  
No almacenar PAN de tarjetas (pagos sin datos de tarjeta en DB).

---

## Estado real resumido

**Fuerte:** chat + notificaciones internas + emails Auth.  
**Débil:** WhatsApp/SMS como producto, push, helpdesk ticketing, email transaccional general (solo Resend opcional para certificados).
