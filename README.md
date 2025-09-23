# AML Smart-Contract Oracle (Cosmos + Postgres) — Hackathon MVP

--

## Team

**Team Name:** VGBoost  
**Team Members:**  
- Gyanendra Prakash  
- Vaishvi

---


This repo contains a working end-to-end MVP that:

- Runs a local Cosmos chain
- Deploys a CosmWasm contract that accepts signed oracle updates and exposes queries
- Ingests a slice of Bitcoin transaction data into Postgres
- Exposes an oracle-service (Node/TS) that computes a basic AML risk score for a wallet
- Has a single-file UI to call the service and (optionally) write results on-chain

It’s intentionally simple so judges can run it quickly and see the whole flow.

---

## Quick Start (5–10 min)

### 0) Prereqs

- Node 18+ and npm
- Docker Desktop (for Postgres)
- Rust toolchain (if you want to rebuild the contract)
- jq (optional, for curl output)

### 1) Clone & install

```sh
git clone https://github.com/Gyaniultimate/AMLhack.git
cd AMLhack
```

### 2) Start infrastructure

#### Postgres with datasets

If you haven’t already, start the DB container and load the small BTC sample (already done for judges in our demo environment).

```sh
docker compose up -d postgres
docker exec -it postgres psql -U postgres -c "\l"
```

#### Local chain

Start the dev chain (if not already running):

- RPC:      http://localhost:26657
- REST:     http://localhost:1317

If you followed the workshop bootstrap, your chain is `my-chain` and the contract is already deployed. If not, deploy the WASM and set the oracle pubkey (see On-chain setup below).

### 3) Configure the oracle-service

Create `oracle-service/.env` (do not commit this file):

```
# chain
RPC_URL=http://localhost:26657
CHAIN_ID=my-chain
CONTRACT_ADDRESS=wasm1...your_contract_address...

# fee payer (has gas on local chain)
WALLET_MNEMONIC="candy maple cake sugar ..."

# oracle signing key (secp256k1 private key hex). Its pubkey must be stored in the contract.
ORACLE_PRIVKEY=5d15d2...

# DB
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=password
PGDATABASE=bitcoin

# service
PORT=3000
HIGH_VALUE_THRESHOLD=1000000000  # sats (10 BTC)
```

Install deps and run:

```sh
cd oracle-service
npm i
npx ts-node src/app.ts
# -> oracle-service listening on http://localhost:3000
```

#### Health check

```sh
curl -s http://localhost:3000/health | jq
# { "ok": true, "port": 3000, "db": "up" }
```

### 4) Open the mini UI

The UI is a single static file.

```sh
npx http-server ui -p 8080   # or `npx serve ui -l 8080`
# visit http://localhost:8080
```

Set Endpoint: `http://localhost:3000`

Click Health, then Assess with a known address from your dataset (e.g. one you queried from Postgres).

Optional: Assess + Write (writes result to chain) and Read On-Chain (reads the last stored JSON from the contract).

---

## What’s Running

### 1) Oracle Service (Node/TypeScript)

- Connects to Postgres (pg), queries recent txs for an address (deduped/aggregated)
- Computes a transparent MVP risk score:
  - Flags high value transfers (threshold configurable)
  - Simple recency/streak features
  - Produces `{ riskScore, band, isCompliant, flags, evidence }`

**Endpoints:**

- `GET /health` → JSON `{ ok, db, port }`
- `POST /assess` → compute profile off-chain and return JSON
- `POST /assess-and-submit` → compute, sign with oracle key, and execute contract `oracle_data_update`
- `GET /onchain/latest` → query contract `get_oracle_data`

Signing uses `@noble/secp256k1` (compact 64-byte sig) with message = `sha256(utf8(data))` to match CosmWasm `secp256k1_verify`.

### 2) CosmWasm Contract (Rust)

Stores:

- admin (address that can update oracle pubkey)
- oracle_pubkey (compressed secp256k1 pubkey bytes; base64 in JSON)
- oracle_key_type (secp256k1)
- latest oracle_data (string)

Executes:

- `OracleDataUpdate { data, signature }`
  - Verifies signature against oracle_pubkey using sha256(data). On success, stores data and emits event.
- `UpdateOracle { new_pubkey, new_key_type }` (admin-only)
- (also includes a simple Send example)

Queries:

- `GetOracleData {}` → `{ data?: string }`
- `GetOraclePubkey {}` → `{ pubkey, key_type }`
- `GetAdmin {}` → `{ admin }`

### 3) Postgres Dataset

Table: `public.transactions` (wide, denormalized slice with input_addresses, output_addresses, value columns, timestamps).

The oracle uses a CTE to dedupe and aggregate per-tx:

- Sums values per address per tx for input/out
- Computes net_value = out - in
- Orders by timestamp and limits lookback

---

## Demo Script (2–3 minutes)

- Health in the UI → shows API OK and DB up.
- Paste an address from your dataset, set Lookback (20), threshold (1e9 sats).
- Click Assess → Show returned riskScore, band, flags, and Evidence block.
- Click Assess + Write → Show txHash and height.
- Click Read On-Chain → JSON payload stored in contract (address, score, band, ts).

This proves off-chain scoring + on-chain anchoring + query.

---

## On-chain Setup (if redeploying)

Build & deploy contract (standard CosmWasm flow; abbreviated here).

Instantiate with your oracle public key (compressed secp256k1, base64).

If you change the oracle signer, run:

```json
{
  "update_oracle": {
    "new_pubkey": "<base64-33B-compressed>",
    "new_key_type": "secp256k1"
  }
}
```

Fund the WALLET_MNEMONIC account with gas tokens (bank send / faucet).

