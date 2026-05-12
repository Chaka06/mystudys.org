import { describe, it, expect, vi, beforeEach } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { updateProfileAction } from "@/app/actions/profile";

const mockSingle = vi.fn();
const mockSelect = vi.fn(() => ({ single: mockSingle }));
const mockEq = vi.fn(() => ({ select: mockSelect }));
const mockUpdate = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ update: mockUpdate }));

const mockGetUser = vi.fn();

const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: mockFrom,
};

vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

const payload = {
  first_name: "Issiaka",
  last_name: "Diarrassouba",
  is_public: true,
};

describe("updateProfileAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retourne une erreur si non authentifié", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const result = await updateProfileAction(payload);
    expect(result.error).toBe("Non authentifié");
  });

  it("met à jour le profil avec succès", async () => {
    const fakeUser = { id: "uuid-123" };
    const fakeProfile = { id: "uuid-123", username: "issiaka", first_name: "Issiaka", last_name: "Diarrassouba" };
    mockGetUser.mockResolvedValue({ data: { user: fakeUser } });
    mockSingle.mockResolvedValue({ data: fakeProfile, error: null });

    const result = await updateProfileAction(payload);
    expect(result.error).toBeUndefined();
    expect(result.data).toEqual(fakeProfile);
    expect(mockFrom).toHaveBeenCalledWith("profiles");
    expect(mockEq).toHaveBeenCalledWith("id", "uuid-123");
  });

  it("retourne l'erreur Supabase si la mise à jour échoue", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "uuid-123" } } });
    mockSingle.mockResolvedValue({ data: null, error: { message: "RLS violation" } });

    const result = await updateProfileAction(payload);
    expect(result.error).toBe("RLS violation");
  });

  it("construit full_name à partir de first_name et last_name", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "uuid-123" } } });
    mockSingle.mockResolvedValue({ data: { full_name: "Issiaka Diarrassouba" }, error: null });

    await updateProfileAction({ first_name: "Issiaka", last_name: "Diarrassouba", is_public: true });
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ full_name: "Issiaka Diarrassouba" })
    );
  });
});
