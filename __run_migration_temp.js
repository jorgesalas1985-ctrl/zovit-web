const fs = require('fs');
const { Client } = require('pg');

const sqlPath = 'C:\\\\Users\\\\jorge\\\\.copilot\\\\session-state\\\\185d9295-bfbd-4d4a-bfe5-2e38cc9783c4\\\\files\\\\MIGRACION_CONSOLIDADA.sql';
let sql = fs.readFileSync(sqlPath, 'utf8');
if (sql.charCodeAt(0) === 0xFEFF) {
  sql = sql.slice(1);
}

const password = (process.env.ZOVIT_DB_PASSWORD || '').trim();
if (!password) {
  console.error('Falta ZOVIT_DB_PASSWORD en el entorno');
  process.exit(1);
}

const client = new Client({
  host: 'aws-1-sa-east-1.pooler.supabase.com',
  port: 6543,
  user: 'postgres.rtsfgzyqzcibmtifdfbp',
  password,
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
});

(async () => {
  try {
    await client.connect();
    console.log('Conectado. Ejecutando migracion...');
    await client.query(sql);
    console.log('OK: migracion aplicada sin errores.');
  } catch (err) {
    console.error('ERROR ejecutando migracion:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
})();
