import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ImageLightbox } from "@/components/ui/ImageLightbox";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    img: ({ children, ...props }: any) => <img {...props} />,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const IMAGES = [
  "https://example.com/img1.jpg",
  "https://example.com/img2.jpg",
  "https://example.com/img3.jpg",
];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ImageLightbox", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset body overflow
    document.body.style.overflow = "";
  });

  it("affiche l'image courante", () => {
    render(<ImageLightbox images={IMAGES} initialIndex={0} onClose={onClose} />);
    const img = screen.getByRole("img", { name: "Image 1" });
    expect(img).toHaveAttribute("src", IMAGES[0]);
  });

  it("bloque le scroll du body à l'ouverture", () => {
    render(<ImageLightbox images={IMAGES} onClose={onClose} />);
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("restaure le scroll du body à la fermeture", () => {
    const { unmount } = render(<ImageLightbox images={IMAGES} onClose={onClose} />);
    unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("appelle onClose en cliquant sur le bouton ×", () => {
    render(<ImageLightbox images={IMAGES} onClose={onClose} />);
    const closeBtn = screen.getByTitle("Fermer (Échap)");
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("appelle onClose avec la touche Échap", async () => {
    render(<ImageLightbox images={IMAGES} onClose={onClose} />);
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });

  it("navigue vers l'image suivante avec ArrowRight", async () => {
    render(<ImageLightbox images={IMAGES} initialIndex={0} onClose={onClose} />);
    fireEvent.keyDown(window, { key: "ArrowRight" });
    await waitFor(() => {
      const img = screen.getByRole("img", { name: "Image 2" });
      expect(img).toHaveAttribute("src", IMAGES[1]);
    });
  });

  it("navigue vers l'image précédente avec ArrowLeft", async () => {
    render(<ImageLightbox images={IMAGES} initialIndex={1} onClose={onClose} />);
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    await waitFor(() => {
      const img = screen.getByRole("img", { name: "Image 1" });
      expect(img).toHaveAttribute("src", IMAGES[0]);
    });
  });

  it("navigation circulaire : ArrowLeft sur la 1ère image → dernière image", async () => {
    render(<ImageLightbox images={IMAGES} initialIndex={0} onClose={onClose} />);
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    await waitFor(() => {
      const img = screen.getByRole("img", { name: `Image ${IMAGES.length}` });
      expect(img).toHaveAttribute("src", IMAGES[IMAGES.length - 1]);
    });
  });

  it("affiche le compteur d'images quand il y en a plusieurs", () => {
    render(<ImageLightbox images={IMAGES} initialIndex={0} onClose={onClose} />);
    expect(screen.getByText(`1 / ${IMAGES.length}`)).toBeInTheDocument();
  });

  it("n'affiche pas le compteur pour une seule image", () => {
    render(<ImageLightbox images={[IMAGES[0]]} onClose={onClose} />);
    expect(screen.queryByText(/\/ 1/)).not.toBeInTheDocument();
  });

  it("affiche les boutons de zoom", () => {
    render(<ImageLightbox images={IMAGES} onClose={onClose} />);
    expect(screen.getByTitle("Zoom −")).toBeInTheDocument();
    expect(screen.getByTitle("Zoom +")).toBeInTheDocument();
  });

  it("rend le portal après le montage (mounted=true)", async () => {
    // createPortal requiert que mounted=true — le composant rend null avant useEffect
    // Ce test vérifie que l'image principale est affichée après hydratation
    render(<ImageLightbox images={IMAGES} initialIndex={0} onClose={onClose} />);
    await waitFor(
      () => {
        const mainImg = screen.queryByAltText("Image 1");
        expect(mainImg).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  it("affiche les boutons de navigation gauche/droite", () => {
    render(<ImageLightbox images={IMAGES} onClose={onClose} />);
    const chevrons = document.querySelectorAll("svg");
    // Doit avoir au moins 2 chevrons (prev + next)
    expect(chevrons.length).toBeGreaterThan(2);
  });

  it("n'affiche pas les boutons prev/next pour une seule image", () => {
    render(<ImageLightbox images={[IMAGES[0]]} onClose={onClose} />);
    expect(screen.queryByRole("button", { name: /suivant|précédent/i })).not.toBeInTheDocument();
  });
});
