"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageLightboxProps {
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}

export function ImageLightbox({ images, initialIndex = 0, onClose }: ImageLightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [mounted, setMounted] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // Monte après le premier render (nécessaire pour createPortal côté client)
  useEffect(() => { setMounted(true); }, []);

  const prev = useCallback(() => { setIndex((i) => (i - 1 + images.length) % images.length); setScale(1); }, [images.length]);
  const next = useCallback(() => { setIndex((i) => (i + 1) % images.length); setScale(1); }, [images.length]);
  const zoomIn  = useCallback(() => setScale((s) => Math.min(s + 0.5, 4)), []);
  const zoomOut = useCallback(() => setScale((s) => Math.max(s - 0.5, 1)), []);

  // Navigation clavier
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape")      { e.preventDefault(); onClose(); }
      if (e.key === "ArrowLeft")   prev();
      if (e.key === "ArrowRight")  next();
      if (e.key === "+" || e.key === "=") zoomIn();
      if (e.key === "-")           zoomOut();
      if (e.key === "0")           setScale(1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [prev, next, onClose, zoomIn, zoomOut]);

  // Bloquer le scroll du body
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Swipe tactile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || scale > 1) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - (touchStartY.current ?? 0);
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx > 0) prev(); else next();
    }
    touchStartX.current = null;
  };

  const download = () => {
    const a = document.createElement("a");
    a.href = images[index];
    a.download = `studys-${index + 1}.jpg`;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="lightbox-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[9999] flex flex-col bg-black/95"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => {
          // Clic sur le fond noir → fermer
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {/* ─── Barre du haut ─── */}
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0 select-none"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-white/50 text-sm font-medium">
            {images.length > 1 ? `${index + 1} / ${images.length}` : ""}
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={zoomOut}
              disabled={scale <= 1}
              className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-20"
              title="Zoom −"
            ><ZoomOut className="h-5 w-5" /></button>

            <button
              onClick={() => setScale(1)}
              className="px-2.5 py-1 text-xs font-mono rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >{Math.round(scale * 100)}%</button>

            <button
              onClick={zoomIn}
              disabled={scale >= 4}
              className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-20"
              title="Zoom +"
            ><ZoomIn className="h-5 w-5" /></button>

            <div className="w-px h-5 bg-white/20 mx-1" />

            <button
              onClick={download}
              className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              title="Télécharger"
            ><Download className="h-5 w-5" /></button>

            {/* Bouton fermer — priorité maximale */}
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="p-2 ml-1 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Fermer (Échap)"
            ><X className="h-5 w-5" /></button>
          </div>
        </div>

        {/* ─── Image principale ─── */}
        <div
          className="flex-1 relative flex items-center justify-center overflow-hidden min-h-0 px-12"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          {/* Navigation gauche */}
          {images.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); prev(); }}
              className="absolute left-2 z-10 h-10 w-10 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
            ><ChevronLeft className="h-6 w-6" /></button>
          )}

          {/* Image avec AnimatePresence pour slide entre images */}
          <AnimatePresence mode="wait">
            <motion.img
              key={`img-${index}`}
              src={images[index]}
              alt={`Image ${index + 1}`}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              className="max-w-full max-h-full object-contain select-none"
              style={{
                transform: `scale(${scale})`,
                cursor: scale > 1 ? "zoom-out" : "zoom-in",
                transition: "transform 0.2s ease",
              }}
              draggable={false}
              onClick={(e) => {
                e.stopPropagation();
                if (scale === 1) zoomIn(); else setScale(1);
              }}
            />
          </AnimatePresence>

          {/* Navigation droite */}
          {images.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); next(); }}
              className="absolute right-2 z-10 h-10 w-10 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
            ><ChevronRight className="h-6 w-6" /></button>
          )}
        </div>

        {/* ─── Miniatures ─── */}
        {images.length > 1 && (
          <div
            className="shrink-0 flex items-center justify-center gap-2 py-3 px-4 overflow-x-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {images.map((url, i) => (
              <button
                key={i}
                onClick={() => { setIndex(i); setScale(1); }}
                className={cn(
                  "h-12 w-12 rounded-lg overflow-hidden shrink-0 border-2 transition-all duration-150",
                  i === index
                    ? "border-brand-orange scale-110 opacity-100"
                    : "border-transparent opacity-50 hover:opacity-80"
                )}
              >
                <img src={url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
