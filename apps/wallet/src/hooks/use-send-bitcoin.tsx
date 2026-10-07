import type { Address, AssetRef } from "@sango/wallet-chains";
import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { useWalletSession } from "@/providers/wallet-session-context";
import { useWalletStore } from "@/stores/wallet-store";
import { useNetworkQueryContext } from "./use-network-query-context";

export interface SendBitcoinArgs {
  readonly to: Address;
  /** Montant en satoshis (base units BTC). */
  readonly amountSats: bigint;
  /** Taux de frais explicite (sats/vbyte). */
  readonly feeRate: bigint;
}

export interface SendBitcoinResult {
  readonly txId: string;
}

/**
 * Envoi Bitcoin natif — E2.1.b.6.3.
 *
 * Délègue le pipeline build/sign/broadcast à `WalletSession.send()`
 * avec un `SendParams.transferBitcoin`. Le builder reçoit :
 *   - destinataire (`to`)
 *   - montant (satoshis, base units)
 *   - feeRate explicite (choix UI ou custom)
 *
 * Le feeRate est calculé par l'UI à partir de
 * `useBitcoinFeeRates()` (fast/normal/slow) ou d'une saisie custom.
 * Le builder fait la sélection UTXO + change à partir de ces
 * paramètres.
 */
export function useSendBitcoin(): UseMutationResult<
  SendBitcoinResult,
  Error,
  SendBitcoinArgs
> {
  const session = useWalletSession();
  const format = useWalletStore((s) => s.format);
  const { account, networkId, family } = useNetworkQueryContext();
  const qc = useQueryClient();

  return useMutation<SendBitcoinResult, Error, SendBitcoinArgs>({
    mutationFn: async ({ to, amountSats, feeRate }) => {
      if (!session) {
        throw new Error(
          "useSendBitcoin: WalletSession indisponible (wallet verrouillé ?)",
        );
      }
      if (format !== "bip39") {
        throw new Error(
          "useSendBitcoin: réservé aux wallets BIP-39 (Bitcoin)",
        );
      }
      if (family !== "bitcoin") {
        throw new Error(
          `useSendBitcoin: family="${family}" (attendu "bitcoin")`,
        );
      }

      const assetRef: AssetRef = {
        kind: "native",
        assetId: "btc",
        networkId,
      };

      const txId = await session.send(
        {
          kind: "transferBitcoin",
          to,
          assetRef,
          amount: amountSats,
          feeRate,
        },
        account,
      );

      toast.info("Transaction Bitcoin envoyée", {
        description: (
          <span className="font-mono text-[11px]">
            {txId.slice(0, 10)}…{txId.slice(-8)}
          </span>
        ),
      });

      // Invalide le solde Bitcoin — la tx va changer le total UTXO.
      void qc.invalidateQueries({ queryKey: ["bitcoin-balance"] });

      return { txId };
    },
    onError: (err) => {
      toast.error("Échec de la transaction", { description: err.message });
    },
  });
}
