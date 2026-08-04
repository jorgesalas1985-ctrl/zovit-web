# 11 — Base de datos

**Motor:** PostgreSQL vía Supabase.  
**Migraciones:** scripts SQL en `supabase/*.sql` (≈42 archivos + `backups/`).  
**Orden base documentado:** `schema_v4.sql` → `FASE_1_COMPLETA.sql` → sprints/fixes.

**Importante:** Este informe describe el **esquema declarado en el repositorio**. El estado exacto aplicado en el proyecto Supabase de producción es **NO DETERMINADO** sin consultar el dashboard remoto.

---

## Inventario de tablas

### Core marketplace

| Tabla | Finalidad | PK | FKs / relaciones | Datos personales/sensibles | Uso frontend |
|-------|-----------|----|------------------|----------------------------|--------------|
| `profiles` | Perfil usuario | `id` → `auth.users` | base de casi todo | nombre, RUT, teléfono, dirección, rol, identidad, geo, bank refs MP | AuthProvider, perfil, paneles |
| `solicitudes_de_servicio` | Solicitudes | `id` uuid | client_id, professional_id → profiles | dirección, descripción, geo | panel, trabajos, detalle |
| `request_messages` | Chat | `id` | request_id, sender_id | contenido mensajes | detalle solicitud |
| `request_photos` | Fotos before/after | `id` | request_id, uploaded_by | paths storage | detalle |
| `request_status_history` | Historial estados | `id` | request_id | — | auditoría |
| `notifications` | Notificaciones in-app | `id` | user_id, request_id | título/cuerpo | Header bell |

**Columnas base profiles** (`schema_v4.sql`): `first_name`, `last_name`, `rut`, `phone`, `address`, `commune`, `role`, `avatar_url`, timestamps.  
**Ampliaciones posteriores:** dual mode, intranet_role, identity_*, biometric_*, birth_date, service_categories, experience_level, geo, mp_collector_id, identity_ai_*, etc. (sprints 3–24, mapa).

**Solicitud columnas base:** `category`, `description`, `address`, `status`, `professional_id`, + geo/auto_matched_at en sprints.

### Experiencia y ratings

| Tabla | Finalidad | Sensible | RLS (resumen) |
|-------|-----------|----------|---------------|
| `professional_experience` | Horas/trabajos verificados | bajo | select público/own |
| `service_ratings` | Notas 1–5 | comentarios | insert cliente; select público |

### Pagos

| Tabla | Finalidad | Sensible |
|-------|-----------|----------|
| `service_proposals` | Cotizaciones | montos |
| `work_orders` | Órdenes | montos, partes |
| `payments` | Pagos ZVT-* | montos, provider refs (no PAN tarjeta) |
| `payment_events` | Auditoría | metadata |
| `wallets` | Saldos | balances |
| `wallet_transactions` | Libro mayor | montos |
| `payment_disputes` | Disputas | razones |
| `payout_requests` | Retiros | **datos bancarios** |
| `cancellation_fees` | Fees cancelación | montos |
| `commission_risk_flags` | Evasión comisión | montos chat vs oficial |

### Identidad y worker

| Tabla | Finalidad | Sensible |
|-------|-----------|----------|
| `identity_documents` | Docs carnet/selfie | **alto** paths |
| `worker_registrations` | Draft onboarding | alto |
| `worker_credentials` | Certificados oficio | **alto** |
| `worker_service_authorizations` | Permisos especialidad | medio |
| `worker_review_history` | Auditoría revisión | medio |
| `worker_public_badges` | Badges públicos | bajo |

### Intranet

| Tabla | Finalidad | Uso UI |
|-------|-----------|--------|
| `intranet_employee_files` | Ficha personal | parcial |
| `intranet_payrolls` | Nómina | UI demo vs tabla |
| `intranet_benefits` | Beneficios | parcial |
| `intranet_financial_snapshots` | KPIs | poco usado en UI |

### Otros

| Tabla | Finalidad |
|-------|-----------|
| `issued_certificates` | Certificados folio/QR |
| `service_live_locations` | GPS live por servicio |

---

## RLS — quién puede qué (patrón general)

| Patrón | Quién |
|--------|-------|
| Own row | `auth.uid() = id` / `user_id` / `profile_id` |
| Participantes solicitud | `is_request_participant` |
| Admin plataforma | `is_platform_admin()` / `role = admin` |
| Super dinero | `intranet_role = 'super_admin'` |
| Público selectivo | badges, ratings, RPC credential enmascarada |

Policies se reescriben en FIX_* — la fuente de verdad es el **último script aplicado**. Contradicciones entre scripts antiguos y nuevos son posibles si el orden de aplicación falla.

---

## Triggers y funciones relevantes

| Función / trigger | Rol |
|-------------------|-----|
| `handle_new_user` | Crea profile al signup |
| `notify_request_activity` | Notificaciones |
| `accept_service_request` / `change_service_request_status` | Flujo solicitud |
| `search_professionals` / `search_nearby_professionals` | Búsqueda |
| `submit_service_rating` / `register_verified_experience` | Ratings/exp |
| Pagos RPCs | ver doc 10 |
| `protect_profile_privileges` | Anti-escalada |
| `sanitize_request_message_body` | Anti-contacto |
| `mask_service_address` | Privacidad dirección |
| `get_public_credential` / `get_public_issued_certificate` | Público seguro |
| `haversine_km` | Distancia |

---

## Índices

Declarados en sprints (ej. auto-match queue `SPRINT_23`, geo mapa). Listado exhaustivo por índice: revisar cada SQL.

---

## Vistas

No se inventarió un conjunto grande de `CREATE VIEW` de negocio; la mayoría son tablas + RPC. Vistas adicionales: **NO DETERMINADO** sin grep exhaustivo de cada archivo.

---

## Migraciones (lista de archivos principales)

Base: `schema_v4.sql`, `FASE_1_COMPLETA.sql`  
Sprints: `SPRINT_3` … `SPRINT_24`, `SPRINT_MAP_CLIENT_NEARBY.sql`, `SPRINT_5B`, `SPRINT_8B`  
Fixes: `FIX_*.sql` (dual account, money super admin, wallet IDOR, grants, security hardening, etc.)  
Backups: `supabase/backups/` (no ejecutar como fuente primaria)

---

## Tablas abandonadas / duplicadas / inconsistencias

| Hallazgo | Detalle |
|----------|---------|
| Backups duplicados | `backups/schema_v4.sql` etc. |
| Policies recreadas | Múltiples `drop policy` / `create policy` en fixes — riesgo si no se aplican en orden |
| Categorías no normalizadas | Texto libre vs TS tree |
| `role=admin` vs `intranet_role` | Dos ejes; naming confuso |
| UI liquidaciones vs `intranet_payrolls` | Posible desalineación (demo hardcoded) |

---

## Frontend que usa tablas (mapa rápido)

| Tabla | Archivos típicos |
|-------|------------------|
| profiles | `AuthProvider`, perfil, login, registro |
| solicitudes_* | `app/panel`, `app/solicitudes/*`, `app/trabajos` |
| messages/photos/notifications | detalle solicitud, header |
| payments/* | `app/pagos/*`, components/payments |
| identity_* | verification components |
| worker_* | WorkerOnboardingWizard, intranet trabajadores |
| issued_certificates | certificados pages |
| service_live_locations | map components |

---

## Problemas detectados

1. Dependencia fuerte del orden de migración.
2. Datos bancarios en `payout_requests` — sensibilidad alta.
3. Histórico de policies: posible drift prod vs repo.
4. Sin tabla de categorías versionada en DB.
