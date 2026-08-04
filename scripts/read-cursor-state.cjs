const fs = require("fs");
const path = require("path");
const initSqlJs = require("sql.js");

const dbPath = path.join(
  process.env.APPDATA,
  "Cursor",
  "User",
  "globalStorage",
  "state.vscdb"
);

async function main() {
  const SQL = await initSqlJs({
    locateFile: (file) =>
      path.join(
        __dirname,
        "..",
        "node_modules",
        "sql.js",
        "dist",
        file
      ),
  });

  const fileBuffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(fileBuffer);

  const rows = db.exec(`
    SELECT key, length(value) as len
    FROM ItemTable
    WHERE key LIKE '%cursor%' OR key LIKE '%anysphere%' OR key LIKE '%application%' OR key LIKE '%composer%'
    ORDER BY key
  `);

  console.log(JSON.stringify(rows, null, 2));

  const target = db.exec(`
    SELECT key, value FROM ItemTable
    WHERE value LIKE '%yoloEnableRunEverything%'
    LIMIT 5
  `);
  console.log("\n--- matches ---");
  for (const row of target[0]?.values || []) {
    console.log("KEY:", row[0]);
    try {
      const parsed = JSON.parse(row[1]);
      console.log(
        "yoloEnableRunEverything:",
        parsed?.composerState?.yoloEnableRunEverything
      );
      const agent = parsed?.composerState?.modes4?.find((m) => m.id === "agent");
      console.log("agent mode:", agent?.autoRun, agent?.fullAutoRun, agent?.smartModeAutoRun);
    } catch (e) {
      console.log("preview:", String(row[1]).slice(0, 200));
    }
  }

  db.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
