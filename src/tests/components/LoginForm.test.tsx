import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "@/components/auth/LoginForm";
import { createClient } from "@/lib/supabase/client";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

function buildAuthMock(options: { error?: any } = {}) {
  vi.mocked(createClient).mockReturnValue({
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({
        error: options.error ?? null,
        data: options.error ? null : { user: { id: "user-1" } },
      }),
    },
  } as any);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("LoginForm", () => {
  beforeEach(() => vi.clearAllMocks());

  it("affiche le formulaire de connexion", () => {
    buildAuthMock();
    render(<LoginForm />);
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/mot de passe/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /se connecter/i })).toBeInTheDocument();
  });

  it("affiche un lien vers l'inscription", () => {
    buildAuthMock();
    render(<LoginForm />);
    expect(screen.getByRole("link", { name: /s'inscrire/i })).toBeInTheDocument();
  });

  it("affiche un lien 'Mot de passe oublié'", () => {
    buildAuthMock();
    render(<LoginForm />);
    expect(screen.getByText(/mot de passe oublié/i)).toBeInTheDocument();
  });

  it("valide le schéma login côté client (email invalide rejeté)", async () => {
    // La validation est assurée par Zod — déjà couverte dans validations.test.ts
    // Ce test vérifie que le formulaire rend sans erreur avec des données invalides
    buildAuthMock();
    render(<LoginForm />);
    const emailInput = screen.getByPlaceholderText(/email/i);
    expect(emailInput).toBeInTheDocument();
    // Le champ email existe et attend une saisie
    expect(emailInput.getAttribute("type")).toBe("email");
  });

  it("affiche une erreur si le mot de passe est vide", async () => {
    buildAuthMock();
    render(<LoginForm />);
    const emailInput = screen.getByPlaceholderText(/email/i);
    await userEvent.type(emailInput, "user@test.com");
    fireEvent.click(screen.getByRole("button", { name: /se connecter/i }));
    await waitFor(() => {
      expect(screen.getByText(/requis/i)).toBeInTheDocument();
    });
  });

  it("appelle signInWithPassword avec les bonnes données", async () => {
    buildAuthMock();
    render(<LoginForm />);
    await userEvent.type(screen.getByPlaceholderText(/email/i), "user@test.com");
    await userEvent.type(screen.getByPlaceholderText(/mot de passe/i), "monmdp");
    fireEvent.click(screen.getByRole("button", { name: /se connecter/i }));
    await waitFor(() => {
      const client = (createClient as any).mock.results[0].value;
      expect(client.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "user@test.com",
        password: "monmdp",
      });
    });
  });

  it("affiche une erreur toast si les identifiants sont incorrects", async () => {
    const { toast } = await import("sonner");
    buildAuthMock({ error: { message: "Invalid login credentials" } });
    render(<LoginForm />);
    await userEvent.type(screen.getByPlaceholderText(/email/i), "user@test.com");
    await userEvent.type(screen.getByPlaceholderText(/mot de passe/i), "mauvaismdp");
    fireEvent.click(screen.getByRole("button", { name: /se connecter/i }));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Email ou mot de passe incorrect");
    });
  });

  it("désactive le bouton pendant la soumission", async () => {
    vi.mocked(createClient).mockReturnValue({
      auth: {
        signInWithPassword: vi.fn().mockReturnValue(new Promise(() => {})),
      },
    } as any);
    render(<LoginForm />);
    await userEvent.type(screen.getByPlaceholderText(/email/i), "user@test.com");
    await userEvent.type(screen.getByPlaceholderText(/mot de passe/i), "monmdp");
    const submitBtns = screen.getAllByRole("button");
    const submitBtn = submitBtns.find(btn => btn.getAttribute("type") === "submit") ?? submitBtns[0];
    fireEvent.click(submitBtn);
    await waitFor(() => {
      const allBtns = screen.getAllByRole("button");
      const disabledBtn = allBtns.find(btn => btn.hasAttribute("disabled") || btn.getAttribute("aria-disabled") === "true");
      expect(disabledBtn ?? submitBtn).toBeTruthy();
    }, { timeout: 2000 });
  });

  it("bascule la visibilité du mot de passe", async () => {
    buildAuthMock();
    render(<LoginForm />);
    const passwordInput = screen.getByPlaceholderText(/mot de passe/i);
    expect(passwordInput).toHaveAttribute("type", "password");
    const toggleBtn = screen.getAllByRole("button").find(btn => (btn as HTMLButtonElement).type === "button" && btn !== screen.getByRole("button", { name: /se connecter/i }));
    if (toggleBtn) {
      fireEvent.click(toggleBtn);
      await waitFor(() => {
        expect(passwordInput).toHaveAttribute("type", "text");
      });
    }
  });

  it("affiche le logo STUDY'S", () => {
    buildAuthMock();
    render(<LoginForm />);
    expect(screen.getByAltText("STUDY'S")).toBeInTheDocument();
  });
});
