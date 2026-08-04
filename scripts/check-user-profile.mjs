import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

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

const email = process.argv[2] ?? "jor.salasj47@gmail.com";
const env = loadEnv();
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
if (listError) {
  console.error("AUTH_LIST_ERROR", listError.message);
  process.exit(1);
}

const user = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
if (!user) {
  console.log("USER_NOT_FOUND", email);
  process.exit(0);
}

const { data: profile, error: profileError } = await admin
  .from("profiles")
  .select("role, intranet_role, first_name, last_name, identity_status")
  .eq("id", user.id)
  .maybeSingle();

console.log(
  JSON.stringify(
    {
      email: user.email,
      email_confirmed: Boolean(user.email_confirmed_at),
      created_at: user.created_at,
      user_metadata_role: user.user_metadata?.role ?? null,
      profile: profileError ? { error: profileError.message } : profile,
    },
    null,
    2
  )
);
