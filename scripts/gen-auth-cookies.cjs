const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const { createChunks, stringToBase64URL } = require("@supabase/ssr/dist/main/utils");

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
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const proId = "7375e428-2a6a-447b-b87e-1ac8c78f5757";
  const { data: u } = await admin.auth.admin.getUserById(proId);
  const { data: link } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: u.user.email,
  });
  const { data: sessionData, error } = await anon.auth.verifyOtp({
    type: "email",
    token_hash: link.properties.hashed_token,
  });
  if (error) throw error;

  const storageKey = "sb-rtsfgzyqzcibmtifdfbp-auth-token";
  const sessionJson = JSON.stringify(sessionData.session);
  const encoded = "base64-" + stringToBase64URL(sessionJson);
  const chunks = createChunks(storageKey, encoded);
  const cookies = chunks.map((c) => ({
    name: c.name,
    value: c.value,
    domain: "zovit.cl",
    path: "/",
    secure: true,
    httpOnly: false,
    sameSite: "Lax",
  }));
  fs.writeFileSync(path.join(__dirname, "_auth_cookies.json"), JSON.stringify(cookies, null, 2));
  console.log("cookies", cookies.length, "names", cookies.map((c) => c.name).join(","));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
