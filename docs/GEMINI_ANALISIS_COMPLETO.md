# ZOVIT — ANÁLISIS TÉCNICO Y DE ARQUITECTURA COMPLETO

Este documento recopila de forma exhaustiva todo el conocimiento, arquitectura, flujos de negocio, estructura de base de datos y modelo de seguridad del proyecto **ZOVIT (zovit-web-v5-phase1)** en su versión **5.0.0** (Fase 5 con revisiones V6 aplicadas).

---

## 1. Resumen de la Estructura del Proyecto

El proyecto está diseñado bajo un modelo monorreferencial utilizando **Next.js 15 (App Router)** combinado con un backend servido por **Supabase** y servicios externos. La organización física en disco refleja esta arquitectura híbrida:

*   **`app/`**: Directorio raíz de rutas de Next.js (App Router). Contiene las páginas públicas (`page.tsx`, `categorias/`, `servicios/`), flujos de usuario autenticados (`panel/`, `solicitudes/`, `trabajos/`, `pagos/`, `registro/biometria/`), paneles de administración privada (`admin/`) e intranet de personal (`intranet/`), junto con los controladores de API (`app/api/`).
*   **`components/`**: Módulos UI interactivos reutilizables organizados por contextos de negocio (ej. `payments/`, `verification/`, `intranet/`, `credential/`, `home/`).
*   **`lib/`**: Lógica central de negocio, validaciones y wrappers de servicios compartidos (ej. `supabase/`, `auth/`, `payments/`, `verification/`, `worker/`, `security/`, `geo/`).
*   **`hooks/`**: React hooks personalizados para interactuar de forma reactiva con el backend (ej. `useIdentityVerification.ts`).
*   **`supabase/`**: Migraciones de base de datos PostgreSQL, scripts de definición de esquemas (como `schema_v4.sql` y `FASE_1_COMPLETA.sql`), configuraciones de políticas RLS, triggers de seguridad y backups locales.
*   **`scripts/`**: Utilidades en JavaScript/ESM para tareas del ciclo de desarrollo, simulación de flujos de pago, configuración de autenticación, verificación de perfiles y pruebas E2E.
*   **`docs/`**: Documentación técnica del proyecto, incluyendo el plan maestro de IA, OCR, manuales de despliegue, flujos detallados de negocio de la auditoría actual y reportes de seguridad de la versión V6 (`correcciones-v6/`).
*   **`public/`**: Assets estáticos, incluyendo recursos del sitio, manifiestos e íconos de la marca.

---

## 2. Arquitectura de Software Actual

ZOVIT implementa una arquitectura moderna de **SPA/SSR en Next.js** desacoplada mediante un backend como servicio (**BaaS con Supabase**):

1.  **Frontend & Rendering**: Next.js 15 + React 19. Utiliza renderizado híbrido: páginas estáticas para SEO (categorías, servicios, landing page) y renderizado del lado del cliente (CSR) protegido por sesión para las funcionalidades interactivas (chat en tiempo real, creación de solicitudes, billetera).
2.  **Base de Datos e Integración de Datos**: PostgreSQL alojado en Supabase. El frontend interactúa con la base de datos a través del cliente de Supabase (`@supabase/ssr` / `@supabase/supabase-js`), aplicando consultas parametrizadas directas o llamando a **Procedimientos Almacenados en Base de Datos (RPC)** para transacciones críticas.
3.  **Capa de Autenticación**: Supabase Auth integrado mediante Cookies de sesión y manejado de forma centralizada en el `middleware.ts` del servidor de Next.js.
4.  **Capa de Seguridad (RLS)**: Las tablas de PostgreSQL implementan **Políticas de Seguridad a Nivel de Fila (RLS)** para asegurar que los usuarios solo lean o escriban en registros donde tengan propiedad autorizada.
5.  **Integraciones de Terceros**:
    *   **Pagos**: API HTTP de **Mercado Pago** (Checkout Pro) para recaudación segura con pasarela de cuotas.
    *   **Geolocalización**: MapLibre GL en frontend y OpenStreetMap/Nominatim en backend/APIs para geocodificación y renderizado de mapas.
    *   **Procesamiento de Documentos**: OCR local en el navegador/servidor vía `Tesseract.js` para lectura de cédulas de identidad.

