/**
 * Flags UI — configuration centralisée.
 *
 * ⚠️ Ces flags NE SONT PAS des contrôles de sécurité.
 * Ils pilotent la VISIBILITÉ dans l'UI. Toute route backend concernée
 * doit refuser les requêtes indépendamment, en production.
 *
 * Variables d'environnement (build-time, publiques) :
 *   - DEV                     → true en `pnpm dev`
 *   - VITE_SHOW_ADVANCED_RPC  → "true" | "false" (défaut : "false")
 *
 * Stratégie par environnement :
 *   - dev local      : DEV=true  → testnets + staking + faucet visibles
 *   - preview/staging: DEV=false → tous flags UI à leur défaut prod
 *   - production     : DEV=false → idem preview
 *
 * Aucun secret n'est concerné : ces flags finissent dans le bundle.
 */

function readBooleanFlag(value: string | undefined, fallback: boolean): boolean {
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

/**
 * Testnets + faucets visibles uniquement en développement local.
 * En staging et en production, ils sont masqués.
 */
export const SHOW_TESTNETS: boolean = import.meta.env.DEV;

/**
 * Routes staking (`/validators`, `/become-validator`).
 * SANGO n'a pas de mainnet — le staking n'a pas d'usage réel en prod.
 * Réservé à `pnpm dev`.
 */
export const SHOW_STAKING: boolean = import.meta.env.DEV;

/**
 * Kill-switch du panneau "RPC personnalisé".
 * Défaut : false (désactivé). Activable via VITE_SHOW_ADVANCED_RPC=true.
 *
 * La préférence utilisateur réelle reste pilotée par
 * `preferences-store` (défaut = false), mais elle ne peut être
 * activée que si ce flag global est vrai.
 */
export const SHOW_ADVANCED_RPC: boolean = readBooleanFlag(
  import.meta.env.VITE_SHOW_ADVANCED_RPC,
  false,
);