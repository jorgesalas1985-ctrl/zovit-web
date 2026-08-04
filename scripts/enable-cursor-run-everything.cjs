const fs = require("fs");
const path = require("path");
const initSqlJs = require("sql.js");

const STORAGE_KEY =
  "src.vs.platform.reactivestorage.browser.reactiveStorageServiceImpl.persistentStorage.applicationUser";

const dbPath = path.join(
  process.env.APPDATA,
  "Cursor",
  "User",
  "globalStorage",
  "state.vscdb"
);

async function main() {
  if (process.platform === "win32") {
    try {
      const lockProbe = fs.openSync(dbPath, "r+");
      fs.closeSync(lockProbe);
    } catch {
      console.error(
        "Cierra Cursor por completo antes de ejecutar este script (state.vscdb está en uso)."
      );
      process.exit(1);
    }
  }

  const SQL = await initSqlJs({
    locateFile: (file) =>
      path.join(__dirname, "..", "node_modules", "sql.js", "dist", file),
  });

  const backupPath = `${dbPath}.backup-${Date.now()}`;
  fs.copyFileSync(dbPath, backupPath);
  const backupSize = fs.statSync(backupPath).size;
  if (backupSize < 1024) {
    throw new Error("Backup inválido; abortando para no dañar Cursor.");
  }
  console.log("Backup:", backupPath);

  const db = new SQL.Database(fs.readFileSync(dbPath));
  const row = db.exec(
    `SELECT value FROM ItemTable WHERE key = '${STORAGE_KEY.replace(/'/g, "''")}'`
  );

  if (!row[0]?.values?.[0]?.[0]) {
    throw new Error("No se encontró applicationUserPersistentStorage en state.vscdb");
  }

  const data = JSON.parse(row[0].values[0][0]);
  data.composerState = data.composerState || {};
  data.composerState.yoloEnableRunEverything = true;

  if (Array.isArray(data.composerState.modes4)) {
    data.composerState.modes4 = data.composerState.modes4.map((mode) => {
      if (mode?.id !== "agent") return mode;
      return { ...mode, autoRun: true, fullAutoRun: true, smartModeAutoRun: false };
    });
  }

  const updated = JSON.stringify(data);
  db.run("UPDATE ItemTable SET value = ? WHERE key = ?", [updated, STORAGE_KEY]);
  const exported = Buffer.from(db.export());
  db.close();

  if (exported.length < 1024) {
    throw new Error("Exportación inválida; no se escribió nada.");
  }

  fs.writeFileSync(dbPath, exported);

  console.log("OK: Run Everything activado");
  console.log("- yoloEnableRunEverything:", data.composerState.yoloEnableRunEverything);
  const agent = data.composerState.modes4?.find((m) => m.id === "agent");
  console.log("- agent.autoRun:", agent?.autoRun);
  console.log("- agent.fullAutoRun:", agent?.fullAutoRun);
  console.log("\nAbre Cursor de nuevo.");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
