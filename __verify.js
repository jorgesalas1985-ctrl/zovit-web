const { Client } = require('pg');
const c = new Client({
  host: 'aws-1-sa-east-1.pooler.supabase.com',
  port: 6543,
  user: 'postgres.rtsfgzyqzcibmtifdfbp',
  password: process.env.ZOVIT_DB_PASSWORD,
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
});

const checks = [
  "select to_regclass('public.worker_credentials') as t",
  "select to_regclass('public.worker_profiles') as t",
  "select to_regclass('public.worker_registrations') as t",
  "select to_regclass('public.issued_certificates') as t",
  "select to_regclass('public.identity_documents') as t",
  "select to_regclass('public.operational_documents') as t",
  "select to_regclass('public.automation_runs') as t",
  "select column_name from information_schema.columns where table_name='profiles' and column_name='account_kind'",
  "select column_name from information_schema.columns where table_name='profiles' and column_name='birth_date'",
];

(async () => {
  await c.connect();
  for (const q of checks) {
    try {
      const r = await c.query(q);
      console.log(q.slice(0, 60), '=>', JSON.stringify(r.rows));
    } catch (e) {
      console.log(q.slice(0, 60), 'ERR', e.message);
    }
  }
  await c.end();
})().catch((e) => console.log('ERR', e.message));
