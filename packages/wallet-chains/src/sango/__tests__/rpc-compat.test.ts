import { describe, expect, it } from "vitest";
import type { SangoRpcClient, Tx, TxPage } from "@sango/rpc";
import type { SangoRpc } from "../rpc";
import type { TxDetail, TxDetailPage } from "../../types/tx-detail";

describe("SangoRpc structural compatibility", () => {
  it("SangoRpcClient satisfies SangoRpc (compile-time check)", () => {
    // Contrôle de compilation : échoue au typecheck si l'interface
    // dérive (méthode renommée, type changé, méthode manquante).
    const check = (client: SangoRpcClient): SangoRpc => client;
    expect(typeof check).toBe("function");
  });

  it("TxDetail is structurally compatible with @sango/rpc.Tx", () => {
    // Contrôle de compilation : échoue au typecheck si TxDetail
    // diverge du type RPC (champ manquant ou type incompatible).
    const toDetail = (tx: Tx): TxDetail => tx;
    const fromDetail = (detail: TxDetail): Tx => detail;
    expect(typeof toDetail).toBe("function");
    expect(typeof fromDetail).toBe("function");
  });

  it("TxDetailPage is structurally compatible with @sango/rpc.TxPage", () => {
    const toDetailPage = (page: TxPage): TxDetailPage => page;
    const fromDetailPage = (page: TxDetailPage): TxPage => page;
    expect(typeof toDetailPage).toBe("function");
    expect(typeof fromDetailPage).toBe("function");
  });
});
