import { describe, expect, it } from "vitest";

import { redactUrl } from "./redact-url";

describe("redactUrl", () => {
  it("masque ?apikey=", () => {
    expect(redactUrl("https://rpc.example.com?apikey=SECRET")).toContain("apikey=***");
  });

  it("masque ?api_key=", () => {
    expect(redactUrl("https://rpc.example.com?api_key=SECRET&x=1")).toContain("api_key=***");
  });

  it("masque ?token=", () => {
    expect(redactUrl("https://rpc.example.com?token=abc")).toContain("token=***");
  });

  it("masque ?secret=", () => {
    expect(redactUrl("https://rpc.example.com?secret=abc")).toContain("secret=***");
  });

  it("masque user:pass@", () => {
    const r = redactUrl("https://user:secret@rpc.example.com");
    expect(r).not.toContain("secret");
    expect(r).toContain("***");
  });

  it("ne touche pas les URLs propres", () => {
    const r = redactUrl("https://eth.llamarpc.com");
    expect(r).toContain("eth.llamarpc.com");
    expect(r).not.toContain("***");
  });

  it("ne masque pas les clés non-sensibles", () => {
    expect(redactUrl("https://rpc.example.com?chain=1")).toContain("chain=1");
  });

  it("URL invalide → [invalid-url], jamais la string brute", () => {
    const r = redactUrl("not a url");
    expect(r).toBe("[invalid-url]");
    expect(r).not.toContain("not");
  });

  it("input vide → [invalid-url]", () => {
    expect(redactUrl("")).toBe("[invalid-url]");
  });
});
