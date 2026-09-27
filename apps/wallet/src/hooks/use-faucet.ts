import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { toast } from "sonner";

import {
  FaucetError,
  getFaucetHealth,
  requestFaucet,
  type FaucetHealth,
  type FaucetSuccess,
} from "@/lib/faucet";
import { formatSango } from "@/lib/format";
import { useSdkStore } from "@/stores/sdk-store";
import { useWalletStore } from "@/stores/wallet-store";

/**
 * Santé du faucet — poll toutes les 30 s tant que la page est active.
 * Permet de griser le bouton si le faucet est down.
 */
export function useFaucetHealth(): UseQueryResult<FaucetHealth, Error> {
  return useQuery<FaucetHealth, Error>({
    queryKey: ["faucet", "health"],
    queryFn: getFaucetHealth,
    refetchInterval: 30_000,
    retry: 1,
    staleTime: 20_000,
  });
}

export interface FaucetRequestResult {
  txHash: string;
  amountBaseUnits: bigint;
  included: boolean;
}

/**
 * Demande des SANGO de test, puis poll jusqu'à inclusion (via le SDK).
 *
 * Gère les erreurs typées (rate limit, faucet off, node off).
 */
export function useFaucet(): UseMutationResult<
  FaucetRequestResult,
  Error,
  void
> {
  const { client } = useSdkStore();
  const { wallet } = useWalletStore();
  const qc = useQueryClient();

  return useMutation<FaucetRequestResult, Error, void>({
    mutationFn: async () => {
      if (!wallet) throw new Error("Wallet not attached");

      // 1. Appel faucet.
      const res: FaucetSuccess = await requestFaucet(
        wallet.identity.addressHex,
      );

      const amount = BigInt(res.amount_base_units);
      toast.info("Faucet : transaction envoyée", {
        description: `${formatSango(amount)} SANGO — ${res.tx_hash.slice(0, 12)}…`,
      });

      // 2. Attente d'inclusion via le SDK (déjà utilisé pour Send).
      const inclusion = await client.waitForInclusion(
        res.tx_hash as `0x${string}`,
        { timeoutMs: 20_000, pollMs: 500 },
      );

      if (inclusion.status === "included") {
        toast.success("Faucet : fonds reçus", {
          description: `${formatSango(amount)} SANGO`,
        });
      } else {
        toast.warning("Faucet : inclusion lente", {
          description: "Non inclus après 20 s, vérifie plus tard",
        });
      }

      return {
        txHash: res.tx_hash,
        amountBaseUnits: amount,
        included: inclusion.status === "included",
      };
    },
    onSuccess: () => {
      // Rafraîchit la balance.
      void qc.invalidateQueries({ queryKey: ["account"] });
    },
    onError: (err) => {
      if (err instanceof FaucetError) {
        if (err.isRateLimited) {
          const mins = err.remainingSecs
            ? Math.ceil(err.remainingSecs / 60)
            : null;
          toast.error("Faucet : rate limit atteint", {
            description: mins
              ? `Réessaye dans ~${mins} min`
              : "Attends un peu avant de réessayer",
          });
          return;
        }
        if (err.status === 400) {
          toast.error("Faucet : requête invalide", {
            description: err.message,
          });
          return;
        }
        toast.error("Faucet indisponible", { description: err.message });
        return;
      }
      // Erreur transport (fetch a échoué → faucet pas lancé)
      toast.error("Faucet injoignable", {
        description: "Le service est-il lancé ? (`cargo run -p sango-faucet`)",
      });
    },
  });
}
