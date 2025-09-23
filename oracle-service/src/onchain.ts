// src/onchain.ts
import 'dotenv/config';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { toUtf8 } from '@cosmjs/encoding';
import { sha256 } from '@cosmjs/crypto';
import * as secp from '@noble/secp256k1';

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (clean.length % 2) throw new Error('Invalid hex length');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.substr(i*2, 2), 16);
  return out;
}



const RPC_URL  = process.env.RPC_URL  || 'http://localhost:26657';
const CHAIN_ID = process.env.CHAIN_ID || 'my-chain';
const CONTRACT = process.env.CONTRACT_ADDRESS!; // <-- matches your .env
const MNEMONIC = process.env.WALLET_MNEMONIC!;
const ORACLE_PRIV = process.env.ORACLE_PRIVKEY!; // 32-byte hex

export async function getClient() {
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(MNEMONIC, { prefix: 'wasm' });
  const [account] = await wallet.getAccounts();
  const client = await SigningCosmWasmClient.connectWithSigner(RPC_URL, wallet);
  return { client, sender: account.address };
}

/** Sign arbitrary data with oracle privkey; returns 64-byte compact (r||s), not DER */
export async function signOracleData(data: string): Promise<Uint8Array> {
  const privHex = process.env.ORACLE_PRIVKEY!;            // e.g. "5d15d2..."
  const privBytes = hexToBytes(process.env.ORACLE_PRIVKEY!);
      // hex -> Uint8Array
  const hash = sha256(toUtf8(data));                      // Uint8Array(32)
  const sig = await secp.signAsync(hash, privBytes); // 64-byte compact
  return new Uint8Array(sig);
}
export async function submitOracleResult(data: string) {
  const { client, sender } = await getClient();
  const signature = await signOracleData(data);   // <-- await

  const msg = {
    oracle_data_update: {
      data,
      signature,              // Uint8Array; CosmJS encodes it as bytes
    },
  };

  const result = await client.execute(sender, CONTRACT, msg, 'auto');
  return { txHash: result.transactionHash, height: result.height };
}

export async function queryOracleData() {
  const { client } = await getClient();
  return client.queryContractSmart(CONTRACT, { get_oracle_data: {} }); // -> { data?: string }
}

/** (Optional) derive compressed pubkey from ORACLE_PRIVKEY (should match on-chain oracle_pubkey) */
export function derivedOraclePubkeyBase64(): string {
  const privBytes = hexToBytes(ORACLE_PRIV);         // Convert hex string to bytes
  const pub = secp.getPublicKey(privBytes, true);               // 33 bytes compressed
  return Buffer.from(pub).toString('base64');
}
