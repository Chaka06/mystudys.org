import { describe, it, expect } from "vitest";

// Tester la logique de redirection du middleware sans Next.js
const PUBLIC_PATHS = ["/", "/login", "/register", "/verify-otp"];
const AUTH_PATHS = ["/login", "/register", "/verify-otp"];

function getRedirect(path: string, hasSession: boolean): string | null {
  if (!hasSession && !PUBLIC_PATHS.some((p) => path === p || path.startsWith("/api/"))) {
    return "/login";
  }
  if (hasSession && AUTH_PATHS.includes(path)) {
    return "/feed";
  }
  return null;
}

describe("logique de redirection middleware", () => {
  describe("utilisateur non connecté", () => {
    it("peut accéder à /", () => {
      expect(getRedirect("/", false)).toBeNull();
    });

    it("peut accéder à /login", () => {
      expect(getRedirect("/login", false)).toBeNull();
    });

    it("peut accéder à /register", () => {
      expect(getRedirect("/register", false)).toBeNull();
    });

    it("est redirigé vers /login depuis /feed", () => {
      expect(getRedirect("/feed", false)).toBe("/login");
    });

    it("est redirigé vers /login depuis /profile/xxx", () => {
      expect(getRedirect("/profile/issiaka", false)).toBe("/login");
    });

    it("est redirigé vers /login depuis /messages", () => {
      expect(getRedirect("/messages", false)).toBe("/login");
    });

    it("peut accéder aux routes API", () => {
      expect(getRedirect("/api/posts", false)).toBeNull();
    });
  });

  describe("utilisateur connecté", () => {
    it("est redirigé vers /feed depuis /login", () => {
      expect(getRedirect("/login", true)).toBe("/feed");
    });

    it("est redirigé vers /feed depuis /register", () => {
      expect(getRedirect("/register", true)).toBe("/feed");
    });

    it("peut accéder à /feed", () => {
      expect(getRedirect("/feed", true)).toBeNull();
    });

    it("peut accéder à /profile/xxx", () => {
      expect(getRedirect("/profile/issiaka", true)).toBeNull();
    });

    it("peut accéder à /profile/settings", () => {
      expect(getRedirect("/profile/settings", true)).toBeNull();
    });

    it("peut accéder à / (landing page)", () => {
      expect(getRedirect("/", true)).toBeNull();
    });
  });
});
