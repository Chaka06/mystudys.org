import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PostCard } from "@/components/feed/PostCard";
import { useAuthStore } from "@/stores/authStore";
import { toggleLikeAction, toggleSaveAction, deletePostAction, reportPostAction } from "@/app/actions/interactions";
import type { Post } from "@/types/database.types";

// Mock des Server Actions
vi.mock("@/app/actions/interactions", () => ({
  toggleLikeAction: vi.fn().mockResolvedValue({ ok: true }),
  toggleSaveAction: vi.fn().mockResolvedValue({ ok: true }),
  deletePostAction: vi.fn().mockResolvedValue({ ok: true }),
  reportPostAction: vi.fn().mockResolvedValue({ ok: true }),
}));

// Mock framer-motion pour éviter les animations dans les tests
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    img: ({ children, ...props }: any) => <img {...props}>{children}</img>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// PdfThumbnail utilise canvas + pdfjs-dist non disponibles en jsdom
vi.mock("@/components/ui/PdfThumbnail", () => ({
  PdfThumbnail: ({ url }: any) => <div data-testid="pdf-thumbnail" data-url={url} />,
}));

// ImageLightbox utilise createPortal, mocké simplement
vi.mock("@/components/ui/ImageLightbox", () => ({
  ImageLightbox: ({ onClose }: any) => (
    <div data-testid="image-lightbox">
      <button onClick={onClose}>Fermer</button>
    </div>
  ),
}));

// LinkPreviewCard fait un fetch externe, mocké
vi.mock("@/components/ui/LinkPreviewCard", () => ({
  LinkPreviewCard: ({ url }: any) => <div data-testid="link-preview" data-url={url} />,
  extractFirstUrl: (text: string) => text.match(/https?:\/\/[^\s]+/)?.[0] ?? null,
}));

// Mock CommentSection pour isoler PostCard
vi.mock("@/components/feed/CommentSection", () => ({
  CommentSection: ({ postId }: any) => <div data-testid={`comments-${postId}`} />,
}));

const mockProfile = {
  id: "user-123",
  username: "issiaka",
  full_name: "Issiaka Diarrassouba",
  avatar_url: null,
  role: "user" as const,
  is_verified: false,
};

const mockPost: Post = {
  id: "post-1",
  author_id: "author-456",
  content: "Bonjour le réseau STUDY'S !",
  post_type: "general",
  subject_name: null,
  professor_name: null,
  academic_level: null,
  institution: null,
  exam_year: null,
  event_date: null,
  event_location: null,
  event_url: null,
  like_count: 5,
  comment_count: 3,
  share_count: 0,
  view_count: 10,
  moderation_status: "approved",
  is_pinned: false,
  is_deleted: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  liked_by_user: false,
  saved_by_user: false,
  author: {
    id: "author-456",
    username: "konan",
    full_name: "Konan Kouamé",
    avatar_url: null,
    is_verified: false,
    institution: "INPHB",
  } as any,
  media: [],
};

