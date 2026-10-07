/**
 * Capacité optionnelle : taux de frais recommandés (E2.1.b.6.3).
 *
 * **D-E2.1-20** — interface **neutre**, pas spécifique à Bitcoin.
 * Aujourd'hui seul Bitcoin l'implémente (sats/vbyte). EVM pourra
 * l'implémenter plus tard si un modèle équivalent (fast/normal/slow)
 * émerge — pour l'instant `getFeeRates()` retourne `null` pour EVM.
 *
 * Les valeurs sont en **unités de base de la famille** :
 *   - Bitcoin : satoshis / vbyte
 *   - (futur) EVM : wei / gas si un jour pertinent
 *
 * Le type `bigint` évite les imprécisions float. Le builder Bitcoin
 * reçoit un `feeRate` explicite — l'UI ne prend aucune décision sur
 * la sélection des UTXOs.
 */
export interface FeeRates {
  /** Niveau "rapide" (prochain bloc). */
  readonly fast: bigint;
  /** Niveau "normal" (~30 min). */
  readonly normal: bigint;
  /** Niveau "lent" (~1 h). */
  readonly slow: bigint;
}

/**
 * Capacité optionnelle : fournir des taux de frais recommandés.
 *
 * Une famille qui ne peut pas (ou ne veut pas) exposer de taux
 * omet cette capacité. `WalletSession.getFeeRates()` retourne alors
 * `null` proprement.
 */
export interface FeeRateProvider {
  getFeeRates(): Promise<FeeRates>;
}
