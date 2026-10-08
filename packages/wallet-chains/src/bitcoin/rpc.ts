/**
 * Interface structurelle minimale d'un backend Bitcoin (E2.1.b.2).
 *
 * **D-E2.1-4** — Le MVP utilise mempool.space (Esplora REST), mais
 * `wallet-chains/bitcoin` ne le sait PAS : cette interface est le seul
 * point d'entrée. L'implémentation concrète vit dans
 * `wallet-providers/bitcoin/mempool-space-rpc.ts`.
 *
 * **Pattern aligné sur EVM** : `EvmRpc` (interface) → `EvmRpcUsingPool`
 * (impl). Ici : `BitcoinRpc` (interface) → `MempoolSpaceRpc` (impl).
 *
 * **Périmètre E2.1.b.2** : uniquement les lectures nécessaires au
 * pipeline `read` — UTXOs et taux de frais. La méthode `broadcastTx`
 * sera ajoutée en E2.1.b.5 quand on saura ce que @scure/btc-signer
 * produit comme forme de tx signée.
 */

/**
 * Un UTXO (output non dépensé) appartenant à une adresse.
 *
 * Les montants sont en **satoshis** (`bigint`). Le `scriptPubKey`
 * n'est PAS inclus : notre cas d'usage est P2WPKH (BIP-84), dont le
 * script est déterministe à partir de l'adresse. On l'ajoutera en
 * E2.1.b.3 seulement si nécessaire.
 */
export interface Utxo {
  /** Hash de la tx source (32 bytes hex, sans 0x). */
  readonly txid: string;
  /** Index de l'output dans la tx source. */
  readonly vout: number;
  /** Montant en satoshis. */
  readonly value: bigint;
  /** Vrai si la tx source est confirmée (≥ 1 bloc). */
  readonly confirmed: boolean;
}

/**
 * Taux de frais recommandés (satoshis par vbyte).
 *
 * Trois niveaux exposés par mempool.space (`/api/v1/fees/recommended`).
 * L'UI laisse l'utilisateur choisir ; le builder reçoit une valeur
 * **explicite** (jamais une lecture directe du réseau).
 */
export interface BitcoinFeeRates {
  /** Confirmation dans le prochain bloc (~10 min). */
  readonly fast: bigint;
  /** Confirmation dans ~30 minutes. */
  readonly normal: bigint;
  /** Confirmation dans ~1 heure. */
  readonly slow: bigint;
}

/**
 * Forme brute d'une transaction Esplora (mempool.space).
 *
 * Sous-ensemble des champs utilisés par `BitcoinHistoryProvider`.
 * Documenté : https://github.com/Blockstream/esplora/blob/master/API.md#get-addresstxs
 *
 * ⚠️ `scriptpubkey_address` est absent pour :
 *   - les scripts non-standard (OP_RETURN, multisig brut) ;
 *   - les entrées coinbase ;
 *   - certains outputs P2PK anciens.
 * Le provider filtre ces cas.
 */
export interface EsploraTxInput {
  readonly txid: string;
  readonly vout: number;
  readonly prevout: {
    readonly scriptpubkey: string;
    readonly scriptpubkey_address?: string;
    readonly value: number;
  } | null;
  readonly is_coinbase: boolean;
}

export interface EsploraTxOutput {
  readonly scriptpubkey: string;
  readonly scriptpubkey_address?: string;
  readonly value: number;
}

export interface EsploraTxStatus {
  readonly confirmed: boolean;
  readonly block_height?: number;
  readonly block_hash?: string;
  readonly block_time?: number;
}

export interface EsploraTx {
  readonly txid: string;
  readonly version: number;
  readonly locktime: number;
  readonly vin: readonly EsploraTxInput[];
  readonly vout: readonly EsploraTxOutput[];
  readonly size: number;
  readonly weight: number;
  readonly fee: number;
  readonly status: EsploraTxStatus;
}

/**
 * Interface structurelle d'un backend Bitcoin.
 *
 * Toutes les méthodes sont en lecture seule. L'écriture (broadcast)
 * viendra en E2.1.b.5 après stabilisation du signer.
 */
export interface BitcoinRpc {
  /**
   * Liste tous les UTXOs d'une adresse.
   *
   * @param address Adresse Bitcoin (`bc1q…` mainnet, `tb1q…` testnet).
   * @returns Tableau vide si l'adresse n'a jamais reçu de fonds —
   *          ce n'est PAS une erreur.
   */
  getUtxos(address: string): Promise<readonly Utxo[]>;

  /**
   * Récupère les taux de frais recommandés.
   *
   * @returns Trois niveaux (fast / normal / slow) en sats/vbyte.
   */
  getFeeRates(): Promise<BitcoinFeeRates>;

  /**
   * **E2.1.b.5** — broadcast une transaction signée.
   *
   * @param rawHex Transaction sérialisée (hex SANS préfixe `0x`).
   *               Esplora attend ce format exact.
   * @returns Le txid canonique (hex sans préfixe, 32 bytes).
   *
   * L'implémentation concrète (MempoolSpaceRpc) fait un POST
   * `text/plain` sur `/tx` et valide la réponse.
   */
  broadcastTx(rawHex: string): Promise<string>;

  /**
   * **Patch A.2** — liste des transactions touchant une adresse.
   *
   * Esplora renvoie jusqu'à **50** txs confirmées (les plus récentes)
   * + les txs mempool en cours. Le provider tronque à 20.
   *
   * @param address Adresse Bitcoin (`tb1…` / `bc1…`).
   * @returns Tableau vide si aucun mouvement — pas une erreur.
   */
  getTxs(address: string): Promise<readonly EsploraTx[]>;
}
