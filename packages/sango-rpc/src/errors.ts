/**
 * Erreur émise par le client RPC.
 *
 * Couvre 3 cas :
 *  - erreur JSON-RPC renvoyée par le serveur (`code` + `message` + `data`) ;
 *  - erreur transport (timeout, réseau, HTTP ≠ 200) — `code = -1` ;
 *  - réponse JSON malformée — `code = -32700`.
 */
export class SangoRpcError extends Error {
  readonly code: number;
  readonly data?: unknown;

  constructor(code: number, message: string, data?: unknown) {
    super(message);
    this.name = "SangoRpcError";
    this.code = code;
    this.data = data;
  }
}

// --- Codes JSON-RPC standard -----------------------------------------------

export const RPC_PARSE_ERROR = -32700;
export const RPC_INVALID_REQUEST = -32600;
export const RPC_METHOD_NOT_FOUND = -32601;
export const RPC_INVALID_PARAMS = -32602;
export const RPC_INTERNAL_ERROR = -32603;

// --- Codes spécifiques Sango ------------------------------------------------

/** Ressource non trouvée (compte inexistant, bloc inconnu, etc.). */
export const SANGO_NOT_FOUND = -32001;

/** Le serveur a rejeté la transaction (validation échouée). */
export const SANGO_TRANSACTION_REJECTED = -32010;

/** Code interne utilisé pour les erreurs de transport (non-JSON-RPC). */
export const TRANSPORT_ERROR = -1;

/** Vrai si l'erreur correspond à un « not found ». */
export function isNotFound(err: unknown): err is SangoRpcError {
  return err instanceof SangoRpcError && err.code === SANGO_NOT_FOUND;
}

/** Vrai si l'erreur correspond à un rejet de transaction. */
export function isTransactionRejected(err: unknown): err is SangoRpcError {
  return err instanceof SangoRpcError && err.code === SANGO_TRANSACTION_REJECTED;
}
