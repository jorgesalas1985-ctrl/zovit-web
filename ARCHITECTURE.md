# Arquitectura y reglas de desarrollo de ZOVIT

Este documento es el manual oficial de arquitectura de ZOVIT. Define cómo interpretar el árbol actual y cómo evolucionarlo sin perder el comportamiento confirmado de producción.

## 1. Snapshot protegido y reglas de partida

- Rama histórica protegida: `recovery/production-2026-08-24`.
- Commit snapshot de producción: `ddad691a61a751a8ae783576c6f7563393569da8`.
- Esta rama representa el árbol que sirvió el deployment de producción del 24 de agosto de 2026.
- No se desarrolla, experimenta ni refactoriza directamente sobre la rama de recuperación.
- El comportamiento antes y después de una migración estructural debe ser equivalente. Un refactor no autoriza cambios funcionales.

## 2. Stack real actual

ZOVIT es una aplicación Next.js 15 con React 19, TypeScript en modo estricto y App Router. Usa Supabase (`@supabase/ssr` y `@supabase/supabase-js`) para autenticación, Postgres, RPC y Storage; Mercado Pago para pagos; MapLibre/OpenStreetMap para geolocalización; e integraciones IA/OCR con `tesseract.js`, `sharp` y módulos propios.

La aplicación se construye con Vercel y usa los scripts reales:

```text
prebuild  node scripts/generate-ai-platform-changes.mjs
build     next build
lint      eslint .
test      tsx --test lib/worker/**/*.test.ts
```

## 3. Arquitectura actual detectada

### Routing y presentación

`app/` es la capa oficial de routing de Next.js. Contiene páginas, layouts y Route Handlers. Las secciones públicas y de producto incluyen, entre otras:

- identidad y acceso: `login/`, `registro/`, `auth/`, `perfil/`, `verificacion/`;
- oferta y búsqueda: `categorias/`, `servicios/`, `cliente/`, `profesionales-verificados/`, `ia/`;
- operación: `solicitudes/`, `trabajos/`, `pagos/`, `panel/`, `mis-solicitudes/`, `mis-trabajos/`;
- administración: `intranet/`, `admin/`, `gestion-personal/`;
- soporte y contenidos: `ayuda/`, `legal/`, `sitemap/`, `seguridad/`.

`app/api/` contiene Route Handlers para `intranet`, `map`, `payments`, `professional`, `registro`, `requests`, `routing`, `verification` y `worker`. Hoy algunos handlers realizan más que adaptación HTTP; su evolución debe ser gradual y validada.

### Componentes y lógica

- `components/` agrupa UI y componentes por áreas existentes: `ai`, `automation`, `categories`, `certificates`, `credential`, `ecosystem`, `experience`, `home`, `intranet`, `map`, `messaging`, `panel`, `payments`, `profile`, `seo`, `services`, `superadmin`, `support`, `ui`, `verification` y `worker`.
- `lib/` concentra lógica y contratos existentes de dominios como `auth`, `automation`, `categories`, `certificates`, `geo`, `intranet`, `map`, `matching`, `messaging`, `operations`, `payments`, `registration`, `security`, `seo`, `services`, `supabase`, `verification` y `worker`.
- `hooks/` contiene hooks de cliente; actualmente existe `useIdentityVerification.ts`.
- Las pruebas viven junto a los módulos de `lib/` como `*.test.ts`; no existe una carpeta de tests independiente.

### Persistencia e integraciones

- `supabase/` es la única ubicación oficial de SQL, esquema, scripts de seguridad, RLS/RPC y cambios de Storage relacionados con ZOVIT.
- `lib/supabase/` contiene adaptadores cliente, servidor y administración.
- `lib/payments/` y `app/api/payments/` contienen contratos, estados, proveedores, endpoints y webhook de pagos.
- `lib/map/`, `lib/geo/`, `lib/location/`, `components/map/` y `app/api/map/` forman el área actual de geolocalización.
- IA, OCR y automatización están presentes en `lib/ai/`, `lib/verification/`, `lib/worker/`, `lib/automation/`, `lib/operations/`, `components/ai/` y `components/automation/`.

