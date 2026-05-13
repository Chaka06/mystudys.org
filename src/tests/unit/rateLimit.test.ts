import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRateLimited } from "@/lib/rateLimit";

describe("isRateLimited", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("retourne false pour la première requête", () => {
    expect(isRateLimited("user-1:comments", 10, 60_000)).toBe(false);
  });

  it("retourne false tant que la limite n'est pas atteinte", () => {
    const key = "user-test-limit:endpoint";
    for (let i = 0; i < 9; i++) {
      expect(isRateLimited(key, 10, 60_000)).toBe(false);
    }
  });

  it("retourne true quand la limite est atteinte", () => {
    const key = "user-limit-reached:endpoint";
    for (let i = 0; i < 10; i++) {
      isRateLimited(key, 10, 60_000);
    }
    expect(isRateLimited(key, 10, 60_000)).toBe(true);
  });

  it("réinitialise après la fenêtre de temps", () => {
    const key = "user-reset:endpoint";
    for (let i = 0; i < 10; i++) {
      isRateLimited(key, 10, 60_000);
    }
    expect(isRateLimited(key, 10, 60_000)).toBe(true);

    // Avancer le temps de 61 secondes
    vi.advanceTimersByTime(61_000);

    // Doit être réinitialisé
    expect(isRateLimited(key, 10, 60_000)).toBe(false);
  });

  it("les clés différentes ont des compteurs indépendants", () => {
    const key1 = "userA:comments";
    const key2 = "userB:comments";
    for (let i = 0; i < 10; i++) isRateLimited(key1, 10, 60_000);

    expect(isRateLimited(key1, 10, 60_000)).toBe(true);
    expect(isRateLimited(key2, 10, 60_000)).toBe(false);
  });

  it("limite de 1 requête par minute fonctionne", () => {
    const key = "strict:endpoint";
    expect(isRateLimited(key, 1, 60_000)).toBe(false);
    expect(isRateLimited(key, 1, 60_000)).toBe(true);
    expect(isRateLimited(key, 1, 60_000)).toBe(true);
  });

  it("fonctionne avec une fenêtre courte (1 seconde)", () => {
    const key = "short-window:endpoint";
    isRateLimited(key, 3, 1_000);
    isRateLimited(key, 3, 1_000);
    isRateLimited(key, 3, 1_000);
    expect(isRateLimited(key, 3, 1_000)).toBe(true);

    vi.advanceTimersByTime(1_001);
    expect(isRateLimited(key, 3, 1_000)).toBe(false);
  });

  it("ne confond pas des clés qui se ressemblent", () => {
    isRateLimited("abc", 1, 60_000);
    expect(isRateLimited("ab", 1, 60_000)).toBe(false);
    expect(isRateLimited("abcd", 1, 60_000)).toBe(false);
  });
});
