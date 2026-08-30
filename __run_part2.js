const fs = require('fs');
const { Client } = require('pg');

const sqlPath = 'C:\\Users\\jorge\\Downloads\\ZOVIT_Web_v5.0_Fase_1_Completa\\ZOVIT_Web_v4.0_Produccion\\__part2.sql';
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
    console.log('Conectado. Ejecutando parte 2 de la migracion...');
    await client.query(sql);
    console.log('OK: parte 2 aplicada sin errores.');
  } catch (err) {
    console.error('ERROR ejecutando parte 2:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
})();
