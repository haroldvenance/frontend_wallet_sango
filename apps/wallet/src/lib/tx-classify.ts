import type { Tx } from "@sango/rpc";

/**
 * Direction sémantique d'une tx pour l'affichage utilisateur.
 *
 * - `in`      : crédit net pour le wallet
 * - `out`     : débit net du wallet
 * - `neutral` : pas de flux direct (UpdateCommission, Unjail)
 * - `pending` : en mempool
 * - `unknown` : données insuffisantes / TxKind inconnu — NE JAMAIS
 *               afficher comme "reçu" sans validation.
 */
export type TxDirection = "in" | "out" | "neutral" | "pending" | "unknown";

const STAKING_KINDS = new Set([0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b]);

const STAKING_DIRECTION: Record<number, "in" | "out" | "neutral"> = {
  0x04: "out",     // Bond
  0x05: "in",      // Unbond
  0x06: "out",     // Delegate
  0x07: "in",      // Undelegate
  0x08: "in",      // ClaimRewards
  0x09: "out",     // RegisterValidator
  0x0a: "neutral", // UpdateCommission
  0x0b: "neutral", // Unjail
};

const TX_KIND_TRANSFER = 0x01;
const TX_KIND_CONTRACT_CALL = 0x02;
const TX_KIND_CONTRACT_CREATE = 0x03;

export interface ClassifiedTx {
  direction: TxDirection;
  counterparty: string | null;
  isPending: boolean;
  isStaking: boolean;
}

/**
 * Classifie une tx pour l'affichage.
 *
 * Règles (aucun classement `in` par défaut) :
 *   - mempool               → "pending"
 *   - TxKind staking        → direction intrinsèque
 *   - Transfert (0x01)      → "in"/"out" si sender + myAddress fiables,
 *                             "unknown" sinon
 *   - Contrat (0x02/0x03)   → "out" si sender === me, sinon "unknown"
 *                             (impossible de connaître la direction réelle
 *                             sans décoder les logs)
 *   - TxKind inconnu        → "unknown"
 */
export function classifyTx(tx: Tx, myAddress: string): ClassifiedTx {
  const isPending = tx.blockHeight === null;
  const isStaking = STAKING_KINDS.has(tx.txKind);
  const me = (myAddress ?? "").toLowerCase();
  const sender = (tx.sender ?? "").toLowerCase();
  const hasSender = sender !== "";
  const hasMe = me !== "";

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

  if (tx.txKind === TX_KIND_TRANSFER) {
    if (!hasSender || !hasMe) {
      return {
        direction: "unknown",
        counterparty: tx.sender ?? tx.recipient ?? null,
        isPending: false,
        isStaking: false,
      };
    }
    const isSender = sender === me;
    return {
      direction: isSender ? "out" : "in",
      counterparty: isSender ? (tx.recipient ?? null) : (tx.sender ?? null),
      isPending: false,
      isStaking: false,
    };
  }

  if (tx.txKind === TX_KIND_CONTRACT_CALL || tx.txKind === TX_KIND_CONTRACT_CREATE) {
    if (hasSender && hasMe && sender === me) {
      return {
        direction: "out",
        counterparty: tx.recipient ?? null,
        isPending: false,
        isStaking: false,
      };
    }
    return {
      direction: "unknown",
      counterparty: tx.sender ?? tx.recipient ?? null,
      isPending: false,
      isStaking: false,
    };
  }

  // TxKind inconnu (nouveau protocole, donnée corrompue) → jamais "in".
  return {
    direction: "unknown",
    counterparty: tx.sender ?? tx.recipient ?? null,
    isPending: false,
    isStaking: false,
  };
}

/**
 * Montant formaté pour l'affichage.
 * Retourne `null` si `value === 0n` → l'appelant affiche `—`.
 */
export function displayAmount(value: string | bigint): bigint | null {
  const v = typeof value === "string" ? BigInt(value) : value;
  return v === 0n ? null : v;
}

// --- Labels par TxKind ----------------------------------------------------

const TX_KIND_KEYS: Record<number, string> = {
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

const FALLBACK_LABELS: Record<number, string> = {
  0x01: "Transfert",
  0x02: "Appel de contrat",
  0x03: "Création de contrat",
  0x04: "Bond",
  0x05: "Unbond",
  0x06: "Délégation",
  0x07: "Retrait de délégation",
  0x08: "Récompenses",
  0x09: "Enregistrement validateur",
  0x0a: "Mise à jour commission",
  0x0b: "Unjail",
};

/**
 * Libellé lisible d'un TxKind.
 * Un TxKind inconnu retourne "Transaction" — jamais `0x42` à l'écran.
 */
export function txKindLabel(kind: number, t: unknown): string {
  const key = TX_KIND_KEYS[kind];
  if (!key) return "Transaction";
  try {
    const history = (t as { history?: { kind?: Record<string, string> } })
      ?.history;
    const label = history?.kind?.[key];
    if (typeof label === "string") return label;
  } catch {
    /* ignore */
  }
  return FALLBACK_LABELS[kind] ?? "Transaction";
}