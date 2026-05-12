"use client";

import { useEffect, useRef, useState } from "react";
import { FileText } from "lucide-react";

interface PdfThumbnailProps {
  url: string;
  height?: number;
}

type State = "loading" | "done" | "error";

let workerConfigured = false;

export function PdfThumbnail({ url, height = 180 }: PdfThumbnailProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    if (!url) return;
    let cancelled = false;

    async function render() {
      try {
        // Import dynamique côté client uniquement
        const pdfjs = await import("pdfjs-dist");

        // Configurer le worker une seule fois
        if (!workerConfigured) {
          pdfjs.GlobalWorkerOptions.workerSrc =
            `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
          workerConfigured = true;
        }

        const loadingTask = pdfjs.getDocument({
          url,
          withCredentials: false,
          verbosity: 0,
        });

        const pdf = await loadingTask.promise;
        if (cancelled) { loadingTask.destroy(); return; }

        const page = await pdf.getPage(1);
        if (cancelled) return;

        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        // Calculer le scale pour remplir la largeur du conteneur
        const containerWidth = container.clientWidth || 400;
        const naturalViewport = page.getViewport({ scale: 1 });
        const scale = containerWidth / naturalViewport.width;
        const viewport = page.getViewport({ scale });

        // Résolution haute densité (Retina)
        const dpr = window.devicePixelRatio || 1;
        canvas.width  = viewport.width  * dpr;
        canvas.height = viewport.height * dpr;
        canvas.style.width  = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.scale(dpr, dpr);

        // pdfjs-dist v5 — utiliser any pour contourner le type strict de RenderParameters
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (page as any).render({ canvasContext: ctx, viewport }).promise;
        if (!cancelled) setState("done");

      } catch {
        if (!cancelled) setState("error");
      }
    }

    render();
    return () => { cancelled = true; };
  }, [url]);

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden bg-gray-50"
      style={{ height }}
    >
      {/* Rendu PDF sur canvas */}
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full"
        style={{ display: state === "done" ? "block" : "none" }}
      />

      {/* Loader */}
      {state === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <div className="h-8 w-8 border-2 border-brand-orange/30 border-t-brand-orange rounded-full animate-spin" />
        </div>
      )}

      {/* Fallback si erreur de rendu */}
      {state === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gray-50">
          <FileText className="h-10 w-10 text-red-400" />
          <p className="text-xs text-muted-foreground">Aperçu impossible</p>
        </div>
      )}

      {/* Dégradé en bas pour fondre l'aperçu avec la carte */}
      {state === "done" && (
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-b from-transparent to-gray-50/90 pointer-events-none" />
      )}
    </div>
  );
}
