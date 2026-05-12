import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/upload/route";
import { createClient } from "@/lib/supabase/server";

// Helpers pour créer un File avec arrayBuffer() qui fonctionne en jsdom
function makeTestFile(name: string, type: string, sizeBytes: number) {
  const content = new Uint8Array(sizeBytes).fill(42);
  const file = new File([content], name, { type });
  return file;
}

// Mock d'une requête d'upload avec FormData pré-configurée
function makeUploadRequest(file: File | null, folder = "posts") {
  const mockFormData = {
    get: vi.fn((key: string) => {
      if (key === "file") return file;
      if (key === "folder") return folder;
      return null;
    }),
  };

  const req = {
    formData: vi.fn().mockResolvedValue(mockFormData),
  } as unknown as NextRequest;

  return req;
}

function buildStorageMock(options: {
  user?: any;
  uploadError?: any;
  uploadPath?: string;
} = {}) {
  const path = options.uploadPath ?? "user-1/posts/123-abc.jpg";
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: options.user !== undefined ? options.user : { id: "user-1" } },
      }),
    },
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({
          data: options.uploadError ? null : { path },
          error: options.uploadError ?? null,
        }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: `https://example.supabase.co/storage/v1/object/public/studys-uploads/${path}` },
        }),
      }),
    },
  } as any);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/upload", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retourne 401 si non authentifié", async () => {
    buildStorageMock({ user: null });
    const file = makeTestFile("photo.jpg", "image/jpeg", 1024);
    const res = await POST(makeUploadRequest(file));
    expect(res.status).toBe(401);
  });

  it("retourne 400 si aucun fichier fourni", async () => {
    buildStorageMock();
    const res = await POST(makeUploadRequest(null));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("fichier");
  });

  it("retourne 400 si le fichier dépasse 50MB", async () => {
    buildStorageMock();
    const file = makeTestFile("big.jpg", "image/jpeg", 51 * 1024 * 1024);
    const res = await POST(makeUploadRequest(file));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("50MB");
  });

  it("retourne 400 pour un type MIME non autorisé (.exe)", async () => {
    buildStorageMock();
    const file = makeTestFile("malware.exe", "application/x-msdownload", 1024);
    const res = await POST(makeUploadRequest(file));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("non autorisé");
  });

  it("retourne 400 pour un type MIME non autorisé (.mp4)", async () => {
    buildStorageMock();
    const file = makeTestFile("video.mp4", "video/mp4", 1024);
    const res = await POST(makeUploadRequest(file));
    expect(res.status).toBe(400);
  });

  it("accepte les images JPEG", async () => {
    buildStorageMock();
    const file = makeTestFile("photo.jpg", "image/jpeg", 1024);
    const res = await POST(makeUploadRequest(file));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toContain("supabase");
  });

  it("accepte les images PNG", async () => {
    buildStorageMock();
    const file = makeTestFile("image.png", "image/png", 2048);
    const res = await POST(makeUploadRequest(file));
    expect(res.status).toBe(200);
  });

  it("accepte les images WebP", async () => {
    buildStorageMock();
    const file = makeTestFile("image.webp", "image/webp", 1024);
    const res = await POST(makeUploadRequest(file));
    expect(res.status).toBe(200);
  });

  it("accepte les images GIF", async () => {
    buildStorageMock();
    const file = makeTestFile("anim.gif", "image/gif", 1024);
    const res = await POST(makeUploadRequest(file));
    expect(res.status).toBe(200);
  });

  it("accepte les fichiers PDF", async () => {
    buildStorageMock();
    const file = makeTestFile("cours.pdf", "application/pdf", 5 * 1024 * 1024);
    const res = await POST(makeUploadRequest(file));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.type).toBe("application/pdf");
  });

  it("retourne 500 si Supabase Storage échoue", async () => {
    buildStorageMock({ uploadError: { message: "Bucket not found" } });
    const file = makeTestFile("photo.jpg", "image/jpeg", 1024);
    const res = await POST(makeUploadRequest(file));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Bucket not found");
  });

  it("retourne les métadonnées du fichier uploadé", async () => {
    buildStorageMock();
    const file = makeTestFile("cours.pdf", "application/pdf", 512000);
    const res = await POST(makeUploadRequest(file, "documents"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toBeDefined();
    expect(body.path).toBeDefined();
    expect(body.size).toBe(512000);
    expect(body.type).toBe("application/pdf");
    expect(body.name).toBe("cours.pdf");
  });

  it("inclut le user.id dans le chemin du fichier pour l'isolation", async () => {
    const uploadSpy = vi.fn().mockResolvedValue({
      data: { path: "user-1/posts/abc.jpg" },
      error: null,
    });
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
      storage: {
        from: vi.fn().mockReturnValue({
          upload: uploadSpy,
          getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://test.com/file.jpg" } }),
        }),
      },
    } as any);

    const file = makeTestFile("photo.jpg", "image/jpeg", 1024);
    await POST(makeUploadRequest(file));
    const [uploadedPath] = uploadSpy.mock.calls[0];
    expect(uploadedPath).toMatch(/^user-1\//);
  });

  it("utilise upsert=false pour éviter l'écrasement de fichiers", async () => {
    const uploadSpy = vi.fn().mockResolvedValue({ data: { path: "user-1/posts/abc.jpg" }, error: null });
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
      storage: {
        from: vi.fn().mockReturnValue({
          upload: uploadSpy,
          getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://test.com/file.jpg" } }),
        }),
      },
    } as any);

    const file = makeTestFile("photo.jpg", "image/jpeg", 1024);
    await POST(makeUploadRequest(file));
    const [, , options] = uploadSpy.mock.calls[0];
    expect(options.upsert).toBe(false);
  });
});
