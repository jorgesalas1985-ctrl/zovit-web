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
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const paymentId = process.argv[2] || "2f6d2516-a531-4b84-8482-6a121addbb35";
const ref = `MOCK-E2E-${Date.now()}`;

const attempts = [
  {
    p_payment_id: paymentId,
    p_provider: "mock",
    p_provider_reference: ref,
    p_provider_session_id: ref,
    p_payment_method: "mock",
  },
  {
    p_payment_id: paymentId,
    p_provider: "mock",
    p_provider_reference: ref,
    p_provider_session_id: ref,
    p_payment_method: "mock",
    p_external_reference: "ZVT-2D55D57A1276",
    p_amount_gross: 45000,
  },
];

for (const args of attempts) {
  const { data, error } = await admin.rpc("register_payment_received", args);
  console.log("TRY", Object.keys(args).join(","), error ? `ERR ${error.message}` : `OK ${JSON.stringify(data)}`);
  if (!error) process.exit(0);
}

process.exit(1);
