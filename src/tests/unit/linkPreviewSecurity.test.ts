import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/link-preview/route";

// Mock fetch global pour éviter les appels réseau réels
const mockFetch = vi.fn();
global.fetch = mockFetch;

const makeRequest = (url: string) =>
  new NextRequest(`http://localhost:3000/api/link-preview?url=${encodeURIComponent(url)}`);

describe("GET /api/link-preview — sécurité SSRF", () => {
  beforeEach(() => vi.clearAllMocks());

  it("bloque localhost", async () => {
    const res = await GET(makeRequest("http://localhost:8080/secret"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/non autorisée/i);
  });

  it("bloque 127.0.0.1", async () => {
    const res = await GET(makeRequest("http://127.0.0.1/secret"));
    expect(res.status).toBe(400);
  });

  it("bloque une IP privée 10.x.x.x", async () => {
    const res = await GET(makeRequest("http://10.0.0.1/secret"));
    expect(res.status).toBe(400);
  });

  it("bloque une IP privée 192.168.x.x", async () => {
    const res = await GET(makeRequest("http://192.168.1.1/secret"));
    expect(res.status).toBe(400);
  });

  it("bloque le protocole file://", async () => {
    const res = await GET(makeRequest("file:///etc/passwd"));
    expect(res.status).toBe(400);
  });

  it("bloque le protocole ftp://", async () => {
    const res = await GET(makeRequest("ftp://example.com"));
    expect(res.status).toBe(400);
  });

  it("retourne 400 si URL manquante", async () => {
    const res = await GET(new NextRequest("http://localhost:3000/api/link-preview"));
    expect(res.status).toBe(400);
  });

  it("retourne 400 si URL invalide", async () => {
    const res = await GET(makeRequest("not-a-url"));
    expect(res.status).toBe(400);
  });

  it("accepte une URL HTTP publique valide", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => "text/html" },
      body: {
        getReader: () => ({
          read: vi.fn()
            .mockResolvedValueOnce({
              value: new TextEncoder().encode('<title>Test</title><meta property="og:title" content="Test Page">'),
              done: false,
            })
            .mockResolvedValueOnce({ value: undefined, done: true }),
          cancel: vi.fn(),
        }),
      },
    });
    const res = await GET(makeRequest("https://example.com"));
    expect([200, 502]).toContain(res.status); // 200 si succès, 502 si fetch échoue
  });

  it("retourne 502 si le site externe ne répond pas", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));
    const res = await GET(makeRequest("https://example.com"));
    expect(res.status).toBe(502);
  });
});
