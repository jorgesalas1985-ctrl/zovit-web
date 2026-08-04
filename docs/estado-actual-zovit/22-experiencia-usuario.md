# 22 — Diseño y experiencia del usuario

---

## Página de inicio

- Hero con marca ZOVIT y story animada CSS (`HomeHeroStory.tsx`): pared → solicitud → match → pago → aprobación.
- CTAs hacia registro/categorías/seguridad.
- Tipografía: Outfit + DM Sans (`app/layout.tsx`).
- Tema claro/oscuro vía script inline en layout.

---

## Menús y navegación

- `components/Header.tsx` — nav principal autenticado/público.
- Footer `SiteFooter.tsx` — legales, apps “Próximamente”.
- Intranet: `IntranetShell` separado del marketplace.
- Dual mode banner cuando aplica.

---

## Móvil / escritorio

- CSS responsive en `app/globals.css` (home story con breakpoints documentados en historial de trabajo).
- Mapa MapLibre usable en móvil (permisos GPS críticos).
- Formularios `wide` buttons.

---

## Formularios / botones / modales / carga / errores

| Elemento | Observación |
|----------|-------------|
| Registro | Muchos campos obligatorios; RUT/fecha; mensajes claros |
| Login | Selector tipo cuenta — puede confundir dual-mode |
| Biometría | Flujo cámara; errores OCR |
| Pagos | Estados con badges; retorno MP |
| Loading | busy flags en páginas cliente |
| Errores | query `?error=sin-permiso`, `perfil-incompleto` |

---

## Accesibilidad

- Story home `aria-hidden` (decorativo).
- Iconos Lucide.
- Auditoría a11y formal: **NO DETERMINADO** (no se corrió axe en esta revisión).

---

## Funciones que confunden / promesa vs realidad

| Pantalla promete | Realidad |
|------------------|----------|
| “IA” en `/ia` | Keywords, no LLM |
| “Biometría” | Foto + challenge, no match facial |
| “IA valida documentos” worker | Cola humana |
| Liquidaciones | Datos demo |
| Finanzas KPIs | Próximamente |
| Apps en stores | Próximamente |
| Pago protegido | Ledger ZOVIT + MP (no custody marketplace nativo) |
| Auto-match tipo Uber | Solo notifica |

---

## Botones / flujos incompletos

- Cards intranet “próximamente”.
- Emisión boleta real desde comprobante.
- Eliminar mi cuenta (ausente).
- Comparador side-by-side de pros (ausente).

---

## Datos simulados visibles al usuario

- `demoPayrolls` si un staff abre liquidaciones.
- Mock pay button solo fuera de production.

---

## Textos contradictorios

- README “Fase 1” vs sprints 3–24 en código.
- Nombres de funciones OpenAI vs Tesseract.
- Ayuda quickHelp describe “IA” automática de forma optimista.