---

## 3. Tecnologías Utilizadas

*   **Framework Principal**: Next.js v15.1.3 y React v19.0.0.
*   **Lenguaje**: TypeScript v5.7.2 con tipado estricto.
*   **Base de Datos & Auth**: Supabase con PostgreSQL v15+ nativo, `@supabase/supabase-js` v2.45.4 y `@supabase/ssr` v0.5.2.
*   **Estilos y UI**: CSS de Vainilla avanzado (`app/globals.css`). No se utiliza Tailwind CSS; se utiliza un sistema robusto de variables CSS personalizadas que proporcionan soporte de modo oscuro/claro nativo, efectos de desenfoque de fondo (*backdrop-filter*) y una estética Cyberpunk/Neón de alta calidad visual. Iconografía provista por `lucide-react` v0.468.0.
*   **OCR**: `tesseract.js` v5.1.1 para digitalización local de documentos de identidad (RUT y fecha de nacimiento).
*   **Generador QR**: `qrcode` v1.5.4 para códigos QR dinámicos de verificación en certificados de oficios y credenciales.
*   **Comunicaciones**: Supabase Realtime (WebSockets) para mensajería instantánea in-app, y stubs para integración futura con correos transaccionales usando la API de **Resend**.
*   **Motor de Pruebas**: Ejecutor de pruebas nativo de Node.js v24.x configurado mediante `tsx` para la suite de pruebas unitarias (`npm test`).

---

## 4. Ecosistema y Sistema de Roles

El control de acceso de ZOVIT está estructurado de manera robusta en dos ejes ortogonales controlados desde la base de datos y validados rigurosamente por el Middleware:

```
        SISTEMA DE AUTORIZACIÓN DE ZOVIT

     +-----------------------------------------------+
     |                   PROFILES                    |
     +-----------------------------------------------+
                             |
         +-------------------+-------------------+
         |                                       |
  [Eje Marketplace]                       [Eje Intranet]
    profiles.role                      profiles.intranet_role
         |                                       |
  +------+------+                      +---------+---------+
  |             |                      |         |         |
client     professional           worker  supervisor hr_admin
  |             |                      |         |         |
  +--+-------+--+                      +---------+---------+
     |       |                                   |
 [active_mode]                              super_admin
(client | professional)                          |
                                        Bypass completo (Dinero)
```

### Eje 1: Roles de la Plataforma (Marketplace)
1.  **Visitante**: Sin cuenta. Puede navegar por páginas públicas, explorar perfiles profesionales y categorías.
2.  **Cliente (`client`)**: Puede publicar solicitudes de servicios, evaluar ofertas, pagar órdenes de trabajo, chatear y calificar profesionales.
3.  **Profesional (`professional`)**: Puede enviar propuestas (cotizaciones), ejecutar trabajos, publicar su ubicación en tiempo real, ver su saldo financiero y solicitar retiros.
4.  **Administrador de Plataforma (`admin`)**: Encargado de validaciones del sistema generales. Cuenta con un bypass estético, pero carece de permisos de dinero a menos que posea el rol de intranet correspondiente.
5.  **Cuenta Dual (Dual Mode)**: Un cliente o profesional puede habilitar la capacidad de actuar en ambos roles. Su sesión conserva un estado `active_mode` que determina qué interfaz gráfica y permisos de API de Next.js se exponen.

