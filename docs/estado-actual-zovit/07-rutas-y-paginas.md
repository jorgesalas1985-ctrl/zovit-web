# 07 — Lista completa de páginas y rutas

**Conteo:** 55 `page.tsx` + 59 `route.ts` (incluye `/auth/callback`).  
**Protección:** `middleware.ts` + `lib/auth/roles.ts` + `lib/auth/intranetRoles.ts`.

Estados: **OK** · **Parcial** · **Solo UI** · **API**

---

## Páginas (UI)

| Ruta | Nombre | Acceso | Roles | Función | Datos | Estado | Archivo principal | Redirecciones / problemas |
|------|--------|--------|-------|---------|-------|--------|-------------------|---------------------------|
| `/` | Inicio | Público | — | Landing | Estáticos | OK | `app/page.tsx` | — |
| `/login` | Login | Público | — | Auth | Sesión | OK | `app/login/page.tsx` | → panel / biometría |
| `/registro` | Registro | Público | — | Signup | Auth+profiles | OK | `app/registro/page.tsx` | |
| `/registro/biometria` | Biometría | Privado | autenticado | Identidad | identity_* | Parcial | `app/registro/biometria/page.tsx` | Si ya verificado → `/panel` |
| `/registro/trabajador` | Onboarding pro | Privado | professional mode | Wizard worker | worker_* | OK/Parcial | `app/registro/trabajador/page.tsx` | |
| `/auth/restablecer-clave` | Reset clave | Privado* | auth flow | Password | Auth | OK | `app/auth/restablecer-clave/page.tsx` | *protegida en lista middleware |
| `/panel` | Panel | Privado | client/pro | Hub | solicitudes | OK | `app/panel/page.tsx` | Exige biometría |
| `/perfil` | Perfil | Privado | auth | Editar perfil | profiles | OK | `app/perfil/page.tsx` | |
| `/verificacion` | Verificación | Privado | professional/admin | Docs identidad | identity | OK | `app/verificacion/page.tsx` | |
| `/experiencia` | Experiencia | Privado | professional | CV/exp | experience | OK | `app/experiencia/page.tsx` | |
| `/trabajos` | Trabajos | Privado | professional | Jobs abiertos | solicitudes | OK | `app/trabajos/page.tsx` | |
| `/solicitudes/nueva` | Nueva solicitud | Privado | client mode | Crear | solicitudes | OK | `app/solicitudes/nueva/page.tsx` | Fee cancelación puede bloquear |
| `/solicitudes/[id]` | Detalle solicitud | Privado | participantes | Chat/propuestas | multi | OK | `app/solicitudes/[id]/page.tsx` | |
| `/cliente/mapa` | Mapa cliente | Privado | client mode | Nearby + request | geo | OK/Parcial | `app/cliente/mapa/page.tsx` | Requiere SQL mapa |
| `/pagos` | Pagos cliente | Privado | client mode | Checkout/historial | payments | OK | `app/pagos/page.tsx` | Mock solo no-prod |
| `/pagos/profesional` | Pagos pro | Privado | professional | Wallet/payouts | wallets | OK | `app/pagos/profesional/page.tsx` | |
| `/pagos/comprobante/[id]` | Comprobante | Privado | parte | Recibo | payment | OK | `app/pagos/comprobante/[id]/page.tsx` | |
| `/pagos/retorno/[status]` | Retorno MP | Privado | client | Post-checkout | — | OK | `app/pagos/retorno/[status]/page.tsx` | |
| `/admin/pagos` | Admin pagos | Privado | **super_admin** | Dinero | payments | OK | `app/admin/pagos/page.tsx` | Otros → `/panel?error=sin-permiso` |
| `/admin/verificacion` | Admin verificación | Privado | admin | Cola identidad | identity | OK | `app/admin/verificacion/page.tsx` | |
| `/intranet` | Hub intranet | Público | — | Entrada staff | — | OK | `app/intranet/page.tsx` | |
| `/intranet/acceso` | Login intranet | Público | — | Login staff | — | OK | `app/intranet/acceso/page.tsx` | |
| `/intranet/admin` | Admin RR.HH. | Privado | hr_admin, super | Hub | — | Parcial | `app/intranet/admin/page.tsx` | |
| `/intranet/admin/gestion-usuarios` | Gestión usuarios | Privado | super_admin | CRUD cuentas | profiles | OK | `.../gestion-usuarios/page.tsx` | |
| `/intranet/admin/usuarios` | Usuarios intranet | Privado | hr, super | Staff | intranet | OK | `.../usuarios/page.tsx` | |
| `/intranet/admin/trabajadores` | Trabajadores | Privado | hr, super | Workers | worker_* | OK | `.../trabajadores/page.tsx` | |
| `/intranet/admin/verificacion` | Verif. intranet | Privado | hr, super | Identidad | identity | OK | `.../verificacion/page.tsx` | |
| `/intranet/finanzas` | Finanzas | Privado | super_admin | Hub dinero | links | Solo UI parcial | `app/intranet/finanzas/page.tsx` | “próximamente” |
| `/intranet/liquidaciones` | Liquidaciones | Privado | intranet | Nómina | **demo** | Solo UI | `app/intranet/liquidaciones/page.tsx` | `demoPayrolls` |
| `/intranet/supervisor` | Supervisor | Privado | supervisor | Shell | — | Parcial | `app/intranet/supervisor/page.tsx` | |
| `/intranet/trabajador` | Trabajador | Privado | worker | Shell | — | Solo UI | `app/intranet/trabajador/page.tsx` | |
| `/intranet/equipo` | Equipo | Privado | super/hr/sup | Shell | — | Parcial | `app/intranet/equipo/page.tsx` | |
| `/ayuda` | Ayuda | Público | — | FAQ/help | estático + quick | Parcial | `app/ayuda/page.tsx` | |
| `/categorias` | Categorías | Público | — | Árbol | TS | OK | `app/categorias/page.tsx` | |
| `/categorias/[categoria]` | Categoría | Público | — | Browse | TS | OK | `app/categorias/[categoria]/page.tsx` | |
| `/categorias/.../[sub]` | Subcategoría | Público | — | Browse | TS | OK | | |
| `/categorias/.../[esp]` | Especialidad | Público | — | Browse + pros | RPC | OK | | |
| `/servicios` | Servicios | Público | — | Alias browse | TS | OK | `app/servicios/page.tsx` | Duplica conceptos con categorías |
| `/servicios/[categorySlug]` | Servicio cat | Público | — | Browse | TS | OK | | |
| `/servicios/.../[sub]` | Sub | Público | — | Browse | TS | OK | | |
| `/profesional/[id]` | Perfil público | Público | — | Ver pro | RPC/profile | OK | `app/profesional/[id]/page.tsx` | |
| `/profesionales-verificados` | Landing verif. | Público | — | Marketing | — | OK | `app/profesionales-verificados/page.tsx` | |
| `/credencial` | Credencial propia | Público/auth | — | Redirect/hub | — | OK | `app/credencial/page.tsx` | |
| `/credencial/[id]` | Credencial pública | Público | — | Credencial | RPC | OK | `app/credencial/[id]/page.tsx` | |
| `/certificado-experiencia` | Cert. experiencia | Mixto | — | Hub | — | OK | `app/certificado-experiencia/page.tsx` | |
| `/certificados/validar` | Validar folio | Público | — | Validación | issued_certificates | OK | `app/certificados/validar/page.tsx` | |
| `/certificados/[folio]` | Certificado | Público | — | Documento | issued | OK | `app/certificados/[folio]/page.tsx` | |
| `/ia` | Buscador IA | Público | — | Form consulta | — | OK (reglas) | `app/ia/page.tsx` | No es LLM |
| `/ia/resultados` | Resultados IA | Público | — | Recomendaciones | RPC | OK | `app/ia/resultados/page.tsx` | |
| `/por-que-zovit` | Por qué ZOVIT | Público | — | Marketing | — | OK | `app/por-que-zovit/page.tsx` | |
| `/seguridad` | Seguridad | Público | — | Explica flujo | — | OK | `app/seguridad/page.tsx` | CTA registro |
| `/legal/cookies` | Cookies | Público | — | Legal | — | OK | | |
| `/legal/privacidad` | Privacidad | Público | — | Legal | — | OK | | |
| `/legal/seguridad` | Legal seguridad | Público | — | Legal | — | OK | | |
| `/legal/terminos` | Términos | Público | — | Legal | — | OK | | |

