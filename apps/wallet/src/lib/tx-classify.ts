import type { Tx } from "@sango/rpc";

/**
 * Direction sémantique d'une tx pour l'affichage utilisateur.
 *
 * - `in`   : crédit net pour le wallet (Transfer reçu, Unbond, Claim…)
 * - `out`  : débit net du wallet (Transfer envoyé, Bond, Delegate…)
 * - `neutral` : pas de flux direct (UpdateCommission, Unjail)
 * - `pending` : en mempool (blockHeight === null)
 */
export type TxDirection = "in" | "out" | "neutral" | "pending";

/** Ensemble des TxKind de staking (0x04 → 0x0B). */
const STAKING_KINDS = new Set([0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b]);

/**
 * TxKind → direction intrinsèque **indépendamment du sender/recipient**.
 *
 * Ex : `ClaimRewards` crédite toujours le wallet de l'émetteur (c'est le
 * validateur qui paie), donc `in`. `Bond` débite toujours, donc `out`.
 */
const STAKING_DIRECTION: Record<number, "in" | "out" | "neutral"> = {
  0x04: "out",     // Bond            → self-stake engagé
  0x05: "in",      // Unbond          → retour du stake
  0x06: "out",     // Delegate        → délégué au validateur
  0x07: "in",      // Undelegate      → retour de la délégation
  0x08: "in",      // ClaimRewards    → rewards vers l'émetteur
  0x09: "out",     // RegisterValidator → self-stake initial
  0x0a: "neutral", // UpdateCommission  → pas de flux
  0x0b: "neutral", // Unjail            → pas de flux
};

export interface ClassifiedTx {
  direction: TxDirection;
  /** Contrepartie (validator pour Delegate, recipient pour Transfer, etc.) */
  counterparty: string | null;
  /** Vrai si la tx est en mempool. */
  isPending: boolean;
  /** Vrai si la tx est un staking (peu importe la direction). */
  isStaking: boolean;
}

/**
 * Classifie une tx pour l'affichage.
 *
 * Priorité :
 * 1. Si en mempool → `pending`
 * 2. Si TxKind de staking → direction intrinsèque (`STAKING_DIRECTION`)
 * 3. Sinon Transfer :
 *    - sender === moi → `out`
 *    - sinon → `in`
 */
export function classifyTx(tx: Tx, myAddress: string): ClassifiedTx {
  const isPending = tx.blockHeight === null;
  const isStaking = STAKING_KINDS.has(tx.txKind);

  if (isPending) {
    return {
      direction: "pending",
      counterparty: tx.recipient ?? null,
      isPending: true,
      isStaking,
    };
  }

  if (isStaking) {
    const dir = STAKING_DIRECTION[tx.txKind] ?? "neutral";
    return {
      direction: dir,
      counterparty: tx.recipient ?? null,
      isPending: false,
      isStaking: true,
    };
  }

  const me = myAddress.toLowerCase();
  const isSender = tx.sender.toLowerCase() === me;
  return {
    direction: isSender ? "out" : "in",
    counterparty: isSender ? (tx.recipient ?? null) : tx.sender,
    isPending: false,
    isStaking: false,
  };
}

/**
 * Montant formaté pour l'affichage.
 *
 * Retourne `null` si `value === 0n` (ex : Claim, UpdateCommission, Unjail)
 * → l'appelant affiche `—` au lieu de `-0`.
 */
export function displayAmount(value: string | bigint): bigint | null {
  const v = typeof value === "string" ? BigInt(value) : value;
  return v === 0n ? null : v;
}

// --- Labels par TxKind ----------------------------------------------------

/**
 * Libellé lisible d'un TxKind.
 *
 * Utilise la table i18n `t.history.kind` (fr/en).
 */
// Fallback hardcodé si i18n est cassé (évite un crash de l'app).
const FALLBACK_LABELS: Record<number, string> = {
  0x01: "Transfer",
  0x02: "Contract call",
  0x03: "Contract create",
  0x04: "Bond",
  0x05: "Unbond",
  0x06: "Delegate",
  0x07: "Undelegate",
  0x08: "Claim rewards",
  0x09: "Register validator",
  0x0a: "Update commission",
  0x0b: "Unjail",
};

export function txKindLabel(
  kind: number,
  t: unknown,
): string {
  const keys: Record<number, string> = {
    0x01: "transfer",
    0x02: "contractCall",
    0x03: "contractCreate",
    0x04: "bond",
    0x05: "unbond",
    0x06: "delegate",
    0x07: "undelegate",
    0x08: "claimRewards",
    0x09: "registerValidator",
    0x0a: "updateCommission",
    0x0b: "unjail",
  };
  const key = keys[kind];
  if (!key) return `0x${kind.toString(16).padStart(2, "0")}`;

  // Accès défensif : si la traduction n'a pas `history.kind`, on
  // retombe sur un fallback anglais hardcodé.
  try {
    const history = (t as { history?: { kind?: Record<string, string> } })?.history;
    const label = history?.kind?.[key];
    if (typeof label === "string") return label;
  } catch {
    /* ignore */
  }
  return FALLBACK_LABELS[kind] ?? key;
}
