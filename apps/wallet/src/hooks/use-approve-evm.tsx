import type { Address, AssetRef, Hash, Token } from "@sango/wallet-chains";
import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { ExplorerLinkEvm } from "@/features/evm/explorer-link-evm";
import { useWalletSession } from "@/providers/wallet-session-context";
import { useWalletStore } from "@/stores/wallet-store";
import { useNetworkQueryContext } from "./use-network-query-context";

export interface ApproveEvmArgs {
  /** Token ERC-20 dont on modifie l'allowance. */
  readonly token: Token;
  /** Adresse autorisée à dépenser les tokens. */
  readonly spender: Address;
  /**
   * Montant autorisé (base units du token, `bigint`).
   *
   * - `0n` → revoke
   * - `MAX_UINT256` → unlimited (passé par l'UI via la constante de
   *   `@sango/wallet-chains`)
   * - autre → montant exact
   *
   * Le hook ne fait AUCUN parsing décimal — la conversion
   * "25.5 USDT" → `25500000n` est de la responsabilité du formulaire.
   */
  readonly amountBaseUnits: bigint;
}

export interface ApproveEvmResult {
  readonly txHash: Hash;
}

/**
 * Approbation ERC-20 (`approve(spender, amount)`) — E2.2.a.2.
 *
 * Délègue le pipeline build/sign/broadcast à `WalletSession.send()`
 * avec un `SendParams.approveErc20`. Le variant est refusé par
 * `SangoTransactionBuilder` — ce hook n'est donc utilisable que sur
 * un wallet BIP-39 EVM.
 *
 * **D-E2.2-2** — invariant : l'`assetRef` porte l'identité du token
 * approuvé (`kind: "token"`). Les **frais** restent payés dans
 * `network.nativeAsset` (ETH sur Ethereum, BNB sur BSC) — le variant
 * `approveErc20` n'affecte jamais l'asset de gas.
 *
 * Le montant est validé par le builder (`0n <= amount <= MAX_UINT256`).
 * Le hook ne duplique pas cette validation.
 */
export function useApproveEvm(): UseMutationResult<
  ApproveEvmResult,
  Error,
  ApproveEvmArgs
> {
  const session = useWalletSession();
  const format = useWalletStore((s) => s.format);
  const { account, networkId } = useNetworkQueryContext();
  const qc = useQueryClient();

  return useMutation<ApproveEvmResult, Error, ApproveEvmArgs>({
    mutationFn: async ({ token, spender, amountBaseUnits }) => {
      if (!session) {
        throw new Error(
          "useApproveEvm: WalletSession indisponible (wallet verrouillé ?)",
        );
      }
      if (format !== "bip39") {
        throw new Error(
          "useApproveEvm: réservé aux wallets BIP-39 (EVM) — SANGO n'a pas d'ERC-20",
        );
      }
      if (account.family !== "evm") {
        throw new Error(
          `useApproveEvm: account.family="${account.family}" (attendu "evm")`,
        );
      }
      if (token.networkId !== networkId) {
        throw new Error(
          `useApproveEvm: token network "${token.networkId}" ≠ networkId courant "${networkId}"`,
        );
      }

      const assetRef: AssetRef = {
        kind: "token",
        networkId,
        contract: token.contract,
      };

      const txHash = (await session.send(
        {
          kind: "approveErc20",
          token: token.contract as Address,
          spender,
          amount: amountBaseUnits,
          assetRef,
        },
        account,
      )) as Hash;

      toast.info("Approbation envoyée", {
        description: (
          <span className="inline-flex items-center gap-2">
            <span className="font-mono text-[11px]">
              {txHash.slice(0, 10)}…{txHash.slice(-6)}
            </span>
            <span className="text-muted-foreground">·</span>
            <ExplorerLinkEvm hash={txHash} />
          </span>
        ),
      });

      // Invalide les queries dépendantes (compte, tokens, historique,
      // allowance) — l'UI `/approvals` s'appuiera sur la clé
      // ["allowance", …] pour rafraîchir son état.
      void qc.invalidateQueries({ queryKey: ["evm-account"] });
      void qc.invalidateQueries({ queryKey: ["evm-tokens"] });
      void qc.invalidateQueries({ queryKey: ["evm-history"] });
      void qc.invalidateQueries({ queryKey: ["allowance"] });

      return { txHash };
    },
    onError: (err) => {
      toast.error("Échec de l'approbation", {
        description: err.message,
      });
    },
  });
}
