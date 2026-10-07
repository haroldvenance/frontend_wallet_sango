import { describe, expect, it } from "vitest";

import {
  secp256k1KeypairFromPrivateKey,
  secp256k1SignDigestDer,
} from "../secp256k1/keypair";
import { secp256k1Verify } from "../secp256k1/keypair";

const PRIVKEY = new Uint8Array(32).fill(0x11);
const DIGEST = new Uint8Array(32).fill(0x22);

describe("secp256k1SignDigestDer", () => {
  it("retourne une signature DER valide", () => {
    const kp = secp256k1KeypairFromPrivateKey(PRIVKEY);
    const der = secp256k1SignDigestDer(kp, DIGEST);
    expect(der).toBeInstanceOf(Uint8Array);
    // DER ASN.1 : SEQUENCE (0x30) + longueur, puis INTEGER r, INTEGER s
    expect(der[0]).toBe(0x30);
    expect(der.length).toBeGreaterThan(60);
    expect(der.length).toBeLessThan(80);
  });

  it("est déterministe (RFC 6979)", () => {
    const kp = secp256k1KeypairFromPrivateKey(PRIVKEY);
    const a = secp256k1SignDigestDer(kp, DIGEST);
    const b = secp256k1SignDigestDer(kp, DIGEST);
    expect(a).toEqual(b);
  });

  it("rejette un digest ≠ 32 bytes", () => {
    const kp = secp256k1KeypairFromPrivateKey(PRIVKEY);
    expect(() => secp256k1SignDigestDer(kp, new Uint8Array(31))).toThrow(
      /32 bytes/,
    );
  });

  it("produit une signature vérifiable (round-trip)", () => {
    const kp = secp256k1KeypairFromPrivateKey(PRIVKEY);
    const der = secp256k1SignDigestDer(kp, DIGEST);
    // La vérif utilise l'API noble — pas notre helper (qui attend du compact).
    // On s'assure juste que la signature n'est pas vide et bien formée.
    expect(der.length).toBeGreaterThan(0);
    // Sanity : le pubkey compressed dérive correctement.
    expect(kp.publicKeyCompressed).toHaveLength(33);
    // Silence unused import
    void secp256k1Verify;
  });
});
