import { describe, it, expect } from "vitest";
import { getInitials, cn } from "@/lib/utils";

describe("getInitials", () => {
  it("retourne 2 initiales pour un nom complet", () => {
    expect(getInitials("Issiaka Diarrassouba")).toBe("ID");
  });

  it("retourne 1 initiale pour un seul mot", () => {
    expect(getInitials("Issiaka")).toBe("I");
  });

  it("gère les noms avec plusieurs mots", () => {
    expect(getInitials("Jean Claude")).toBe("JC");
  });

  it("retourne une chaîne vide pour une chaîne vide", () => {
    expect(getInitials("")).toBe("");
  });

  it("met les initiales en majuscule", () => {
    expect(getInitials("aminata coulibaly")).toBe("AC");
  });
});

describe("cn (classnames)", () => {
  it("fusionne des classes simples", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("résout les conflits Tailwind", () => {
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("ignore les valeurs falsy", () => {
    expect(cn("foo", false, undefined, null, "bar")).toBe("foo bar");
  });

  it("gère les classes conditionnelles", () => {
    const active = true;
    expect(cn("base", active && "active")).toBe("base active");
  });
});