### Eje 2: Roles de la Intranet (Personal Interno / Staff)
El campo `profiles.intranet_role` define la jerarquía interna de ZOVIT:
1.  **Trabajador (`worker`)**: Empleado de primera línea. Acceso a su panel personal, liquidaciones e información básica.
2.  **Supervisor (`supervisor`)**: Capacidad para coordinar equipos de trabajadores y visualizar fichas de personal.
3.  **Administrador de RR.HH. (`hr_admin`)**: Puede gestionar perfiles de usuarios de la intranet, validar documentos de identidad y revisar la cola de certificación de profesionales. **Bloqueado para operaciones financieras.**
4.  **Superadministrador (`super_admin`)**: Rol supremo del sistema. Acceso total a finanzas, liberación de payouts bancarios, gestión total de cuentas de usuarios, resolución de disputas de pagos y capacidad de bypass global para biometría y modos de rol.

---

## 5. Estructura de la Base de Datos (Supabase)

La base de datos PostgreSQL de Supabase está altamente estructurada y modularizada mediante scripts de Sprints e instrucciones transaccionales complejas:

### Clasificación de Tablas Principales

| Módulo de Negocio | Tabla en Postgres | Finalidad del Registro | Datos Sensibles Almacenados |
| :--- | :--- | :--- | :--- |
| **Usuarios & Core** | `profiles` | Registro de perfil unificado, roles, saldos y metadatos. | RUT, Nombre, Teléfono, Dirección, Coordenadas, Cuentas bancarias. |
| **Marketplace** | `solicitudes_de_servicio` | Solicitudes activas publicadas por clientes. | Coordenadas, Dirección, Descripción detallada de problemas. |
| **Mensajería** | `request_messages` | Historial de chat interno asociado a una solicitud. | Mensajes de texto sin encriptación (filtrados). |
| **Mensajería** | `request_photos` | Fotos del estado del trabajo (Antes / Después). | Rutas físicas de archivos en Supabase Storage. |
| **Finanzas** | `service_proposals` | Ofertas y presupuestos enviados por profesionales. | Monto monetario propuesto. |
| **Finanzas** | `work_orders` | Órdenes formales creadas al aceptar una oferta. | Monto total, desglose tributario, estados de la orden. |
| **Finanzas** | `payments` | Transacciones de pago asociadas a las órdenes. | Referencias del proveedor (Mercado Pago ID). Sin datos PAN de tarjetas. |
| **Finanzas** | `wallets` | Billeteras virtuales de los profesionales. | Balances de saldo retenido (`held`) y disponible (`available`). |
| **Finanzas** | `wallet_transactions` | Libro mayor transaccional (Partida doble). | Montos exactos de transacciones e historial de transferencias. |
| **Finanzas** | `payout_requests` | Peticiones de retiro bancario de profesionales. | Cuentas corrientes, banco, RUT de transferencia. |
| **Finanzas** | `payment_disputes` | Historial de reembolsos u órdenes en conflicto. | Descripciones de reclamos del cliente o profesional. |
| **Identidad / KYC** | `identity_documents` | Documentos adjuntos para verificación (RUT, Selfie). | Rutas a archivos de identidad privados en Storage. |
| **Identidad / KYC** | `worker_registrations` | Borradores intermedios del onboarding. | Datos de postulación de oficios. |
| **Identidad / KYC** | `worker_credentials` | Títulos, licencias SEC, cursos, certificaciones. | Archivos PDF / Imagen de certificados de capacitación. |
| **Certificaciones** | `issued_certificates` | Certificados de competencia emitidos por ZOVIT. | Folio de certificación único y código QR. |
| **Geolocalización** | `service_live_locations` | Coordenadas en tiempo real de profesionales activos. | Coordenadas GPS del teléfono móvil del trabajador. |

### Mecanismos Activos de Triggers en PostgreSQL
*   **`handle_new_user`**: Ejecutado automáticamente en el registro de un usuario a través de Supabase Auth. Inserta una fila inicial correspondiente en `profiles` sanitizando el rol público predeterminado.
*   **`protect_profile_privileges`**: Disparador crítico de seguridad. Impide que consultas de SQL directas modifiquen los campos de nivel superior (`role`, `intranet_role`) si el ejecutor no es un rol autorizado del sistema (`service_role` o super_admin).
*   **`sanitize_request_message_body`**: Trigger de cumplimiento comercial. Escanea el contenido del chat en tiempo real para bloquear o enmascarar información de contacto como números de teléfono, correos electrónicos o palabras clave de pago externo, previniendo la evasión de comisiones.
*   **`mask_service_address`**: Trigger que restringe la visibilidad de la dirección precisa de la solicitud a profesionales no seleccionados, mostrando únicamente datos comunales genéricos hasta que el trabajo sea formalmente asignado.

