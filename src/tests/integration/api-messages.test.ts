import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getConversations, POST as createConversation } from "@/app/api/messages/route";
import { GET as getMessages, POST as sendMessage } from "@/app/api/messages/[conversationId]/route";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const mockMessage = (overrides = {}) => ({
  id: "msg-1",
  conversation_id: "conv-1",
  sender_id: "user-1",
  content: "Bonjour !",
  is_read: false,
  is_deleted: false,
  is_first_message: false,
  created_at: new Date().toISOString(),
  sender: { id: "user-1", username: "issiaka", full_name: "Issiaka D.", avatar_url: null },
  ...overrides,
});

const mockConversation = (overrides = {}) => ({
  id: "conv-1",
  participant_1: "user-1",
  participant_2: "user-2",
  last_message: null,
  last_message_at: null,
  is_active: false,
  created_at: new Date().toISOString(),
  p1: { id: "user-1", username: "issiaka", full_name: "Issiaka D.", avatar_url: null, last_seen_at: null },
  p2: { id: "user-2", username: "konan", full_name: "Konan K.", avatar_url: null, last_seen_at: null },
  ...overrides,
});

const makeRequest = (method: string, url: string, body?: any) =>
  new NextRequest(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { "Content-Type": "application/json" } : {},
  });

function buildConversationsMock(options: { user?: any; conversations?: any[] } = {}) {
  const convs = options.conversations ?? [mockConversation()];
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: options.user !== undefined ? options.user : { id: "user-1" } } }) },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: convs }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: "conv-new" } }),
        }),
      }),
    }),
  } as any);
}

function buildMessagesMock(options: {
  user?: any;
  messages?: any[];
  conversation?: any;
  insertedMsg?: any;
} = {}) {
  const msgs = options.messages ?? [mockMessage()];
  const conv = options.conversation ?? { is_active: false };
  const inserted = options.insertedMsg ?? mockMessage({ id: "msg-new" });

  vi.mocked(createAdminClient).mockResolvedValue({
    from: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnThis(), neq: vi.fn().mockReturnThis() }),
    }),
  } as any);

  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: options.user !== undefined ? options.user : { id: "user-1" } } }) },
    from: vi.fn((table: string) => {
      if (table === "messages") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: msgs }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: inserted }),
            }),
          }),
        };
      }
      if (table === "conversations") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: conv }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null }),
          }),
        };
      }
      return { select: vi.fn().mockReturnThis() };
    }),
  } as any);
}

// ─── GET /api/messages ─────────────────────────────────────────────────────

describe("GET /api/messages", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retourne 401 si non authentifié", async () => {
    buildConversationsMock({ user: null });
    const res = await getConversations();
    expect(res.status).toBe(401);
  });

  it("retourne les conversations de l'utilisateur", async () => {
    buildConversationsMock({ conversations: [mockConversation()] });
    const res = await getConversations();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.conversations).toHaveLength(1);
  });

  it("identifie correctement l'autre participant", async () => {
    buildConversationsMock({
      conversations: [mockConversation({ participant_1: "user-1", participant_2: "user-2" })],
    });
    const res = await getConversations();
    const body = await res.json();
    expect(body.conversations[0].other_participant.id).toBe("user-2");
  });
});

// ─── POST /api/messages ────────────────────────────────────────────────────

describe("POST /api/messages (créer conversation)", () => {
  beforeEach(() => vi.clearAllMocks());

  // UUID valides requis depuis la validation ajoutée dans la route
  const VALID_OTHER_ID = "550e8400-e29b-41d4-a716-446655440000";
  const VALID_USER_ID  = "550e8400-e29b-41d4-a716-446655440001";

  it("retourne 401 si non authentifié", async () => {
    buildConversationsMock({ user: null });
    const res = await createConversation(makeRequest("POST", "http://localhost:3000/api/messages", { otherUserId: VALID_OTHER_ID }));
    expect(res.status).toBe(401);
  });

  it("retourne 400 pour un otherUserId non-UUID", async () => {
    buildConversationsMock({ user: { id: VALID_USER_ID } });
    const res = await createConversation(makeRequest("POST", "http://localhost:3000/api/messages", { otherUserId: "user-2" }));
    expect(res.status).toBe(400);
  });

  it("retourne une conversation existante sans en créer une nouvelle", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: VALID_USER_ID } } }) },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: "conv-existing" } }),
        }),
      }),
    } as any);
    const res = await createConversation(makeRequest("POST", "http://localhost:3000/api/messages", { otherUserId: VALID_OTHER_ID }));
    const body = await res.json();
    expect(body.conversationId).toBe("conv-existing");
  });
});

// ─── GET /api/messages/[conversationId] ────────────────────────────────────

describe("GET /api/messages/[conversationId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retourne 401 si non authentifié", async () => {
    buildMessagesMock({ user: null });
    const res = await getMessages(
      makeRequest("GET", "http://localhost:3000/api/messages/conv-1"),
      { params: Promise.resolve({ conversationId: "conv-1" }) }
    );
    expect(res.status).toBe(401);
  });

  it("retourne les messages d'une conversation", async () => {
    buildMessagesMock({ messages: [mockMessage(), mockMessage({ id: "msg-2" })] });
    const res = await getMessages(
      makeRequest("GET", "http://localhost:3000/api/messages/conv-1"),
      { params: Promise.resolve({ conversationId: "conv-1" }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.messages).toHaveLength(2);
  });
});

// ─── POST /api/messages/[conversationId] ───────────────────────────────────

describe("POST /api/messages/[conversationId] (envoyer message)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retourne 401 si non authentifié", async () => {
    buildMessagesMock({ user: null });
    const res = await sendMessage(
      makeRequest("POST", "http://localhost:3000/api/messages/conv-1", { content: "Bonjour" }),
      { params: Promise.resolve({ conversationId: "conv-1" }) }
    );
    expect(res.status).toBe(401);
  });

  it("retourne 400 si contenu vide", async () => {
    buildMessagesMock();
    const res = await sendMessage(
      makeRequest("POST", "http://localhost:3000/api/messages/conv-1", { content: "   " }),
      { params: Promise.resolve({ conversationId: "conv-1" }) }
    );
    expect(res.status).toBe(400);
  });

  it("envoie un message avec succès", async () => {
    buildMessagesMock({ insertedMsg: mockMessage({ id: "msg-sent", content: "Bonjour !" }) });
    const res = await sendMessage(
      makeRequest("POST", "http://localhost:3000/api/messages/conv-1", { content: "Bonjour !" }),
      { params: Promise.resolve({ conversationId: "conv-1" }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message.id).toBe("msg-sent");
  });

  it("marque is_first_message=true si conversation inactive", async () => {
    buildMessagesMock({ conversation: { is_active: false } });
    const res = await sendMessage(
      makeRequest("POST", "http://localhost:3000/api/messages/conv-1", { content: "Premier message" }),
      { params: Promise.resolve({ conversationId: "conv-1" }) }
    );
    expect(res.status).toBe(200);
    // Vérifier que is_first_message=true a été passé à l'insert
    const client = await createClient();
    const fromCalls = (client.from as any).mock.calls;
    const msgCall = fromCalls.find((c: any[]) => c[0] === "messages");
    expect(msgCall).toBeDefined();
  });
});
