import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(
        new URL("./src/test/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    exclude: ["tests/e2e/**"],
    // Database-backed integration files share one PostgreSQL schema and use
    // lifecycle fixtures. Running files serially prevents unrelated cleanup
    // from changing global-count assertions while another file is executing.
    fileParallelism: false,
  },
});