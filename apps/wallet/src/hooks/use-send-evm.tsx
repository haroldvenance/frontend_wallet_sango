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

export interface SendEvmArgs {
  readonly to: Address;
  readonly amountBaseUnits: bigint;
  /**
   * Token ERC-20 à envoyer. `undefined` = ETH natif.
   * Détermine le `kind` du SendParams (`transferErc20` vs `transfer`).
   */
  readonly token?: Token;
}

export interface SendEvmResult {
  readonly txHash: Hash;
}

/**
 * Envoi d'un actif EVM (ETH natif ou token ERC-20).
 *
 * **E1.6.a.5** — Le `token` optionnel route :
 *   - absent → `{ kind: "transfer", … }` (EIP-1559, value > 0)
 *   - présent → `{ kind: "transferErc20", … }` (data encodé ABI,
 *     value = 0, tx.to = contrat)
 *
 * **Confirmation** : on affiche "Transaction envoyée" avec le hash +
 * lien explorer. Le nonce seul ne prouve pas l'inclusion. Vraie
 * confirmation via `eth_getTransactionReceipt` en E1.6.c+.
 */
export function useSendEvm(): UseMutationResult<
  SendEvmResult,
  Error,
  SendEvmArgs
> {
  const session = useWalletSession();
  const format = useWalletStore((s) => s.format);
  const { account, networkId } = useNetworkQueryContext();
  const qc = useQueryClient();

  return useMutation<SendEvmResult, Error, SendEvmArgs>({
    mutationFn: async ({ to, amountBaseUnits, token }) => {
      if (!session) {
        throw new Error(
          "useSendEvm: WalletSession indisponible (wallet verrouillé ?)",
        );
      }
      if (format !== "bip39") {
        throw new Error(
          "useSendEvm: réservé aux wallets BIP-39 (EVM) — utilise /send pour SANGO",
        );
      }
      if (account.family !== "evm") {
        throw new Error(
          `useSendEvm: account.family="${account.family}" (attendu "evm")`,
        );
      }

      let txHash: Hash;
      if (token) {
        // ERC-20
        const assetRef: AssetRef = {
          kind: "token",
          networkId,
          contract: token.contract,
        };
        txHash = (await session.send(
          {
            kind: "transferErc20",
            to,
            assetRef,
            amount: amountBaseUnits,
          },
          account,
        )) as Hash;
      } else {
        // ETH natif
        const assetRef: AssetRef = {
          kind: "native",
          assetId: "eth",
          networkId,
        };
        txHash = (await session.send(
          { kind: "transfer", to, assetRef, amount: amountBaseUnits },
          account,
        )) as Hash;
      }

      const symbol = token?.metadata.symbol ?? "ETH";
      toast.info("Transaction envoyée", {
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

      // Invalide les queries dépendantes (compte + tokens + historique).
      void qc.invalidateQueries({ queryKey: ["evm-account"] });
      void qc.invalidateQueries({ queryKey: ["evm-tokens"] });
      void qc.invalidateQueries({ queryKey: ["evm-history"] });

      // Silence unused warning pour `symbol` (utile pour debug).
      void symbol;

      return { txHash };
    },
    onError: (err) => {
      toast.error("Échec de la transaction", {
        description: err.message,
      });
    },
  });
}
