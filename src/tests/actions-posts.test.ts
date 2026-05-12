import { describe, it, expect, vi, beforeEach } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { createPostAction } from "@/app/actions/posts";

const mockSingle = vi.fn();
const mockSelect = vi.fn(() => ({ single: mockSingle }));
const mockInsert = vi.fn(() => ({ select: mockSelect }));
const mockFrom = vi.fn(() => ({ insert: mockInsert }));
const mockGetUser = vi.fn();

vi.mocked(createClient).mockResolvedValue({
  auth: { getUser: mockGetUser },
  from: mockFrom,
} as any);

describe("createPostAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retourne une erreur si non authentifié", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const result = await createPostAction({ content: "test", post_type: "general" });
    expect(result.error).toBe("Non authentifié");
  });

  it("crée un post avec succès", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "uuid-123" } } });
    mockSingle.mockResolvedValue({ data: { id: "post-456" }, error: null });

    const result = await createPostAction({ content: "Bonjour", post_type: "general" });
    expect(result.error).toBeUndefined();
    expect(result.postId).toBe("post-456");
  });

  it("force author_id = user.id (pas de spoofing)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "uuid-123" } } });
    mockSingle.mockResolvedValue({ data: { id: "post-456" }, error: null });

    await createPostAction({ content: "test", post_type: "general" });
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ author_id: "uuid-123" })
    );
  });

  it("force moderation_status = approved", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "uuid-123" } } });
    mockSingle.mockResolvedValue({ data: { id: "post-456" }, error: null });

    await createPostAction({ content: "test", post_type: "general" });
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ moderation_status: "approved" })
    );
  });

  it("retourne l'erreur Supabase si l'insertion échoue", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "uuid-123" } } });
    mockSingle.mockResolvedValue({ data: null, error: { message: "posts_insert policy" } });

    const result = await createPostAction({ content: "test", post_type: "general" });
    expect(result.error).toBe("posts_insert policy");
  });

  it("accepte un post sans contenu (fichier uniquement)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "uuid-123" } } });
    mockSingle.mockResolvedValue({ data: { id: "post-789" }, error: null });

    const result = await createPostAction({ content: null, post_type: "exam_subject" });
    expect(result.postId).toBe("post-789");
  });
});
