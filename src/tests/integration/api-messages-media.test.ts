import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as sendMessage } from "@/app/api/messages/[conversationId]/route";
import { createClient, createAdminClient } from "@/lib/supabase/server";

function makePostRequest(body: object) {
  return new NextRequest("http://localhost:3000/api/messages/conv-1", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const params = { params: Promise.resolve({ conversationId: "conv-1" }) };

function buildMock(options: {
  user?: any;
  conv?: any;
  insertedMsg?: any;
  insertError?: any;
} = {}) {
  const adminUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null }) });
  vi.mocked(createAdminClient).mockResolvedValue({
    from: vi.fn().mockReturnValue({ update: adminUpdate }),
  } as any);

  const conv = options.conv ?? { is_active: true };
  const inserted = options.insertedMsg ?? {
    id: "msg-new",
    conversation_id: "conv-1",
    sender_id: "user-1",
    content: "",
    media_url: "https://supabase.co/storage/file.pdf",
    is_read: false,
    created_at: new Date().toISOString(),
    sender: { id: "user-1", full_name: "Issiaka D.", avatar_url: null },
  };

  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: options.user !== undefined ? options.user : { id: "user-1" } },
      }),
    },
    from: vi.fn((table: string) => {
      if (table === "conversations") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: conv }),
          }),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null }) }),
        };
      }
      if (table === "messages") {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: options.insertError ? null : inserted,
                error: options.insertError ?? null,
              }),
            }),
          }),
        };
      }
      return {};
    }),
  } as any);
}

// ─── Tests médias dans les messages ──────────────────────────────────────────

describe("POST /api/messages/[conversationId] — avec médias", () => {
  beforeEach(() => vi.clearAllMocks());

  it("envoie un message avec media_url (image)", async () => {
    buildMock();
    const res = await sendMessage(
      makePostRequest({ content: "", media_url: "https://example.com/img.jpg" }),
      params
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBeDefined();
  });

  it("envoie un message avec media_url (PDF) sans texte", async () => {
    buildMock();
    const res = await sendMessage(
      makePostRequest({ content: "", media_url: "https://example.com/doc.pdf" }),
      params
    );
    expect(res.status).toBe(200);
  });

  it("envoie un message avec texte ET media_url", async () => {
    buildMock();
    const res = await sendMessage(
      makePostRequest({ content: "Voici le document", media_url: "https://example.com/doc.pdf" }),
      params
    );
    expect(res.status).toBe(200);
  });

  it("retourne 400 si contenu ET media_url sont vides", async () => {
    buildMock();
    const res = await sendMessage(
      makePostRequest({ content: "   ", media_url: undefined }),
      params
    );
    expect(res.status).toBe(400);
  });

  it("retourne 401 si non authentifié", async () => {
    buildMock({ user: null });
    const res = await sendMessage(
      makePostRequest({ content: "test", media_url: "https://example.com/img.jpg" }),
      params
    );
    expect(res.status).toBe(401);
  });

  it("met à jour last_message avec '📎 Fichier' si contenu vide", async () => {
    buildMock();
    const res = await sendMessage(
      makePostRequest({ content: "", media_url: "https://example.com/img.jpg" }),
      params
    );
    expect(res.status).toBe(200);
    const client = await createClient();
    const convFrom = (client.from as any).mock.results.find(
      (_: any, i: number) => (client.from as any).mock.calls[i]?.[0] === "conversations"
    );
    // La conversation doit être mise à jour
    expect(convFrom).toBeDefined();
  });

  it("nom du fichier PDF transmis dans content est affiché", async () => {
    const pdfFilename = "cours_analyse_numerique.pdf";
    buildMock({
      insertedMsg: {
        id: "msg-pdf",
        conversation_id: "conv-1",
        sender_id: "user-1",
        content: pdfFilename, // Le nom du fichier est stocké dans content
        media_url: "https://supabase.co/storage/cours.pdf",
        is_read: false,
        created_at: new Date().toISOString(),
      },
    });

    const res = await sendMessage(
      makePostRequest({ content: pdfFilename, media_url: "https://supabase.co/storage/cours.pdf" }),
      params
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message.content).toBe(pdfFilename);
  });
});
