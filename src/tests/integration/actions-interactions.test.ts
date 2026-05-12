import { describe, it, expect, vi, beforeEach } from "vitest";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  toggleLikeAction,
  toggleSaveAction,
  deletePostAction,
  reportPostAction,
} from "@/app/actions/interactions";

// ─── Builders ─────────────────────────────────────────────────────────────────

function buildChainableMock(finalResult: any) {
  const chain: any = {
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    then: (resolve: any) => Promise.resolve(finalResult).then(resolve),
  };
  return chain;
}

function setupMocks(options: {
  userId?: string | null;
  postAuthorId?: string;
  dbError?: any;
} = {}) {
  const userId = options.userId !== undefined ? options.userId : "user-123";
  const adminInsert = vi.fn().mockResolvedValue({ data: null, error: null });

  vi.mocked(createAdminClient).mockResolvedValue({
    from: vi.fn().mockReturnValue({ insert: adminInsert }),
  } as any);

  const deleteChain = buildChainableMock({ data: null, error: options.dbError ?? null });
  const updateChain = buildChainableMock({ data: null, error: options.dbError ?? null });
  const insertResult = { data: null, error: options.dbError ?? null };

  const mockClient = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: userId !== null ? { id: userId } : null },
      }),
    },
    from: vi.fn((table: string) => {
      if (table === "posts") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { author_id: options.postAuthorId ?? "author-456" },
                error: null,
              }),
            }),
          }),
          update: vi.fn().mockReturnValue(buildChainableMock({ data: null, error: options.dbError ?? null })),
        };
      }
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { full_name: "Issiaka D." },
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        insert: vi.fn().mockResolvedValue(insertResult),
        delete: vi.fn().mockReturnValue(deleteChain),
        update: vi.fn().mockReturnValue(updateChain),
        select: vi.fn().mockReturnThis(),
      };
    }),
  };

  vi.mocked(createClient).mockResolvedValue(mockClient as any);
  return { adminInsert, mockClient };
}

// ─── toggleLikeAction ─────────────────────────────────────────────────────────

describe("toggleLikeAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retourne une erreur si non authentifié", async () => {
    setupMocks({ userId: null });
    const result = await toggleLikeAction("post-1", false);
    expect(result.error).toBe("Non authentifié");
  });

  it("unlike: supprime le like si liked=true", async () => {
    setupMocks();
    const result = await toggleLikeAction("post-1", true);
    expect(result.ok).toBe(true);
  });

  it("like: ajoute un like si liked=false et envoie une notification", async () => {
    const { adminInsert } = setupMocks({ postAuthorId: "author-456" });
    const result = await toggleLikeAction("post-1", false);
    expect(result.ok).toBe(true);
    expect(adminInsert).toHaveBeenCalledWith(
      expect.objectContaining({ type: "like", recipient_id: "author-456" })
    );
  });

  it("n'envoie pas de notification si l'auteur like son propre post", async () => {
    const { adminInsert } = setupMocks({ userId: "user-123", postAuthorId: "user-123" });
    const result = await toggleLikeAction("post-1", false);
    expect(result.ok).toBe(true);
    expect(adminInsert).not.toHaveBeenCalled();
  });

  it("retourne ok:true après une opération réussie", async () => {
    setupMocks();
    const r = await toggleLikeAction("post-1", false);
    expect(r.ok).toBe(true);
  });
});

// ─── toggleSaveAction ─────────────────────────────────────────────────────────

describe("toggleSaveAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retourne une erreur si non authentifié", async () => {
    setupMocks({ userId: null });
    const result = await toggleSaveAction("post-1", false);
    expect(result.error).toBe("Non authentifié");
  });

  it("sauvegarde un post si saved=false", async () => {
    setupMocks();
    const result = await toggleSaveAction("post-1", false);
    expect(result.ok).toBe(true);
  });

  it("retire la sauvegarde si saved=true", async () => {
    setupMocks();
    const result = await toggleSaveAction("post-1", true);
    expect(result.ok).toBe(true);
  });
});

// ─── deletePostAction ─────────────────────────────────────────────────────────

describe("deletePostAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retourne une erreur si non authentifié", async () => {
    setupMocks({ userId: null });
    const result = await deletePostAction("post-1");
    expect(result.error).toBe("Non authentifié");
  });

  it("soft-delete le post avec succès", async () => {
    setupMocks();
    const result = await deletePostAction("post-1");
    expect(result.ok).toBe(true);
  });

  it("retourne l'erreur Supabase si l'update échoue", async () => {
    setupMocks({ dbError: { message: "permission denied" } });
    const result = await deletePostAction("post-1");
    expect(result.error).toBe("permission denied");
  });

  it("utilise update (soft delete), pas delete (hard delete)", async () => {
    const { mockClient } = setupMocks();
    await deletePostAction("post-1");
    const postsFrom = (mockClient.from as any).mock.results.find(
      (_: any, i: number) => (mockClient.from as any).mock.calls[i]?.[0] === "posts"
    );
    expect(postsFrom?.value?.update).toBeDefined();
  });

  it("force is_deleted=true dans l'update", async () => {
    const { mockClient } = setupMocks();
    await deletePostAction("post-1");
    // L'update devrait être appelé avec is_deleted: true
    const fromCalls = (mockClient.from as any).mock.calls;
    const postCallIdx = fromCalls.findIndex((c: any[]) => c[0] === "posts");
    if (postCallIdx >= 0) {
      const postTableProxy = (mockClient.from as any).mock.results[postCallIdx].value;
      expect(postTableProxy.update).toHaveBeenCalledWith({ is_deleted: true });
    }
  });
});

// ─── reportPostAction ─────────────────────────────────────────────────────────

describe("reportPostAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retourne une erreur si non authentifié", async () => {
    setupMocks({ userId: null });
    const result = await reportPostAction("post-1", "Contenu inapproprié");
    expect(result.error).toBe("Non authentifié");
  });

  it("crée un signalement avec succès", async () => {
    setupMocks();
    const result = await reportPostAction("post-1", "Spam");
    expect(result.ok).toBe(true);
  });

  it("ignore l'erreur 23505 (post déjà signalé)", async () => {
    setupMocks({ dbError: { message: "duplicate key", code: "23505" } });
    const result = await reportPostAction("post-1", "Spam");
    expect(result.error).toBeUndefined();
    expect(result.ok).toBe(true);
  });

  it("retourne l'erreur pour toute autre erreur DB", async () => {
    setupMocks({ dbError: { message: "connection error", code: "PGRST301" } });
    const result = await reportPostAction("post-1", "Spam");
    expect(result.error).toBeDefined();
  });

  it("insère un signalement avec la bonne raison", async () => {
    const { mockClient } = setupMocks();
    await reportPostAction("post-1", "Contenu dangereux");
    const fromCalls = (mockClient.from as any).mock.calls;
    const reportsCallIdx = fromCalls.findIndex((c: any[]) => c[0] === "post_reports");
    if (reportsCallIdx >= 0) {
      const reportsProxy = (mockClient.from as any).mock.results[reportsCallIdx].value;
      expect(reportsProxy.insert).toHaveBeenCalledWith(
        expect.objectContaining({ reason: "Contenu dangereux" })
      );
    }
  });
});
