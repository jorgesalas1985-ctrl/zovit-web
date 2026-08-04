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

const email = process.argv[2] ?? "jorgeandresalasguzman@gmail.com";
const env = loadEnv();
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
const user = list?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
if (!user) {
  console.log("NOT_FOUND");
  process.exit(0);
}

const { data: profile } = await admin.from("profiles").select("*").eq("id", user.id).single();
const { data: docs } = await admin.from("identity_documents").select("*").eq("profile_id", user.id);

console.log(JSON.stringify({ profile: { role: profile?.role, identity_status: profile?.identity_status, identity_submitted_at: profile?.identity_submitted_at }, docsCount: docs?.length ?? 0, docs }, null, 2));
