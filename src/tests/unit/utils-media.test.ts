import { describe, it, expect } from "vitest";

// Tests des helpers utilisés dans les composants médias

function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url);
}

function isPdfUrl(url: string): boolean {
  return /\.pdf(\?|$)/i.test(url);
}

function extractFirstUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s<>"{}|\\^`[\]]+/);
  return match?.[0] ?? null;
}

function formatPdfDisplayName(content: string): string {
  if (!content || content.startsWith("http")) return "Document PDF";
  return content.replace(/\.[^/.]+$/, "");
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── isImageUrl ──────────────────────────────────────────────────────────────

describe("isImageUrl", () => {
  it("reconnaît les JPEG", () => {
    expect(isImageUrl("https://example.com/photo.jpg")).toBe(true);
    expect(isImageUrl("https://example.com/photo.jpeg")).toBe(true);
    expect(isImageUrl("https://example.com/PHOTO.JPG")).toBe(true);
  });
  it("reconnaît les PNG", () => {
    expect(isImageUrl("https://example.com/img.png")).toBe(true);
  });
  it("reconnaît les WebP", () => {
    expect(isImageUrl("https://example.com/img.webp")).toBe(true);
  });
  it("reconnaît les GIF", () => {
    expect(isImageUrl("https://example.com/anim.gif")).toBe(true);
  });
  it("reconnaît les URLs avec paramètres de query", () => {
    expect(isImageUrl("https://supabase.co/storage/photo.jpg?t=12345")).toBe(true);
  });
  it("rejette les PDFs", () => {
    expect(isImageUrl("https://example.com/doc.pdf")).toBe(false);
  });
  it("rejette les URLs sans extension image", () => {
    expect(isImageUrl("https://example.com/page")).toBe(false);
  });
});

// ─── isPdfUrl ────────────────────────────────────────────────────────────────

describe("isPdfUrl", () => {
  it("reconnaît un PDF simple", () => {
    expect(isPdfUrl("https://example.com/document.pdf")).toBe(true);
  });
  it("reconnaît un PDF avec paramètres", () => {
    expect(isPdfUrl("https://supabase.co/storage/cours.pdf?t=123")).toBe(true);
  });
  it("reconnaît un PDF en majuscules", () => {
    expect(isPdfUrl("https://example.com/doc.PDF")).toBe(true);
  });
  it("rejette les images", () => {
    expect(isPdfUrl("https://example.com/photo.jpg")).toBe(false);
  });
  it("rejette les URLs sans extension", () => {
    expect(isPdfUrl("https://example.com/page")).toBe(false);
  });
});

// ─── extractFirstUrl ─────────────────────────────────────────────────────────

describe("extractFirstUrl (helper messages)", () => {
  it("extrait une URL depuis un texte", () => {
    expect(extractFirstUrl("Vois ceci : https://example.com")).toBe("https://example.com");
  });
  it("extrait la première URL si plusieurs", () => {
    expect(extractFirstUrl("https://un.com et https://deux.com")).toBe("https://un.com");
  });
  it("retourne null si pas d'URL", () => {
    expect(extractFirstUrl("Bonjour tout le monde")).toBeNull();
  });
  it("extrait une URL avec chemin complet", () => {
    const url = "https://uvci.edu.ci/emploi-du-temps?session=2024&semestre=1";
    expect(extractFirstUrl(`Lien : ${url} voilà`)).toBe(url);
  });
  it("retourne null pour un texte vide", () => {
    expect(extractFirstUrl("")).toBeNull();
  });
});

// ─── formatPdfDisplayName ────────────────────────────────────────────────────

describe("formatPdfDisplayName", () => {
  it("affiche 'Document PDF' si content est vide", () => {
    expect(formatPdfDisplayName("")).toBe("Document PDF");
  });
  it("affiche 'Document PDF' si content est une URL", () => {
    expect(formatPdfDisplayName("https://supabase.co/storage/xyz.pdf")).toBe("Document PDF");
  });
  it("affiche le nom sans extension si content est un nom de fichier", () => {
    expect(formatPdfDisplayName("cours_maths.pdf")).toBe("cours_maths");
  });
  it("affiche le nom complet si pas d'extension", () => {
    expect(formatPdfDisplayName("TD Informatique")).toBe("TD Informatique");
  });
  it("supprime uniquement la dernière extension", () => {
    expect(formatPdfDisplayName("sujet.examen.pdf")).toBe("sujet.examen");
  });
});

// ─── formatFileSize ──────────────────────────────────────────────────────────

describe("formatFileSize (upload)", () => {
  it("affiche les octets pour les petits fichiers", () => {
    expect(formatFileSize(512)).toBe("512 B");
  });
  it("affiche les kilooctets", () => {
    expect(formatFileSize(1536)).toBe("1.5 KB");
  });
  it("affiche les mégaoctets", () => {
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 MB");
  });
  it("affiche 0 B pour un fichier vide", () => {
    expect(formatFileSize(0)).toBe("0 B");
  });
  it("affiche 50.0 MB pour la limite max", () => {
    expect(formatFileSize(50 * 1024 * 1024)).toBe("50.0 MB");
  });
});
