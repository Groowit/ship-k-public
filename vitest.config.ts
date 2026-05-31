import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: {
    jsx: "automatic"
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    exclude: ["tests/e2e/**", "node_modules/**", ".next/**", ".next-stale-*/**", "dist/**"]
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname
    }
  }
});
