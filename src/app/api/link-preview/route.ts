import { NextRequest, NextResponse } from "next/server";

function extractMeta(html: string, ...patterns: RegExp[]): string {
  for (const p of patterns) {
    const m = html.match(p);
    if (m?.[1]) return decodeHTML(m[1].trim());
  }
  return "";
}

function decodeHTML(t: string): string {
  return t
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

const BLOCKED = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.|0\.0\.0\.0)/i;

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "URL requise" }, { status: 400 });

  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return NextResponse.json({ error: "URL invalide" }, { status: 400 });
    }
    if (BLOCKED.test(parsed.hostname)) {
      return NextResponse.json({ error: "URL non autorisée" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "URL invalide" }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "StudysBot/1.0 (+https://mystudys.org)",
        "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "fr,en;q=0.5",
      },
      signal: AbortSignal.timeout(6000),
      redirect: "follow",
    });

    const contentType = res.headers.get("content-type") || "";
    const domain = new URL(url).hostname.replace(/^www\./, "");

    if (!contentType.includes("text/html")) {
      return NextResponse.json(
        { title: domain, description: "", image: "", siteName: domain, url },
        { headers: { "Cache-Control": "public, max-age=3600" } }
      );
    }

    // Lire seulement les 50KB du début (les balises meta sont dans <head>)
    const reader = res.body?.getReader();
    if (!reader) throw new Error("No body");
    let html = "";
    while (html.length < 50000) {
      const { done, value } = await reader.read();
      if (done) break;
      html += new TextDecoder().decode(value);
      if (html.includes("</head>")) break;
    }
    reader.cancel();

    const og = (prop: string) => [
      new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${prop}["'][^>]*>`, "i"),
    ];
    const tw = (name: string) => [
      new RegExp(`<meta[^>]+name=["']twitter:${name}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:${name}["'][^>]*>`, "i"),
    ];

    const title = extractMeta(html, ...og("title"), ...tw("title"),
      /<title[^>]*>([^<]+)<\/title>/i);

    const description = extractMeta(html, ...og("description"),
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["'][^>]*>/i,
    );

    let image = extractMeta(html, ...og("image"), ...tw("image"));
    if (image && !image.startsWith("http")) {
      try { image = new URL(image, new URL(url).origin).toString(); } catch {}
    }

    const siteName = extractMeta(html, ...og("site_name")) || domain;

    return NextResponse.json(
      { title: title || siteName, description, image, siteName, url },
      { headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600" } }
    );
  } catch {
    return NextResponse.json({ error: "Impossible de récupérer" }, { status: 502 });
  }
}
