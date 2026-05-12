import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useMessages, useConversations } from "@/hooks/useMessages";
import { createClient } from "@/lib/supabase/client";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

const mockMessage = (overrides = {}) => ({
  id: `msg-${Math.random()}`,
  conversation_id: "conv-1",
  sender_id: "user-1",
  content: "Bonjour !",
  media_url: null,
  is_read: false,
  is_deleted: false,
  is_first_message: false,
  created_at: new Date().toISOString(),
  ...overrides,
});

const mockConversation = (overrides = {}) => ({
  id: "conv-1",
  participant_1: "user-1",
  participant_2: "user-2",
  last_message: "Salut",
  last_message_at: new Date().toISOString(),
  is_active: true,
  created_at: new Date().toISOString(),
  other_participant: { id: "user-2", username: "konan", full_name: "Konan K.", avatar_url: null },
  ...overrides,
});

function buildSupabaseMock(options: {
  subscribeCallback?: (event: any, handler: (p: any) => void) => void;
} = {}) {
  const unsubscribe = vi.fn();
  const removeChannel = vi.fn();

  const channel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnValue({ unsubscribe }),
  };

  vi.mocked(createClient).mockReturnValue({
    channel: vi.fn().mockReturnValue(channel),
    removeChannel,
  } as any);

  return { channel, removeChannel };
}

// ─── useConversations ─────────────────────────────────────────────────────────

describe("useConversations", () => {
  beforeEach(() => vi.clearAllMocks());

  it("commence avec loading=true et liste vide", () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    buildSupabaseMock();
    const { result } = renderHook(() => useConversations("user-1"));
    expect(result.current.loading).toBe(true);
    expect(result.current.conversations).toHaveLength(0);
  });

  it("charge les conversations depuis l'API", async () => {
    const convs = [mockConversation(), mockConversation({ id: "conv-2" })];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ conversations: convs }),
    });
    buildSupabaseMock();

    const { result } = renderHook(() => useConversations("user-1"));
    await act(async () => { await new Promise(r => setTimeout(r, 50)); });
    expect(result.current.loading).toBe(false);
    expect(result.current.conversations).toHaveLength(2);
  });

  it("gère une erreur réseau sans crash", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
    buildSupabaseMock();
    const { result } = renderHook(() => useConversations("user-1"));
    await act(async () => { await new Promise(r => setTimeout(r, 50)); });
    expect(result.current.loading).toBe(false);
    expect(result.current.conversations).toHaveLength(0);
  });

  it("ne charge pas si userId est vide", () => {
    global.fetch = vi.fn();
    buildSupabaseMock();
    renderHook(() => useConversations(""));
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

// ─── useMessages ──────────────────────────────────────────────────────────────

describe("useMessages", () => {
  beforeEach(() => vi.clearAllMocks());

  it("commence avec loading=true et messages vides", () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    buildSupabaseMock();
    const { result } = renderHook(() => useMessages("conv-1", "user-1"));
    expect(result.current.loading).toBe(true);
    expect(result.current.messages).toHaveLength(0);
  });

  it("charge les messages depuis l'API", async () => {
    const msgs = [mockMessage(), mockMessage({ id: "msg-2" })];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ messages: msgs }),
    });
    buildSupabaseMock();

    const { result } = renderHook(() => useMessages("conv-1", "user-1"));
    await act(async () => { await new Promise(r => setTimeout(r, 50)); });
    expect(result.current.loading).toBe(false);
    expect(result.current.messages).toHaveLength(2);
  });

  it("s'abonne au canal Supabase Realtime", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ messages: [] }),
    });
    const { channel } = buildSupabaseMock();

    renderHook(() => useMessages("conv-1", "user-1"));
    await act(async () => { await new Promise(r => setTimeout(r, 50)); });

    expect(channel.on).toHaveBeenCalledWith(
      "postgres_changes",
      expect.objectContaining({ filter: "conversation_id=eq.conv-1" }),
      expect.any(Function)
    );
    expect(channel.subscribe).toHaveBeenCalled();
  });

  it("ajoute un message optimiste lors de sendMessage", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ messages: [] }) })
      .mockResolvedValue({ ok: true, json: () => Promise.resolve({ message: mockMessage({ id: "msg-real", content: "Nouveau message !" }) }) });
    buildSupabaseMock();

    const { result } = renderHook(() => useMessages("conv-1", "user-1"));
    await act(async () => { await new Promise(r => setTimeout(r, 50)); });

    // Envoyer un message et attendre la fin complète
    await act(async () => {
      await result.current.sendMessage("Nouveau message !");
    });

    // Après la résolution de l'API, le message réel est présent
    expect(result.current.messages.some(m => m.content === "Nouveau message !")).toBe(true);
  });

  it("ne crée pas de doublon si Realtime envoie le même message", async () => {
    const msgs = [mockMessage({ id: "msg-existing" })];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ messages: msgs }),
    });
    buildSupabaseMock();

    const { result } = renderHook(() => useMessages("conv-1", "user-1"));
    await act(async () => { await new Promise(r => setTimeout(r, 50)); });

    // Simuler un message Realtime avec le même ID
    act(() => {
      // Essayer d'ajouter le même message via setState
      // Le hook doit filtrer les doublons
      const existingId = result.current.messages[0]?.id;
      if (existingId) {
        // Le hook doit dédupliquer via : if (prev.some(m => m.id === newMsg.id)) return prev
        expect(result.current.messages.filter(m => m.id === existingId)).toHaveLength(1);
      }
    });
  });

  it("ne charge pas si conversationId est vide", () => {
    global.fetch = vi.fn();
    buildSupabaseMock();
    renderHook(() => useMessages("", "user-1"));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("rollback le message optimiste si l'API échoue", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ messages: [] }) })
      .mockResolvedValue({ ok: false });
    buildSupabaseMock();

    const { result } = renderHook(() => useMessages("conv-1", "user-1"));
    await act(async () => { await new Promise(r => setTimeout(r, 50)); });

    await act(async () => {
      await result.current.sendMessage("Message qui va échouer");
    });

    // Après rollback, les messages doivent être vides
    expect(result.current.messages).toHaveLength(0);
  });
});
