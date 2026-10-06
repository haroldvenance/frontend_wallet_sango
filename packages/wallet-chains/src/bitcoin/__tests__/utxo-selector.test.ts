import { describe, expect, it } from "vitest";

import {
  InsufficientFundsError,
  selectUtxosGreedy,
} from "../utxo-selector";
import { utxo } from "./_helpers";

describe("selectUtxosGreedy — happy path", () => {
  it("1 UTXO assez gros → 1 input + change", () => {
    // 100 000 sats, target 50 000, feeRate 5 sats/vB.
    // vsize (1 in, 2 out) = 140, fee = 700.
    // change = 100_000 - 50_000 - 700 = 49_300 >= 294. ✓
    const r = selectUtxosGreedy(
      [utxo({ value: 100_000n })],
      50_000n,
      5n,
    );
    expect(r.inputs).toHaveLength(1);
    expect(r.hasChange).toBe(true);
    expect(r.change).toBe(49_300n);
    expect(r.fee).toBe(700n);
  });

  it("2 UTXOs quand le 1er ne suffit pas", () => {
    // Tri décroissant : 40_000 puis 30_000. Target 50_000, feeRate 10.
    //
    // Étape 1 (40_000 seul) :
    //   - avec change (2 outs) : vsize(1,2)=140, fee=1_400.
    //     change = 40_000 - 50_000 - 1_400 < 0 → non.
    //   - sans change (1 out)  : vsize(1,1)=109, fee=1_090.
    //     40_000 >= 50_000 + 1_090 ? NON.
    //
    // Étape 2 (+30_000 → 70_000) :
    //   - avec change : vsize(2,2)=208, fee=2_080.
    //     change = 70_000 - 50_000 - 2_080 = 17_920 >= 294. ✓
    const r = selectUtxosGreedy(
      [
        utxo({ txid: "a".repeat(64), value: 30_000n }),
        utxo({ txid: "b".repeat(64), value: 40_000n }),
      ],
      50_000n,
      10n,
    );
    expect(r.inputs).toHaveLength(2);
    expect(r.hasChange).toBe(true);
    expect(r.change).toBe(17_920n);
    expect(r.fee).toBe(2_080n);
    expect(r.vsize).toBe(208);
  });

  it("tri décroissant : prend le plus gros d'abord", () => {
    const small = utxo({ txid: "s".repeat(64), value: 20_000n });
    const big = utxo({ txid: "b".repeat(64), value: 200_000n });
    const r = selectUtxosGreedy([small, big], 50_000n, 5n);
    expect(r.inputs[0]!.txid).toBe("b".repeat(64));
    expect(r.inputs).toHaveLength(1);
  });

  it("sans change : surplus absorbé dans les frais", () => {
    // Target 100_000. UTXO 100_500.
    // vsize(1,2)=140, fee=1400 → change = -900 négatif. Try sans change.
    // vsize(1,1)=109, fee=1090. total=100_500 >= 100_000 + 1090 = 101_090? NON.
    // Hmm. Essayons avec une valeur plus subtile.
    // Target 99_000. UTXO 100_200, feeRate 5.
    // vsize(1,2)=140, fee=700. change = 100_200 - 99_000 - 700 = 500 >= 294. ✓ (avec change)
    // Re-test avec target 99_800 :
    // vsize(1,2)=140, fee=700. change = 100_200 - 99_800 - 700 = -300. Try sans change.
    // vsize(1,1)=109, fee=545. total=100_200 >= 99_800 + 545 = 100_345? NON (100_200 < 100_345).
    // Pas assez. Try avec un 2e UTXO.
    // Ce cas est tricky. Testons autre chose :
    // Target 99_500, UTXO 100_000, feeRate 1.
    // vsize(1,2)=140, fee=140. change = 100_000 - 99_500 - 140 = 360 >= 294. ✓ (avec change).
    // Essayons : Target 99_800, UTXO 100_000, feeRate 1.
    // vsize(1,2)=140, fee=140. change = 100_000 - 99_800 - 140 = 60 < 294. Try sans change.
    // vsize(1,1)=109, fee=109. total=100_000 >= 99_800 + 109 = 99_909? OUI.
    // Absorbe : effectiveFee = 200, change = 0. ✓
    const r = selectUtxosGreedy(
      [utxo({ value: 100_000n })],
      99_800n,
      1n,
    );
    expect(r.hasChange).toBe(false);
    expect(r.change).toBe(0n);
    expect(r.fee).toBe(200n); // 100_000 - 99_800 (le reste aux frais)
  });
});

describe("selectUtxosGreedy — erreurs", () => {
  it("InsufficientFundsError si total insuffisant", () => {
    expect(() =>
      selectUtxosGreedy([utxo({ value: 1_000n })], 100_000n, 5n),
    ).toThrow(InsufficientFundsError);
  });

  it("rejette target <= 0", () => {
    expect(() => selectUtxosGreedy([utxo()], 0n, 5n)).toThrow(/target/);
  });

  it("rejette feeRate < 1", () => {
    expect(() => selectUtxosGreedy([utxo()], 1n, 0n)).toThrow(/feeRate/);
  });

  it("tableau vide → InsufficientFundsError", () => {
    expect(() => selectUtxosGreedy([], 1_000n, 5n)).toThrow(
      InsufficientFundsError,
    );
  });
});

describe("selectUtxosGreedy — déterminisme", () => {
  it("même entrée → même résultat", () => {
    const utxos = [
      utxo({ txid: "a".repeat(64), value: 30_000n }),
      utxo({ txid: "b".repeat(64), value: 60_000n }),
      utxo({ txid: "c".repeat(64), value: 90_000n }),
    ];
    const a = selectUtxosGreedy(utxos, 50_000n, 5n);
    const b = selectUtxosGreedy(utxos, 50_000n, 5n);
    expect(a.inputs.map((u) => u.txid)).toEqual(b.inputs.map((u) => u.txid));
    expect(a.fee).toBe(b.fee);
    expect(a.change).toBe(b.change);
  });
});
