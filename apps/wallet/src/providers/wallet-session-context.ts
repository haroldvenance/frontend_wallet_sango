import { createContext, useContext } from "react";
import type { WalletSession } from "@sango/wallet-session";

/**
 * Contexte React de la session blockchain.
 *
 * Exposé dans un fichier séparé du provider pour respecter la règle
 * react-refresh (`only-export-components`) : un `.tsx` ne doit
 * exporter que des composants.
 *
 * ⚠️ Export public utilisé par les tests pour injecter une session
 *    mockée sans passer par le provider réel.
 */
export const WalletSessionContext = createContext<WalletSession | null>(null);

/**
 * Retourne la `WalletSession` active, ou `null` si le wallet n'est
 * pas déverrouillé.
 *
 * ⚠️ Les consommateurs DOIVENT gérer le `null` :
 *
 *   const session = useWalletSession();
 *   const { status } = useWalletStore();
 *   // enabled: status === "unlocked" && Boolean(session)
 */
export function useWalletSession(): WalletSession | null {
  return useContext(WalletSessionContext);
}
