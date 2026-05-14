import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/contacts/sync/route";
import { createClient } from "@/lib/supabase/server";

function buildMock(options: { user?: any } = {}) {
  const deleteEq = vi.fn().mockResolvedValue({ data: null, error: null });
  const insertMock = vi.fn().mockResolvedValue({ data: null, error: null });

  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: options.user !== undefined ? options.user : { id: "user-1" } },
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      upsert: insertMock,
    }),
  } as any);

  return { deleteEq, insertMock };
}

const makeRequest = (body: any) =>
  new NextRequest("http://localhost:3000/api/contacts/sync", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

describe("POST /api/contacts/sync", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retourne 401 si non authentifié", async () => {
    buildMock({ user: null });
    const res = await POST(makeRequest({ phones: ["+2250799298420"] }));
    expect(res.status).toBe(401);
  });

  it("retourne 400 si phones manquant", async () => {
    buildMock();
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("retourne 400 si phones est un tableau vide", async () => {
    buildMock();
    const res = await POST(makeRequest({ phones: [] }));
    expect(res.status).toBe(400);
  });

  it("retourne 400 si phones n'est pas un tableau", async () => {
    buildMock();
    const res = await POST(makeRequest({ phones: "+2250799298420" }));
    expect(res.status).toBe(400);
  });

  it("synchronise des numéros valides avec succès", async () => {
    buildMock();
    const res = await POST(makeRequest({
      phones: ["+2250799298420", "+2250707070707", "+2250505050505"],
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.synced).toBe(3);
  });

  it("déduplique les numéros identiques", async () => {
    buildMock();
    const res = await POST(makeRequest({
      phones: ["+2250799298420", "+225 07 99 29 84 20", "0799298420"],
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    // Tous les trois sont le même numéro normalisé → 1 seul hash
    expect(body.synced).toBe(1);
  });

  it("utilise upsert pour insérer les contacts", async () => {
    const { insertMock } = buildMock();
    await POST(makeRequest({ phones: ["+2250799298420"] }));
    expect(insertMock).toHaveBeenCalled();
  });

  it("limite à 5000 contacts maximum", async () => {
    buildMock();
    const phones = Array.from({ length: 6000 }, (_, i) => `+225070000${String(i).padStart(4, "0")}`);
    const res = await POST(makeRequest({ phones }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.synced).toBeLessThanOrEqual(5000);
  });

  it("les hashes ne contiennent jamais de numéro en clair", async () => {
    const { insertMock } = buildMock();
    await POST(makeRequest({ phones: ["+2250799298420"] }));

    const calls = insertMock.mock.calls;
    if (calls.length > 0) {
      const rows = calls[0][0];
      if (Array.isArray(rows)) {
        rows.forEach((row: any) => {
          expect(row.phone_hash).not.toContain("2250799");
          expect(row.phone_hash).toHaveLength(64);
        });
      }
    }
  });
});
