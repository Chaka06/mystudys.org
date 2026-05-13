import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock Supabase SSR avant l'import du proxy
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}));

import { createServerClient } from "@supabase/ssr";
import { proxy } from "@/proxy";

const makeRequest = (path: string) =>
  new NextRequest(`https://www.mystudys.org${path}`);

function mockSupabase(hasSession: boolean, cookiesToSet: Array<{name: string; value: string}> = []) {
  vi.mocked(createServerClient).mockReturnValue({
    auth: {
      getSession: vi.fn().mockImplementation(async function() {
        // Simuler le rafraîchissement de token en appelant setAll si des cookies sont fournis
        return { data: { session: hasSession ? { user: { id: "user-1" } } : null } };
      }),
    },
    cookies: {},
  } as any);
}

describe("proxy middleware", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("routes publiques", () => {
    it("laisse passer / sans session", async () => {
      mockSupabase(false);
      const res = await proxy(makeRequest("/"));
      expect(res.status).not.toBe(307);
    });

    it("laisse passer /about sans session", async () => {
      mockSupabase(false);
      const res = await proxy(makeRequest("/about"));
      expect(res.status).not.toBe(307);
    });

    it("laisse passer /login sans session", async () => {
      mockSupabase(false);
      const res = await proxy(makeRequest("/login"));
      expect(res.status).not.toBe(307);
    });

    it("laisse passer /register sans session", async () => {
      mockSupabase(false);
      const res = await proxy(makeRequest("/register"));
      expect(res.status).not.toBe(307);
    });

    it("laisse passer /privacy sans session", async () => {
      mockSupabase(false);
      const res = await proxy(makeRequest("/privacy"));
      expect(res.status).not.toBe(307);
    });

    it("laisse passer /terms sans session", async () => {
      mockSupabase(false);
      const res = await proxy(makeRequest("/terms"));
      expect(res.status).not.toBe(307);
    });

    it("laisse passer /api/* sans session", async () => {
      mockSupabase(false);
      const res = await proxy(makeRequest("/api/feed"));
      expect(res.status).not.toBe(307);
    });
  });

  describe("routes protégées", () => {
    it("redirige /feed vers /login si pas de session", async () => {
      mockSupabase(false);
      const res = await proxy(makeRequest("/feed"));
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/login");
    });

    it("redirige /messages vers /login si pas de session", async () => {
      mockSupabase(false);
      const res = await proxy(makeRequest("/messages"));
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/login");
    });

    it("redirige /profile/* vers /login si pas de session", async () => {
      mockSupabase(false);
      const res = await proxy(makeRequest("/profile/someuser"));
      expect(res.status).toBe(307);
    });

    it("inclut redirectTo dans le lien de redirection", async () => {
      mockSupabase(false);
      const res = await proxy(makeRequest("/feed"));
      const location = res.headers.get("location") ?? "";
      expect(location).toContain("redirectTo");
    });

    it("laisse passer /feed avec une session valide", async () => {
      mockSupabase(true);
      const res = await proxy(makeRequest("/feed"));
      expect(res.status).not.toBe(307);
    });
  });

  describe("redirections auth (connecté)", () => {
    it("redirige /login vers /feed si déjà connecté", async () => {
      mockSupabase(true);
      const res = await proxy(makeRequest("/login"));
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/feed");
    });

    it("redirige /register vers /feed si déjà connecté", async () => {
      mockSupabase(true);
      const res = await proxy(makeRequest("/register"));
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/feed");
    });

    it("redirige /verify-otp vers /feed si déjà connecté", async () => {
      mockSupabase(true);
      const res = await proxy(makeRequest("/verify-otp"));
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/feed");
    });

    it("laisse passer /about même si connecté", async () => {
      mockSupabase(true);
      const res = await proxy(makeRequest("/about"));
      expect(res.status).not.toBe(307);
    });
  });
});
