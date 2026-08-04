# 25 — Diagrama general del sistema

Diagramas alineados al código auditado (Next.js + Supabase + Mercado Pago + MapLibre).

---

## Arquitectura general

```mermaid
flowchart TB
  subgraph clients [Clientes]
    Browser[Navegador Web]
  end

  subgraph next [Next.js en Vercel]
    Pages[App Router pages]
    API[Route Handlers /api]
    MW[middleware.ts]
  end

  subgraph supabase [Supabase]
    Auth[Auth]
    DB[(Postgres + RLS)]
    Storage[Storage buckets]
    RT[Realtime]
  end

  subgraph external [Externos]
    MP[Mercado Pago]
    OSM[OSM + Nominatim]
    Resend[Resend opcional]
    Haulmer[Haulmer DTE pendiente]
  end

  Browser --> MW --> Pages
  Browser --> API
  MW --> Auth
  Pages --> Auth
  Pages --> DB
  Pages --> Storage
  Pages --> RT
  API --> DB
  API --> Storage
  API --> MP
  API --> OSM
  API --> Resend
  API -.-> Haulmer
  MP -->|webhook| API
```

---

## Flujo cliente

```mermaid
flowchart LR
  A[Visita /] --> B[Registro/Login]
  B --> C[Biometría / identidad]
  C --> D[Panel]
  D --> E[Nueva solicitud / Mapa / IA]
  E --> F[Recibe propuestas]
  F --> G[Acepta]
  G --> H[Paga MP]
  H --> I[Seguimiento / chat]
  I --> J[Aprueba]
  J --> K[Califica]
```

---

## Flujo profesional

```mermaid
flowchart LR
  A[Registro Profesional] --> B[Biometría]
  B --> C[Onboarding worker / docs]
  C --> D[Trabajos / notificaciones]
  D --> E[Envía propuesta]
  E --> F[Cliente paga]
  F --> G[Start / live GPS]
  G --> H[Complete]
  H --> I[Espera aprobación]
  I --> J[Wallet available]
  J --> K[Payout]
```

---

## Flujo de contratación

```mermaid
sequenceDiagram
  participant C as Cliente
  participant App as ZOVIT API/DB
  participant P as Profesional
  C->>App: Publica solicitud
  App-->>P: Notificación opcional auto-match
  P->>App: Crea service_proposal
  C->>App: accept proposal
  App->>App: work_order + payment esperando_pago
```

---

## Flujo de pago

```mermaid
stateDiagram-v2
  [*] --> esperando_pago
  esperando_pago --> pago_retenido: webhook MP / confirm
  pago_retenido --> trabajo_en_ejecucion: start_work
  trabajo_en_ejecucion --> esperando_aprobacion_cliente: complete_work
  esperando_aprobacion_cliente --> pago_liberado: approve
  pago_retenido --> reembolsado: refund
  pago_retenido --> en_disputa: dispute
  en_disputa --> reembolsado: resolve refund
  en_disputa --> pago_liberado: resolve release
```

---

## Flujo de verificación

```mermaid
flowchart TD
  U[Usuario sube carnet + selfie] --> OCR[OCR Tesseract local]
  OCR -->|match RUT + fecha| OK[identity approved]
  OCR -->|dudoso| Q[Cola admin/intranet]
  Q -->|approve| OK
  Q -->|reject| KO[Rechazado]
  OK --> Gate[Middleware permite panel/pagos]
```

---

## Flujo de reclamo / disputa

```mermaid
flowchart TD
  A[Pago retenido / post-pago] --> B[Cliente o sistema abre disputa]
  B --> C[payment_disputes abierta]
  C --> D[Superadmin review]
  D --> E[resuelta_reembolso]
  D --> F[resuelta_liberacion]
```

---

## Relaciones principales de base de datos

```mermaid
erDiagram
  profiles ||--o{ solicitudes_de_servicio : client_or_pro
  solicitudes_de_servicio ||--o{ request_messages : has
  solicitudes_de_servicio ||--o{ request_photos : has
  solicitudes_de_servicio ||--o{ service_proposals : receives
  service_proposals ||--o| work_orders : becomes
  work_orders ||--o| payments : has
  payments ||--o{ payment_events : logs
  profiles ||--o| wallets : owns
  wallets ||--o{ wallet_transactions : ledger
  payments ||--o{ payment_disputes : may_have
  profiles ||--o{ identity_documents : uploads
  profiles ||--o{ worker_registrations : onboards
  profiles ||--o{ service_ratings : receives
```

---

## Integraciones externas

```mermaid
flowchart LR
  ZOVIT[ZOVIT Next] --> SB[Supabase]
  ZOVIT --> MP[Mercado Pago]
  ZOVIT --> OSM[Nominatim/OSM]
  ZOVIT --> Tess[Tesseract local]
  ZOVIT -.-> Resend
  ZOVIT -.-> Haulmer
```
