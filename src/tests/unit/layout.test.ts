import { describe, it, expect } from "vitest";

// Tests de la logique de layout (MainContent, LayoutContainer, RightSidebar)
// Ces composants utilisent usePathname() — on teste la logique pure

function isMessagesRoute(pathname: string): boolean {
  return pathname.startsWith("/messages");
}

function getContentClass(pathname: string): string {
  return isMessagesRoute(pathname)
    ? "flex-1 min-w-0 min-h-0 overflow-hidden"
    : "flex-1 min-w-0 max-w-2xl mx-auto lg:mx-0";
}

function getContainerClass(pathname: string): string {
  return isMessagesRoute(pathname)
    ? "flex-1 flex min-h-0 px-0 sm:px-2 py-3"
    : "flex-1 container mx-auto max-w-6xl px-2 sm:px-4 py-4 flex min-h-0";
}

function shouldHideRightSidebar(pathname: string): boolean {
  return isMessagesRoute(pathname);
}

describe("Layout routing logic", () => {
  describe("isMessagesRoute", () => {
    it("identifie /messages comme route messages", () => {
      expect(isMessagesRoute("/messages")).toBe(true);
    });
    it("identifie /messages/[id] comme route messages", () => {
      expect(isMessagesRoute("/messages/abc-123")).toBe(true);
    });
    it("n'identifie pas /feed comme route messages", () => {
      expect(isMessagesRoute("/feed")).toBe(false);
    });
    it("n'identifie pas /notifications comme route messages", () => {
      expect(isMessagesRoute("/notifications")).toBe(false);
    });
    it("n'identifie pas / comme route messages", () => {
      expect(isMessagesRoute("/")).toBe(false);
    });
    it("n'identifie pas /profile/messages-user comme route messages", () => {
      // Attention aux faux positifs : /profile/messages-user commence par /profile
      expect(isMessagesRoute("/profile/messages-user")).toBe(false);
    });
  });

  describe("MainContent — classe CSS", () => {
    it("retire max-w-2xl sur /messages", () => {
      const cls = getContentClass("/messages");
      expect(cls).not.toContain("max-w-2xl");
      expect(cls).toContain("flex-1");
    });
    it("applique max-w-2xl sur /feed", () => {
      const cls = getContentClass("/feed");
      expect(cls).toContain("max-w-2xl");
    });
    it("applique max-w-2xl sur /notifications", () => {
      const cls = getContentClass("/notifications");
      expect(cls).toContain("max-w-2xl");
    });
    it("retire max-w-2xl sur /messages/conv-123", () => {
      const cls = getContentClass("/messages/conv-123");
      expect(cls).not.toContain("max-w-2xl");
    });
  });

  describe("LayoutContainer — classe CSS", () => {
    it("retire max-w-6xl et le padding sur /messages", () => {
      const cls = getContainerClass("/messages");
      expect(cls).not.toContain("max-w-6xl");
      expect(cls).toContain("px-0");
    });
    it("applique max-w-6xl sur /feed", () => {
      const cls = getContainerClass("/feed");
      expect(cls).toContain("max-w-6xl");
      expect(cls).toContain("px-2");
    });
  });

  describe("RightSidebar — visibilité", () => {
    it("masque la sidebar sur /messages", () => {
      expect(shouldHideRightSidebar("/messages")).toBe(true);
    });
    it("masque la sidebar sur /messages/conv-abc", () => {
      expect(shouldHideRightSidebar("/messages/conv-abc")).toBe(true);
    });
    it("affiche la sidebar sur /feed", () => {
      expect(shouldHideRightSidebar("/feed")).toBe(false);
    });
    it("affiche la sidebar sur /friends", () => {
      expect(shouldHideRightSidebar("/friends")).toBe(false);
    });
    it("affiche la sidebar sur /profile/username", () => {
      expect(shouldHideRightSidebar("/profile/issiaka")).toBe(false);
    });
  });
});
