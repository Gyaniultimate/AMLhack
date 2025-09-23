// src/db-test.ts
import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.PGHOST ?? 'localhost',
  port: Number(process.env.PGPORT ?? 5432),
  user: process.env.PGUSER ?? 'postgres',
  password: process.env.PGPASSWORD ?? 'password',
  database: process.env.PGDATABASE ?? 'bitcoin',
});

async function main() {
  console.log('Connecting to', {
    host: pool.options.host,
    port: pool.options.port,
    db: pool.options.database,
    user: pool.options.user,
  });

  try {
    const client = await pool.connect();
    console.log('✅ Connected');

    // Pick ONE of these depending on how your loader created tables:

    // Case A: inside DB "bitcoin" with table "transactions"
    // const q = 'SELECT COUNT(*) AS c FROM transactions';

    // Case B: tables are schema-qualified (e.g., public.bitcoin_transactions)
    // const q = 'SELECT COUNT(*) AS c FROM public.transactions';

    // Case C: DB "ethereum"
    // const q = 'SELECT COUNT(*) AS c FROM transactions';

    // If unsure, list tables:
    // const q = `
    //   SELECT table_schema, table_name
    //   FROM information_schema.tables
    //   WHERE table_type = 'BASE TABLE'
    //   ORDER BY 1,2
    // `;

    const q = 'SELECT COUNT(*) AS c FROM transactions';
    const { rows } = await client.query(q);
    console.log('Rows:', rows[0]);

    client.release();
  } catch (e) {
    console.error('❌ DB error:', e);
  } finally {
    await pool.end();
    console.log('Closed connection.');
  }
}

main();
