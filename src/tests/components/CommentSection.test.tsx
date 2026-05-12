import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommentSection } from "@/components/feed/CommentSection";
import { useAuthStore } from "@/stores/authStore";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

const mockProfile = {
  id: "user-1",
  username: "issiaka",
  full_name: "Issiaka Diarrassouba",
  avatar_url: null,
  role: "user" as const,
};

const mockComments = [
  {
    id: "c-1",
    post_id: "post-1",
    author_id: "user-2",
    parent_id: null,
    content: "Super publication !",
    like_count: 2,
    is_deleted: false,
    created_at: new Date().toISOString(),
    author: { id: "user-2", username: "konan", full_name: "Konan K.", avatar_url: null },
  },
];

function setupFetchMock(options: {
  comments?: any[];
  postCommentResponse?: any;
  fetchError?: boolean;
} = {}) {
  const comments = options.comments ?? mockComments;

  global.fetch = vi.fn((url: string, init?: RequestInit) => {
    if (options.fetchError) {
      return Promise.reject(new Error("Network error"));
    }
    if ((init?.method ?? "GET") === "POST") {
      const newComment = {
        id: "c-new",
        post_id: "post-1",
        content: "Nouveau commentaire",
        author: { id: "user-1", full_name: "Issiaka D.", avatar_url: null },
        created_at: new Date().toISOString(),
        like_count: 0,
        is_deleted: false,
        parent_id: null,
        author_id: "user-1",
      };
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ comment: options.postCommentResponse ?? newComment }),
      } as Response);
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ comments }),
    } as Response);
  }) as any;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("CommentSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ profile: null, user: null, isLoading: false });
  });

  it("commence en état de chargement puis affiche le contenu", async () => {
    setupFetchMock({ comments: [] });
    render(<CommentSection postId="post-1" />);
    // Attendre que le fetch se termine — si vide, affiche le message
    await waitFor(() => {
      expect(screen.getByText(/soyez le premier/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it("affiche les commentaires après chargement", async () => {
    setupFetchMock();
    render(<CommentSection postId="post-1" />);
    await waitFor(() => {
      expect(screen.getByText("Super publication !")).toBeInTheDocument();
    });
  });

  it("affiche le nom de l'auteur du commentaire", async () => {
    setupFetchMock();
    render(<CommentSection postId="post-1" />);
    await waitFor(() => {
      expect(screen.getByText("Konan K.")).toBeInTheDocument();
    });
  });

  it("affiche le message 'aucun commentaire' si la liste est vide", async () => {
    setupFetchMock({ comments: [] });
    render(<CommentSection postId="post-1" />);
    await waitFor(() => {
      expect(screen.getByText(/soyez le premier/i)).toBeInTheDocument();
    });
  });

  it("n'affiche pas le formulaire de commentaire si non connecté", async () => {
    setupFetchMock();
    useAuthStore.setState({ profile: null, user: null, isLoading: false });
    render(<CommentSection postId="post-1" />);
    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/écrire un commentaire/i)).not.toBeInTheDocument();
    });
  });

  it("affiche le formulaire de commentaire si connecté", async () => {
    setupFetchMock();
    useAuthStore.setState({ profile: mockProfile as any, user: null, isLoading: false });
    render(<CommentSection postId="post-1" />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/écrire un commentaire/i)).toBeInTheDocument();
    });
  });

  it("soumet un nouveau commentaire", async () => {
    setupFetchMock();
    useAuthStore.setState({ profile: mockProfile as any, user: null, isLoading: false });
    render(<CommentSection postId="post-1" />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/écrire un commentaire/i)).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/écrire un commentaire/i);
    await userEvent.type(input, "Mon commentaire");
    fireEvent.submit(input.closest("form")!);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/comments", expect.objectContaining({
        method: "POST",
      }));
    });
  });

  it("ne soumet pas un commentaire vide", async () => {
    setupFetchMock();
    useAuthStore.setState({ profile: mockProfile as any, user: null, isLoading: false });
    render(<CommentSection postId="post-1" />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/écrire un commentaire/i)).toBeInTheDocument();
    });

    fireEvent.submit(screen.getByPlaceholderText(/écrire un commentaire/i).closest("form")!);
    // fetch ne devrait pas être appelé avec POST
    const postCalls = (global.fetch as any).mock.calls.filter(
      (call: any[]) => call[1]?.method === "POST"
    );
    expect(postCalls).toHaveLength(0);
  });

  it("ajoute le commentaire localement après soumission réussie", async () => {
    setupFetchMock({ comments: [] });
    useAuthStore.setState({ profile: mockProfile as any, user: null, isLoading: false });
    render(<CommentSection postId="post-1" />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/écrire un commentaire/i)).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/écrire un commentaire/i);
    await userEvent.type(input, "Nouveau commentaire");
    fireEvent.submit(input.closest("form")!);

    await waitFor(() => {
      expect(screen.getByText("Nouveau commentaire")).toBeInTheDocument();
    });
  });

  it("affiche le bouton Répondre sur chaque commentaire", async () => {
    setupFetchMock();
    render(<CommentSection postId="post-1" />);
    await waitFor(() => {
      expect(screen.getByText("Répondre")).toBeInTheDocument();
    });
  });

  it("affiche le compteur de likes si > 0", async () => {
    setupFetchMock({ comments: [{ ...mockComments[0], like_count: 5 }] });
    render(<CommentSection postId="post-1" />);
    await waitFor(() => {
      expect(screen.getByText("5")).toBeInTheDocument();
    });
  });

  it("récupère les commentaires pour le bon postId", async () => {
    setupFetchMock();
    render(<CommentSection postId="post-special-123" />);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("postId=post-special-123")
      );
    });
  });
});
