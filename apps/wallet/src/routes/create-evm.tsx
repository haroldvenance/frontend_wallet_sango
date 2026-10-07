import { Navigate } from "react-router-dom";

/**
 * Route legacy `/create-evm` — redirection vers `/create` (E2.5).
 *
 * Conservée pour compat avec les liens existants (welcome, deep-links).
 * Le flow unifié `CreateUnified` gère désormais EVM et Bitcoin.
 */
export function CreateEvmWallet() {
  return <Navigate to="/create" replace />;
}
