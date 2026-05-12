"use client";

import { useState, useEffect, memo } from "react";

// Cache en mémoire — évite de refetcher la même URL plusieurs fois dans la session
const previewCache = new Map<string, any>();
import { ExternalLink, Globe } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Preview {
  title: string;
  description: string;
  image: string;
  siteName: string;
  url: string;
}

interface LinkPreviewCardProps {
  url: string;
  compact?: boolean;
}

export const LinkPreviewCard = memo(function LinkPreviewCard({ url, compact = false }: LinkPreviewCardProps) {
  const cached = previewCache.get(url);
  const [preview, setPreview] = useState<Preview | null>(cached ?? null);
  const [loading, setLoading] = useState(!cached);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (previewCache.has(url)) {
      setPreview(previewCache.get(url));
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setPreview(null);
    setImgError(false);

    fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const result = (!data.error && data.title) ? data : null;
        previewCache.set(url, result);
        setPreview(result);
        setLoading(false);
      })
      .catch(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [url]);

  const domain = (() => {
    try { return new URL(url).hostname.replace(/^www\./, ""); }
    catch { return url; }
  })();

  if (loading) {
    return (
      <div className="mt-2 border border-border/60 rounded-xl overflow-hidden">
        {!compact && <Skeleton className="h-36 w-full rounded-none" />}
        <div className="p-3 space-y-2">
          <Skeleton className="h-2.5 w-20" />
          <Skeleton className="h-4 w-3/4" />
          {!compact && <Skeleton className="h-3 w-full" />}
        </div>
      </div>
    );
  }

  if (!preview) return null;

  const hasImage = preview.image && !imgError;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`mt-2 block border border-border/60 rounded-xl overflow-hidden hover:border-brand-orange/50 hover:shadow-md transition-all group bg-muted/20 ${compact ? "flex items-center gap-3" : ""}`}
    >
      {/* Image */}
      {hasImage && !compact && (
        <div className="h-40 bg-muted overflow-hidden">
          <img
            src={preview.image}
            alt={preview.title}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
            onError={() => setImgError(true)}
          />
        </div>
      )}

      {/* Compact mode: small thumbnail */}
      {hasImage && compact && (
        <div className="h-16 w-16 shrink-0 bg-muted overflow-hidden rounded-l-xl">
          <img
            src={preview.image}
            alt={preview.title}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        </div>
      )}

      {/* Texte */}
      <div className={`px-3 py-2.5 flex-1 min-w-0 ${!hasImage && !compact ? "border-l-4 border-brand-orange" : ""}`}>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
          <Globe className="h-2.5 w-2.5 shrink-0" />
          <span className="truncate">{preview.siteName || domain}</span>
          <ExternalLink className="h-2.5 w-2.5 ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        </p>
        <p className="text-sm font-semibold text-foreground group-hover:text-brand-orange transition-colors line-clamp-2 leading-snug">
          {preview.title}
        </p>
        {preview.description && !compact && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
            {preview.description}
          </p>
        )}
      </div>
    </a>
  );
});

// Détecte les URLs dans un texte et retourne la première
export function extractFirstUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s<>"{}|\\^`[\]]+/);
  return match?.[0] ?? null;
}
