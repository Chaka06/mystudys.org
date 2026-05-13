import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/feed/route";
import { createClient } from "@/lib/supabase/server";

const mockPost = (overrides = {}) => ({
  id: "post-1",
  author_id: "user-1",
  content: "Bonjour !",
  post_type: "general",
  like_count: 5,
  comment_count: 2,
  is_deleted: false,
  moderation_status: "approved",
  created_at: new Date().toISOString(),
  author: { id: "user-1", username: "issiaka", full_name: "Issiaka D.", avatar_url: null, is_verified: false, institution: "UVCI", field_of_study: "Info" },
  media: [],
  ...overrides,
});

const makeGetRequest = (params: Record<string, string> = {}) => {
  const url = new URL("http://localhost:3000/api/feed");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString());
};

function buildSupabaseMock(options: {
  user?: any;
  posts?: any[];
  liked?: any[];
  saved?: any[];
  error?: any;
  userCount?: number;
} = {}) {
  const posts = options.posts ?? [mockPost()];
  const liked = options.liked ?? [];
  const saved = options.saved ?? [];
  const userCount = options.userCount ?? 5; // < 100 par défaut = feed chronologique

  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: options.user !== undefined ? options.user : { id: "user-1" } },
      }),
    },
    rpc: vi.fn().mockResolvedValue({ data: [] }), // RPC feed personnalisé vide
    from: vi.fn((table: string) => {
      if (table === "profiles") {
        // Comptage des utilisateurs actifs pour le seuil personnalisé
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: userCount, data: null, error: null }),
          }),
        };
      }
      if (table === "posts") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            range: vi.fn().mockResolvedValue({ data: posts, error: options.error ?? null }),
          }),
        };
      }
      if (table === "post_likes") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ data: liked }),
          }),
        };
      }
      if (table === "post_saves") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ data: saved }),
          }),
        };
      }
      return { select: vi.fn().mockReturnThis() };
    }),
  } as any);
}

describe("GET /api/feed", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retourne 401 si non authentifié", async () => {
    buildSupabaseMock({ user: null });
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("retourne des posts avec offset=0 par défaut", async () => {
    buildSupabaseMock({ posts: [mockPost({ id: "post-1" }), mockPost({ id: "post-2" })] });
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.posts).toHaveLength(2);
  });

  it("enrichit les posts avec liked_by_user et saved_by_user", async () => {
    buildSupabaseMock({
      posts: [mockPost({ id: "post-1" })],
      liked: [{ post_id: "post-1" }],
      saved: [],
    });
    const res = await GET(makeGetRequest());
    const body = await res.json();
    expect(body.posts[0].liked_by_user).toBe(true);
    expect(body.posts[0].saved_by_user).toBe(false);
  });

  it("filtre les posts dont l'auteur est null", async () => {
    buildSupabaseMock({
      posts: [
        mockPost({ id: "post-1", author: null }),
        mockPost({ id: "post-2" }),
      ],
    });
    const res = await GET(makeGetRequest());
    const body = await res.json();
    expect(body.posts).toHaveLength(1);
    expect(body.posts[0].id).toBe("post-2");
  });

  it("retourne nextOffset=null quand il y a moins de 10 posts", async () => {
    buildSupabaseMock({ posts: Array.from({ length: 5 }, (_, i) => mockPost({ id: `post-${i}` })) });
    const res = await GET(makeGetRequest());
    const body = await res.json();
    expect(body.nextOffset).toBeNull();
  });

  it("retourne nextOffset=10 quand exactement 10 posts retournés", async () => {
    buildSupabaseMock({ posts: Array.from({ length: 10 }, (_, i) => mockPost({ id: `post-${i}` })) });
    const res = await GET(makeGetRequest());
    const body = await res.json();
    expect(body.nextOffset).toBe(10);
  });

  it("trie les médias par position", async () => {
    buildSupabaseMock({
      posts: [mockPost({
        media: [
          { id: "m2", media_type: "image", url: "url2", position: 2 },
          { id: "m1", media_type: "image", url: "url1", position: 0 },
        ],
      })],
    });
    const res = await GET(makeGetRequest());
    const body = await res.json();
    expect(body.posts[0].media[0].id).toBe("m1");
    expect(body.posts[0].media[1].id).toBe("m2");
  });

  it("retourne 500 si Supabase échoue", async () => {
    buildSupabaseMock({ error: { message: "DB connection failed" } });
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("DB connection failed");
  });

  it("supporte la pagination avec offset", async () => {
    buildSupabaseMock({ posts: [mockPost()] });
    const res = await GET(makeGetRequest({ offset: "10" }));
    expect(res.status).toBe(200);
  });

  it("un post sauvegardé est bien marqué saved_by_user=true", async () => {
    buildSupabaseMock({
      posts: [mockPost({ id: "post-X" })],
      liked: [],
      saved: [{ post_id: "post-X" }],
    });
    const res = await GET(makeGetRequest());
    const body = await res.json();
    expect(body.posts[0].saved_by_user).toBe(true);
    expect(body.posts[0].liked_by_user).toBe(false);
  });
});
