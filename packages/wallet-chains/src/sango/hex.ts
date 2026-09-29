/**
 * Utilitaires hex internes au module SANGO.
 *
 * Alignés sur la convention RPC : `0x…` lowercase pour les entrées
 * et sorties. Ne pas exporter au-delà du module — c'est un détail
 * d'implémentation.
 */

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0) {
    throw new Error(`hexToBytes: odd length (${clean.length})`);
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    const byte = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(byte)) {
      throw new Error(`hexToBytes: invalid hex at index ${i * 2}`);
    }
    out[i] = byte;
  }
  return out;
}

export function bytesToHex(bytes: Uint8Array): string {
  let s = "0x";
  for (const b of bytes) s += b.toString(16).padStart(2, "0");
  return s;
}
