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

const env = loadEnv();
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: payments, error: listError } = await admin
  .from("payments")
  .select("id,public_id,status,amount_gross,client_id,professional_id,request_id")
  .in("status", ["esperando_pago", "pendiente"])
  .order("created_at", { ascending: false })
  .limit(3);

if (listError) {
  console.error("LIST_ERROR", listError.message);
  process.exit(1);
}

console.log("PENDING_PAYMENTS", JSON.stringify(payments, null, 2));

if (!payments?.length) {
  console.log("NO_PENDING: no hay pagos esperando_pago para simular.");
  process.exit(0);
}

const p = payments[0];
const ref = `MOCK-DEMO-${Date.now()}`;
const { error } = await admin.rpc("register_payment_received", {
  p_payment_id: p.id,
  p_provider: "mock",
  p_provider_reference: ref,
  p_provider_session_id: ref,
  p_payment_method: "mock",
  p_external_reference: p.public_id,
  p_amount_gross: Number(p.amount_gross),
});

if (error) {
  console.error("SIMULATE_ERROR", error.message);
  process.exit(1);
}

const { data: updated } = await admin
  .from("payments")
  .select("public_id,status,amount_gross")
  .eq("id", p.id)
  .single();

console.log("SIMULATED_OK", JSON.stringify(updated, null, 2));
