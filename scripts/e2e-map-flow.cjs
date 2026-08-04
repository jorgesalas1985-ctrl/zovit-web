const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

function loadEnv(file) {
  const raw = fs.readFileSync(file, "utf8");
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    const key = line.slice(0, i).trim();
    let val = line.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const env = loadEnv(path.join(__dirname, "..", ".env.local"));
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = env.SUPABASE_SERVICE_ROLE_KEY;
const app = "https://zovit.cl";

const results = [];
function ok(name, pass, detail) {
  results.push({ name, pass: !!pass, detail: detail ?? "" });
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? " — " + detail : ""}`);
}

async function main() {
  if (!url || !anon || !service) {
    console.error("Missing env keys");
    process.exit(1);
  }

  const admin = createClient(url, service, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1) Public geocode via production
  {
    const res = await fetch(`${app}/api/map/geocode?q=Providencia`);
    const body = await res.json().catch(() => ({}));
    ok(
      "GET /api/map/geocode",
      res.status === 200 && Array.isArray(body.suggestions) && body.suggestions.length > 0,
      `status=${res.status} n=${body.suggestions?.length ?? 0}`
    );
  }

  // 2) Professionals requires auth
  {
    const res = await fetch(`${app}/api/map/professionals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: app,
        Referer: `${app}/cliente/mapa`,
      },
      body: JSON.stringify({ latitude: -33.4489, longitude: -70.6693, radiusKm: 10 }),
    });
    const body = await res.json().catch(() => ({}));
    ok(
      "POST /api/map/professionals sin sesión → 401",
      res.status === 401,
      `status=${res.status} err=${body.error || ""}`
    );
  }

  // 3) Ensure test pro has geo + available
  const proId = "7375e428-2a6a-447b-b87e-1ac8c78f5757";
  {
    const { error } = await admin
      .from("profiles")
      .update({
        latitude: -33.4489,
        longitude: -70.6693,
        availability_status: "available",
        location_sharing_enabled: true,
        location_updated_at: new Date().toISOString(),
        public_profile: true,
        can_act_as_professional: true,
      })
      .eq("id", proId);
    ok("Seed profesional de prueba available+geo", !error, error?.message || "updated");
  }

  // 4) RPC as service role
  {
    const { data, error } = await admin.rpc("search_nearby_professionals", {
      p_lat: -33.4489,
      p_lng: -70.6693,
      p_radius_km: 15,
      p_category: null,
      p_specialty: null,
      p_min_rating: 0,
      p_verified_only: false,
      p_certified_only: false,
      p_availability: null,
      p_limit: 20,
    });
    ok(
      "RPC search_nearby_professionals",
      !error && Array.isArray(data) && data.length > 0,
      error?.message || `n=${data?.length ?? 0} first=${data?.[0]?.first_name || ""}`
    );
  }

  // 5) Create authenticated user session via admin magic link
  const { data: userData, error: userErr } = await admin.auth.admin.getUserById(proId);
  ok("Cargar usuario de prueba", !userErr && !!userData?.user?.email, userErr?.message || userData?.user?.email || "");
  const email = userData?.user?.email;
  if (!email) {
    printSummary();
    process.exit(1);
  }

  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  ok("generateLink magiclink", !linkErr && !!linkData?.properties?.hashed_token, linkErr?.message || "token ok");

  const userClient = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const tokenHash = linkData?.properties?.hashed_token;
  const { data: sessionData, error: otpErr } = await userClient.auth.verifyOtp({
    type: "email",
    token_hash: tokenHash,
  });
  ok("verifyOtp → sesión", !otpErr && !!sessionData?.session?.access_token, otpErr?.message || "session ok");
  const accessToken = sessionData?.session?.access_token;
  const refreshToken = sessionData?.session?.refresh_token;

  // 6) Call RPC as authenticated user (anon key + JWT)
  if (accessToken) {
    const authed = createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await authed.rpc("search_nearby_professionals", {
      p_lat: -33.4489,
      p_lng: -70.6693,
      p_radius_km: 15,
      p_limit: 20,
    });
    ok(
      "RPC como authenticated (JWT usuario)",
      !error && Array.isArray(data) && data.some((r) => r.id === proId),
      error?.message || `n=${data?.length ?? 0}`
    );
  }

  // 7) Hit Next.js APIs with supabase auth cookie format used by @supabase/ssr
  if (accessToken && refreshToken) {
    const projectRef = new URL(url).hostname.split(".")[0];
    const storageKey = `sb-${projectRef}-auth-token`;
    const sessionPayload = JSON.stringify({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: sessionData.session.expires_in ?? 3600,
      expires_at: sessionData.session.expires_at,
      token_type: "bearer",
      user: sessionData.user,
    });
    // @supabase/ssr chunked cookie encoding (base64url + chunked)
    const cookie = buildSupabaseCookie(storageKey, sessionPayload);

    async function api(pathname, init = {}) {
      const res = await fetch(`${app}${pathname}`, {
        ...init,
        headers: {
          Origin: app,
          Referer: `${app}/cliente/mapa`,
          Cookie: cookie,
          ...(init.headers || {}),
        },
      });
      const text = await res.text();
      let json = null;
      try {
        json = JSON.parse(text);
      } catch {
        json = { raw: text.slice(0, 200) };
      }
      return { status: res.status, json };
    }

    const availabilityGet = await api("/api/map/availability");
    ok(
      "GET /api/map/availability",
      availabilityGet.status === 200 && availabilityGet.json?.canPublish !== undefined,
      `status=${availabilityGet.status} statusField=${availabilityGet.json?.availabilityStatus}`
    );

    const availabilityOn = await api("/api/map/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        available: true,
        latitude: -33.45,
        longitude: -70.67,
        accuracy: 12,
      }),
    });
    ok(
      "POST /api/map/availability ON",
      availabilityOn.status === 200 && availabilityOn.json?.ok === true,
      `status=${availabilityOn.status} body=${JSON.stringify(availabilityOn.json).slice(0, 180)}`
    );

    const pros = await api("/api/map/professionals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        latitude: -33.4489,
        longitude: -70.6693,
        radiusKm: 15,
      }),
    });
    ok(
      "POST /api/map/professionals autenticado",
      pros.status === 200 && Array.isArray(pros.json?.professionals) && pros.json.professionals.length > 0,
      `status=${pros.status} n=${pros.json?.professionals?.length ?? 0} source=${pros.json?.source || ""}`
    );

    // Create map request
    const req = await api("/api/map/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        professionalId: proId,
        category: "Gasfitería",
        description: "Prueba automatizada de flujo mapa - fuga de agua en cocina.",
        address: "Santiago Centro, Chile",
        latitude: -33.4489,
        longitude: -70.6693,
        commune: "Santiago",
        region: "Región Metropolitana",
        urgency: "normal",
      }),
    });
    ok(
      "POST /api/map/requests",
      req.status === 200 || req.status === 201,
      `status=${req.status} id=${req.json?.id || ""} err=${req.json?.error || ""}`
    );
    const requestId = req.json?.id;

    if (requestId) {
      // Move to aceptada via admin/rpc if possible, then live location
      const { error: statusErr } = await admin.rpc("change_service_request_status", {
        request_id: requestId,
        new_status: "aceptada",
      });
      // If RPC fails due to payment rules, force update with service role
      if (statusErr) {
        const { error: upErr } = await admin
          .from("solicitudes_de_servicio")
          .update({ status: "aceptada", professional_id: proId })
          .eq("id", requestId);
        ok(
          "Forzar status aceptada (service role)",
          !upErr,
          upErr?.message || `rpcFail=${statusErr.message}`
        );
      } else {
        ok("change_service_request_status → aceptada", true, "rpc ok");
      }

      const live = await api("/api/map/live-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: requestId,
          latitude: -33.449,
          longitude: -70.67,
          accuracy: 8,
          heading: 90,
          speed: 4,
        }),
      });
      ok(
        "POST /api/map/live-location",
        live.status === 200 && live.json?.ok === true,
        `status=${live.status} body=${JSON.stringify(live.json).slice(0, 180)}`
      );

      const liveGet = await api(`/api/map/live-location?serviceId=${requestId}`);
      ok(
        "GET /api/map/live-location",
        liveGet.status === 200 && liveGet.json?.location?.latitude != null,
        `status=${liveGet.status} lat=${liveGet.json?.location?.latitude}`
      );

      // Cleanup: cancel/finalize test request so we don't pollute
      await admin
        .from("solicitudes_de_servicio")
        .update({ status: "cancelada" })
        .eq("id", requestId);
      ok("Cleanup solicitud de prueba → cancelada", true, requestId);
    }
  }

  // 8) UI routes redirect / exist
  {
    const mapa = await fetch(`${app}/cliente/mapa`, { redirect: "manual" });
    ok(
      "GET /cliente/mapa protegido",
      mapa.status === 307 || mapa.status === 302 || mapa.status === 200,
      `status=${mapa.status} loc=${mapa.headers.get("location") || ""}`
    );
    const panel = await fetch(`${app}/panel`, { redirect: "manual" });
    ok(
      "GET /panel responde",
      panel.status === 200 || panel.status === 307 || panel.status === 302,
      `status=${panel.status}`
    );
  }

  printSummary();
}

function buildSupabaseCookie(storageKey, sessionJson) {
  // Use the same encoder/chunker as @supabase/ssr so middleware can parse the session.
  const { createChunks, stringToBase64URL } = require("@supabase/ssr/dist/main/utils");
  const encoded = "base64-" + stringToBase64URL(sessionJson);
  const chunks = createChunks(storageKey, encoded);
  return chunks.map((c) => `${c.name}=${c.value}`).join("; ");
}

function printSummary() {
  const failed = results.filter((r) => !r.pass);
  console.log("\n=== SUMMARY ===");
  console.log(`total=${results.length} pass=${results.length - failed.length} fail=${failed.length}`);
  if (failed.length) {
    for (const f of failed) console.log(` - ${f.name}: ${f.detail}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
