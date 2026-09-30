import { describe, expect, it } from "vitest";
import type { SangoRpcClient } from "@sango/rpc";
import type { SangoRpc } from "../rpc";

describe("SangoRpc structural compatibility", () => {
  it("SangoRpcClient satisfies SangoRpc (compile-time check)", () => {
    // Contrôle de compilation : échoue au typecheck si l'interface
    // dérive (méthode renommée, type changé, méthode manquante).
    // Le `expect` est un no-op runtime.
    const check = (client: SangoRpcClient): SangoRpc => client;
    expect(typeof check).toBe("function");
  });
});
