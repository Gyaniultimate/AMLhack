import express from "express";
import { getLastNTxsBTC } from "./data/bitcoin";
import { computeRisk } from "./aml/scorer";
import cors from 'cors';
import { pool } from './db';
import { submitOracleResult, queryOracleData } from './onchain';



const app = express();
app.use(express.json());
app.use(cors({ origin: true }));
// 1) Assess + write on-chain (single POST)
app.post('/assess-and-submit', async (req, res) => {
  try {
    const { address, lookback = 20, highValue } = req.body || {};
    if (!address) return res.status(400).json({ error: 'address is required' });

    const txs = await getLastNTxsBTC(address, lookback);
    const profile = computeRisk(address, txs, {
      highValue: Number(highValue ?? process.env.HIGH_VALUE_THRESHOLD ?? 1_000_000_000),
    });

    // minimal payload to persist on-chain (keep it small!)
    const payload = JSON.stringify({
      v: 1,
      address,
      score: profile.riskScore,
      band: profile.band,
      flags: profile.flags,
      ts: profile.observed_at,
    });

    const { txHash, height } = await submitOracleResult(payload);
    res.json({ ok: true, txHash, height, payload, profile });
  } catch (e:any) {
    console.error(e);
    res.status(500).json({ ok:false, error: e?.message ?? String(e) });
  }
});

// 2) Read back from chain (GET)
app.get('/onchain/latest', async (_req, res) => {
  try {
    const out = await queryOracleData(); // { data?: string }
    res.json({ ok:true, data: out?.data ?? null });
  } catch (e:any) {
    res.status(500).json({ ok:false, error: e?.message ?? String(e) });
  }
});
app.post("/assess", async (req, res) => {
  try {
    const { chain="btc", address, lookback=20, highValue } = req.body || {};
    if (!address) return res.status(400).json({ error: "address is required" });
    if (chain !== "btc") return res.status(400).json({ error: "only btc supported in MVP" });

    const txs = await getLastNTxsBTC(address, lookback);
    const profile = computeRisk(address, txs, {
      highValue: Number(highValue ?? process.env.HIGH_VALUE_THRESHOLD ?? 1_000_000_000) // sats
    });

    res.json({ chain, address, profile });
  } catch (e:any) {
    console.error(e);
    res.status(500).json({ error: e?.message ?? String(e) });
  }
});

// JSON health check that also pings Postgres
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');     // simple DB ping
    res.status(200).json({ ok: true, port: 3000, db: 'up' });
  } catch (e: any) {
    res.status(500).json({ ok: false, port: 3000, db: 'down', error: e?.message });
  }
});

app.listen(Number(process.env.PORT ?? 3000), () => {
  console.log("oracle-service listening on", process.env.PORT ?? 3000);
});
