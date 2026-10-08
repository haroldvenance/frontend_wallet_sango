import { ed25519 } from "@noble/curves/ed25519.js";

import { deriveNativeAddress, encodeNativeAddress } from "../address";
import { slip10DerivePath } from "./slip10";

/**
 * Dérivation SANGO — SLIP-0010 Ed25519 (Phase 5.1).
 *
 * Voir `docs/design/hd-derivation.md` §2.1 pour la spec complète.
 *
 * **Ed25519 pubkey** : on utilise `@noble/curves/ed25519` (déjà en
 * dépendance) plutôt que `@noble/ed25519` standalone. Raison :
 * `@noble/curves` embarque la config SHA-512 par défaut (sync), alors
 * que `@noble/ed25519` v3 exige une injection `etc.sha512Sync`
 * fragile (refusée à l'exécution dans notre environnement).
 */

const SANGO_COIN_TYPE_PROVISIONAL = 9999;
const BIP44_PURPOSE = 44;

/**
 * Chemin de dérivation SANGO.
 *
 *     m / 44' / 9999' / account' / 0' / 0'
 *
 * ⚠️ `9999` est un coin type **provisoire** (plage privée
 * documentée). Voir spec §2.4. Aucune constante métier
 * `SANGO_COIN_TYPE` n'est exportée tant que SLIP-0044 n'a pas
 * officiellement attribué un numéro.
 */
export function formatSangoPath(account = 0): string {
  if (!Number.isInteger(account) || account < 0) {
    throw new Error(
      `formatSangoPath: account must be a non-negative integer, got ${account}`,
    );
  }
  return `m/44'/${SANGO_COIN_TYPE_PROVISIONAL}'/${account}'/0'/0'`;
}

export interface SangoIdentity {
  readonly path: string;
  /** Clé privée Ed25519 (32 bytes). **Secret.** */
  readonly privateKey: Uint8Array;
  /** Clé publique Ed25519 (32 bytes). */
  readonly publicKey: Uint8Array;
  /** Adresse native (20 bytes). */
  readonly address: Uint8Array;
  readonly addressHex: string;
  /** Représentation bech32m devnet/testnet (`tsango1…`). */
  readonly addressBech32Testnet: string;
}

export function deriveSangoIdentity(
  seed: Uint8Array,
  args?: { readonly account?: number },
): SangoIdentity {
  const account = args?.account ?? 0;
  const path = formatSangoPath(account);
  const indices = [BIP44_PURPOSE, SANGO_COIN_TYPE_PROVISIONAL, account, 0, 0];
  const node = slip10DerivePath(seed, indices);
  const publicKey = ed25519.getPublicKey(node.privateKey);
  const address = deriveNativeAddress(publicKey);
  return {
    path,
    privateKey: node.privateKey,
    publicKey,
    address,
    addressHex: `0x${Array.from(address, (b) => b.toString(16).padStart(2, "0")).join("")}`,
    addressBech32Testnet: encodeNativeAddress(address, "testnet"),
  };
}
