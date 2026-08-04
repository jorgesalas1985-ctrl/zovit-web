# 08 — Categorías y servicios

## Origen de los datos

| Fuente | Archivo | Uso |
|--------|---------|-----|
| Lista plana | `lib/categories.ts` → `SERVICE_CATEGORIES` | Formularios / tipos |
| Árbol UI/SEO | `lib/data/categories.ts` → `CATEGORY_TREE` | Páginas `/categorias`, `/servicios` |
| Catálogo IA | `lib/ai/serviceCatalog.ts` → `SERVICE_CATALOG` | Parse keywords / recommend |
| Perfil profesional | `profiles.service_categories text[]` | SQL `SPRINT_4_IA.sql` |
| Solicitud | `solicitudes_de_servicio.category` (texto) | No FK a tabla catálogo |

**No existe tabla `categories` seed en Supabase.** Toda la taxonomía de browse está en TypeScript.

Servicios regulados (requieren certificación): `lib/worker/regulatedServices.ts`.

---

## Categorías raíz

| Nombre | Identificador (slug) | Icono (tree) | Aparece cliente | Aparece profesional | Certificación | Subcategorías |
|--------|----------------------|--------------|-----------------|---------------------|---------------|---------------|
| Automotriz | `automotriz` | `car` | Sí | Sí | Algunas especialidades eléctricas | Sí |
| Auxiliar de Aseo | `auxiliar-de-aseo` | (tree) | Sí | Sí | No por default | Sí (varios tipos aseo) |
| Construcción | `construccion` | (tree) | Sí | Sí | electricidad-obra regulada | Sí |
| Educación | `educacion` | (tree) | Sí | Sí | No | Tutorías/clases |
| Fuerzas Armadas, de Orden y Seguridad | `fuerzas-armadas-orden-seguridad` | por institución | Sí | Sí | No (asesorías) | Instituciones + especialidades |
| Hogar | `hogar` | (tree) | Sí | Sí | electricidad, gasfitería reguladas | Sí |
| Jardinería | `jardineria` | (tree) | Sí | Sí | No | Sí |
| Limpieza | `limpieza` | (tree) | Sí | Sí | No | Sí |
| Profesionales | `profesionales` | (tree) | Sí | Sí | No (asesoría legal) | Sí |
| Salud | `salud` | (tree) | Sí | Sí | NO DETERMINADO regulación sanitaria formal en código | Atención domiciliaria |
| Tecnología | `tecnologia` | (tree) | Sí | Sí | No | Soporte PC, redes |
| Transporte de carga | `transporte-de-carga` | (tree) | Sí | Sí | No en regulatedServices | Fletes |

Descripciones e iconos detallados: nodos en `CATEGORY_TREE` (`lib/data/categories.ts`).

---

## Especialidades destacadas (catálogo IA)

**Automotriz:** electricidad-automotriz, mecánica-general, scanners, aire-acondicionado-auto  
**Hogar:** electricidad-domiciliaria, gasfitería, climatización, cerrajería  
**Construcción:** pintura, albañilería, electricidad-obra  
**Tecnología:** soporte-pc, redes  
**Jardinería:** mantención-jardines  
**Limpieza:** limpieza-profunda  
**Transporte:** fletes  
**Salud:** atención-domiciliaria  
**Educación:** tutorías / clases online / particulares  
**Profesionales:** asesoría-legal  

Lista completa de leaves: `SERVICE_CATALOG` + children de `CATEGORY_TREE`.

---

## Clasificación pedida en el brief

| Tipo | En ZOVIT |
|------|----------|
| Servicios profesionales | Categoría `Profesionales`, Educación, Salud (parcial) |
| Servicios técnicos | Tecnología, Automotriz, Hogar técnico |
| Oficios | Construcción, Jardinería, Limpieza, Auxiliar de Aseo |
| Trabajos simples | Muchas especialidades comunidad (sin credential) |
| Servicios regulados | Electricidad / gas (`regulatedServices.ts`) — `authorization_status=blocked` hasta verificación |
| Servicios deshabilitados | Por autorización worker, no por flag global de categoría |
| Transporte de personas | **No aparece** como categoría |
| Transporte de carga | **Sí** — `transporte-de-carga` / “Transporte de carga” |
| Categorías antiguas/duplicadas | Duplicidad de navegación `/categorias` vs `/servicios`; Auxiliar/Fuerzas menos cubiertos en `SERVICE_CATALOG` (IA más débil) |

---

## Estado

| Aspecto | Estado |
|---------|--------|
| Browse SEO | Implementado |
| Matching a profesionales | Por `service_categories` / specialty en RPC |
| Admin editar catálogo | **No existe** |
| Precio referencial | Copy estático “a confirmar con el profesional” |

---

## Archivos evidencia

- `lib/categories.ts`
- `lib/data/categories.ts`
- `lib/ai/serviceCatalog.ts`
- `lib/categories/hierarchy.ts`
- `lib/worker/regulatedServices.ts`
- `components/categories/*`
- `app/categorias/**`, `app/servicios/**`
