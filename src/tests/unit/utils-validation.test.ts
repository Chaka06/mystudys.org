import { describe, it, expect } from "vitest";
import {
  cn, formatRelativeTime, truncate, getInitials,
  isValidEmail, isValidPhone, slugify, formatFileSize,
} from "@/lib/utils";

describe("cn — class merging", () => {
  it("fusionne des classes simples", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("résout les conflits Tailwind (dernière valeur gagne)", () => {
    expect(cn("p-4", "p-8")).toBe("p-8");
  });

  it("ignore les valeurs falsy", () => {
    expect(cn("a", false && "b", undefined, "c")).toBe("a c");
  });

  it("gère les objets conditionnels", () => {
    expect(cn({ "text-red-500": true, "text-green-500": false })).toBe("text-red-500");
  });
});

describe("truncate", () => {
  it("ne tronque pas si la chaîne est plus courte", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("tronque et ajoute … si la chaîne est plus longue", () => {
    const result = truncate("hello world", 5);
    expect(result).toBe("hello…");
    expect(result.length).toBe(6);
  });

  it("gère une chaîne vide", () => {
    expect(truncate("", 10)).toBe("");
  });

  it("gère maxLength=0", () => {
    expect(truncate("hello", 0)).toBe("…");
  });

  it("ne tronque pas quand longueur exacte", () => {
    expect(truncate("hello", 5)).toBe("hello");
  });
});

describe("getInitials", () => {
  it("retourne les deux premières initiales", () => {
    expect(getInitials("Issiaka Diarrassouba")).toBe("ID");
  });

  it("gère un prénom seul", () => {
    expect(getInitials("Issiaka")).toBe("I");
  });

  it("retourne en majuscules", () => {
    expect(getInitials("jean paul")).toBe("JP");
  });

  it("gère trois mots (garde 2 initiales)", () => {
    expect(getInitials("Issiaka Jean Diarrassouba")).toBe("IJ");
  });
});

describe("isValidEmail", () => {
  it("valide un email correct", () => {
    expect(isValidEmail("contact@mystudys.org")).toBe(true);
    expect(isValidEmail("user+tag@gmail.com")).toBe(true);
  });

  it("rejette un email sans @", () => {
    expect(isValidEmail("notanemail")).toBe(false);
  });

  it("rejette un email sans domaine", () => {
    expect(isValidEmail("user@")).toBe(false);
  });

  it("rejette une chaîne vide", () => {
    expect(isValidEmail("")).toBe(false);
  });
});

describe("isValidPhone", () => {
  it("valide un numéro ivoirien avec +225", () => {
    expect(isValidPhone("+2250799298420")).toBe(true);
  });

  it("valide un numéro local sans indicatif", () => {
    expect(isValidPhone("0799298420")).toBe(true);
  });

  it("rejette un numéro trop court", () => {
    expect(isValidPhone("123")).toBe(false);
  });

  it("rejette un numéro avec lettres", () => {
    expect(isValidPhone("abc12345678")).toBe(false);
  });
});

describe("formatFileSize", () => {
  it("formate les bytes", () => {
    expect(formatFileSize(500)).toBe("500 B");
  });

  it("formate les kilobytes", () => {
    expect(formatFileSize(1500)).toBe("1.5 KB");
  });

  it("formate les mégabytes", () => {
    expect(formatFileSize(2 * 1024 * 1024)).toBe("2.0 MB");
  });

  it("gère 0 bytes", () => {
    expect(formatFileSize(0)).toBe("0 B");
  });
});

describe("slugify", () => {
  it("convertit les espaces en tirets", () => {
    expect(slugify("hello world")).toBe("hello-world");
  });

  it("passe en minuscules", () => {
    expect(slugify("HELLO")).toBe("hello");
  });

  it("supprime les caractères spéciaux", () => {
    expect(slugify("hello!@#world")).toBe("helloworld");
  });

  it("remplace les accents ivoiriens", () => {
    expect(slugify("économie")).toBe("economie");
    expect(slugify("étudiant")).toBe("etudiant");
  });

  it("nettoie les tirets multiples", () => {
    expect(slugify("hello   world")).toBe("hello-world");
  });

  it("gère une chaîne vide", () => {
    expect(slugify("")).toBe("");
  });
});

describe("formatRelativeTime", () => {
  it("retourne une string non vide pour une date récente", () => {
    const result = formatRelativeTime(new Date());
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("accepte une string ISO en entrée", () => {
    const result = formatRelativeTime(new Date().toISOString());
    expect(typeof result).toBe("string");
  });
});
