import type { Address, AssetRef, Hash } from "@sango/wallet-chains";
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
  readonly amountWei: bigint;
}

export interface SendEvmResult {
  readonly txHash: Hash;
}

/**
 * Envoi d'ETH natif (EIP-1559).
 *
 * **D-UI-3 (patch 6.b)** — pipeline :
 *
 *     build → sign → broadcast → txHash → toast + explorer
 *
 * **Note importante** : le nonce seul ne permet PAS de confirmer qu'une
 * tx donnée est incluse (une autre tx peut consommer le nonce avant).
 * Ce hook n'affiche donc PAS "Confirmée" sur la base du nonce — il
 * affiche "Transaction envoyée" avec le hash + lien explorer. Le
 * polling `useEvmAccount` rafraîchit ensuite le solde/nonce en
 * arrière-plan. Une vraie confirmation (receipt) viendra en 6.b.1+
 * si nécessaire.
 *
 * Guards :
 *   - session requise
 *   - wallet.format === "bip39" (EVM uniquement)
 *   - networkId EVM
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
    mutationFn: async ({ to, amountWei }) => {
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

      const assetRef: AssetRef = {
        kind: "native",
        assetId: "eth",
        networkId,
      };

      const txHash = (await session.send(
        { kind: "transfer", to, assetRef, amount: amountWei },
        account,
      )) as Hash;

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

      // D-INDEXER-3 : invalidation immédiate (pas besoin d'attendre
      // le refresh périodique de 30 s).
      void qc.invalidateQueries({ queryKey: ["evm-account"] });
      void qc.invalidateQueries({ queryKey: ["evm-history"] });

      return { txHash };
    },
    onError: (err) => {
      toast.error("Échec de la transaction", {
        description: err.message,
      });
    },
  });
}