---

## 6. Reglas de Negocio Clave

La lógica empresarial de ZOVIT ha sido modelada para operar de manera transparente y segura:

1.  **Modelo de Retención (Escrow)**:
    *   El dinero pagado por el cliente en Mercado Pago es retenido de manera contable por ZOVIT.
    *   Se deposita inicialmente en el saldo retenido (`held_balance`) de la billetera virtual del profesional asociado.
    *   **Liberación de Fondos**: Solo ocurre cuando el cliente aprueba formalmente el trabajo como "completado" o si un super_admin resuelve una disputa a favor del profesional. Al liberarse, los fondos pasan a saldo disponible (`available_balance`), permitiendo su retiro.
2.  **Estructura de Comisión de ZOVIT**:
    *   ZOVIT cobra una comisión base del **10%** sobre el neto de la transacción acordada entre el profesional y el cliente.
    *   **IVA**: Se aplica el **19% de IVA exclusivamente sobre la comisión de ZOVIT**, no sobre el total del trabajo del profesional.
    *   *Ejemplo de cálculo*: Para un trabajo de $10.000 bruto cobrado al profesional:
        *   Comisión Zovit Neto: $1.000.
        *   IVA sobre Comisión: $190.
        *   Comisión Total Deductible: $1.190.
        *   Monto Neto Final Depositado en Wallet del Profesional: $8.810.
3.  **Financiamiento en Cuotas**:
    *   Si el cliente paga con tarjeta de crédito en cuotas, las tasas de financiamiento aplicadas por Mercado Pago son transferidas como recargo en el cobro final del cliente (`client_charged_amount`). El neto prometido al profesional permanece constante e inmune.
4.  **Servicios Regulados**:
    *   Servicios correspondientes a categorías de alta peligrosidad (ej. Instalaciones Eléctricas bajo norma SEC o redes de Gas) son bloqueados preventivamente. El profesional no puede postular a ofertas en estas áreas hasta que un `hr_admin` de la intranet apruebe de forma manual su documentación y credenciales.
5.  **Políticas de Cancelación**:
    *   Si un cliente cancela un trabajo en ejecución, se pueden aplicar cargos de cancelación automáticos (`cancellation_fees`) para compensar el traslado o preparación del profesional, bloqueando futuras publicaciones del cliente hasta saldar la multa.

---

## 7. Flujo Detallado Cliente → Profesional

El ciclo completo de vida del servicio dentro de la plataforma opera bajo el siguiente pipeline:

```
        FLUJO OPERATIVO CLIENTE -> PROFESIONAL

       [ Cliente ]                        [ Profesional ]
            |                                    |
     1. Se registra                       1. Se registra
     2. KYC (Carnet+Selfie)               2. KYC (Carnet+Selfie)
            |                               3. Sube Credenciales Oficio
            |                                    |
     3. Crea Solicitud                           |
        (Dirección enmascarada)                  |
            |                                    |
            +------------< Auto-Match >----------+ (Notificación)
            |                                    |
            |                             4. Envía Cotización
            |                                ($ Monto Neto)
            |                                    |
     5. Revisa Propuestas                        |
     6. Acepta Oferta                            |
            |                                    |
     7. Paga (Mercado Pago)                      |
        (Fondos Retenidos en Wallet)             |
            |                                    |
            |                             8. Presiona "Iniciar Trabajo"
            |                                (Ubicación GPS Live)
            |                             9. Presiona "Completar Trabajo"
            |                                    |
    10. Revisa e Inspecciona                     |
    11. Presiona "Aprobar"                       |
            |                                    |
    12. Emite Calificación                       |
            |                                    |
            |                            10. Saldo se Libera a "Disponible"
            |                            11. Solicita Payout Bancario
            v                                    v
```

