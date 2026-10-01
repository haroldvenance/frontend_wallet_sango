import { vi } from "vitest";
import { secp256k1KeypairFromPrivateKey } from "@sango/wallet-core";

import type { EvmRpc } from "../rpc";
import type { AccountRef } from "../../types/account";
import type { Address } from "../../types/address";
import type { Signer } from "../../types/signer";

// Golden vector : première clé privée Hardhat/Anvil (publique,
// documentée). Utilisée pour tester la dérivation d'adresse.
export const ANVIL_PRIVKEY_0 =
  "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
export const ANVIL_ADDRESS_0 =
  "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266" as Address;

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/** Clé publique non-compressée (65 bytes, 0x04-prefixed) d'Anvil/0. */
export const ANVIL_PUBKEY_UNCOMPRESSED: Uint8Array = (() => {
  const kp = secp256k1KeypairFromPrivateKey(hexToBytes(ANVIL_PRIVKEY_0));
  return kp.publicKeyUncompressed;
})();

export const EVM_ACCOUNT: AccountRef = {
  family: "evm",
  accountIndex: 0,
  networkId: "ethereum-sepolia",
};

/** Mock EvmRpc : valeurs par défaut neutres, overridables. */
export function mockRpc(overrides: Partial<EvmRpc> = {}): EvmRpc {
  return {
    // Patch 2 : lecture
    getChainId: vi.fn(async () => 11155111), // Sepolia
    getBalance: vi.fn(async () => 0n),
    getTransactionCount: vi.fn(async () => 0),
    // Patch 4 : EIP-1559 + broadcast
    estimateGas: vi.fn(async () => 21_000n),
    getBaseFeePerGas: vi.fn(async () => 1_000_000_000n), // 1 gwei
    getMaxPriorityFeePerGas: vi.fn(async () => 1_000_000_000n), // 1 gwei
    sendRawTransaction: vi.fn(
      async () =>
        "0x" + "00".repeat(32) as `0x${string}`,
    ),
    // E1.6 : eth_call pour la lecture ERC-20. Retourne 0x par défaut
    // (32 bytes de zéros = uint256 0). Les tests qui ont besoin d'une
    // valeur override ce mock.
    call: vi.fn(async () => "0x"),
    ...overrides,
  };
}

/**
 * Mock Signer EVM : `getPublicKey` retourne la clé publique
 * non-compressée d'Anvil/0. `signDomain` n'est jamais appelé par
 * les providers patch 2 (address/balance/account sont en lecture).
 */
export function mockSigner(
  publicKey: Uint8Array = ANVIL_PUBKEY_UNCOMPRESSED,
): Signer {
  return {
    getPublicKey: vi.fn(async () => publicKey),
    signDomain: vi.fn(async () => new Uint8Array(64)),
  };
}
