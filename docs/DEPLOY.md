# Publicar ZOVIT en zovit.cl (producción)

Guía paso a paso para conectar el dominio **zovit.cl** con la app Next.js y seguir desarrollando en local.

## Resumen del flujo

```
Código (GitHub)  →  Vercel (hosting)  →  DNS (registrador)  →  zovit.cl
       ↑
  localhost:3000 (desarrollo local, mismo Supabase)
```

Comprar el dominio **no** publica la web. Necesitas estos 4 pasos:

1. Subir el código a GitHub  
2. Desplegar en Vercel  
3. Apuntar DNS de zovit.cl a Vercel  
4. Configurar Supabase Auth para zovit.cl  

---

## Paso 1 — Subir el código a GitHub

### 1.1 Crear repositorio en GitHub

1. Entra a [github.com/new](https://github.com/new)  
2. Nombre sugerido: `zovit-web`  
3. **Private** (recomendado) o Public  
4. **No** marques README, .gitignore ni licencia (ya existen en el proyecto)  
5. Clic en **Create repository**

### 1.2 Conectar y subir desde tu PC

En PowerShell, desde la carpeta del proyecto:

```powershell
cd "C:\Users\jorge\Downloads\ZOVIT_Web_v5.0_Fase_1_Completa\ZOVIT_Web_v4.0_Produccion"

# Reemplaza TU_USUARIO por tu usuario de GitHub
git remote add origin https://github.com/TU_USUARIO/zovit-web.git

git add .
git commit -m "Preparar despliegue en zovit.cl con Vercel y Supabase."

git branch -M main
git push -u origin main
```

> Si ya tienes `origin` configurado, usa `git remote set-url origin ...` en lugar de `add`.

---

## Paso 2 — Desplegar en Vercel

### 2.1 Crear cuenta e importar proyecto

1. [vercel.com/signup](https://vercel.com/signup) (puedes usar **Continue with GitHub**)  
2. **Add New… → Project**  
3. Importa el repo `zovit-web`  
4. Framework: **Next.js** (detectado automáticamente)  
5. **No cambies** Build Command ni Output Directory  

### 2.2 Variables de entorno en Vercel

En **Environment Variables**, agrega **Production** (y opcionalmente Preview/Development):

| Variable | Valor |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Copia de tu `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Copia de tu `.env.local` (clave **anon**, nunca service_role) |
| `NEXT_PUBLIC_APP_URL` | `https://zovit.cl` |
| `ZOVIT_PAYMENT_PROVIDER` | `mock` (al inicio) o `mercadopago` cuando actives pagos |
| `MERCADOPAGO_ACCESS_TOKEN` | Solo si usas Mercado Pago |

6. Clic **Deploy**  
7. Espera el build. Deberías ver una URL tipo `zovit-web.vercel.app` funcionando.

---

## Paso 3 — Conectar zovit.cl en Vercel

1. Proyecto en Vercel → **Settings → Domains**  
2. Agrega: `zovit.cl`  
3. Agrega: `www.zovit.cl`  
4. Elige redirección recomendada: **www → zovit.cl** o **zovit.cl → www** (usa una sola versión canónica)  
5. Vercel mostrará registros DNS. Anótalos (suelen ser):

| Tipo | Host / Nombre | Valor |
|------|----------------|--------|
| A | `@` | `76.76.21.21` |
| CNAME | `www` | `cname.vercel-dns.com` |

> Usa **exactamente** los valores que muestre Vercel en tu pantalla.

---

## Paso 4 — DNS en tu registrador (donde compraste zovit.cl)

Entra al panel donde compraste el dominio (NIC Chile, GoDaddy, Hostinger, etc.).

### Busca una sección como:

- **DNS / Zona DNS**  
- **Administrar DNS**  
- **Registros DNS**

### Acciones:

1. Elimina registros **A** antiguos en `@` que apunten a otra IP  
2. Elimina **CNAME** de `www` si choca  
3. Crea el registro **A** para `@` → IP de Vercel  
4. Crea el registro **CNAME** para `www` → target de Vercel  
5. Guarda cambios  

### Propagación

- Puede tardar **5 minutos a 48 horas**  
- Verifica en [dnschecker.org](https://dnschecker.org) buscando `zovit.cl`  
- En Vercel, el dominio debe pasar a estado **Valid**  

### Si compraste en NIC Chile (nic.cl)

1. [nic.cl](https://www.nic.cl) → Iniciar sesión  
2. **Mis dominios** → `zovit.cl`  
3. **Administrar DNS** o delegación DNS  
4. Agrega los registros A y CNAME de Vercel  

---

## Paso 5 — Supabase (login y registro en producción)

En [Supabase Dashboard](https://supabase.com/dashboard) → tu proyecto → **Authentication → URL Configuration**:

| Campo | Valor |
|-------|--------|
| **Site URL** | `https://zovit.cl` |
| **Redirect URLs** | Agrega cada línea: |

```
https://zovit.cl/**
https://www.zovit.cl/**
http://localhost:3000/**
https://*.vercel.app/**
```

Guarda. Sin esto, el login en zovit.cl fallará aunque la web cargue.

### Correos con marca ZOVIT (no "Supabase")

En **Authentication → Email Templates**, personaliza asunto y cuerpo con "ZOVIT". Copia las plantillas listas en [`supabase/AUTH_EMAIL_TEMPLATES.md`](../supabase/AUTH_EMAIL_TEMPLATES.md).

---

## Paso 6 — Mercado Pago (cuando actives pagos reales)

En `.env.local` y en Vercel (producción):

```env
NEXT_PUBLIC_APP_URL=https://zovit.cl
ZOVIT_PAYMENT_PROVIDER=mercadopago
MERCADOPAGO_ACCESS_TOKEN=APP_USR-...
```

En Mercado Pago → tu aplicación → **Webhooks / Notificaciones**:

- URL: `https://zovit.cl/api/payments/webhook/mercadopago`

---

## Paso 7 — Verificar que todo funciona

Checklist:

- [ ] `https://zovit-web.vercel.app` abre la home  
- [ ] `https://zovit.cl` abre la misma app (tras DNS)  
- [ ] Registro / login funciona en zovit.cl  
- [ ] Panel y solicitudes cargan con tu usuario  
- [ ] Vercel → Domains muestra **Valid**  

---

## Seguir trabajando en local (sin cambiar nada)

```powershell
cd "C:\Users\jorge\Downloads\ZOVIT_Web_v5.0_Fase_1_Completa\ZOVIT_Web_v4.0_Produccion"
npm run dev
```

- **Local:** `http://localhost:3000` — desarrollo rápido  
- **Producción:** `https://zovit.cl` — se actualiza solo al hacer `git push` (Vercel redeploy automático)  

Misma base Supabase en ambos entornos. Solo cambia `NEXT_PUBLIC_APP_URL` en Vercel vs local.

### Flujo diario recomendado

```powershell
# 1. Trabajas en local
npm run dev

# 2. Cuando quieras publicar cambios
git add .
git commit -m "Describe tu cambio"
git push

# 3. Vercel despliega en 1-3 minutos → zovit.cl se actualiza
```

---

## Problemas frecuentes

| Síntoma | Causa probable | Solución |
|---------|----------------|----------|
| zovit.cl no abre nada | DNS no configurado o sin deploy | Pasos 2–4 |
| Dominio comprado pero “no aparece” en el navegador | Normal sin hosting | Deploy + DNS |
| Login falla en zovit.cl | Redirect URLs en Supabase | Paso 5 |
| Build falla en Vercel | Faltan env vars | Paso 2.2 |
| Mercado Pago no redirige | `NEXT_PUBLIC_APP_URL` es localhost | Usar `https://zovit.cl` en Vercel |

---

## Soporte

Indica en qué paso estás atascado y dónde compraste el dominio (NIC.cl, GoDaddy, etc.) para ayudarte con capturas concretas del panel DNS.