---

## .env Template (do NOT commit)

```
RPC_URL=http://localhost:26657
CHAIN_ID=my-chain
CONTRACT_ADDRESS=wasm1...contract...
WALLET_MNEMONIC="candy maple cake sugar pudding cream honey rich smooth crumble sweet treat"
ORACLE_PRIVKEY=5d15d2...   # 32B hex; pubkey must match contract state

PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=password
PGDATABASE=bitcoin

PORT=3000
HIGH_VALUE_THRESHOLD=1000000000
```

---

## Repository Layout

```
.
├─ contract/                # CosmWasm contract (Rust)
│  └─ src/{contract.rs,msg.rs,state.rs}
├─ oracle-service/          # Node/TS oracle
│  ├─ src/
│  │  ├─ app.ts             # express server + routes
│  │  ├─ db.ts              # pg pool + helper
│  │  ├─ data/bitcoin.ts    # SQL for last-N tx aggregation
│  │  ├─ aml/scorer.ts      # simple rule-based scoring
│  │  └─ onchain.ts         # submit/query via CosmJS + signature
│  └─ .env                  # local only (ignored)
├─ ui/
│  └─ index.html            # single-file mini UI
└─ data/                    # ignored; large datasets kept locally
   └─ .gitkeep
```

---

## How the Risk Score Works (MVP)

Transparent rule-based scoring (easy to demo and extend):

- High value: if any tx value ≥ threshold → +15 pts (high_value flag)
- Burstiness/recency: many tx in last 24–72h → +10–20 pts (optional if time permits)
- Net outflow 7d: negative flows → +5 pts
- Age: very new wallet with burst of activity → +20 pts

**Bands:**

- 0–29 LOW (allow)
- 30–59 MEDIUM (monitor)
- 60–79 HIGH (needs review)
- 80–100 CRITICAL (block)

The service returns:

```json
{
  "riskScore": 65,
  "band": "HIGH",
  "isCompliant": false,
  "flags": ["high_value"],
  "evidence": { "age_days": 5808.7, "tx_24h": 0, "tx_7d": 0, "net_7d": 0 }
}
```

---

## Proposed Better Solution (Post-MVP Roadmap)

**Event-Driven Oracle**

- Contract emits `RequestAmlCheck{address, req_id}`
- Oracle listens via WS, computes, signs, and calls `SubmitAmlResult{req_id, result}`
- Contract stores result per req_id, enforces authorized oracle

**Richer Features & Data**

- Full address graph (fan-in/fan-out, clusters, reuse patterns)
- Velocity, periodicity, counterparties by risk level
- External intel (sanctions, mixers, darknet) via reproducible lists

**ML/LLM Hybrid**

- Gradient-boosted model or logistic regression over features
- LLM for explainability narratives (why flagged, recommended action)

**Multi-chain**

- Add Ethereum tables (transfers/logs), unifying risk across chains

**Attestation & Auditability**

- Sign payloads & store hashes on-chain (not full data), keeping state small
- Include model version, feature vector hash, and oracle ID for traceability

**Performance**

- Precompute a tx_addresses table (flattened index) to serve lookups in O(log n)
- Materialized views / incremental loaders for larger datasets

---

## Troubleshooting

- **CORS in UI** → add to `src/app.ts`:
  ```js
  import cors from "cors";
  app.use(cors({ origin: true }));
  ```
- **DB errors** → check .env PG vars; docker ps and:
  ```sh
  docker exec -it postgres psql -U postgres -d bitcoin -c "\dt"
  ```
- **Signature verification failed** → the contract’s oracle_pubkey must match
  `@noble/secp256k1.getPublicKey(ORACLE_PRIVKEY, true)` (base64). Update via UpdateOracle.
- **Gas / insufficient funds** → fund WALLET_MNEMONIC on the local chain.
- **Git large files** → `data/**` is ignored. If pushed earlier, rewrite history (see repo notes).

---

## Security Notes

- Never commit .env or private keys/mnemonics
- Treat this as a demo; rotate keys after the event
- In production, sign in HSM/KMS, and store only hashes of AML results on-chain

---

## License & Credits

Built with CosmWasm, CosmJS, Postgres, and @noble/secp256k1.

Public blockchain sample datasets courtesy of community resources (referenced in the event brief).

MIT License (adjust as needed).

---

## Appendix — Useful Commands

**DB peek**
```sh
docker exec -it postgres psql -U postgres -d bitcoin -c "SELECT COUNT(*) FROM transactions;"
```

**Address activity (last 20 unique tx)**
```sql
WITH ins_raw AS (
  SELECT DISTINCT hash, block_timestamp, input_value_1
  FROM public.transactions
  WHERE lower(input_addresses) = lower('<addr>')
),
outs_raw AS (
  SELECT DISTINCT hash, block_timestamp, output_value_1
  FROM public.transactions
  WHERE lower(output_addresses) = lower('<addr>')
),
ins AS (
  SELECT hash, block_timestamp, SUM(input_value_1) AS in_value
  FROM ins_raw GROUP BY 1,2
),
outs AS (
  SELECT hash, block_timestamp, SUM(output_value_1) AS out_value
  FROM outs_raw GROUP BY 1,2
)
SELECT coalesce(i.hash,o.hash) AS tx_hash,
       coalesce(i.block_timestamp,o.block_timestamp) AS ts,
       coalesce(out_value,0) AS out_value,
       coalesce(in_value,0) AS in_value,
       coalesce(out_value,0) - coalesce(in_value,0) AS net_value
FROM ins i FULL JOIN outs o USING (hash, block_timestamp)
ORDER BY ts DESC LIMIT 20;
```