### Configuración

La configuración relevante reside en `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `.eslintrc.json`, `middleware.ts`, `vercel.json`, `package.json` y `scripts/`. Las variables de entorno no forman parte del repositorio y nunca deben incluirse en Git.

## 4. Arquitectura objetivo gradual

ZOVIT evolucionará gradualmente a una arquitectura híbrida orientada por dominios. Esta sección es un destino, no una instrucción de crear ni mover carpetas ahora.

```text
app/                  # rutas, layouts, páginas y Route Handlers de Next.js
features/             # dominios migrados de manera gradual
  categories/
  professionals/
  requests/
  proposals/
  jobs/
  messaging/
  reputation/
  certificates/
  verification/
  notifications/
shared/               # UI, tipos, helpers y constantes realmente transversales
integrations/         # adaptadores externos cuando su frontera sea clara
  maps/
  ai/
lib/                  # infraestructura estable: supabase, auth, security, payments
supabase/             # SQL, migraciones y configuración relacionada
```

No se crea una carpeta `database/`: `supabase/` permanece como fuente oficial para base de datos. Tampoco se crean directorios vacíos por anticipación.

## 5. Reglas para `app/` y Route Handlers

`app/` seguirá siendo la capa oficial de routing. La dirección deseada para páginas y handlers es:

```text
Página o Route Handler -> feature/dominio -> lógica o repositorio -> Supabase o integración externa
```

- Las páginas deben tender a ser delgadas y delegar lógica de negocio.
- Los Route Handlers deben tender a recibir, validar, invocar dominio y devolver respuesta.
- No se mueven rutas existentes como parte de esta regla.
- Cualquier cambio de rutas, middleware, rewrites, SEO o sitemap exige validación explícita de rutas generadas.

## 6. Reglas para `features/` y `shared/`

Un dominio nuevo o migrado puede usar una estructura mínima como:

```text
features/<dominio>/
  components/
  services/
  types/
  utils/
  index.ts
