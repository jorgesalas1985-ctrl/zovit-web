const { Client } = require('pg');
const c = new Client({
  host: 'aws-1-sa-east-1.pooler.supabase.com',
  port: 6543,
  user: 'postgres.rtsfgzyqzcibmtifdfbp',
  password: process.env.ZOVIT_DB_PASSWORD,
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
});

(async () => {
  await c.connect();
  const r1 = await c.query(
    "select column_name from information_schema.columns where table_name='profiles' and column_name='account_kind'"
  );
  console.log('account_kind column exists:', r1.rows.length > 0);
  const r2 = await c.query("select to_regclass('public.worker_credentials') as t");
  console.log('worker_credentials exists:', r2.rows[0].t);
  const r3 = await c.query("select to_regclass('public.issued_certificates') as t");
  console.log('issued_certificates exists:', r3.rows[0].t);
  const r4 = await c.query("select to_regclass('public.worker_profiles') as t");
  console.log('worker_profiles exists:', r4.rows[0].t);
  await c.end();
})().catch((e) => console.log('ERR', e.message));
