import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({
  host: process.env.PGHOST ?? "localhost",
  port: Number(process.env.PGPORT ?? 5432),
  user: process.env.PGUSER ?? "postgres",
  password: process.env.PGPASSWORD ?? "password",
  database: process.env.PGDATABASE ?? "bitcoin",
});

const address = (process.argv[2] ?? "").toLowerCase();
const limit = Number(process.argv[3] ?? 20);

if (!address) {
  console.error("Usage: npx ts-node src/run-sql.ts <address> [limit]");
  process.exit(1);
}

const sql = `
WITH flat AS (
  SELECT hash, block_timestamp, 'in' AS side, input_value_1 AS value,
         regexp_split_to_table(regexp_replace(coalesce(input_addresses,''),'[\\{\\}\\[\\]]','','g'), ',') AS raw_addr
  FROM public.transactions WHERE input_addresses IS NOT NULL
  UNION ALL
  SELECT hash, block_timestamp, 'out', output_value_1,
         regexp_split_to_table(regexp_replace(coalesce(output_addresses,''),'[\\{\\}\\[\\]]','','g'), ',')
  FROM public.transactions WHERE output_addresses IS NOT NULL
)
SELECT hash AS tx_hash, block_timestamp AS ts, side, value,
       lower(trim(both ' "' from raw_addr)) AS address
FROM flat
WHERE lower(trim(both ' "' from raw_addr)) = $1
ORDER BY ts DESC
LIMIT $2
`;

(async () => {
  const c = await pool.connect();
  try {
    const { rows } = await c.query(sql, [address, limit]);
    console.log(`Found ${rows.length} rows`);
    console.table(rows.slice(0, 5));
  } finally {
    c.release();
    await pool.end();
  }
})();