```

No todas las subcarpetas son obligatorias. `index.ts` puede ser una fachada pública cuando reduzca acoplamiento. Se evitan imports profundos entre features; los contratos compartidos deben ser explícitos.

`shared/` solo alojará elementos demostrablemente reutilizables por varios dominios: UI genérica, helpers puros, tipos compartidos o constantes globales. No debe convertirse en un cajón de sastre. Si el código pertenece a un único dominio, permanece en ese dominio.

## 7. Zonas críticas protegidas

Las siguientes áreas son de **alto riesgo** y no se refactorizan como efecto secundario de una migración estructural:

- `middleware.ts`;
- `lib/auth/**`, sesiones, guards, roles, SUPERADMIN e intranet;
- `lib/supabase/**`, Supabase Auth, Postgres, RPC, RLS y Storage;
- `lib/security/**`;
- `lib/payments/**`, `app/api/payments/**` y el webhook Mercado Pago;
- verificación de identidad, documentos, biometría, OCR y permisos;
- variables de entorno, `vercel.json` y configuración de Vercel;
- todos los archivos SQL existentes en `supabase/`.

Un cambio futuro en una de estas zonas requiere tarea independiente, revisión de contratos y pruebas específicas. Nunca se debilitan controles para hacer pasar una prueba.

## 8. Base de datos, pagos y seguridad

### Base de datos

No se ejecutan automáticamente migraciones, SQL, RLS, políticas, RPC ni cambios de Storage durante una reorganización. Una refactorización de carpetas debe mantener intacto el contrato de base de datos.

### Pagos

Mercado Pago es un dominio crítico. No se cambia arquitectura y comportamiento de pagos en la misma fase. Se preservan endpoints, webhook, estados, confirmación, liberación, reembolso, tipos y variables. Cualquier reorganización de pagos será una fase específica posterior.

### Autenticación y seguridad

No se modifica autenticación durante una migración por accidente. Se preservan middleware, cliente/servidor Supabase, sesiones, roles cliente/profesional, guards, permisos, super administración e intranet.

## 9. Reglas de imports

- Preferir aliases ya configurados cuando correspondan.
- Evitar rutas relativas excesivamente profundas.
- Al migrar un módulo, permitir temporalmente re-exportaciones o bridges si reducen roturas.
- No realizar reemplazos globales masivos de imports sin una validación por dominio.
- No mezclar una limpieza de imports con cambios funcionales no autorizados.

## 10. Protocolo de migración estructural

Toda migración se hace **un dominio a la vez**. Nunca se mueven simultáneamente varios dominios.

Secuencia inicial propuesta, sujeta a una auditoría previa de dependencias reales:

1. `categories`;
2. `certificates` o un dominio equivalente de bajo riesgo;
3. mapa/geolocalización;
4. `requests`.

Antes de una fase:

1. Git limpio y rama específica (`refactor/<dominio>`).
2. Baseline conocida y dependencias identificadas.
3. Archivos y zonas críticas fuera de alcance listados explícitamente.

Después de una fase:

1. `npx tsc --noEmit --incremental false`.
2. El script real de lint.
3. Tests disponibles.
4. Build aislado cuando `prebuild` genere archivos.
5. Revisión de `git status`, `git diff` y rutas generadas.

Si aparece una regresión nueva, la fase se detiene. Si se descubre un bug, se documenta; no se corrige dentro del mismo refactor sin autorización explícita.

### Baseline del snapshot confirmado

| Validación | Baseline |
|---|---|
| TypeScript | pasa |
| Lint | pasa con una advertencia conocida |
| Tests configurados | 13/14; un fallo preexistente |
| Build aislado | pasa |
| Rutas generadas | 74 |

## 11. Reglas Git

- `recovery/production-2026-08-24` es un snapshot histórico protegido; no se modifica ni se usa para desarrollo.
- Las ramas de trabajo se crean explícitamente desde la base aprobada: `feature/<nombre>`, `refactor/<dominio>` o `fix/<problema>`.
- Los cambios importantes se dividen en commits pequeños, comprensibles y verificables.
- No se modifica `main` directamente.
- No se hace force push sin autorización explícita.
- No se mezcla recuperación histórica con desarrollo nuevo.
- No se hace push, deploy o pull request automático.

## 12. Reglas obligatorias para agentes de IA / Codex

Todo agente que trabaje sobre ZOVIT debe:

1. Leer este `ARCHITECTURE.md` antes de modificar código.
2. Revisar `git status` e identificar la rama activa.
3. Comprender el dominio y los contratos que modificará.
4. No tocar dominios fuera del alcance solicitado.
5. No modificar zonas críticas sin autorización explícita.
6. No ejecutar SQL, migraciones, RLS, RPC ni cambios Storage automáticamente.
7. No hacer deploy ni push automáticamente salvo instrucción explícita.
8. No cambiar funcionalidad durante un refactor estructural.
9. Ejecutar las validaciones aplicables al terminar.
10. Reportar exactamente los archivos modificados y los resultados de validación.
11. Detenerse si aparece una regresión nueva.
12. No continuar automáticamente con la siguiente fase.

## 13. Límites para eficiencia y contexto

Los dominios deben tender a límites claros para que un agente pueda trabajar leyendo este documento, el feature o área concreta, contratos compartidos necesarios y rutas relacionadas. No se duplica lógica para reducir contexto; la prioridad es mantenibilidad, seguridad y contratos consistentes.

## 14. Primer candidato futuro: `categories`

El primer candidato propuesto para una migración estructural es `categories`. No se migra en esta fase. Antes de tocarlo se debe auditar desde la fuente maestra su relación real con catálogo de servicios, SEO, sitemap, filtros, mapa, selección manual y profesionales.

## 15. Decisión de esta fase

Este documento establece reglas; no mueve archivos, no crea `features/` ni `shared/`, no altera imports, no modifica funcionalidades y no aplica cambios de base de datos.