Componentes asociados frecuentes: `Header`, `SiteFooter`, `AuthProvider`, `RoleGuard`, `IntranetShell`, `ProposalSection`, `ClientServiceMap`, forms de verificación.

---

## Rutas API (resumen)

| Prefijo | Cantidad aprox. | Auth |
|---------|-----------------|------|
| `/api/payments/*` | 21 | Usuario / webhook / superadmin |
| `/api/intranet/*` | 12+ | Intranet roles |
| `/api/admin/*` | 4+ | Platform admin / super |
| `/api/map/*` | 5 | Auth cliente/pro |
| `/api/verification*` | varias | Auth |
| `/api/worker/*` | 2 | Professional |
| `/api/ai/recommend` | 1 | Público/auth según route |
| `/api/automation/tick`, `/api/cron/automate` | 2 | `CRON_SECRET` |
| `/api/certificates*` | 2 | Auth / delivery |
| `/api/support/quick` | 1 | FAQ keywords |
| `/api/profile/activate-mode` | 1 | Auth |
| `/api/services/professionals` | 1 | Browse |
| `/api/requests/[id]/*` | 3 | Participantes |
| `/auth/callback` | 1 | OAuth/code Supabase |

Lista completa de paths: ver informe de estructura / árbol `app/api/**/route.ts`.

---

## Rutas ocultas / antiguas / no enlazadas

| Observación | Evidencia |
|-------------|-----------|
| `/admin/pagos` no es para `role=admin` genérico | Middleware |
| `/intranet/*` shells poco enlazados desde marketing | Header enfocado marketplace |
| Duplicidad browse `/categorias` vs `/servicios` | Ambas activas |
| Scripts E2E no son rutas web | `scripts/*.mjs` |

---

## Problemas detectados (rutas)

1. Liquidaciones y partes de finanzas/trabajador: UI sin backend real.
2. Protección biométrica puede sorprender a usuarios nuevos (redirect forzoso).
3. Estado de aplicación de migraciones SQL en prod: **NO DETERMINADO** → algunas rutas (mapa live) fallan si falta SQL.
4. Coexistencia `/admin/verificacion` e `/intranet/admin/verificacion` (duplicación de superficie).