1.  **Registro y Autenticación**: Ambos se registran y pasan por el control de mayoría de edad (+18).
2.  **Onboarding de Identidad**: Suben fotos de carnet de identidad chilena (Frontal y Reverso) más una selfie. El OCR de `Tesseract.js` valida el RUT y la fecha de nacimiento en el cliente. Si coincide con el registro, se aprueba de inmediato (`identity_status = approved`). Si es dudoso, se deriva a revisión manual del personal de RR.HH.
3.  **Creación de Solicitud**: El cliente redacta los requisitos, sube fotos del estado actual y fija la ubicación usando el mapa. El Middleware valida que el cliente tenga su identidad aprobada o pendiente para continuar; si no, es redirigido obligatoriamente al flujo biométrico.
4.  **Asignación Inteligente (Auto-Match)**: Un cronjob analiza la solicitud recién creada, calcula las distancias geográficas mediante la fórmula de Haversine y envía alertas automatizadas en segundo plano (vía websockets/notificaciones) hasta a un máximo de **8 profesionales** calificados cercanos que tengan disponibilidad de radio de cobertura.
5.  **Cotización**: Los profesionales interesados postulan enviando su propuesta económica formal.
6.  **Pago de la Orden**: El cliente selecciona al profesional idóneo basándose en calificaciones anteriores, nivel de experiencia y precio. Acepta la propuesta y paga a través de la pasarela de Mercado Pago. El pago pasa de `esperando_pago` a `pago_retenido` tras la llamada de webhook segura.
7.  **Ejecución**: El profesional viaja a la ubicación (cuya dirección exacta se devela automáticamente). El profesional presiona "Iniciar Trabajo", lo cual puede gatillar la transmisión de su ubicación satelital en vivo en el mapa del cliente para propósitos de monitoreo.
8.  **Finalización**: Al terminar el servicio, el profesional sube fotos del resultado final y presiona "Completar Trabajo".
9.  **Aprobación y Cierre**: El cliente valida la calidad del servicio e ingresa a aprobar la orden. Esto ejecuta la base RPC que transfiere los fondos de retenidos a disponibles en la wallet del profesional, emitiendo una boleta de comisión. El cliente finalmente deja una calificación de estrellas y reseñas.
10. **Retiro bancario**: El profesional solicita su dinero, lo cual entra en revisión administrativa para su posterior transferencia electrónica a su cuenta bancaria.

---

## 8. La Intranet de ZOVIT

La intranet de ZOVIT es una suite administrativa robusta construida bajo estrictas reglas de renderizado y seguridad, accesible únicamente bajo credenciales con rol corporativo habilitado:

*   **Ruta Segura**: Centralizada bajo `/intranet`. Si el Middleware detecta que el usuario tiene un valor `intranet_role === null`, es bloqueado y expulsado hacia la interfaz pública de acceso.
*   **Módulo de RR.HH. (`hr_admin`)**:
    *   Visualiza la cola de verificación de usuarios del marketplace en tiempo real (`verificationQueue`).
    *   Analiza los resultados automáticos del OCR e imágenes de cédulas frente a selfies, permitiendo aprobar o rechazar identidades bajo razones fundadas.
    *   Aprueba credenciales profesionales de oficios regulados para desbloquear su perfil de trabajo en categorías protegidas.
*   **Módulo Financiero / Control de Escrow (`super_admin`)**:
    *   Acceso único y restringido a `/admin/pagos` e `/intranet/finanzas`.
    *   Revisa la consola transaccional de pagos capturados.
    *   Visualiza el historial detallado del Ledger de wallets y las solicitudes de retiro bancario (`payout_requests`), pudiendo procesar y autorizar retiros bancarios.
    *   Actúa como mediador en disputas activas (`payment_disputes`), tomando la decisión irreversible de reembolsar los fondos al cliente o liberarlos permanentemente al profesional.
