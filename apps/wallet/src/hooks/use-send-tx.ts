import type { AddressHex, TxHashHex } from "@sango/types";
import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { toast } from "sonner";

import { GAS_BY_TX_KIND, DEFAULT_MAX_FEE, DEFAULT_PRIORITY_FEE } from "@/lib/config";
import { useSdkStore } from "@/stores/sdk-store";

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
 * Le `maxFee` est calculé dynamiquement à partir de `sango_baseFee`
 * (recommandation backend : `baseFee * 2`). Fallback sur `DEFAULT_MAX_FEE`
 * si l'appel échoue (nœud ancien, endpoint custom).
 */
export function useSendTx(): UseMutationResult<SendResult, Error, SendArgs> {
  const { client } = useSdkStore();
  const qc = useQueryClient();

  return useMutation<SendResult, Error, SendArgs>({
    mutationFn: async ({ to, amountBaseUnits }) => {
      // 1. Récupère la base fee courante (avec fallback silencieux).
      let maxFee = DEFAULT_MAX_FEE;
      try {
        const baseFeeStr = await client.getBaseFee();
        const baseFee = BigInt(baseFeeStr);
        maxFee = baseFee * 2n;
      } catch {
        // Nœud ancien ou endpoint custom sans sango_baseFee → fallback.
      }

      // 2. Signe + broadcast.
      const { txHash } = await client.send({
        to,
        amountBaseUnits,
        gasLimit: GAS_BY_TX_KIND[0x01],
        maxFee,
        priorityFee: DEFAULT_PRIORITY_FEE,
      });

      toast.info("Transaction envoyée", { description: txHash });

      // 2b. Invalide immédiatement le compte pour rafraîchir le solde
      // dès que le backend a appliqué la tx (sans attendre le polling).
      void qc.invalidateQueries({ queryKey: ["account"] });

      // 3. Poll jusqu'à inclusion.
      const result = await client.waitForInclusion(txHash);

      switch (result.status) {
        case "included":
          toast.success("Transaction incluse", { description: txHash });
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
