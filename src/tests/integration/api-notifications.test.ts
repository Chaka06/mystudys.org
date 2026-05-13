import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, PATCH } from "@/app/api/notifications/route";
import { createClient } from "@/lib/supabase/server";

const mockNotif = (overrides = {}) => ({
  id: "notif-1", recipient_id: "user-1", sender_id: "user-2",
  type: "like", title: "Nouveau like", body: "...",
  is_read: false, created_at: new Date().toISOString(),
  sender: { id: "user-2", username: "user2", full_name: "User 2", avatar_url: null },
  ...overrides,
});

function buildMock(options: { user?: any; notifications?: any[]; error?: any } = {}) {
  const notifs = options.notifications ?? [mockNotif()];

  // Chaîne update().eq() pour markAll et update().in().eq() pour ids spécifiques
  const eqFinal = vi.fn().mockResolvedValue({ data: null, error: null });
  const inFn = vi.fn().mockReturnValue({ eq: eqFinal });
  const updateChain = { eq: eqFinal, in: inFn };

  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: options.user !== undefined ? options.user : { id: "user-1" } },
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: notifs,
          error: options.error ?? null,
        }),
      }),
      update: vi.fn().mockReturnValue(updateChain),
    }),
  } as any);
}

const makeRequest = (method: string, body?: any) =>
  new NextRequest("http://localhost:3000/api/notifications", {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { "Content-Type": "application/json" } : {},
  });

describe("GET /api/notifications", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retourne 401 si non authentifié", async () => {
    buildMock({ user: null });
    const res = await GET(new NextRequest("http://localhost:3000/api/notifications"));
    expect(res.status).toBe(401);
  });

  it("retourne les notifications avec unreadCount correct", async () => {
    buildMock({
      notifications: [
        mockNotif({ id: "1", is_read: false }),
        mockNotif({ id: "2", is_read: true }),
        mockNotif({ id: "3", is_read: false }),
      ],
    });
    const res = await GET(new NextRequest("http://localhost:3000/api/notifications"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.notifications).toHaveLength(3);
    expect(body.unreadCount).toBe(2);
  });

  it("retourne unreadCount=0 si toutes lues", async () => {
    buildMock({
      notifications: [
        mockNotif({ id: "1", is_read: true }),
        mockNotif({ id: "2", is_read: true }),
      ],
    });
    const res = await GET(new NextRequest("http://localhost:3000/api/notifications"));
    const body = await res.json();
    expect(body.unreadCount).toBe(0);
  });

  it("retourne une liste vide si aucune notification", async () => {
    buildMock({ notifications: [] });
    const res = await GET(new NextRequest("http://localhost:3000/api/notifications"));
    const body = await res.json();
    expect(body.notifications).toHaveLength(0);
    expect(body.unreadCount).toBe(0);
  });
});

describe("PATCH /api/notifications", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retourne 401 si non authentifié", async () => {
    buildMock({ user: null });
    const res = await PATCH(makeRequest("PATCH", { ids: ["notif-1"] }));
    expect(res.status).toBe(401);
  });

  it("marque des notifications spécifiques comme lues", async () => {
    buildMock();
    const res = await PATCH(makeRequest("PATCH", { ids: ["notif-1", "notif-2"] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("marque toutes les notifications comme lues avec markAll=true", async () => {
    buildMock();
    const res = await PATCH(makeRequest("PATCH", { markAll: true }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
