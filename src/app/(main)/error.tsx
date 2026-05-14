"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log en production pour monitoring
    if (process.env.NODE_ENV === "production") {
      console.error("[STUDYS_ERROR]", error.digest, error.message);
    }
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-4 text-center">
      <div className="h-14 w-14 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
        <AlertTriangle className="h-7 w-7 text-red-500" />
      </div>
      <h2 className="text-lg font-bold text-gray-900 mb-2">
        Une erreur est survenue
      </h2>
      <p className="text-sm text-gray-500 mb-6 max-w-xs">
        {process.env.NODE_ENV === "development"
          ? error.message
          : "Quelque chose s'est mal passé. Réessayez."}
      </p>
      <Button onClick={reset} size="sm">
        Réessayer
      </Button>
    </div>
  );
}
