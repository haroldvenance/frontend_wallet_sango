import type { AddressHex, ValidatorInfo } from "@sango/rpc";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { useSdkStore } from "@/stores/sdk-store";

const POLL_MS = 5_000;

/** Liste complète des validateurs, rafraîchie toutes les 5 s. */
export function useValidators(): UseQueryResult<ValidatorInfo[], Error> {
  const { client } = useSdkStore();
  return useQuery<ValidatorInfo[], Error>({
    queryKey: ["validators"],
    queryFn: () => client.getValidators(),
    refetchInterval: POLL_MS,
    staleTime: POLL_MS / 2,
  });
}

/** Infos d'un validateur précis, rafraîchies toutes les 5 s. */
export function useValidatorInfo(
  address: AddressHex | undefined,
): UseQueryResult<ValidatorInfo | null, Error> {
  const { client } = useSdkStore();
  return useQuery<ValidatorInfo | null, Error>({
    queryKey: ["validator", address],
    queryFn: () => (address ? client.getValidatorInfo(address) : Promise.resolve(null)),
    enabled: !!address,
    refetchInterval: POLL_MS,
  });
}
