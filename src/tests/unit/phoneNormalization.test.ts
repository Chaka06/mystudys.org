import { describe, it, expect } from "vitest";
import { createHash } from "crypto";

// Réplication corrigée de la logique de normalisation depuis api/contacts/sync
// Bug corrigé : 0799298420 → 2250799298420 (225 + le numéro ENTIER avec le 0)
function normalizePhone(p: string): string {
  let n = p.replace(/[\s\-\(\)\.]+/g, "");
  n = n.replace(/^\+/, "");
  n = n.replace(/^00/, "");
  // Numéro local ivoirien 10 chiffres commençant par 0 → 225 + numéro entier (sans supprimer le 0)
  if (/^0\d{9}$/.test(n)) n = "225" + n;
  return n;
}

function hashPhone(phone: string): string {
  return createHash("sha256").update(normalizePhone(phone)).digest("hex");
}

describe("normalizePhone — numéros ivoiriens", () => {
  it("format international +2250799298420 → supprime le +", () => {
    expect(normalizePhone("+2250799298420")).toBe("2250799298420");
  });

  it("format 002250799298420 → supprime le 00", () => {
    expect(normalizePhone("002250799298420")).toBe("2250799298420");
  });

  it("format local 0799298420 → préfixe 225 sans enlever le 0", () => {
    expect(normalizePhone("0799298420")).toBe("2250799298420");
  });

  it("format local 0512345678 → préfixe 225 sans enlever le 0", () => {
    expect(normalizePhone("0512345678")).toBe("2250512345678");
  });

  it("supprime les espaces", () => {
    expect(normalizePhone("+225 07 99 29 84 20")).toBe("2250799298420");
  });

  it("supprime les tirets", () => {
    expect(normalizePhone("+225-07-99-29-84-20")).toBe("2250799298420");
  });

  it("supprime les parenthèses", () => {
    expect(normalizePhone("(+225)07 99 29 84 20")).toBe("2250799298420");
  });

  it("garde un numéro déjà normalisé intact", () => {
    expect(normalizePhone("2250799298420")).toBe("2250799298420");
  });

  it("numéro 225 suivi de 10 chiffres reste tel quel", () => {
    expect(normalizePhone("2250512345678")).toBe("2250512345678");
  });
});

describe("normalizePhone — cohérence (mêmes numéros, formats différents)", () => {
  // Ces 5 variantes doivent toutes normaliser vers 2250799298420
  const variants = [
    "+2250799298420",
    "002250799298420",
    "0799298420",
    "+225 07 99 29 84 20",
    "+225-07-99-29-84-20",
  ];

  it("tous les formats du même numéro donnent le même résultat normalisé", () => {
    const normalized = variants.map(normalizePhone);
    const unique = new Set(normalized);
    expect(unique.size).toBe(1);
    expect([...unique][0]).toBe("2250799298420");
  });

  it("tous les formats du même numéro donnent le même hash", () => {
    const hashes = variants.map(hashPhone);
    const unique = new Set(hashes);
    expect(unique.size).toBe(1);
  });
});

describe("hashPhone", () => {
  it("retourne une chaîne hex de 64 caractères (SHA-256)", () => {
    const h = hashPhone("+2250799298420");
    expect(h).toHaveLength(64);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it("deux numéros différents donnent des hashes différents", () => {
    const h1 = hashPhone("+2250799298420");
    const h2 = hashPhone("+2250707070707");
    expect(h1).not.toBe(h2);
  });

  it("est déterministe — même entrée = même sortie", () => {
    const h1 = hashPhone("+2250799298420");
    const h2 = hashPhone("+2250799298420");
    expect(h1).toBe(h2);
  });

  it("ne stocke jamais le numéro en clair dans le hash", () => {
    const h = hashPhone("+2250799298420");
    expect(h).not.toContain("225");
    expect(h).not.toContain("0799");
  });
});
