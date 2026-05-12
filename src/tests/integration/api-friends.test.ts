import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/friends/route";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const mockProfile = (id: string, overrides = {}) => ({
  id,
  username: `user_${id}`,
  full_name: `Utilisateur ${id}`,
  avatar_url: null,
  is_verified: false,
  institution: "UVCI",
  ...overrides,
});

const mockFriendship = (overrides = {}) => ({
  id: "fs-1",
  requester_id: "user-1",
  addressee_id: "user-2",
  status: "accepted",
  created_at: new Date().toISOString(),
  requester: mockProfile("user-1"),
  addressee: mockProfile("user-2"),
  ...overrides,
});

const makeRequest = (method: string, url: string, body?: any) =>
  new NextRequest(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { "Content-Type": "application/json" } : {},
  });

function buildFriendsMock(options: {
  user?: any;
  friendships?: any[];
  suggestions?: any[];
  requests?: any[];
  rpcData?: any[];
} = {}) {
  const adminInsert = vi.fn().mockResolvedValue({ data: null, error: null });
  vi.mocked(createAdminClient).mockResolvedValue({
    from: vi.fn().mockReturnValue({ insert: adminInsert }),
  } as any);

  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: options.user !== undefined ? options.user : { id: "user-1" } } }) },
    rpc: vi.fn().mockResolvedValue({ data: options.rpcData ?? [] }),
    from: vi.fn((table: string) => {
      const baseSelect = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: options.suggestions ?? [] }),
          single: vi.fn().mockResolvedValue({ data: { full_name: "Issiaka D.", requester_id: "user-2" } }),
        }),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      };

      if (table === "friendships") {
        return {
          ...baseSelect,
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { requester_id: "user-2" } }),
            mockResolvedValue: vi.fn().mockResolvedValue({ data: options.friendships ?? [] }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: "fs-new-123" }, error: null }),
            }),
            // accès direct sans select (comportement par défaut)
            then: (resolve: any) => Promise.resolve({ data: null, error: null }).then(resolve),
          }),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnThis() }),
          delete: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnThis() }),
        };
      }
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ data: options.suggestions ?? [] }),
            single: vi.fn().mockResolvedValue({ data: { full_name: "Issiaka D." } }),
          }),
        };
      }
      return baseSelect;
    }),
  } as any);
}

// ─── GET /api/friends ──────────────────────────────────────────────────────

describe("GET /api/friends", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retourne 401 si non authentifié", async () => {
    buildFriendsMock({ user: null });
    const res = await GET(makeRequest("GET", "http://localhost:3000/api/friends"));
    expect(res.status).toBe(401);
  });

  it("retourne les amis acceptés par défaut", async () => {
    buildFriendsMock();
    const res = await GET(makeRequest("GET", "http://localhost:3000/api/friends"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("friends");
  });

  it("retourne les suggestions d'amis", async () => {
    buildFriendsMock({ rpcData: [{ suggested_id: "user-3", common_friends: 2, match_score: 45 }] });
    const res = await GET(makeRequest("GET", "http://localhost:3000/api/friends?type=suggestions"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("suggestions");
  });

  it("retourne les demandes d'amis reçues", async () => {
    buildFriendsMock();
    const res = await GET(makeRequest("GET", "http://localhost:3000/api/friends?type=requests"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("requests");
  });
});

// ─── POST /api/friends ─────────────────────────────────────────────────────

describe("POST /api/friends", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retourne 401 si non authentifié", async () => {
    buildFriendsMock({ user: null });
    const res = await POST(makeRequest("POST", "http://localhost:3000/api/friends", {
      action: "send",
      addresseeId: "user-2",
    }));
    expect(res.status).toBe(401);
  });

  it("envoie une demande d'amitié", async () => {
    buildFriendsMock();
    const res = await POST(makeRequest("POST", "http://localhost:3000/api/friends", {
      action: "send",
      addresseeId: "user-2",
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("accepte une demande d'amitié", async () => {
    buildFriendsMock();
    const res = await POST(makeRequest("POST", "http://localhost:3000/api/friends", {
      action: "accept",
      friendshipId: "fs-1",
    }));
    expect(res.status).toBe(200);
  });

  it("rejette une demande d'amitié", async () => {
    buildFriendsMock();
    const res = await POST(makeRequest("POST", "http://localhost:3000/api/friends", {
      action: "reject",
      friendshipId: "fs-1",
    }));
    expect(res.status).toBe(200);
  });

  it("supprime un ami", async () => {
    buildFriendsMock();
    const res = await POST(makeRequest("POST", "http://localhost:3000/api/friends", {
      action: "remove",
      friendshipId: "fs-1",
    }));
    expect(res.status).toBe(200);
  });

  it("retourne ok:true pour action inconnue sans crash", async () => {
    buildFriendsMock();
    const res = await POST(makeRequest("POST", "http://localhost:3000/api/friends", {
      action: "unknown_action",
    }));
    expect(res.status).toBe(200);
  });
});
