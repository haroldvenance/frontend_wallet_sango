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
    // **E2.1.b.3** — le widening d'`Address` (D-E2.1-14) ajoute
  // `bc1…` / `tb1…` à l'union. `Tx.sender` de @sango/rpc est
  // `\`0x${string}\`` : structurellement incompatible avec l'union
  // élargie. Mais cette compat n'a de sens QUE pour SANGO ↔ SANGO :
  // au runtime, un `TxDetail` Bitcoin ne sera jamais assigné à un
  // `Tx` SANGO. On caste à la frontière (comme dans use-transactions
  // côté app), le type élargi est ici un artefact multi-chaîne.
  const fromDetail = (detail: TxDetail): Tx => detail as unknown as Tx;
    expect(typeof toDetail).toBe("function");
    expect(typeof fromDetail).toBe("function");
  });

  it("TxDetailPage is structurally compatible with @sango/rpc.TxPage", () => {
    const toDetailPage = (page: TxPage): TxDetailPage => page;
    // Idem ci-dessus : cast explicite à la frontière SANGO ↔ @sango/rpc.
  const fromDetailPage = (page: TxDetailPage): TxPage =>
    page as unknown as TxPage;
    expect(typeof toDetailPage).toBe("function");
    expect(typeof fromDetailPage).toBe("function");
  });
});
