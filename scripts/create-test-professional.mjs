import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const TEST_EMAIL = "jorgeandresalasguzman@gmail.com";
const TEST_PASSWORD = "TestZovit1!";
const TEST_USER = {
  first_name: "Jorge Andres",
  last_name: "Salas Guzman",
  phone: "+56912345678",
  role: "professional",
};

function loadEnv() {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i === -1) continue;
    const key = line.slice(0, i);
    let val = line.slice(i + 1);
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    env[key] = val;
  }
  return env;
}

const env = loadEnv();
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const redirectTo = "https://www.zovit.cl/auth/callback?next=%2Fpanel";

const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
const existing = list?.users.find((u) => u.email?.toLowerCase() === TEST_EMAIL.toLowerCase());

if (existing) {
  await admin.auth.admin.deleteUser(existing.id);
  console.log("DELETED_EXISTING", TEST_EMAIL);
}

const { data: created, error: createError } = await admin.auth.admin.createUser({
  email: TEST_EMAIL,
  password: TEST_PASSWORD,
  email_confirm: true,
  user_metadata: TEST_USER,
});

if (createError) {
  console.error("CREATE_USER_ERROR", createError.message);
  process.exit(1);
}

const userId = created.user.id;
console.log("CREATE_USER_OK", userId, "| email_confirm: true (sin esperar correo)");

const { data: profile } = await admin
  .from("profiles")
  .select("role, first_name, last_name")
  .eq("id", userId)
  .maybeSingle();

console.log("PROFILE", profile);

if (profile?.role !== "professional") {
  const { error: fixError } = await admin
    .from("profiles")
    .update({
      role: "professional",
      first_name: TEST_USER.first_name,
      last_name: TEST_USER.last_name,
      phone: TEST_USER.phone,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
  console.log("PROFILE_FIX", fixError ? fixError.message : "role -> professional");
}

const resendResponse = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/resend`, {
  method: "POST",
  headers: {
    apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ type: "signup", email: TEST_EMAIL, options: { emailRedirectTo: redirectTo } }),
});
const resendBody = await resendResponse.json();
console.log(
  "RESEND_CONFIRMATION",
  resendResponse.ok ? "sent" : `${resendResponse.status} ${resendBody.msg ?? resendBody.error_code}`
);

console.log("\n--- CUENTA PROFESIONAL DE PRUEBA ---");
console.log("Correo:", TEST_EMAIL);
console.log("Clave:", TEST_PASSWORD);
console.log("Rol:", "professional");
console.log("Login: https://www.zovit.cl/login → tipo Profesional");
console.log("\nNota: Supabase limitó envío de correos (429). La cuenta ya está confirmada para que puedas entrar.");
console.log("Revisa Gmail por si igual llega un correo; también carpeta Spam.");
