import type { Network } from "@sango/types";

/**
 * Endpoint RPC par défaut.
 *
 * Depuis que le nœud Rust renvoie les headers `Access-Control-*` (preflight
 * OPTIONS inclus), on peut appeler directement depuis le navigateur — plus
 * besoin de proxy Vite.
 *
 * Surchargable via `VITE_SANGO_RPC_URL` (prod : URL HTTPS publique).
 */
export const DEFAULT_ENDPOINT =
  import.meta.env.VITE_SANGO_RPC_URL ?? "http://127.0.0.1:8545";

export const DEFAULT_NETWORK: Network =
  import.meta.env.VITE_SANGO_NETWORK ?? "testnet";

/**
 * Endpoints connus par réseau.
 *
 * ⚠️ Testnet/Mainnet publics ne sont PAS déployés (cf. backend P3).
 *    Le devnet local reste la seule cible opérationnelle.
 */
export const NETWORK_ENDPOINTS: Record<Network, string> = {
  mainnet: "",
  testnet: DEFAULT_ENDPOINT,
};


/** Auto-lock après inactivité (15 min). */
export const AUTO_LOCK_MS = 15 * 60 * 1000;

/** Clipboard auto-clear (30 s). */
export const CLIPBOARD_CLEAR_MS = 30 * 1000;

/**
 * Table des gas fixes par TxKind (Freeze).
 */
export const GAS_BY_TX_KIND: Record<number, bigint> = {
  0x01: 21_000n, // Transfer
  0x02: 21_000n, // ContractCall
  0x03: 21_000n, // ContractCreate
  0x04: 50_000n, // Bond
  0x05: 50_000n, // Unbond
  0x06: 80_000n, // Delegate
  0x07: 80_000n, // Undelegate
  0x08: 40_000n, // ClaimRewards
  0x09: 200_000n, // RegisterValidator
  0x0a: 30_000n, // UpdateCommission
  0x0b: 30_000n, // Unjail
};

/**
 * Max fee par défaut (base units / gas).
 *
 * ⚠️ En attendant `sango_baseFee`, hardcodé. Au devnet actuel, la base
 *    fee initiale est 1 et ne bouge pas tant que les blocs sont vides.
 */
export const DEFAULT_MAX_FEE = 1_000n;
export const DEFAULT_PRIORITY_FEE = 0n;

/**
 * Base URL de l'explorer web.
 *
 * Résolution (préférée → fallback) :
 *   1. VITE_SANGO_EXPLORER_URL (préféré)
 *   2. VITE_EXPLORER_URL       (legacy, doc backend)
 *   3. DEFAULT_EXPLORER_URL    (devnet local)
 */
export const DEFAULT_EXPLORER_URL = "http://127.0.0.1:8090";

export const EXPLORER_URL: string =
  (import.meta.env.VITE_SANGO_EXPLORER_URL as string | undefined) ??
  (import.meta.env.VITE_EXPLORER_URL as string | undefined) ??
  DEFAULT_EXPLORER_URL;

/**
 * Endpoint du faucet HTTP.
 *
 * Résolution (préférée → fallback) :
 *   1. VITE_SANGO_FAUCET_URL (préféré)
 *   2. VITE_FAUCET_URL       (legacy, doc backend)
 *   3. DEFAULT_FAUCET_URL    (devnet local)
 */
export const DEFAULT_FAUCET_URL = "http://127.0.0.1:3001";

export const FAUCET_ENDPOINT: string =
  (import.meta.env.VITE_SANGO_FAUCET_URL as string | undefined) ??
  (import.meta.env.VITE_FAUCET_URL as string | undefined) ??
  DEFAULT_FAUCET_URL;
