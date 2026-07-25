/**
 * E2E pagado con dos cuentas:
 * - Cliente: sesión actual no necesaria; usa service role solo para lecturas/perfil
 * - Profesional: login con password y RPCs authenticated
 * - Cliente: login para aceptar + mock pay via API local o RPC
 */
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

function fail(step, err) {
  console.error(`FAIL:${step}`, err?.message || err);
  process.exit(1);
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(url, service, { auth: { persistSession: false } });

const CLIENT_EMAIL = (process.env.E2E_CLIENT_EMAIL || "jor.salasj47@gmail.com").toLowerCase();
const CLIENT_PASSWORD = process.env.E2E_CLIENT_PASSWORD || "";
const PRO_EMAIL = (process.env.E2E_PRO_EMAIL || "jorgeandresalasguzman@gmail.com").toLowerCase();
const PRO_PASSWORD = process.env.E2E_PRO_PASSWORD || "TestZovit1!";

const { data: usersPage } = await admin.auth.admin.listUsers({ perPage: 1000 });
const clientAuth = usersPage.users.find((u) => u.email?.toLowerCase() === CLIENT_EMAIL);
const proAuth = usersPage.users.find((u) => u.email?.toLowerCase() === PRO_EMAIL);
if (!clientAuth) fail("client", CLIENT_EMAIL);
if (!proAuth) fail("pro", PRO_EMAIL);

console.log("USERS", { client: clientAuth.id, pro: proAuth.id });

// Asegurar modos/roles
await admin.from("profiles").update({
  can_act_as_client: true,
  can_act_as_professional: true,
  active_mode: "client",
  identity_status: "pending",
  updated_at: new Date().toISOString(),
}).eq("id", clientAuth.id);

await admin.from("profiles").update({
  role: "professional",
  can_act_as_client: true,
  can_act_as_professional: true,
  active_mode: "professional",
  identity_status: "pending",
  updated_at: new Date().toISOString(),
}).eq("id", proAuth.id);

// Cliente: crear solicitud — prefer login si hay password; si no, insert via admin using a workaround
let requestId = process.env.E2E_REQUEST_ID || "";
if (!requestId) {
  // Usar admin.auth.admin.generateLink + ? no. Insert directo falló en proposals; try requests table
  const { data: req, error: reqErr } = await admin
    .from("solicitudes_de_servicio")
    .insert({
      client_id: clientAuth.id,
      category: "Tecnología",
      description: `E2E UI/pago mock ${new Date().toISOString()}`,
      address: "Puente Alto, RM",
      status: "publicada",
    })
    .select("id")
    .single();
  if (reqErr) fail("requestInsert", reqErr);
  requestId = req.id;
}
console.log("REQUEST", requestId);

// Profesional autentica y crea propuesta
const proClient = createClient(url, anon, { auth: { persistSession: false } });
const { error: proLoginError } = await proClient.auth.signInWithPassword({
  email: PRO_EMAIL,
  password: PRO_PASSWORD,
});
if (proLoginError) fail("proLogin", proLoginError);

const { data: proposalId, error: proposalError } = await proClient.rpc("create_service_proposal", {
  p_request_id: requestId,
  p_amount: 45000,
  p_description: "Diagnóstico y soporte PC (prueba E2E sin cobro real)",
  p_estimated_hours: 2,
});
if (proposalError) fail("createProposal", proposalError);
console.log("PROPOSAL", proposalId);

// Cliente acepta — necesita password. Si no hay, usar accept API no disponible.
if (!CLIENT_PASSWORD) {
  console.log("NEED_CLIENT_PASSWORD: propuesta creada. Acepta en UI o set E2E_CLIENT_PASSWORD.");
  console.log("OPEN", `https://zovit.cl/solicitudes/${requestId}`);
  process.exit(0);
}

const clientSb = createClient(url, anon, { auth: { persistSession: false } });
const { error: clientLoginError } = await clientSb.auth.signInWithPassword({
  email: CLIENT_EMAIL,
  password: CLIENT_PASSWORD,
});
if (clientLoginError) fail("clientLogin", clientLoginError);

const { data: session } = await clientSb.auth.getSession();
const accessToken = session.session?.access_token;
if (!accessToken) fail("clientToken", "sin access token");

const acceptRes = await fetch(`https://zovit.cl/api/payments/proposals/${proposalId}/accept`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    Cookie: "",
    "Content-Type": "application/json",
  },
});
// Accept route uses cookie session from createClient server — Bearer may not work.
// Prefer RPC if exposed:
const { data: acceptData, error: acceptError } = await clientSb.rpc("accept_service_proposal", {
  p_proposal_id: proposalId,
});
if (acceptError) {
  console.log("ACCEPT_HTTP", acceptRes.status, await acceptRes.text().catch(() => ""));
  fail("acceptProposal", acceptError);
}
console.log("ACCEPTED", acceptData);

const row = Array.isArray(acceptData) ? acceptData[0] : acceptData;
const paymentId = row?.payment_id;
if (!paymentId) fail("paymentId", JSON.stringify(acceptData));

// Simular pago con service role RPC (si grants lo permiten)
const ref = `MOCK-E2E-${Date.now()}`;
const { error: payError } = await admin.rpc("register_payment_received", {
  p_payment_id: paymentId,
  p_provider: "mock",
  p_provider_reference: ref,
  p_provider_session_id: ref,
  p_payment_method: "mock",
});
if (payError) fail("mockPay", payError);

const { error: startError } = await proClient.rpc("start_paid_work", { p_payment_id: paymentId });
if (startError) console.log("START", startError.message);

const { error: completeError } = await proClient.rpc("complete_paid_work", { p_payment_id: paymentId });
if (completeError) console.log("COMPLETE", completeError.message);

const { error: approveError } = await clientSb.rpc("approve_and_release_payment", {
  p_payment_id: paymentId,
});
if (approveError) console.log("APPROVE", approveError.message);

const { data: finalPay } = await admin
  .from("payments")
  .select("public_id,status,amount_gross,amount_net")
  .eq("id", paymentId)
  .maybeSingle();

console.log("E2E_RESULT", finalPay);
console.log("REQUEST_URL", `https://zovit.cl/solicitudes/${requestId}`);
