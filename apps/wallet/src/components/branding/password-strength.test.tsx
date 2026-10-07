import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PasswordStrength } from "./password-strength";

afterEach(() => {
  cleanup();
});

function levelOf(password: string): string {
  render(<PasswordStrength password={password} />);
  const el = screen.getByTestId("password-strength");
  return el.getAttribute("data-level") ?? "";
}

describe("PasswordStrength", () => {
  it("retourne null pour un mot de passe vide", () => {
    const { container } = render(<PasswordStrength password="" />);
    expect(container.firstChild).toBeNull();
  });

  it("'a' → weak (0 critère)", () => {
    expect(levelOf("a")).toBe("weak");
  });

  it("'password' → weak (longueur ok, mais pas maj/chiffre/symbole)", () => {
    expect(levelOf("password")).toBe("weak");
  });

  it("'Password1' → good (3 critères : longueur, maj, chiffre)", () => {
    expect(levelOf("Password1")).toBe("good");
  });

  it("'Password1!' → strong (4 critères)", () => {
    expect(levelOf("Password1!")).toBe("strong");
  });

  it("affiche le label en français", () => {
    render(<PasswordStrength password="Password1!" />);
    expect(screen.getByText(/fort/i)).toBeDefined();
  });
});