*   **Secciones Visuales Simuladas (Demos/Stubs)**:
    *   El módulo de nóminas internas y liquidaciones de sueldos corporativos del staff (`app/intranet/liquidaciones/page.tsx`) opera actualmente bajo datos fijos simulados (`demoPayrolls`) como demostración de interfaz gráfica para futuros desarrollos.

---

## 9. Seguridad, Control de Accesos y RLS

ZOVIT cuenta con un excelente hardening de seguridad reforzado sistemáticamente en el backend para evitar dependencias exclusivas en el código de interfaz:

### Fortalezas de Seguridad
1.  **Middleware de Sesión**: Un solo punto centralizado de inspección que impide el acceso a rutas protegidas (`/panel`, `/solicitudes`, `/pagos`, `/intranet`, `/admin`) si el token de sesión JWT de Supabase es inexistente o inválido, o si el usuario no cumple el Gate de identidad aprobada.
2.  **Políticas RLS en Base de Datos**: Las tablas clave están fuertemente protegidas contra vulnerabilidades de escalado o visualización indebida (IDOR). Por ejemplo, en `wallets`, un usuario solo puede consultar el balance si `auth.uid() = profile_id`, bloqueando lecturas cruzadas.
3.  **Privilege Lock en Base de Datos**: Un trigger en PostgreSQL protege la tabla `profiles` e impide de forma estricta que un atacante intente realizar un ataque de escalamiento de privilegios enviando una mutación para cambiarse a sí mismo el rol a `admin` o añadir un `intranet_role = 'super_admin'`.
4.  **Webhooks Firmados con Firma Simétrica**: El endpoint de webhook de Mercado Pago valida de forma matemática la cabecera de firma HMAC-SHA256 usando el secreto privado configurado, asegurando la imposibilidad de inyectar transacciones falsas desde clientes maliciosos sin pagar.

### Mejoras e Hardening Aplicados en la Versión V6
Tras un análisis profundo de vulnerabilidades de seguridad y control de privilegios, se implementaron soluciones preventivas en la versión V6 del sistema:

*   **SEG-001 (Control Administrativo de Rutas Financieras)**:
    *   Se creó un helper centralizado en `lib/auth/roles.ts` llamado `isFinancialAdminRoute()` que identifica dinámicamente rutas sensibles de dinero como `/admin/pagos` e `/intranet/finanzas`.
    *   El `middleware.ts` fue blindado para bloquear de raíz el acceso a estas rutas de administración de capital a cualquier rol corporativo, excepto a los usuarios que tengan de manera fehaciente `intranet_role = 'super_admin'`.
*   **SEG-002 (Hardening de APIs y Mitigación IDOR)**:
    *   Se diseñó la utilidad de validación `lib/security/validation.ts` para verificar la sanidad de IDs, parámetros de ruta y UUIDs antes de ejecutar consultas.
    *   Se reescribieron más de 15 route handlers de API (ej. `/api/payments/orders/[id]/pay`, `/api/requests/[id]/cancel`, `/api/verification`, `/api/worker/documents`) para comprobar de manera obligatoria que el `auth.uid()` del usuario coincide exactamente con la propiedad del recurso a modificar.
    *   Se confeccionó el script seguro `supabase/SEG-002-RLS-SECURITY.sql` que activa RLS exhaustivo en tablas clave del onboarding (`identity_documents`, `worker_credentials`, `worker_service_authorizations`), y modifica el RPC crítico `request_payout` para forzar la lectura del RUT y del ID bancario desde el contexto seguro de sesión `auth.uid()`, desestimando parámetros inyectados de clientes sospechosos.

---

## 10. Catálogo de Documentación del Proyecto

El proyecto está excelentemente documentado, lo cual provee el mapa de ruta e histórico de sprints del sistema. A continuación se describe el propósito de las piezas documentales:

