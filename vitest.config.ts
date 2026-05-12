import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/tests/setup.ts"],
    include: [
      "src/tests/unit/**/*.test.ts",
      "src/tests/integration/**/*.test.ts",
      "src/tests/components/**/*.test.tsx",
      // Anciens tests à la racine (compatibilité)
      "src/tests/*.test.ts",
      "src/tests/*.test.tsx",
    ],
    exclude: [
      "src/tests/e2e/**", // Les tests E2E utilisent Playwright, pas Vitest
      "node_modules/**",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: [
        "src/app/api/**/*.ts",
        "src/app/actions/**/*.ts",
        "src/components/**/*.tsx",
        "src/hooks/**/*.ts",
        "src/lib/**/*.ts",
        "src/stores/**/*.ts",
        "src/middleware.ts",
      ],
      exclude: [
        "src/types/**",
        "src/app/layout.tsx",
        "src/app/providers.tsx",
        "src/**/*.d.ts",
        "node_modules/**",
      ],
      thresholds: {
        global: {
          branches: 60,
          functions: 65,
          lines: 65,
          statements: 65,
        },
      },
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
