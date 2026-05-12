import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/link-preview/route";

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

function makeRequest(url: string) {
  return new NextRequest(`http://localhost:3000/api/link-preview?url=${encodeURIComponent(url)}`);
}

const htmlWithOg = `
<html><head>
  <title>Ma page de test</title>
  <meta property="og:title" content="Titre Open Graph" />
  <meta property="og:description" content="Description de la page" />
  <meta property="og:image" content="https://example.com/image.jpg" />
  <meta property="og:site_name" content="Mon Site" />
</head><body></body></html>
`;

const htmlWithoutOg = `
<html><head>
  <title>Titre simple</title>
  <meta name="description" content="Description meta" />
</head><body></body></html>
`;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/link-preview", () => {
  beforeEach(() => vi.clearAllMocks());

  afterEach(() => vi.restoreAllMocks());

  it("retourne 400 si url manquante", async () => {
    const req = new NextRequest("http://localhost:3000/api/link-preview");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("retourne 400 pour une URL invalide (non http)", async () => {
    const res = await GET(makeRequest("ftp://malicious.com"));
    expect(res.status).toBe(400);
  });

  it("retourne 400 pour une URL mal formée", async () => {
    const res = await GET(makeRequest("pas-une-url"));
    expect(res.status).toBe(400);
  });

  it("extrait les balises Open Graph correctement", async () => {
    const mockBody = {
      getReader: () => {
        let done = false;
        return {
          read: async () => {
            if (done) return { done: true, value: undefined };
            done = true;
            return { done: false, value: new TextEncoder().encode(htmlWithOg) };
          },
          cancel: vi.fn(),
        };
      },
    };
    mockFetch.mockResolvedValue({
      ok: true,
      headers: { get: () => "text/html; charset=utf-8" },
      body: mockBody,
    });

    const res = await GET(makeRequest("https://example.com"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe("Titre Open Graph");
    expect(body.description).toBe("Description de la page");
    expect(body.image).toBe("https://example.com/image.jpg");
    expect(body.siteName).toBe("Mon Site");
    expect(body.url).toBe("https://example.com");
  });

  it("utilise les balises <title> et meta description si pas d'OG", async () => {
    const mockBody = {
      getReader: () => {
        let done = false;
        return {
          read: async () => {
            if (done) return { done: true, value: undefined };
            done = true;
            return { done: false, value: new TextEncoder().encode(htmlWithoutOg) };
          },
          cancel: vi.fn(),
        };
      },
    };
    mockFetch.mockResolvedValue({
      ok: true,
      headers: { get: () => "text/html" },
      body: mockBody,
    });

    const res = await GET(makeRequest("https://example.com"));
    const body = await res.json();
    expect(body.title).toBe("Titre simple");
    expect(body.description).toBe("Description meta");
  });

  it("retourne les infos de domaine pour les contenus non-HTML", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      headers: { get: () => "application/pdf" },
      body: { getReader: () => ({ read: async () => ({ done: true }), cancel: vi.fn() }) },
    });

    const res = await GET(makeRequest("https://example.com/doc.pdf"));
    const body = await res.json();
    expect(body.title).toBe("example.com");
    expect(res.status).toBe(200);
  });

  it("retourne 502 si le fetch échoue", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));
    const res = await GET(makeRequest("https://example.com"));
    expect(res.status).toBe(502);
  });

  it("inclut un header Cache-Control dans la réponse", async () => {
    const mockBody = {
      getReader: () => {
        let done = false;
        return {
          read: async () => {
            if (done) return { done: true, value: undefined };
            done = true;
            return { done: false, value: new TextEncoder().encode(htmlWithOg) };
          },
          cancel: vi.fn(),
        };
      },
    };
    mockFetch.mockResolvedValue({
      ok: true,
      headers: { get: () => "text/html" },
      body: mockBody,
    });

    const res = await GET(makeRequest("https://example.com"));
    const cacheControl = res.headers.get("Cache-Control");
    expect(cacheControl).toContain("max-age=3600");
  });

  it("résout les URLs d'images relatives en absolues", async () => {
    const htmlRelativeImage = `
      <html><head>
        <meta property="og:image" content="/images/photo.jpg" />
        <title>Test</title>
      </head></html>
    `;
    const mockBody = {
      getReader: () => {
        let done = false;
        return {
          read: async () => {
            if (done) return { done: true, value: undefined };
            done = true;
            return { done: false, value: new TextEncoder().encode(htmlRelativeImage) };
          },
          cancel: vi.fn(),
        };
      },
    };
    mockFetch.mockResolvedValue({
      ok: true,
      headers: { get: () => "text/html" },
      body: mockBody,
    });

    const res = await GET(makeRequest("https://monsite.com/page"));
    const body = await res.json();
    expect(body.image).toBe("https://monsite.com/images/photo.jpg");
  });
});
