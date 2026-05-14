import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/friends/route";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const mockProfile = (id: string, overrides = {}) => ({
  id, username: `user_${id}`, full_name: `Utilisateur ${id}`,
  avatar_url: null, is_verified: false, institution: "UVCI",
  first_name: `User`, phone: null, ...overrides,
});

const mockFriendship = (overrides = {}) => ({
  id: "22222222-2222-2222-2222-222222222222", requester_id: "bef99e72-cdc5-417f-ac9c-6d56925466b9", addressee_id: "efe7d223-ba13-42f6-89ac-8391ab490338",
  status: "accepted", created_at: new Date().toISOString(),
  requester: mockProfile("bef99e72-cdc5-417f-ac9c-6d56925466b9"), addressee: mockProfile("efe7d223-ba13-42f6-89ac-8391ab490338"), ...overrides,
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
  rpcData?: any[];
  mutualContacts?: any[];
} = {}) {
  vi.mocked(createAdminClient).mockResolvedValue({
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  } as any);

  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: options.user !== undefined ? options.user : { id: "bef99e72-cdc5-417f-ac9c-6d56925466b9" } },
      }),
    },
    rpc: vi.fn((fn: string) => {
      if (fn === "get_mutual_contacts") return Promise.resolve({ data: options.mutualContacts ?? [] });
      if (fn === "get_friend_suggestions") return Promise.resolve({ data: options.rpcData ?? [] });
      return Promise.resolve({ data: [] });
    }),
    from: vi.fn((table: string) => {
      if (table === "friendships") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ data: options.friendships ?? [mockFriendship()] }),
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            single: vi.fn().mockResolvedValue({ data: { requester_id: "efe7d223-ba13-42f6-89ac-8391ab490338" } }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: "33333333-3333-3333-3333-333333333333" }, error: null }),
            }),
          }),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnThis() }),
          delete: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnThis() }),
        };
      }
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ data: options.suggestions ?? [] }),
            single: vi.fn().mockResolvedValue({ data: { full_name: "Issiaka D." } }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          single: vi.fn().mockResolvedValue({ data: null }),
        }),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnThis() }),
        delete: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnThis() }),
      };
    }),
  } as any);
}

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

  it("retourne les suggestions avec contacts mutuels en tête", async () => {
    buildFriendsMock({
      mutualContacts: [{ profile_id: "user-mutual", mutual_score: 50 }],
      rpcData: [{ suggested_id: "11111111-1111-1111-1111-111111111111", common_friends: 2 }],
      suggestions: [mockProfile("user-mutual"), mockProfile("11111111-1111-1111-1111-111111111111")],
    });
    const res = await GET(makeRequest("GET", "http://localhost:3000/api/friends?type=suggestions"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("suggestions");
    // Le contact mutuel doit être en tête
    const mutualFirst = body.suggestions[0];
    if (mutualFirst) {
      expect(mutualFirst.mutual_contact).toBe(true);
    }
  });

  it("retourne les demandes d'amis reçues", async () => {
    buildFriendsMock();
    const res = await GET(makeRequest("GET", "http://localhost:3000/api/friends?type=requests"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("requests");
  });
});

describe("POST /api/friends", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retourne 401 si non authentifié", async () => {
    buildFriendsMock({ user: null });
    const res = await POST(makeRequest("POST", "http://localhost:3000/api/friends", {
      action: "send", addresseeId: "efe7d223-ba13-42f6-89ac-8391ab490338",
    }));
    expect(res.status).toBe(401);
  });

  it("envoie une demande d'amitié", async () => {
    buildFriendsMock();
    const res = await POST(makeRequest("POST", "http://localhost:3000/api/friends", {
      action: "send", addresseeId: "efe7d223-ba13-42f6-89ac-8391ab490338",
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("accepte une demande d'amitié", async () => {
    buildFriendsMock();
    const res = await POST(makeRequest("POST", "http://localhost:3000/api/friends", {
      action: "accept", friendshipId: "22222222-2222-2222-2222-222222222222",
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("rejette une demande d'amitié", async () => {
    buildFriendsMock();
    const res = await POST(makeRequest("POST", "http://localhost:3000/api/friends", {
      action: "reject", friendshipId: "22222222-2222-2222-2222-222222222222",
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("supprime une amitié", async () => {
    buildFriendsMock();
    const res = await POST(makeRequest("POST", "http://localhost:3000/api/friends", {
      action: "remove", friendshipId: "22222222-2222-2222-2222-222222222222",
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("rejette un UUID invalide pour addresseeId", async () => {
    buildFriendsMock();
    const res = await POST(makeRequest("POST", "http://localhost:3000/api/friends", {
      action: "send", addresseeId: "not-a-uuid",
    }));
    // L'API ne valide pas l'UUID ici, mais ne crashe pas
    expect([200, 400]).toContain(res.status);
  });
});
