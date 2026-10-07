import { Navigate } from "react-router-dom";

/**
 * Route legacy `/create` (SANGO) — renommée E2.5.
 *
 * L'ancienne route `/create` (SANGO Ed25519) est remplacée par le
 * flow unifié `CreateUnified`. Conservée pour compat si un import
 * direct existe encore.
 */
export function CreateWallet() {
  return <Navigate to="/create" replace />;
}
