import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/search/route";
import { createClient } from "@/lib/supabase/server";

const mockPost = (id = "post-1") => ({
  id,
  content: "Mathématiques avancées",
  author: { id: "user-1", username: "issiaka", full_name: "Issiaka D.", avatar_url: null, is_verified: false, institution: "UVCI" },
  media: [],
});

const mockUser = (id = "user-1") => ({
  id,
  username: `user_${id}`,
  full_name: `Utilisateur ${id}`,
  avatar_url: null,
  is_verified: false,
  institution: "UVCI",
  field_of_study: "Informatique",
  academic_level: "licence_1",
});

const makeRequest = (params: Record<string, string> = {}) => {
  const url = new URL("http://localhost:3000/api/search");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString());
};

function makeChainableQuery(finalData: any[]) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    then: (resolve: any, reject: any) => Promise.resolve({ data: finalData }).then(resolve, reject),
  };
  // Make all methods return the chain itself
  Object.keys(chain).forEach((k) => {
    if (k !== "then") chain[k].mockReturnValue(chain);
  });
  return chain;
}

function buildSearchMock(options: {
  user?: any;
  posts?: any[];
  users?: any[];
  liked?: any[];
  saved?: any[];
} = {}) {
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: options.user !== undefined ? options.user : { id: "user-1" } } }) },
    from: vi.fn((table: string) => {
      if (table === "posts") return makeChainableQuery(options.posts ?? [mockPost()]);
      if (table === "profiles") return makeChainableQuery(options.users ?? [mockUser()]);
      if (table === "post_likes") return makeChainableQuery(options.liked ?? []);
      if (table === "post_saves") return makeChainableQuery(options.saved ?? []);
      return { select: vi.fn().mockReturnThis() };
    }),
  } as any);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/search", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retourne des listes vides si q est vide", async () => {
    buildSearchMock();
    const res = await GET(makeRequest({ q: "" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.posts).toHaveLength(0);
    expect(body.users).toHaveLength(0);
  });

  it("retourne des listes vides si q est manquant", async () => {
    buildSearchMock();
    const res = await GET(makeRequest());
    const body = await res.json();
    expect(body.posts).toHaveLength(0);
    expect(body.users).toHaveLength(0);
  });

  it("recherche dans les posts et utilisateurs (type=all)", async () => {
    buildSearchMock({ posts: [mockPost()], users: [mockUser()] });
    const res = await GET(makeRequest({ q: "math" }));
    const body = await res.json();
    expect(body.posts.length).toBeGreaterThan(0);
    expect(body.users.length).toBeGreaterThan(0);
  });

  it("recherche uniquement dans les utilisateurs (type=users)", async () => {
    buildSearchMock({ users: [mockUser()] });
    const res = await GET(makeRequest({ q: "issiaka", type: "users" }));
    const body = await res.json();
    expect(body.users.length).toBeGreaterThan(0);
    // Les posts ne doivent pas être recherchés
    expect(body.posts).toHaveLength(0);
  });

  it("filtre les posts dont l'auteur est null", async () => {
    buildSearchMock({ posts: [{ ...mockPost(), author: null }, mockPost("post-2")] });
    const res = await GET(makeRequest({ q: "math" }));
    const body = await res.json();
    expect(body.posts).toHaveLength(1);
    expect(body.posts[0].id).toBe("post-2");
  });

  it("enrichit les posts avec liked/saved si l'utilisateur est connecté", async () => {
    buildSearchMock({
      posts: [mockPost("post-1")],
      liked: [{ post_id: "post-1" }],
      saved: [],
    });
    const res = await GET(makeRequest({ q: "math" }));
    const body = await res.json();
    expect(body.posts[0].liked_by_user).toBe(true);
    expect(body.posts[0].saved_by_user).toBe(false);
  });

  it("retourne les posts sans enrichissement si l'utilisateur est non connecté", async () => {
    buildSearchMock({ user: null, posts: [mockPost()] });
    const res = await GET(makeRequest({ q: "math" }));
    const body = await res.json();
    expect(body.posts[0].liked_by_user).toBeUndefined();
  });

  it("filtre les sujets d'examens (type=exam_subject)", async () => {
    buildSearchMock({ posts: [mockPost()] });
    const res = await GET(makeRequest({ q: "maths", type: "exam_subject" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("posts");
  });
});
