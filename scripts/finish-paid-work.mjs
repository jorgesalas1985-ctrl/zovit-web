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
    let val = line.slice(i + 1);
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    env[line.slice(0, i)] = val;
  }
  return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const paymentId = process.argv[2] || "2f6d2516-a531-4b84-8482-6a121addbb35";

const pro = createClient(url, anon, { auth: { persistSession: false } });
const { error: loginError } = await pro.auth.signInWithPassword({
  email: "jorgeandresalasguzman@gmail.com",
  password: "TestZovit1!",
});
if (loginError) {
  console.error("PRO_LOGIN", loginError.message);
  process.exit(1);
}

for (const [name, args] of [
  ["start_paid_work", { p_payment_id: paymentId }],
  ["complete_paid_work", { p_payment_id: paymentId }],
]) {
  const { error } = await pro.rpc(name, args);
  console.log(name, error ? `ERR ${error.message}` : "OK");
}

console.log("NEXT: cliente debe aprobar en /pagos o RPC approve_and_release_payment");
