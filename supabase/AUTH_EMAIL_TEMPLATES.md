# Plantillas de correo ZOVIT (Supabase Auth)

Los correos de confirmación los envía **Supabase Auth**. En el plan gratuito con el proveedor de correo por defecto, el remitente puede seguir diciendo "Supabase" hasta que configures SMTP propio.

## Configuración ya aplicada en el proyecto

Estos valores ya están configurados en Supabase (proyecto `rtsfgzyqzcibmtifdfbp`):

| Campo | Valor |
|-------|--------|
| **Site URL** | `https://www.zovit.cl` |
| **Redirect URLs** | `https://www.zovit.cl/**`, `https://zovit.cl/**`, localhost y Vercel |

Con esto, al confirmar el correo el usuario vuelve a **zovit.cl** y entra al panel.

Para volver a aplicar las URLs:

```powershell
$env:SUPABASE_ACCESS_TOKEN="tu_token"
node scripts/configure-supabase-auth.mjs
```

Token en: [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens)

## Personalizar texto del correo (requiere SMTP)

En plan Free con correo por defecto, Supabase **no permite** editar plantillas por API. Para que diga ZOVIT en lugar de Supabase:

1. Configura **Authentication → SMTP Settings** (Resend, SendGrid, etc.) con `noreply@zovit.cl`
2. Luego en **Authentication → Email Templates** pega las plantillas de abajo

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
