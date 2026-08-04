# 05 — Flujo de empresas

## Conclusión principal

**El rol de usuario “empresa” no existe en ZOVIT.**

Evidencia:

- `lib/auth/roles.ts` define únicamente `UserRole = "client" | "professional" | "admin"`.
- `lib/auth/intranetRoles.ts` define staff: `worker | supervisor | hr_admin | super_admin`.
- No hay páginas `/registro/empresa`, ni tablas `companies` / `organization_members` en el inventario SQL auditado.
- La palabra “empresa” aparece en copy de marketing, textos legales, jardinería (“hogares y empresas”) y en el **emisor tributario** de boletas — no como cuenta B2B.

---

## Qué sí existe relacionado con “empresa”

### Emisor tributario ZOVIT (no es un usuario)

Archivo: `lib/billing/company.ts`

| Campo | Valor |
|-------|-------|
| Nombre comercial | Impresiones Getsemaní |
| Razón social | IMPRESIONES JORGE ANDRES SALAS GUZMAN E.I.R.L. |
| RUT | 77.057.636-9 |
| Régimen | Pro Pyme General (14D) |
| Domicilio | Getsemaní 0301, Puente Alto |
| POS / DTE | Haulmer (`posProvider: "haulmer"`) |

Uso: textos de comprobante (`lib/payments/receiptCopy.ts`), notas de integración (`HAULMER_INTEGRATION_NOTES`). Emisión electrónica cableada a API: **pendiente** (`docs/PAGOS.md`).

---

## Preguntas del brief — respuestas

| Pregunta | Respuesta |
|----------|-----------|
| ¿Existe el rol empresa? | **No** |
| ¿Cómo se registra? | No aplica |
| ¿Qué datos solicita? | No aplica |
| ¿Puede contratar? | No como empresa; un cliente persona natural sí |
| ¿Puede ofrecer servicios? | No como empresa; un profesional persona sí |
| ¿Varios usuarios? | No hay multi-tenant org |
| ¿Administrar trabajadores? | Solo intranet staff ZOVIT (empleados internos), no “empresa cliente” |
| ¿Emitir/recibir facturas? | Emisión SII del servicio ZOVIT: pendiente Haulmer; no hay portal empresa facturadora |
| ¿Panel propio? | No |
| ¿Solo visual? | N/A — no hay UI de rol empresa |
| ¿Comparte funciones con cliente/profesional? | No hay rol que compartir |

---

## Confusiones a evitar

1. **Intranet “Trabajador ZOVIT”** ≠ profesional marketplace ≠ empresa.
2. **Impresiones Getsemaní** es la razón social operadora/emisora, no un tipo de cuenta en la app.
3. Copy que menciona “empleador, cliente o empresa” en credenciales (`app/profesionales-verificados/page.tsx`) es lenguaje de uso del certificado, no un rol implementado.
