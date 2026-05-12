import type { MetadataRoute } from "next";

const BASE_URL = "https://mystudys.org";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Règles générales — pages publiques indexées, privées bloquées
      {
        userAgent: "*",
        allow: ["/", "/about", "/contact", "/terms", "/privacy", "/register", "/login"],
        disallow: [
          "/feed",
          "/profile/",
          "/messages/",
          "/notifications",
          "/admin",
          "/create",
          "/saved",
          "/api/",
          // Paramètres internes Next.js — évite les doublons d'indexation
          "/*?_rsc=*",
          "/*?*_rsc=*",
        ],
      },
      // Googlebot — autorisé sur les ressources JS/CSS pour le rendu
      {
        userAgent: "Googlebot",
        allow: ["/", "/_next/static/"],
        disallow: ["/api/", "/admin", "/*?_rsc=*"],
      },
      // Bots IA — bloqués sur tout le contenu
      { userAgent: "GPTBot", disallow: "/" },
      { userAgent: "ChatGPT-User", disallow: "/" },
      { userAgent: "CCBot", disallow: "/" },
      { userAgent: "anthropic-ai", disallow: "/" },
      { userAgent: "Claude-Web", disallow: "/" },
      { userAgent: "Omgilibot", disallow: "/" },
      { userAgent: "FacebookBot", allow: "/" },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
