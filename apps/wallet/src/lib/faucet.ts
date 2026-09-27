import { FAUCET_ENDPOINT } from "./config";

// --- Types -----------------------------------------------------------------

export interface FaucetSuccess {
  readonly tx_hash: string;
  readonly amount_base_units: string;
  readonly to: string;
}

export interface FaucetHealth {
  readonly status: "ok";
  readonly faucet_address: string;
  readonly balance_base_units: string;
}

export interface FaucetInfo {
  readonly service: "sango-faucet";
  readonly endpoints: Record<string, string>;
  readonly amount_base_units: string;
  readonly cooldown_secs: number;
}

/** Erreur renvoyée par le faucet (400/429/502). */
export class FaucetError extends Error {
  readonly status: number;
  readonly reason?: string;
  readonly remainingSecs?: number;

  constructor(
    status: number,
    message: string,
    opts: { reason?: string; remainingSecs?: number } = {},
  ) {
    super(message);
    this.name = "FaucetError";
    this.status = status;
    this.reason = opts.reason;
    this.remainingSecs = opts.remainingSecs;
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }
}

// --- Client ----------------------------------------------------------------

async function fetchJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${FAUCET_ENDPOINT}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (response.ok) {
    return (await response.json()) as T;
  }

  // Erreur typée : essaie de parser le corps JSON pour récupérer reason/remaining.
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // ignore : certains endpoints renvoient du text/plain
  }
  const obj = (body ?? {}) as {
    error?: string;
    reason?: string;
    remaining_secs?: number;
  };
  throw new FaucetError(
    response.status,
    obj.error ?? `HTTP ${response.status} ${response.statusText}`,
    {
      reason: obj.reason,
      remainingSecs: obj.remaining_secs,
    },
  );
}

/**
 * Demande des SANGO de test pour une adresse native (hex 0x…).
 *
 * Le faucet effectue lui-même le broadcast sur le nœud RPC. Le `tx_hash`
 * renvoyé est donc immédiatement utilisable pour le suivi d'inclusion.
 */
export function requestFaucet(address: string): Promise<FaucetSuccess> {
  return fetchJson<FaucetSuccess>("/faucet", {
    method: "POST",
    body: JSON.stringify({ address }),
  });
}

/** État de santé du faucet (utile pour griser le bouton si off). */
export function getFaucetHealth(): Promise<FaucetHealth> {
  return fetchJson<FaucetHealth>("/health", { method: "GET" });
}

/** Infos publiques : montant distribué, cooldown, endpoints. */
export function getFaucetInfo(): Promise<FaucetInfo> {
  return fetchJson<FaucetInfo>("/", { method: "GET" });
}