1.  **Guía Paso a Paso (`GUIA_PASO_A_PASO.txt`)**: Manual operacional para levantar el entorno de desarrollo, variables locales, poblamiento de la base de datos de prueba y flujo de pagos local.
2.  **Guía de Instalación y Cambios de Lanzamiento**: (`INSTALACION_FASE_1.txt`, `CAMBIOS_FASE_1.txt`, `CAMBIOS_LANZAMIENTO.txt`, `CAMBIOS_REALIZADOS.txt`) detallan los despliegues de la versión inicial, las modificaciones manuales de datos en Supabase y el estado de transición del software.
3.  **Manual de Despliegue (`docs/DEPLOY.md`)**: Instrucciones precisas para exportar el proyecto a Vercel, asociar las variables de entorno de producción de Supabase, configurar DNS del dominio `zovit.cl` y registrar webhooks productivos en Mercado Pago Chile.
4.  **Flujos de la Auditoría Técnica (`docs/estado-actual-zovit/`)**:
    *   *`00-todo-en-uno.md` y `28-informe-consolidado.md`*: Consolidados de arquitectura de más de 140KB con el mapa entero del software.
    *   *`02-usuarios-y-roles.md`*: Matriz de roles en base de datos.
    *   *`10-pagos.md` y `docs/PAGOS.md`*: Documentación detallada del modelo de escrow, flujo del ledger, comisiones e IVA transaccional de Mercado Pago Chile.
    *   *`11-base-de-datos.md`*: Detalle de llaves foráneas, tablas e inventario RLS.
    *   *`24-errores-pendientes.md`*: Registro exhaustivo de 20 hallazgos (E-01 a E-20) clasificados por riesgo técnico que sirven de backlog de corrección prioritario.
5.  **Planes Maestros de Inteligencia Artificial y OCR (`docs/ZOVIT_AI_*`, `docs/ZOVIT_OCR_*`)**:
    *   Plan integral para la gobernanza de datos de IA, estrategias de escalamiento, análisis predictivo de coincidencias cliente-profesional y mapas conceptuales de verificación automatizada.
6.  **Gobierno del Co-Fundador (`docs/FOUNDER_VAULT_*`)**: Documentos sobre la estructura de seguridad, gobernanza del código y el máster plan estratégico y de negocio a largo plazo de ZOVIT.
7.  **Reportes de Seguridad de la Versión V6 (`docs/correcciones-v6/`)**:
    *   *`SEG-001.md` y `SEG-002.md`*: Análisis forense y reportes detallados del desarrollo, pruebas aplicadas (typecheck, lint, test) y mitigación de brechas de seguridad financieras y de vulnerabilidades IDOR descritas anteriormente.

---

## 11. Conclusión General del Estado del Proyecto

ZOVIT es una plataforma robusta, con una **estética visual sumamente atractiva y moderna**, construida sobre estándares tecnológicos modernos y eficientes. No se trata de un simple prototipo gráfico; la lógica del flujo de trabajo, la mensajería en tiempo real con websockets de Supabase, la geolocalización de profesionales cercanos mediante búsquedas espaciales y el backend de validación de APIs e implementaciones RLS demuestran un software con un alto grado de desarrollo real.

Para alcanzar un estado apto para producción masiva y cumplimiento regulatorio en Chile, el foco de desarrollo debe orientarse a cerrar las integraciones externas descritas en su backlog de prioridades:
1.  **Tributario**: Cablear la API de Haulmer para la emisión automatizada de Boletas de Honorarios / DTE hacia el SII.
2.  **Pagos**: Transicionar del modelo Escrow Ledger Centralizado de un solo recolector (Fase A) al split de fondos automatizado en cuentas de Mercado Pago de vendedores independientes mediante Mercado Pago Marketplace (Fase B).
3.  **KYC**: Reemplazar la simulación de concordancia de rostros por un pipeline biométrico real de liveness y verificación facial automatizada.
4.  **Consistencia de Datos**: Realizar una auditoría remota de políticas y triggers de base de datos para asegurar el correcto acoplamiento de las 42 migraciones locales del repositorio frente al estado de la base de datos Supabase en nube.
