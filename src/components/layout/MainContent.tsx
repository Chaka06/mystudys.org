"use client";

import { usePathname } from "next/navigation";

export function MainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMessages = pathname.startsWith("/messages");

  if (isMessages) {
    // Messages : prend tout l'espace restant après la sidebar gauche, sans max-w
    return (
      <main className="flex-1 min-w-0 min-h-0 overflow-hidden">
        {children}
      </main>
    );
  }

  return (
    <main className="flex-1 min-w-0 max-w-2xl mx-auto lg:mx-0">
      {children}
    </main>
  );
}
