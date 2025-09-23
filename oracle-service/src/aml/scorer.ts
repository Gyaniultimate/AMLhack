export type TxAgg = { timestamp:number; out_value:number; in_value:number; net_value:number; };
export type Profile = {
  riskScore:number; band:"LOW"|"MEDIUM"|"HIGH"|"CRITICAL";
  isCompliant:boolean; flags:string[];
  observed_at:number; lastN:number;
  evidence: Record<string, any>;
};

const now = () => Math.floor(Date.now()/1000);

export function computeRisk(address:string, txs:TxAgg[], cfg:{highValue:number}) : Profile {
  const N = txs.length;
  const tNow = now();
  const DAY = 86400, WEEK = 7*DAY;

  // basic features
  const tx24h = txs.filter(t => t.timestamp >= tNow - DAY).length;
  const tx7d  = txs.filter(t => t.timestamp >= tNow - WEEK).length;
  const firstSeen = txs.length ? txs[txs.length-1].timestamp : tNow;
  const ageDays = (tNow - firstSeen)/DAY;

  const hasHighValue = txs.some(t => Math.max(t.out_value, t.in_value) >= cfg.highValue);
  const net7d = txs.filter(t => t.timestamp >= tNow - WEEK)
                   .reduce((s,t)=>s + t.net_value, 0);

  // simple flags
  const flags:string[] = [];
  if (ageDays < 7 && tx24h >= 5) flags.push("new_wallet_burst");
  if (hasHighValue) flags.push("high_value");
  if (net7d < 0) flags.push("net_outflow_7d");

  // score (transparent)
  let score = 50;
  if (ageDays < 7 && tx24h >= 5) score += 20;
  if (hasHighValue) score += 15;
  if (tx7d >= 15) score += 10;
  score = Math.max(0, Math.min(100, score));

  const band = score >= 80 ? "CRITICAL" : score >= 60 ? "HIGH" : score >= 30 ? "MEDIUM" : "LOW";
  const isCompliant = !(band === "HIGH" || band === "CRITICAL");

  return {
    riskScore: score, band, isCompliant, flags,
    observed_at: tNow, lastN: N,
    evidence: { age_days: +ageDays.toFixed(2), tx_24h: tx24h, tx_7d: tx7d, net_7d: net7d }
  };
}
