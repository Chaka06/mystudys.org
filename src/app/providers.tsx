"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import { ServiceWorkerProvider } from "@/components/providers/ServiceWorkerProvider";
import { PushNotificationProvider } from "@/components/providers/PushNotificationProvider";
import { InstallPromptProvider } from "@/components/providers/InstallPromptProvider";
import { OfflineProvider } from "@/components/providers/OfflineProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
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
      </ThemeProvider>
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
