# 24 — Errores y funciones incompletas

Clasificación:

- **Error confirmado** — comportamiento incorrecto o hueco claro en código.
- **Riesgo probable** — puede fallar según config/migración.
- **Código incompleto** — stub / próximamente.
- **Función simulada** — UI o nombre engañoso.
- **Decisión de negocio pendiente** — no es bug, falta definición.

---

## Lista

| Código | Descripción | Nivel | Área | Tipo | Efecto | Cómo reproducir | Archivo | Función | Posible solución | ¿Bloquea prod? |
|--------|-------------|-------|------|------|--------|-----------------|---------|---------|------------------|----------------|
| E-01 | Biometría sin match facial | Alto | Verificación | Simulada | KYC débil | Onboarding biometría | `lib/verification/biometric.ts` | challenge/foto | Vendor KYC / renombrar | No técnico |
| E-02 | Worker AI siempre dudoso | Medio | Verificación | Simulada | Carga manual | Subir credencial + ai-validate | `aiDocumentValidation` | analyzeWorker* | Modelo real o quitar “IA” | No |
| E-03 | Haulmer DTE no cableado | Alto | Fiscal | Incompleto | Sin boleta SII automática | Completar pago y esperar DTE | `lib/billing/company.ts` | notes | Integrar API Haulmer | Compliance sí |
| E-04 | Marketplace split MP pendiente | Alto | Pagos | Negocio/Incompleto | Fondos en un collector | Ciclo escrow | `docs/PAGOS.md` | Fase B | Activar split | Operativo |
| E-05 | Webpay/Stripe stubs | Bajo | Pagos | Incompleto | Error si se configura | Set `ZOVIT_PAYMENT_PROVIDER=webpay` | `providers/index.ts` | getProvider | Integrar o bloquear enum | Si se setea mal |
| E-06 | Liquidaciones demo | Medio | Intranet | Simulada | Datos falsos a staff | Abrir `/intranet/liquidaciones` | `liquidaciones/page.tsx` | demoPayrolls | Conectar `intranet_payrolls` | No marketplace |
| E-07 | Finanzas “próximamente” | Bajo | Intranet | Incompleto | Sin KPIs | `/intranet/finanzas` | page | — | Dashboard real | No |
| E-08 | Auto-match no asigna | Medio | Matching | Incompleto (diseño) | Expectativa Uber | Crear solicitud mapa | `inviteProfessionals.ts` | invite | Definir producto | No |
| E-09 | Live GPS depende SQL | Medio | Mapa | Riesgo | Tracking falla | Trabajo activo sin migración | SPRINT_MAP | live_loc | Aplicar SQL | Parcial |
| E-10 | README desactualizado | Bajo | Docs | Incompleto | Onboarding confuso | Leer README | `README.md` | — | Actualizar | No |
| E-11 | Sin auto-delete cuenta | Medio | Privacidad | Incompleto | Derechos ARCO difíciles | Buscar “eliminar cuenta” en UI cliente | — | — | Flujo delete + soft delete | Compliance |
| E-12 | Cron sin secret | Alto | Seguridad | Riesgo | Automation abusada | GET cron sin auth si mal config | `cronAuth.ts` | | Forzar secret | Sí si abierto |
| E-13 | OCR fraude | Medio | Fraud | Riesgo | Autoapprove indebido | Fotos adversarias | localCarnetOcr | | Human-in-loop | Parcial |
| E-14 | Drift migraciones Supabase | Alto | DB | Riesgo | Features rotas en prod | Feature nueva sin SQL remoto | `supabase/*` | | Checklist apply | Sí posibles |
| E-15 | Working tree sucio vs origin | Medio | Release | Confirmado en audit | Prod puede ≠ local | `git status` | — | | Commit/push consciente | Deploy |
| E-16 | Apps móviles ausentes | Bajo | Producto | Negocio | Footer promete | Footer | SiteFooter | | Apps o quitar | No |
| E-17 | Antecedentes no pedidos | Bajo | Verificación | Negocio | Gap compliance oficios | Onboarding | — | | Decidir política | Depende |
| E-18 | SEC no validada online | Medio | Regulado | Incompleto | Licencias no verificadas vs registro | Ofrecer electricidad | regulatedServices | | Integración/proceso | Riesgo legal |
| E-19 | Payout bancario automático | Medio | Pagos | NO DETERMINADO/Parcial | Retiros manuales | Request payout | SPRINT_5B | process_payout | Automatizar | Ops |
| E-20 | Contratos de ayuda vs OCR | Bajo | UX | Confirmado copy | Expectativa IA | Leer quickHelp | `quickHelp.ts` | | Ajustar textos | No |

---

## Funciones críticas pendientes (resumen ejecutivo)

1. Emisión tributaria Haulmer.  
2. Definición custody/split de dinero.  
3. KYC biométrico real o relabel.  
4. Garantizar SQL prod = repo.  
5. Hardening cron/secrets.  
6. Privacidad: borrado de cuenta.

---

## Diferencias pedidas

| Tipo | Ejemplos |
|------|----------|
| Error confirmado | E-06 demo payrolls; E-02 AI stub; E-15 dirty tree |
| Riesgo probable | E-09, E-12, E-14 |
| Código incompleto | E-03, E-05, E-07 |
| Función simulada | E-01, E-02, E-06 |
| Decisión negocio | E-04, E-08, E-17, comisión definitiva ya está en código al 10% pero política legal puede cambiar |
