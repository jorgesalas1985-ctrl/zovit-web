# Plantillas de correo ZOVIT (Supabase Auth)

Los correos de confirmación y recuperación los envía **Supabase Auth**. El texto "Supabase" aparece porque las plantillas vienen por defecto del proveedor. Debes personalizarlas en el panel de Supabase (no se puede cambiar solo desde el código de Next.js).

## Dónde configurarlo

1. Abre [Supabase Dashboard](https://supabase.com/dashboard) → tu proyecto.
2. Ve a **Authentication → Email Templates**.
3. En **Authentication → URL Configuration**, confirma:
   - **Site URL:** `https://www.zovit.cl` (o `https://zovit.cl`, según tu dominio principal)
   - **Redirect URLs:** incluye `https://www.zovit.cl/**`, `https://zovit.cl/**` y `http://localhost:3000/**`

4. Opcional: **Authentication → SMTP Settings** para enviar desde `noreply@zovit.cl` con tu proveedor (Resend, SendGrid, etc.).

## Plantilla — Confirm signup (Confirmar registro)

**Subject:**

```
Confirma tu cuenta en ZOVIT
```

**Body (HTML):**

```html
<h2>Bienvenido a ZOVIT</h2>
<p>Gracias por registrarte. Confirma tu correo para activar tu cuenta y acceder a la plataforma.</p>
<p><a href="{{ .ConfirmationURL }}">Confirmar mi cuenta</a></p>
<p>Si no creaste esta cuenta, puedes ignorar este mensaje.</p>
<p>— Equipo ZOVIT<br><a href="https://www.zovit.cl">www.zovit.cl</a></p>
```

## Plantilla — Reset password (Recuperar contraseña)

**Subject:**

```
Recupera tu contraseña en ZOVIT
```

**Body (HTML):**

```html
<h2>Recuperación de contraseña</h2>
<p>Recibimos una solicitud para restablecer la contraseña de tu cuenta ZOVIT.</p>
<p><a href="{{ .ConfirmationURL }}">Restablecer contraseña</a></p>
<p>Si no solicitaste este cambio, ignora este correo.</p>
<p>— Equipo ZOVIT<br><a href="https://www.zovit.cl">www.zovit.cl</a></p>
```

## Plantilla — Magic link (opcional)

**Subject:**

```
Tu enlace de acceso a ZOVIT
```

**Body (HTML):**

```html
<h2>Acceso a ZOVIT</h2>
<p>Usa el siguiente enlace para ingresar a tu cuenta:</p>
<p><a href="{{ .ConfirmationURL }}">Ingresar a ZOVIT</a></p>
<p>— Equipo ZOVIT</p>
```

## Cómo funciona el enlace de confirmación

La app registra usuarios con:

```
https://www.zovit.cl/auth/callback?next=/panel
```

Tras confirmar, Supabase redirige a esa URL con un `code`. El callback de ZOVIT intercambia el código por sesión y envía al usuario a `/panel` (o a restablecer clave si es recuperación).

Variables de entorno en Vercel:

```env
NEXT_PUBLIC_APP_URL=https://www.zovit.cl
```

Tras guardar las plantillas en Supabase, prueba un registro nuevo con un correo real.
