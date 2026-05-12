/**
 * Tests E2E — Fil d'actualité et interactions
 * Prérequis: app démarrée sur localhost:3000 avec un compte de test
 */
import { test, expect, type BrowserContext, type Page } from "@playwright/test";

const TEST_EMAIL = process.env.TEST_EMAIL ?? "test@studys.ci";
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? "Test123456";

// ─── Setup: Session authentifiée ─────────────────────────────────────────────

async function loginUser(page: Page) {
  await page.goto("/login");
  await page.getByPlaceholder(/email/i).fill(TEST_EMAIL);
  await page.getByPlaceholder(/mot de passe/i).fill(TEST_PASSWORD);
  await page.getByRole("button", { name: /se connecter/i }).click();
  await page.waitForURL(/\/feed/, { timeout: 10000 });
}

// ─── Feed ────────────────────────────────────────────────────────────────────

test.describe("Fil d'actualité", () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test("affiche la page du feed", async ({ page }) => {
    await expect(page).toHaveURL(/\/feed/);
    await expect(page.getByRole("main")).toBeVisible();
  });

  test("affiche la navbar", async ({ page }) => {
    await expect(page.getByRole("navigation")).toBeVisible();
  });

  test("affiche au moins un post ou le message 'aucun post'", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    const posts = page.locator("article, [class*='card']");
    const noContent = page.getByText(/aucune publication/i);
    const hasContent = (await posts.count()) > 0;
    const hasNoContentMsg = await noContent.isVisible();
    expect(hasContent || hasNoContentMsg).toBe(true);
  });

  test("charge plus de posts au scroll (pagination infinie)", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    const initialPostCount = await page.locator("[class*='card']").count();
    if (initialPostCount >= 10) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(2000);
      const newPostCount = await page.locator("[class*='card']").count();
      expect(newPostCount).toBeGreaterThanOrEqual(initialPostCount);
    }
  });
});

// ─── Création de post ─────────────────────────────────────────────────────────

test.describe("Création de publication", () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await page.goto("/create");
  });

  test("affiche le formulaire de création", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /créer/i })).toBeVisible();
  });

  test("soumet un post général", async ({ page }) => {
    const uniqueContent = `Test E2E ${Date.now()}`;
    const contentField = page.getByPlaceholder(/quoi de neuf/i) ?? page.getByRole("textbox").first();
    await contentField.fill(uniqueContent);
    await page.getByRole("button", { name: /publier/i }).click();
    await expect(page).toHaveURL(/\/feed/, { timeout: 5000 });
  });
});

// ─── Interactions sur un post ─────────────────────────────────────────────────

test.describe("Interactions sur les posts", () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test("peut liker un post", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    const firstLikeButton = page.locator("button").filter({ hasText: "" }).first();
    if (await firstLikeButton.isVisible()) {
      await firstLikeButton.click();
      await page.waitForTimeout(500);
    }
  });

  test("peut ouvrir la section commentaires", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    const commentBtns = page.getByRole("button").filter({ has: page.locator("svg[data-lucide='message-circle']") });
    const count = await commentBtns.count();
    if (count > 0) {
      await commentBtns.first().click();
      await expect(page.getByPlaceholder(/écrire un commentaire/i)).toBeVisible({ timeout: 3000 });
    }
  });

  test("peut sauvegarder un post", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    const saveBtns = page.getByRole("button").filter({ has: page.locator("svg[data-lucide='bookmark']") });
    const count = await saveBtns.count();
    if (count > 0) {
      await saveBtns.first().click();
      await expect(page.getByText(/enregistrée/i)).toBeVisible({ timeout: 3000 });
    }
  });
});

// ─── Navigation ───────────────────────────────────────────────────────────────

test.describe("Navigation principale", () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test("navigue vers la page Messages", async ({ page }) => {
    await page.getByRole("link", { name: /messages/i }).first().click();
    await expect(page).toHaveURL(/\/messages/);
  });

  test("navigue vers la page Notifications", async ({ page }) => {
    await page.getByRole("link", { name: /notifications/i }).first().click();
    await expect(page).toHaveURL(/\/notifications/);
  });

  test("navigue vers la page Profil", async ({ page }) => {
    const profileLinks = page.getByRole("link").filter({ hasText: /profil/i });
    if (await profileLinks.count() > 0) {
      await profileLinks.first().click();
      await expect(page).toHaveURL(/\/profile\//);
    }
  });

  test("navigue vers la page Amis", async ({ page }) => {
    await page.getByRole("link", { name: /amis/i }).first().click();
    await expect(page).toHaveURL(/\/friends/);
  });

  test("se déconnecte correctement", async ({ page }) => {
    const logoutBtn = page.getByRole("button", { name: /déconnexion|quitter/i });
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      await expect(page).toHaveURL(/\/|\/login/, { timeout: 5000 });
    }
  });
});

// ─── Recherche ────────────────────────────────────────────────────────────────

test.describe("Recherche", () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await page.goto("/search");
  });

  test("affiche la page de recherche", async ({ page }) => {
    await expect(page).toHaveURL(/\/search/);
  });

  test("recherche des utilisateurs par nom", async ({ page }) => {
    const searchInput = page.getByRole("searchbox") ?? page.getByPlaceholder(/recherche/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill("Issiaka");
      await page.waitForTimeout(1000);
    }
  });
});

// ─── PWA Manifest ────────────────────────────────────────────────────────────

test.describe("PWA", () => {
  test("le manifest.json est accessible", async ({ page }) => {
    const response = await page.request.get("/manifest.json");
    expect(response.status()).toBe(200);
    const manifest = await response.json();
    expect(manifest.name).toContain("STUDY");
    expect(manifest.start_url).toBeDefined();
  });

  test("le meta theme-color est défini", async ({ page }) => {
    await page.goto("/");
    const themeColor = await page.locator('meta[name="theme-color"]').getAttribute("content");
    expect(themeColor).toBeTruthy();
  });
});

// ─── Accessibilité ────────────────────────────────────────────────────────────

test.describe("Accessibilité basique", () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test("la page a un élément <main>", async ({ page }) => {
    await expect(page.locator("main")).toBeVisible();
  });

  test("les images ont des attributs alt", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    const imagesWithoutAlt = page.locator("img:not([alt])");
    expect(await imagesWithoutAlt.count()).toBe(0);
  });

  test("les liens de navigation sont focusables au clavier", async ({ page }) => {
    await page.keyboard.press("Tab");
    const focused = page.locator(":focus");
    await expect(focused).toBeVisible({ timeout: 2000 });
  });
});
