"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import { ServiceWorkerProvider } from "@/components/providers/ServiceWorkerProvider";
import { PushNotificationProvider } from "@/components/providers/PushNotificationProvider";
import { InstallPromptProvider } from "@/components/providers/InstallPromptProvider";
import { OfflineProvider } from "@/components/providers/OfflineProvider";
import { ContactsSyncProvider } from "@/components/providers/ContactsSyncProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,   // 5 min — évite les refetch inutiles
            gcTime:    10 * 60 * 1000,  // 10 min — garde en cache mémoire
            retry: 1,
            refetchOnWindowFocus: false, // Pas de refetch à chaque clic
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
        forcedTheme="light"
        disableTransitionOnChange
      >
        {children}
        <ServiceWorkerProvider />
        <PushNotificationProvider />
        <InstallPromptProvider />
        <OfflineProvider />
        <ContactsSyncProvider />
      </ThemeProvider>
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
