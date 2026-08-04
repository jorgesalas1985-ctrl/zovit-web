import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = {};
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  if (!line || line.startsWith("#")) continue;
  const i = line.indexOf("=");
  let v = line.slice(i + 1);
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  env[line.slice(0, i)] = v;
}

const email = process.env.ZOVIT_TEST_EMAIL || "jor.salasj47@gmail.com";
const pass = process.env.ZOVIT_TEST_PASS || "TestZovit1!";
const user = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const { data: auth, error: authErr } = await user.auth.signInWithPassword({
  email,
  password: pass,
});
if (authErr) {
  console.log("login_fail", authErr.message);
  process.exit(1);
}

const id = auth.user.id;
const { error: e1 } = await user.from("profiles").update({ role: "admin" }).eq("id", id);
console.log("escalation_role", e1?.message || "ALLOWED_BAD");
const { error: e2 } = await user
  .from("profiles")
  .update({ intranet_role: "super_admin" })
  .eq("id", id);
console.log("escalation_intranet", e2?.message || "ALLOWED_BAD");
const { error: e3 } = await user
  .from("profiles")
  .update({ identity_verified: true, identity_status: "approved" })
  .eq("id", id);
console.log("escalation_identity", e3?.message || "ALLOWED_BAD");
const { data: me } = await user
  .from("profiles")
  .select("role,intranet_role,identity_status,identity_verified")
  .eq("id", id)
  .maybeSingle();
console.log("profile_after", me);
