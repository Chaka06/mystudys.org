import type { MetadataRoute } from "next";

const BASE_URL = "https://mystudys.org";

// Google ignore <priority> et <changefreq> — seul <lastmod> est utilisé.
// On les conserve pour Bing et les autres moteurs.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const launchDate = new Date("2026-05-09");

  return [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/register`,
      lastModified: launchDate,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: launchDate,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/login`,
      lastModified: launchDate,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: launchDate,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: launchDate,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: launchDate,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
