import { describe, expect, it } from "vitest";
import type { SangoRpcClient } from "@sango/rpc";
import type { SangoRpc } from "../rpc";

describe("SangoRpc structural compatibility", () => {
  it("SangoRpcClient satisfies SangoRpc", () => {
    // Contrôle de compilation : échoue au typecheck si l'interface
    // dérive. Le `expect` est un no-op runtime.
    const check = (client: SangoRpcClient): SangoRpc => client;
    expect(typeof check).toBe("function");
  });
});
