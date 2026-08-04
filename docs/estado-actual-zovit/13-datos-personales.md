# 13 — Datos personales y documentos

Inventario basado en formularios, tablas y buckets. Políticas legales completas: ver páginas `/legal/*` (texto); cumplimiento operativo exacto **NO DETERMINADO** solo por código.

---

## Catálogo de datos

| Dato | Quién lo entrega | Para qué | Dónde se almacena | Quién puede verlo | ¿Público? | ¿Eliminable? | Conservación | Consentimiento | Evidencia |
|------|------------------|----------|-------------------|-------------------|-----------|--------------|--------------|----------------|-----------|
| Nombre / apellido | Usuario | Identidad, credencial | `profiles` | Dueño, contraparte en jobs, admin | Parcial en credencial | Update perfil; delete solo superadmin | NO DETERMINADO | Términos/registro | `app/registro`, `app/perfil` |
| RUT | Usuario | Identidad, OCR match | `profiles.rut`, OCR meta | Dueño, admin verificación; enmascarado en públicos | Enmascarado | Idem | NO DETERMINADO | Registro | `FIX_SECURITY_HARDENING`, credential RPCs |
| Fecha nacimiento | Usuario + carnet | Mayoría de edad | `profiles.birth_date`, cols carnet | Dueño/admin | No | Idem | NO DETERMINADO | Registro 18+ | `SPRINT_19`, `SPRINT_20` |
| Correo | Usuario | Auth | `auth.users` | Dueño, admin Auth | No | Superadmin deleteUser | Política Supabase | Signup | Auth |
| Teléfono | Usuario | Contacto | `profiles.phone` | Dueño; chat filtra compartirlo | No idealmente | Update | NO DETERMINADO | Registro | perfil |
| Dirección / comuna | Usuario / solicitud | Servicio, matching | `profiles`, `solicitudes.address` | Participantes; mask a otros | No completa | Update | NO DETERMINADO | Flujo servicio | `mask_service_address` |
| Ubicación GPS | Usuario (permiso browser) | Mapa, live | profiles geo, `service_live_locations` | Partes del servicio | No | Delete policies live | Mientras servicio / NO DETERMINADO historial largo | Permiso browser | `lib/geo/*`, map APIs |
| Foto avatar | Usuario | Credencial | `profile-avatars` | Público | **Sí** | Sobrescribir/borrar storage | NO DETERMINADO | Upload | SPRINT_10 |
| Cédula (imagen) | Usuario | Verificación | `identity-documents` | Dueño + admin | **No** | Policies delete | NO DETERMINADO | Flujo biometría | SPRINT_7 |
| Selfie / liveness | Usuario | Verificación | identity-documents | Dueño + admin | **No** | Idem | NO DETERMINADO | Biometría | verification forms |
| Certificados oficio | Profesional | Autorización | `worker-credentials` | Dueño + intranet | **No** | Idem | NO DETERMINADO | Onboarding | SPRINT_11/12 |
| Títulos | Profesional | Idem | worker_credentials | Idem | No | Idem | NO DETERMINADO | Onboarding | wizard |
| Antecedentes | — | — | **No hay campo dedicado** | — | — | — | — | — | No existe flujo |
| Datos bancarios | Profesional | Payout | `payout_requests` | Dueño + super_admin | **No** | NO DETERMINADO | NO DETERMINADO | Solicitud retiro | SPRINT_5B |
| Historial laboral ZOVIT | Sistema | Experiencia | `professional_experience` | Público agregado / own | Parcial | NO DETERMINADO | Indefinido aparente | Términos | SPRINT_3 |
| Mensajes chat | Usuario | Coordinación | `request_messages` | Participantes | No | NO DETERMINADO delete UI | NO DETERMINADO | Uso plataforma | Fase 1 |
| Calificaciones | Cliente | Reputación | `service_ratings` | Público | Sí (contenido) | NO DETERMINADO | Indefinido | Post-servicio | SPRINT_3 |
| Fotos domicilio/trabajo | Participantes | Evidencia | `request-photos` | Participantes | No | NO DETERMINADO | NO DETERMINADO | Upload | Fase 1 |
| Info pagos | Sistema/MP | Cobro | `payments` (sin PAN) | Partes + super | No | NO DETERMINADO | Contable | Checkout | SPRINT_5 |
| Dispositivo / IP | NO DETERMINADO app | — | Posible en Supabase Auth logs / Vercel | Ops | No | — | — | — | No modelado en tablas app |
| Cookies | Browser | Sesión/tema | cookies | — | — | — | — | `/legal/cookies` | layout theme script |

---

## Documentos solicitados por rol

| Rol | Documentos |
|-----|------------|
| Cliente | Carnet + selfie (biometría gate) |
| Profesional | Idem + credenciales según especialidad regulada |
| Staff intranet | Ficha (`intranet_employee_files`) — UI incompleta |

---

## Eliminación y derechos

- Auto-borrado cuenta: **no implementado** para el usuario.
- Borrado admin: `lib/intranet/platformUsers.ts` + `FIX_PLATFORM_USER_DELETE.sql`.
- Tiempo de conservación explícito en código: **NO DETERMINADO** (solo textos legales).

---

## Consentimiento

- Checkbox/aceptación de términos en registro: revisar UI `app/registro/page.tsx` (campos obligatorios; aceptación legal también en páginas `/legal/terminos`).
- Geolocalización: permiso del navegador (`lib/geo/locationPermission.ts`).
