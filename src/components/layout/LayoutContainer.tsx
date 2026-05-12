"use client";

import { usePathname } from "next/navigation";

export function LayoutContainer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMessages = pathname.startsWith("/messages");

  return (
    <div
      className={
        isMessages
          // Messages : pleine largeur, padding réduit, pas de max-w
          ? "flex-1 flex min-h-0 px-0 sm:px-2 py-3"
          // Autres pages : layout standard centré
          : "flex-1 container mx-auto max-w-6xl px-2 sm:px-4 py-4 flex min-h-0"
      }
    >
      <div className="flex gap-3 flex-1 min-h-0 min-w-0">
        {children}
      </div>
    </div>
  );
}
