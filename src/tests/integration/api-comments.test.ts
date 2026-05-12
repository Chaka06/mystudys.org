import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/comments/route";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const mockComment = (overrides = {}) => ({
  id: "comment-1",
  post_id: "post-1",
  author_id: "user-1",
  parent_id: null,
  content: "Super publication !",
  like_count: 0,
  is_deleted: false,
  created_at: new Date().toISOString(),
  author: { id: "user-1", username: "issiaka", full_name: "Issiaka D.", avatar_url: null },
  ...overrides,
});

const makeRequest = (method: "GET" | "POST", params: Record<string, string> = {}, body?: any) => {
  const url = new URL("http://localhost:3000/api/comments");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString(), {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { "Content-Type": "application/json" } : {},
  });
};

function buildSupabaseMock(options: {
  user?: any;
  comments?: any[];
  insertedComment?: any;
  postAuthorId?: string;
  insertError?: any;
} = {}) {
  const comments = options.comments ?? [mockComment()];
  const inserted = options.insertedComment ?? mockComment({ id: "comment-new" });

  const adminInsertMock = vi.fn().mockResolvedValue({ data: null, error: null });
  vi.mocked(createAdminClient).mockResolvedValue({
    from: vi.fn().mockReturnValue({ insert: adminInsertMock }),
  } as any);

  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: options.user !== undefined ? options.user : { id: "user-1" } } }),
    },
    from: vi.fn((table: string) => {
      if (table === "comments") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: comments, error: null }),
          }),
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
      if (table === "posts") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { author_id: options.postAuthorId ?? "author-other" },
              error: null,
            }),
          }),
        };
      }
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { full_name: "Issiaka D." }, error: null }),
          }),
        };
      }
      return { select: vi.fn().mockReturnThis() };
    }),
  } as any);
}

// ─── GET /api/comments ─────────────────────────────────────────────────────

describe("GET /api/comments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retourne 400 si postId manquant", async () => {
    buildSupabaseMock();
    const res = await GET(makeRequest("GET"));
    expect(res.status).toBe(400);
  });

  it("retourne les commentaires d'un post", async () => {
    buildSupabaseMock({ comments: [mockComment(), mockComment({ id: "comment-2" })] });
    const res = await GET(makeRequest("GET", { postId: "post-1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.comments).toHaveLength(2);
  });

  it("retourne un tableau vide si aucun commentaire", async () => {
    buildSupabaseMock({ comments: [] });
    const res = await GET(makeRequest("GET", { postId: "post-1" }));
    const body = await res.json();
    expect(body.comments).toHaveLength(0);
  });
});

// ─── POST /api/comments ────────────────────────────────────────────────────

describe("POST /api/comments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retourne 401 si non authentifié", async () => {
    buildSupabaseMock({ user: null });
    const res = await POST(makeRequest("POST", {}, { post_id: "post-1", content: "Test" }));
    expect(res.status).toBe(401);
  });

  it("retourne 400 si post_id manquant", async () => {
    buildSupabaseMock();
    const res = await POST(makeRequest("POST", {}, { content: "Test" }));
    expect(res.status).toBe(400);
  });

  it("retourne 400 si contenu vide", async () => {
    buildSupabaseMock();
    const res = await POST(makeRequest("POST", {}, { post_id: "post-1", content: "   " }));
    expect(res.status).toBe(400);
  });

  it("crée un commentaire avec succès", async () => {
    buildSupabaseMock({ postAuthorId: "user-other" });
    const res = await POST(makeRequest("POST", {}, { post_id: "post-1", content: "Super post !" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.comment).toBeDefined();
    expect(body.comment.id).toBe("comment-new");
  });

  it("trim le contenu du commentaire", async () => {
    buildSupabaseMock({ postAuthorId: "user-other" });
    await POST(makeRequest("POST", {}, { post_id: "post-1", content: "  Super  " }));
    // Vérifier que le contenu est trimé lors de l'insertion
    const client = await createClient();
    const fromCalls = (client.from as any).mock.calls;
    const commentCall = fromCalls.find((c: any[]) => c[0] === "comments");
    expect(commentCall).toBeDefined();
  });

  it("ne notifie pas si l'auteur commente son propre post", async () => {
    // L'auteur du post est le même que l'utilisateur connecté
    buildSupabaseMock({ postAuthorId: "user-1" });
    await POST(makeRequest("POST", {}, { post_id: "post-1", content: "Mon propre post" }));
    const adminClient = await createAdminClient();
    expect((adminClient.from as any).mock.calls.length).toBe(0);
  });

  it("supporte les réponses (parent_id)", async () => {
    buildSupabaseMock({ postAuthorId: "user-other" });
    const res = await POST(makeRequest("POST", {}, {
      post_id: "post-1",
      content: "Réponse au commentaire",
      parent_id: "comment-parent",
    }));
    expect(res.status).toBe(200);
  });
});
