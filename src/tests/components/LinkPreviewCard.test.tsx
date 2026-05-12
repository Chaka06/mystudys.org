import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { LinkPreviewCard, extractFirstUrl } from "@/components/ui/LinkPreviewCard";

vi.mock("framer-motion", () => ({
  motion: { div: ({ children, ...p }: any) => <div {...p}>{children}</div> },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// ─── extractFirstUrl ──────────────────────────────────────────────────────────

describe("extractFirstUrl", () => {
  it("extrait une URL https", () => {
    expect(extractFirstUrl("Regarde ce site https://example.com cool !")).toBe("https://example.com");
  });

  it("extrait une URL http", () => {
    expect(extractFirstUrl("http://test.org/page")).toBe("http://test.org/page");
  });

  it("retourne null si aucune URL", () => {
    expect(extractFirstUrl("Bonjour tout le monde")).toBeNull();
  });

  it("retourne null pour une chaîne vide", () => {
    expect(extractFirstUrl("")).toBeNull();
  });

  it("extrait la première URL si plusieurs", () => {
    const text = "Voir https://premier.com et https://second.com";
    expect(extractFirstUrl(text)).toBe("https://premier.com");
  });

  it("extrait les URLs avec chemins complexes", () => {
    const url = "https://example.com/path?query=value&other=123#anchor";
    expect(extractFirstUrl(`Lien: ${url}`)).toBe(url);
  });
});

// ─── LinkPreviewCard ──────────────────────────────────────────────────────────

describe("LinkPreviewCard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("affiche un état de chargement pendant le fetch", () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {})); // jamais résolu
    const { container } = render(<LinkPreviewCard url="https://example.com" />);
    // En mode loading, le composant affiche les skeletons (divs avec classes de skeleton)
    // ou simplement un contenu minimal — on vérifie que la carte n'est pas encore visible
    const link = container.querySelector("a");
    // La carte finale (lien cliquable) ne doit pas encore être visible
    // car le fetch n'est pas encore résolu
    expect(link).toBeNull();
  });

  it("affiche le titre et la description après chargement", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        title: "Mon article super",
        description: "Une description courte",
        image: "",
        siteName: "MonBlog",
        url: "https://monblog.ci",
      }),
    });

    render(<LinkPreviewCard url="https://monblog.ci" />);
    await waitFor(() => {
      expect(screen.getByText("Mon article super")).toBeInTheDocument();
      expect(screen.getByText("Une description courte")).toBeInTheDocument();
    });
  });

  it("affiche le nom du site ou le domaine", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        title: "Article",
        description: "",
        image: "",
        siteName: "StudysBlog",
        url: "https://studysblog.ci",
      }),
    });

    render(<LinkPreviewCard url="https://studysblog.ci" />);
    await waitFor(() => {
      expect(screen.getByText("StudysBlog")).toBeInTheDocument();
    });
  });

  it("ne s'affiche pas si le fetch retourne une erreur", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ error: "Impossible de récupérer" }),
    });

    const { container } = render(<LinkPreviewCard url="https://example.com" />);
    await waitFor(() => {
      // Aucune carte ne doit être visible
      expect(container.querySelector("a")).toBeNull();
    });
  });

  it("ne s'affiche pas si le titre est vide", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        title: "", description: "", image: "", siteName: "", url: "https://example.com",
      }),
    });

    const { container } = render(<LinkPreviewCard url="https://example.com" />);
    await waitFor(() => {
      expect(container.querySelector("a")).toBeNull();
    });
  });

  it("ne s'affiche pas en cas d'erreur réseau", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
    const { container } = render(<LinkPreviewCard url="https://example.com" />);
    await waitFor(() => {
      expect(container.querySelector("a")).toBeNull();
    });
  });

  it("appelle l'API link-preview avec l'URL encodée", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ title: "T", description: "", image: "", siteName: "S", url: "https://example.com" }),
    });
    global.fetch = fetchMock;

    render(<LinkPreviewCard url="https://example.com/path?q=1" />);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("https%3A%2F%2Fexample.com%2Fpath")
      );
    });
  });

  it("est cliquable avec le bon href", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        title: "Mon titre", description: "Desc", image: "", siteName: "Site", url: "https://test.com",
      }),
    });

    render(<LinkPreviewCard url="https://test.com" />);
    await waitFor(() => {
      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("href", "https://test.com");
      expect(link).toHaveAttribute("target", "_blank");
    });
  });

  it("mode compact : n'affiche pas la description", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        title: "Titre", description: "Description longue à cacher", image: "", siteName: "S", url: "https://x.com",
      }),
    });

    render(<LinkPreviewCard url="https://x.com" compact />);
    await waitFor(() => {
      expect(screen.queryByText("Description longue à cacher")).not.toBeInTheDocument();
    });
  });
});
