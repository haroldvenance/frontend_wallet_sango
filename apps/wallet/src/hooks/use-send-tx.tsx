import type { AddressHex, TxHashHex } from "@sango/types";
import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { ExplorerLink } from "@/components/branding/explorer-link";
import { shortenHash } from "@/lib/format";
import { useWalletSession } from "@/providers/wallet-session-context";
import { useSdkStore } from "@/stores/sdk-store";
import { useNetworkQueryContext } from "./use-network-query-context";

export interface SendArgs {
  to: AddressHex;
  amountBaseUnits: bigint;
}

export interface SendResult {
  txHash: TxHashHex;
  included: boolean;
}

/**
 * Signe + broadcast une tx Transfer, puis poll jusqu'à inclusion.
 *
 * **Migration V0.1 (stratégie B)** :
 * - Le pipeline build/sign/broadcast est délégué à `WalletSession.send()`
 *   (D-SESS-5/8). Le hook ne connaît plus le SDK pour l'envoi.
 * - `waitForInclusion` reste sur le SDK (D-SESS-7 — primitive réseau,
 *   pas une action wallet).
 * - Le fallback `getBaseFee → DEFAULT_MAX_FEE` est **supprimé** : une
 *   erreur de calcul de fee remonte au caller (meilleur diagnostic,
 *   cf. §4.3 du design doc).
 */
export function useSendTx(): UseMutationResult<SendResult, Error, SendArgs> {
  const session = useWalletSession();
  const { client } = useSdkStore();
  const { account } = useNetworkQueryContext();
  const qc = useQueryClient();

  return useMutation<SendResult, Error, SendArgs>({
    mutationFn: async ({ to, amountBaseUnits }) => {
      if (!session) {
        throw new Error(
          "useSendTx: WalletSession indisponible (wallet verrouillé ?)",
        );
      }

      // 1. Pipeline complet via la session.
      const txHashStr = await session.send(
        {
          kind: "transfer",
          to,
          assetRef: {
            kind: "native",
            assetId: "sango",
            networkId: account.networkId,
          },
          amount: amountBaseUnits,
        },
        account,
      );
      const txHash = txHashStr as TxHashHex;

      toast.info("Transaction envoyée", {
        description: (
          <span className="inline-flex items-center gap-2">
            <span className="font-mono text-[11px]">
              {shortenHash(txHash, 6)}
            </span>
            <span className="text-muted-foreground">·</span>
            <ExplorerLink hash={txHash} />
          </span>
        ),
      });

      // 2. Invalide immédiatement le compte pour rafraîchir le solde
      // dès que le backend a appliqué la tx (sans attendre le polling).
      void qc.invalidateQueries({ queryKey: ["account"] });

      // 3. Poll d'inclusion (D-SESS-7 : reste sur le SDK).
      const result = await client.waitForInclusion(txHash);

      switch (result.status) {
        case "included":
          toast.success("Transaction incluse", {
            description: (
              <span className="inline-flex items-center gap-2">
                <span className="font-mono text-[11px]">
                  {shortenHash(txHash, 6)}
                </span>
                <span className="text-muted-foreground">·</span>
                <ExplorerLink hash={txHash} />
              </span>
            ),
          });
          break;
        case "rejected":
          toast.error("Transaction rejetée", { description: result.error });
          break;
        case "dropped":
          toast.error("Transaction perdue", { description: result.error });
          break;
        case "pending":
        default:
          toast.warning("Transaction en attente", {
            description: "Pas encore incluse après 15 s",
          });
      }

      return { txHash, included: result.status === "included" };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["account"] });
    },
    onError: (err) => {
      toast.error("Échec de la transaction", { description: err.message });
    },
  });
}
