import { defineConfig } from "vitest/config";
import fileURLToPath from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath.fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
