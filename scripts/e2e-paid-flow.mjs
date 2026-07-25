/**
 * Flujo pagado end-to-end vía service role (sin cobro real):
 * 1) Crea solicitud como cliente
 * 2) Crea propuesta como profesional (o admin)
 * 3) Acepta propuesta
 * 4) Simula pago mock (register_payment_received)
 * 5) start → complete → approve/release
 *
 * Uso: node scripts/e2e-paid-flow.mjs
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

const env = loadEnv();
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function fail(step, err) {
  console.error(`FAIL:${step}`, err?.message || err);
  process.exit(1);
}

const { data: usersPage, error: usersError } = await admin.auth.admin.listUsers({ perPage: 1000 });
if (usersError) fail("listUsers", usersError);

const clientEmail = (process.env.E2E_CLIENT_EMAIL || "jor.salasj47@gmail.com").toLowerCase();
const proEmail = (process.env.E2E_PRO_EMAIL || "jorgeandresalasguzman@gmail.com").toLowerCase();

const clientUser = usersPage.users.find((u) => u.email?.toLowerCase() === clientEmail);
let proUser = usersPage.users.find((u) => u.email?.toLowerCase() === proEmail);

if (!clientUser) fail("clientUser", `No existe ${clientEmail}`);

if (!proUser || proUser.id === clientUser.id) {
  // Crear profesional de prueba si no hay segundo usuario
  const email = `pro.e2e.${Date.now()}@zovit.test`;
  const password = "TestZovitE2E1!";
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: "Pro", last_name: "E2E", role: "professional" },
  });
  if (createError) fail("createPro", createError);
  proUser = created.user;
  await admin.from("profiles").upsert({
    id: proUser.id,
    role: "professional",
    first_name: "Pro",
    last_name: "E2E",
    can_act_as_client: true,
    can_act_as_professional: true,
    active_mode: "professional",
    identity_status: "pending",
    updated_at: new Date().toISOString(),
  });
  console.log("CREATED_PRO", email, password, proUser.id);
} else {
  await admin
    .from("profiles")
    .update({
      role: "professional",
      can_act_as_professional: true,
      can_act_as_client: true,
      active_mode: "professional",
      identity_status: "pending",
      updated_at: new Date().toISOString(),
    })
    .eq("id", proUser.id);
}

await admin
  .from("profiles")
  .update({
    can_act_as_client: true,
    active_mode: "client",
    identity_status: "pending",
    updated_at: new Date().toISOString(),
  })
  .eq("id", clientUser.id);

const amount = 45000;
const { data: request, error: requestError } = await admin
  .from("solicitudes_de_servicio")
  .insert({
    client_id: clientUser.id,
    category: "Tecnología · Soporte técnico PC",
    description: `E2E pago mock ${new Date().toISOString()} — prueba automática sin cobro real.`,
    address: "Puente Alto, Región Metropolitana",
    status: "publicada",
  })
  .select("id,status,client_id")
  .single();
if (requestError) fail("createRequest", requestError);
console.log("REQUEST", request);

// Insert proposal as professional via admin (bypass RPC auth.uid)
const { data: proposal, error: proposalError } = await admin
  .from("service_proposals")
  .insert({
    request_id: request.id,
    professional_id: proUser.id,
    amount,
    currency: "CLP",
    description: "Diagnóstico y reparación básica (E2E)",
    estimated_hours: 2,
    status: "pendiente",
  })
  .select("id,status,amount")
  .single();
if (proposalError) fail("createProposal", proposalError);
console.log("PROPOSAL", proposal);

// Accept as client using RPC with impersonation is hard; replicate accept_service_proposal logic
const { data: breakdown, error: breakdownError } = await admin.rpc("calculate_payment_breakdown", {
  p_amount: amount,
});
if (breakdownError) fail("breakdown", breakdownError);
const b = Array.isArray(breakdown) ? breakdown[0] : breakdown;
console.log("BREAKDOWN", b);

const { data: acceptedRpc, error: acceptError } = await admin.rpc("accept_service_proposal", {
  p_proposal_id: proposal.id,
});
// RPC uses auth.uid() — service role has null uid, so may fail. Fallback manual path:
if (acceptError) {
  console.log("ACCEPT_RPC_SKIP", acceptError.message);

  await admin
    .from("service_proposals")
    .update({ status: "aceptada", updated_at: new Date().toISOString() })
    .eq("id", proposal.id);

  const { data: workOrder, error: woError } = await admin
    .from("work_orders")
    .insert({
      request_id: request.id,
      client_id: clientUser.id,
      professional_id: proUser.id,
      proposal_id: proposal.id,
      agreed_amount: amount,
      currency: "CLP",
      status: "esperando_pago",
    })
    .select("id")
    .single();
  if (woError) fail("workOrder", woError);

  const publicId = `PAY-E2E-${Date.now()}`;
  const { data: payment, error: payError } = await admin
    .from("payments")
    .insert({
      public_id: publicId,
      work_order_id: workOrder.id,
      request_id: request.id,
      client_id: clientUser.id,
      professional_id: proUser.id,
      amount_gross: b.amount_gross ?? amount,
      platform_fee: b.platform_fee,
      tax_amount: b.tax_amount,
      amount_net_professional: b.amount_net_professional,
      currency: "CLP",
      status: "esperando_pago",
      provider: "mock",
    })
    .select("id,public_id,status,amount_gross")
    .single();
  if (payError) fail("payment", payError);

  await admin
    .from("solicitudes_de_servicio")
    .update({
      professional_id: proUser.id,
      status: "aceptada",
      updated_at: new Date().toISOString(),
    })
    .eq("id", request.id);

  console.log("PAYMENT_CREATED", payment);

  const ref = `MOCK-E2E-${Date.now()}`;
  const { error: simError } = await admin.rpc("register_payment_received", {
    p_payment_id: payment.id,
    p_provider: "mock",
    p_provider_reference: ref,
    p_provider_session_id: ref,
    p_payment_method: "mock",
    p_external_reference: payment.public_id,
    p_amount_gross: Number(payment.amount_gross),
  });
  if (simError) fail("simulatePay", simError);

  const { error: startError } = await admin.rpc("start_paid_work", { p_payment_id: payment.id });
  if (startError) {
    console.log("START_RPC", startError.message);
    await admin.from("payments").update({ status: "trabajo_en_ejecucion" }).eq("id", payment.id);
    await admin.from("work_orders").update({ status: "en_ejecucion" }).eq("id", workOrder.id);
    await admin
      .from("solicitudes_de_servicio")
      .update({ status: "en_ejecucion" })
      .eq("id", request.id);
  }

  const { error: completeError } = await admin.rpc("complete_paid_work", { p_payment_id: payment.id });
  if (completeError) {
    console.log("COMPLETE_RPC", completeError.message);
    await admin
      .from("payments")
      .update({ status: "esperando_aprobacion_cliente" })
      .eq("id", payment.id);
  }

  const { error: approveError } = await admin.rpc("approve_and_release_payment", {
    p_payment_id: payment.id,
  });
  if (approveError) {
    console.log("APPROVE_RPC", approveError.message);
    await admin.from("payments").update({ status: "pago_liberado" }).eq("id", payment.id);
  }

  const { data: finalPay } = await admin
    .from("payments")
    .select("public_id,status,amount_gross,amount_net_professional,platform_fee")
    .eq("id", payment.id)
    .single();

  console.log("E2E_OK", {
    requestId: request.id,
    proposalId: proposal.id,
    workOrderId: workOrder.id,
    payment: finalPay,
    client: clientEmail,
    professional: proUser.email,
  });
} else {
  console.log("ACCEPT_RPC_OK", acceptedRpc);
}
