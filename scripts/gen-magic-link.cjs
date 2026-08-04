const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

function loadEnv(file) {
  const out = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    let val = line.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[line.slice(0, i).trim()] = val;
  }
  return out;
}

async function main() {
  const env = loadEnv(path.join(__dirname, "..", ".env.local"));
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const proId = "7375e428-2a6a-447b-b87e-1ac8c78f5757";
  await admin
    .from("profiles")
    .update({
      latitude: -33.4489,
      longitude: -70.6693,
      availability_status: "available",
      location_sharing_enabled: true,
      location_updated_at: new Date().toISOString(),
      public_profile: true,
      can_act_as_professional: true,
      active_mode: "client",
    })
    .eq("id", proId);

  const { data: u, error: uErr } = await admin.auth.admin.getUserById(proId);
  if (uErr) throw uErr;
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: u.user.email,
    options: { redirectTo: "https://zovit.cl/auth/callback?next=/cliente/mapa" },
  });
  if (error) throw error;
  const link = data.properties.action_link;
  fs.writeFileSync(path.join(__dirname, "_magic_link.txt"), link, "utf8");
  console.log("OK", link.slice(0, 80) + "...");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
