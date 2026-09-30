import * as bip39 from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";

const VALID_STRENGTHS = [128, 160, 192, 224, 256] as const;
export type MnemonicStrength = (typeof VALID_STRENGTHS)[number];

export function generateMnemonic(strength: MnemonicStrength = 128): string {
  if (!VALID_STRENGTHS.includes(strength)) {
    throw new Error(
      `Invalid mnemonic strength: ${strength}. Expected one of ${VALID_STRENGTHS.join(", ")}`,
    );
  }
  return bip39.generateMnemonic(wordlist, strength);
}

export function validateMnemonic(mnemonic: string): boolean {
  return bip39.validateMnemonic(mnemonic, wordlist);
}

export function mnemonicToSeedSync(mnemonic: string, passphrase = ""): Uint8Array {
  if (!validateMnemonic(mnemonic)) {
    throw new Error("Invalid BIP-39 mnemonic (checksum or wordlist)");
  }
  return bip39.mnemonicToSeedSync(mnemonic, passphrase);
}

export async function mnemonicToSeed(mnemonic: string, passphrase = ""): Promise<Uint8Array> {
  if (!validateMnemonic(mnemonic)) {
    throw new Error("Invalid BIP-39 mnemonic (checksum or wordlist)");
  }
  return bip39.mnemonicToSeed(mnemonic, passphrase);
}
