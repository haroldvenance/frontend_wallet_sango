/**
 * Flags d'environnement — Phase 5.5.
 *
 * **D5.5-f·A** — `SHOW_TESTNETS` est piloté par `import.meta.env.DEV` :
 *   - `pnpm dev`      → `DEV = true`  → testnets + faucets visibles.
 *   - build prod      → `DEV = false` → masqués.
 *
 * Aucune variable Netlify à configurer. Le comportement est figé au
 * build.
 *
 * ⚠️ **Ce n'est pas une protection de sécurité.** Cacher un testnet
 * dans l'UI n'empêche personne de s'y connecter directement. C'est
 * uniquement une décision de présentation « production-ready ».
 */
export const SHOW_TESTNETS: boolean = import.meta.env.DEV;
