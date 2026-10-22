import path from "node:path";
import base from "../../../playwright.config";

// Run from the repository root after npm run build. No live R2 credentials
// are needed: the capture test intercepts the book-reader API only.
export default {
  ...base,
  testDir: path.resolve("tests/e2e/review"),
  testMatch: "khateebReaderScreenshots.ts",
  outputDir: path.resolve("test-results/khateeb-reader-review"),
  workers: 1,
  use: { ...base.use, baseURL: "http://localhost:3004" },
  webServer: {
    command: "npm start -- -p 3004",
    cwd: process.cwd(),
    url: "http://localhost:3004",
    reuseExistingServer: false,
    timeout: 120000,
  },
};
