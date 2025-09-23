import { withClient } from "../db";

export type BtcTxAgg = {
  tx_hash: string;
  timestamp: number; // unix seconds
  out_value: number;
  in_value: number;
  net_value: number;
};

export async function getLastNTxsBTC(address: string, n = 20): Promise<BtcTxAgg[]> {
  const sql = `
  WITH ins_raw AS (
    SELECT DISTINCT hash, block_timestamp, input_value_1
    FROM public.transactions
    WHERE lower(input_addresses) = lower($1)
  ),
  outs_raw AS (
    SELECT DISTINCT hash, block_timestamp, output_value_1
    FROM public.transactions
    WHERE lower(output_addresses) = lower($1)
  ),
  ins AS (
    SELECT hash AS tx_hash, block_timestamp AS ts, SUM(input_value_1) AS in_value
    FROM ins_raw GROUP BY hash, block_timestamp
  ),
  outs AS (
    SELECT hash AS tx_hash, block_timestamp AS ts, SUM(output_value_1) AS out_value
    FROM outs_raw GROUP BY hash, block_timestamp
  ),
  unioned AS (
    SELECT
      COALESCE(i.tx_hash, o.tx_hash) AS tx_hash,
      COALESCE(i.ts,     o.ts)       AS ts,
      COALESCE(i.in_value, 0)        AS in_value,
      COALESCE(o.out_value, 0)       AS out_value
    FROM ins i
    FULL OUTER JOIN outs o
      ON i.tx_hash = o.tx_hash AND i.ts = o.ts
  )
  SELECT tx_hash, ts, out_value, in_value, (out_value - in_value) AS net_value
  FROM unioned
  ORDER BY ts DESC
  LIMIT $2
  `;
  return withClient(async (c) => {
    const { rows } = await c.query(sql, [address, n]);
    return rows.map((r: any) => ({
      tx_hash: r.tx_hash,
      timestamp: Math.floor(new Date(r.ts).getTime() / 1000),
      out_value: Number(r.out_value ?? 0),
      in_value: Number(r.in_value ?? 0),
      net_value: Number(r.net_value ?? 0),
    }));
  });
}