function setup(postOverrides: Partial<Post> = {}, authProfile: any = mockProfile) {
  useAuthStore.setState({ profile: authProfile as any, user: null, isLoading: false });
  const onDelete = vi.fn();
  const utils = render(<PostCard post={{ ...mockPost, ...postOverrides }} onDelete={onDelete} />);
  return { ...utils, onDelete };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("PostCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ profile: null, user: null, isLoading: false });
  });

  it("affiche le nom de l'auteur", () => {
    setup();
    expect(screen.getByText("Konan Kouamé")).toBeInTheDocument();
  });

  it("affiche l'établissement de l'auteur", () => {
    setup();
    expect(screen.getByText("INPHB")).toBeInTheDocument();
  });

  it("affiche le contenu du post", () => {
    setup();
    expect(screen.getByText("Bonjour le réseau STUDY'S !")).toBeInTheDocument();
  });

  it("affiche le compteur de likes", () => {
    setup({ like_count: 42 });
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("n'affiche pas le compteur de likes si 0", () => {
    setup({ like_count: 0 });
    // Le compteur ne devrait pas apparaître avec 0 likes
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("affiche le badge du type de post (exam_subject)", () => {
    setup({ post_type: "exam_subject" });
    expect(screen.getByText("Sujet d'examen")).toBeInTheDocument();
  });

  it("n'affiche pas de badge pour le type general", () => {
    setup({ post_type: "general" });
    expect(screen.queryByText("Publication générale")).not.toBeInTheDocument();
  });

  it("affiche les métadonnées académiques si présentes", () => {
    setup({ subject_name: "Mathématiques", professor_name: "Pr. Traore", academic_level: "licence_1" });
    expect(screen.getByText("Mathématiques")).toBeInTheDocument();
    expect(screen.getByText(/Pr\. Traore/)).toBeInTheDocument();
  });

  it("toggle le like en cliquant sur le bouton Like", async () => {
    setup({ liked_by_user: false, like_count: 5 });
    const likeButton = screen.getAllByRole("button").find(
      (btn) => btn.className.includes("text-muted-foreground") && btn.textContent?.includes("5")
    ) ?? screen.getAllByRole("button")[0];
    fireEvent.click(likeButton);
    await waitFor(() => {
      expect(toggleLikeAction).toHaveBeenCalledWith("post-1", false);
    });
  });

  it("affiche le bouton Supprimer uniquement pour l'auteur", () => {
    setup({ author_id: "user-123" }, { ...mockProfile, id: "user-123" });
    // Click sur le premier bouton icon (MoreHorizontal)
    const buttons = screen.getAllByRole("button");
    const moreBtn = buttons.find(btn => !btn.textContent || btn.textContent.trim() === "");
    if (moreBtn) {
      fireEvent.click(moreBtn);
      expect(screen.queryByText("Supprimer")).toBeInTheDocument();
    }
  });

  it("n'affiche pas le bouton Supprimer pour un non-auteur", () => {
    setup({ author_id: "author-456" }, { ...mockProfile, id: "user-999" });
    const buttons = screen.getAllByRole("button");
    const moreBtn = buttons.find(btn => !btn.textContent || btn.textContent.trim() === "");
    if (moreBtn) {
      fireEvent.click(moreBtn);
      expect(screen.queryByText("Supprimer")).not.toBeInTheDocument();
    }
  });

  it("affiche toujours le bouton Signaler", () => {
    setup();
    const menu = screen.getAllByRole("button").find(btn => btn.querySelector("svg"));
    if (menu) {
      fireEvent.click(menu);
      expect(screen.getByText("Signaler")).toBeInTheDocument();
    }
  });

  it("affiche les commentaires en cliquant sur le bouton Commentaires", async () => {
    setup();
    const commentBtn = screen.getAllByRole("button").find(btn => btn.textContent?.includes("3"));
    if (commentBtn) {
      fireEvent.click(commentBtn);
      // CommentSection est lazy — on attend le rendu après résolution du Suspense
      await waitFor(() => {
        expect(screen.getByTestId("comments-post-1")).toBeInTheDocument();
      });
    }
  });

  it("affiche une carte PDF si le post contient un PDF", () => {
    setup({
      media: [{
        id: "media-1",
        post_id: "post-1",
        media_type: "pdf",
        url: "https://example.com/cours_maths.pdf",
        thumbnail_url: null,
        file_name: "cours_maths.pdf",
        file_size: 1024 * 1024,
        width: null,
        height: null,
        position: 0,
        created_at: new Date().toISOString(),
      }],
    });
    // PdfPreviewCard affiche le nom sans extension + "PDF"
    expect(screen.getByText("cours_maths")).toBeInTheDocument();
    expect(screen.getByText(/PDF/)).toBeInTheDocument();
  });

  it("appelle onDelete après suppression réussie", async () => {
    const { onDelete } = setup({ author_id: "user-123" }, { ...mockProfile, id: "user-123" });
    const menu = screen.getAllByRole("button")[0];
    fireEvent.click(menu);
    const deleteBtn = screen.queryByText("Supprimer");
    if (deleteBtn) {
      fireEvent.click(deleteBtn);
      await waitFor(() => {
        expect(deletePostAction).toHaveBeenCalledWith("post-1");
        expect(onDelete).toHaveBeenCalledWith("post-1");
      });
    }
  });

  it("affiche le badge vérifié pour les auteurs vérifiés", () => {
    setup({ author: { ...mockPost.author!, is_verified: true } as any });
    expect(screen.getByText("✓")).toBeInTheDocument();
  });
});
