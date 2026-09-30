import type { Network } from "@sango/types";

import type { StoredWalletV1 } from "@sango/wallet-core";

/**
 * Format du fichier exporté — wrapper versionné.
 *
 * On n'exporte **jamais** le seed en clair : uniquement le blob chiffré
 * AES-GCM + PBKDF2. Le destinataire a besoin du mot de passe pour
 * l'utiliser.
 */
/** Version sérialisée d'un `StoredWallet` (Uint8Array → hex). */
export interface SerializedStoredWallet {
  readonly version: 1;
  readonly network: Network;
  readonly addressHex: string;
  /** 16 bytes hex (sans préfixe 0x). */
  readonly salt: string;
  /** 12 bytes hex (sans préfixe 0x). */
  readonly iv: string;
  /** Ciphertext hex (sans préfixe 0x). */
  readonly ciphertext: string;
  readonly kdf: "PBKDF2-SHA256";
  readonly iterations: number;
}

export interface KeyfileExport {
  readonly format: "sango-wallet-keyfile";
  readonly version: 1;
  readonly exportedAt: string; // ISO date
  readonly network: Network;
  readonly addressHex: string;
  readonly stored: SerializedStoredWallet;
}

/**
 * Sérialise un `StoredWallet` en JSON-safe (hex pour les Uint8Array).
 */
export function serializeKeyfile(
  stored: StoredWalletV1,
): KeyfileExport {
  return {
    format: "sango-wallet-keyfile",
    version: 1,
    exportedAt: new Date().toISOString(),
    network: stored.network,
    addressHex: stored.addressHex,
    stored: {
      version: stored.version,
      network: stored.network,
      addressHex: stored.addressHex,
      salt: bytesToHex(stored.salt),
      iv: bytesToHex(stored.iv),
      ciphertext: bytesToHex(stored.ciphertext),
      kdf: stored.kdf,
      iterations: stored.iterations,
    },
  };
}

function bytesToHex(u: Uint8Array): string {
  return Array.from(u, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Désérialise un JSON exporté en `StoredWallet`.
 *
 * Lance une erreur si le format est invalide ou la version inconnue.
 */
export function deserializeKeyfile(raw: unknown): StoredWalletV1 {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Fichier invalide (pas un objet JSON)");
  }
  const o = raw as Record<string, unknown>;

  if (o.format !== "sango-wallet-keyfile") {
    throw new Error("Format inconnu — attendu : sango-wallet-keyfile");
  }
  if (o.version !== 1) {
    throw new Error(`Version non supportée : ${String(o.version)}`);
  }

  const s = o.stored as Record<string, unknown> | undefined;
  if (!s || typeof s !== "object") {
    throw new Error("Bloc 'stored' manquant");
  }

  return {
    version: 1,
    network: s.network as Network,
    addressHex: s.addressHex as string,
    salt: bytesFromHexField(s.salt, "salt"),
    iv: bytesFromHexField(s.iv, "iv"),
    ciphertext: bytesFromHexField(s.ciphertext, "ciphertext"),
    kdf: s.kdf as "PBKDF2-SHA256",
    iterations: s.iterations as number,
  };
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error("hex impair");
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function bytesFromHexField(v: unknown, name: string): Uint8Array {
  if (typeof v === "string") return hexToBytes(v);
  // Supporte aussi un tableau de nombres (fallback)
  if (Array.isArray(v)) return new Uint8Array(v as number[]);
  throw new Error(`Champ '${name}' invalide`);
}

/**
 * Déclenche le téléchargement d'un fichier JSON dans le navigateur.
 */
export function downloadJson(filename: string, data: unknown): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Libère l'URL après un court délai.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Ouvre un sélecteur de fichier et lit le JSON choisi.
 *
 * Résout **toujours** :
 *  - resolve(parsed) si un fichier est choisi
 *  - reject(...) si l'utilisateur annule (oncancel) ou si la lecture échoue
 *
 * ⚠️ Sans `oncancel`, fermer le sélecteur laisse la Promise en attente
 *    éternellement (bug corrigé ici).
 */
export async function pickJsonFile(): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";

    let settled = false;
    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      fn();
    };

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        settle(() => reject(new Error("Aucun fichier sélectionné")));
        return;
      }
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        settle(() => resolve(parsed));
      } catch (e) {
        settle(() =>
          reject(new Error(`Lecture du fichier échouée : ${(e as Error).message}`)),
        );
      }
    };

    // L'utilisateur a fermé le sélecteur sans choisir (support moderne).
    input.oncancel = () => {
      settle(() => reject(new Error("Sélection annulée")));
    };

    input.click();

    // Sécurité supplémentaire : si rien ne se passe dans les 5 minutes,
    // on abandonne pour ne pas bloquer l'UI indéfiniment.
    setTimeout(() => {
      settle(() => reject(new Error("Sélection expirée")));
    }, 5 * 60 * 1000);
  });
}
