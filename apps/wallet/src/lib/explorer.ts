import { EXPLORER_URL } from "./config";

/**
 * Helpers pour construire des URLs vers l'explorer web.
 *
 * Centralisé ici pour ne pas répéter le format d'URL dans chaque
 * composant. Si l'explorer change de structure, on modifie un seul
 * fichier.
 */

/** URL de la page d'une transaction. */
export function explorerTxUrl(hash: string): string {
  return `${EXPLORER_URL}/tx/${hash}`;
}

/** URL de la page d'une adresse. */
export function explorerAddressUrl(address: string): string {
  return `${EXPLORER_URL}/address/${address}`;
}

/** URL de la page d'un bloc. */
export function explorerBlockUrl(height: number | string): string {
  return `${EXPLORER_URL}/block/${height}`;
}

/** URL de la liste des validateurs. */
export function explorerValidatorsUrl(): string {
  return `${EXPLORER_URL}/validators`;
}
