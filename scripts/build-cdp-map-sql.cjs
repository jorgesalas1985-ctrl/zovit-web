const fs = require("fs");
const path = require("path");

const sql = fs.readFileSync("supabase/SPRINT_MAP_CLIENT_NEARBY.sql");
const b64 = sql.toString("base64");

const expression = `
(async () => {
  const b64 = ${JSON.stringify(b64)};
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const sql = new TextDecoder().decode(bytes);
  const raw = localStorage.getItem("supabase.dashboard.auth.token");
  const { access_token } = JSON.parse(raw);
  const res = await fetch("https://api.supabase.com/v1/projects/rtsfgzyqzcibmtifdfbp/database/query", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + access_token,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  return { status: res.status, body: text.slice(0, 2000), sqlLen: sql.length };
})()
`.trim();

const out = {
  expression,
  returnByValue: true,
  awaitPromise: true,
};

fs.writeFileSync(path.join("scripts", "_cdp_run_map_sql.json"), JSON.stringify(out));
console.log("wrote", Buffer.byteLength(JSON.stringify(out)), "bytes");
