/**
 * Tests E2E — Flux d'authentification
 * Nécessite: npx playwright install
 * Commande: npx playwright test
 *
 * Ces tests simulent un vrai navigateur contre l'app en cours d'exécution.
 * L'app doit être lancée sur http://localhost:3000 avant d'exécuter les tests.
 */
import { test, expect, type Page } from "@playwright/test";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function fillLoginForm(page: Page, email: string, password: string) {
  await page.getByPlaceholder(/adresse email/i).fill(email);
  await page.getByPlaceholder(/mot de passe/i).fill(password);
}

async function fillRegisterStep1(page: Page, data: {
  firstName: string; lastName: string; email: string; phone: string;
}) {
  await page.getByPlaceholder(/prénom/i).fill(data.firstName);
  await page.getByPlaceholder(/nom/i).fill(data.lastName);
  await page.getByPlaceholder(/email/i).fill(data.email);
  await page.getByPlaceholder(/téléphone/i).fill(data.phone);
}

// ─── Connexion ──────────────────────────────────────────────────────────────

test.describe("Page de connexion", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("affiche le formulaire de connexion", async ({ page }) => {
    await expect(page.getByPlaceholder(/adresse email/i)).toBeVisible();
    await expect(page.getByPlaceholder(/mot de passe/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /se connecter/i })).toBeVisible();
  });

  test("affiche une erreur pour un email invalide", async ({ page }) => {
    await fillLoginForm(page, "pasunemail", "monmdp");
    await page.getByRole("button", { name: /se connecter/i }).click();
    await expect(page.getByText(/email invalide/i)).toBeVisible();
  });

  test("affiche une erreur pour un mot de passe vide", async ({ page }) => {
    await page.getByPlaceholder(/adresse email/i).fill("user@test.com");
    await page.getByRole("button", { name: /se connecter/i }).click();
    await expect(page.getByText(/requis/i)).toBeVisible();
  });

  test("bascule la visibilité du mot de passe", async ({ page }) => {
    const passwordInput = page.getByPlaceholder(/mot de passe/i);
    await expect(passwordInput).toHaveAttribute("type", "password");
    await page.getByRole("button").filter({ hasText: "" }).last().click();
    await expect(passwordInput).toHaveAttribute("type", "text");
  });

  test("redirige vers /register depuis le lien d'inscription", async ({ page }) => {
    await page.getByRole("link", { name: /s'inscrire/i }).click();
    await expect(page).toHaveURL(/\/register/);
  });

  test("redirige vers /feed après connexion réussie", async ({ page }) => {
    // Utilisez un compte de test réel configuré dans les variables d'environnement
    const testEmail = process.env.TEST_EMAIL ?? "test@studys.ci";
    const testPassword = process.env.TEST_PASSWORD ?? "Test123456";
    await fillLoginForm(page, testEmail, testPassword);
    await page.getByRole("button", { name: /se connecter/i }).click();
    await expect(page).toHaveURL(/\/feed/, { timeout: 10000 });
  });

  test("affiche le toast d'erreur pour des identifiants incorrects", async ({ page }) => {
    await fillLoginForm(page, "mauvais@test.com", "MauvaisPass123");
    await page.getByRole("button", { name: /se connecter/i }).click();
    await expect(page.getByText(/email ou mot de passe incorrect/i)).toBeVisible({ timeout: 5000 });
  });
});

// ─── Inscription ────────────────────────────────────────────────────────────

test.describe("Page d'inscription", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/register");
  });

  test("affiche les deux étapes d'inscription", async ({ page }) => {
    await expect(page.getByText(/vos informations/i)).toBeVisible();
    await expect(page.getByText("1")).toBeVisible();
  });

  test("passe à l'étape 2 après validation de l'étape 1", async ({ page }) => {
    await fillRegisterStep1(page, {
      firstName: "Issiaka",
      lastName: "Diarrassouba",
      email: `test+${Date.now()}@test.com`,
      phone: "+225 07 00 00 00 00",
    });
    await page.getByRole("button", { name: /continuer/i }).click();
    await expect(page.getByText(/parcours académique/i)).toBeVisible();
  });

  test("valide le numéro de téléphone ivoirien", async ({ page }) => {
    await fillRegisterStep1(page, {
      firstName: "Issiaka",
      lastName: "Diarrassouba",
      email: "test@test.com",
      phone: "abc", // invalide
    });
    await page.getByRole("button", { name: /continuer/i }).click();
    await expect(page.getByText(/format invalide/i)).toBeVisible();
  });

  test("affiche les niveaux académiques dans le sélecteur", async ({ page }) => {
    await fillRegisterStep1(page, {
      firstName: "Issiaka",
      lastName: "Diarrassouba",
      email: "test@test.com",
      phone: "+225 07 00 00 00 00",
    });
    await page.getByRole("button", { name: /continuer/i }).click();
    await page.getByRole("combobox").click();
    await expect(page.getByText("Licence 1 (L1)")).toBeVisible();
    await expect(page.getByText("Master 2 (M2)")).toBeVisible();
  });
});

// ─── Middleware / Redirections ───────────────────────────────────────────────

test.describe("Redirections d'authentification", () => {
  test("redirige /feed vers /login si non connecté", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/feed");
    await expect(page).toHaveURL(/\/login/);
  });

  test("redirige /messages vers /login si non connecté", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/messages");
    await expect(page).toHaveURL(/\/login/);
  });

  test("conserve le paramètre redirectTo", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/notifications");
    await expect(page).toHaveURL(/redirectTo=%2Fnotifications/);
  });

  test("la landing page / est accessible sans connexion", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/");
    await expect(page).toHaveURL("/");
  });
});

// ─── Vérification OTP ───────────────────────────────────────────────────────

test.describe("Page de vérification OTP", () => {
  test("affiche le champ OTP", async ({ page }) => {
    await page.goto("/verify-otp?email=test@test.com");
    await expect(page.getByLabel(/code/i) || page.getByRole("textbox")).toBeVisible();
  });
});
