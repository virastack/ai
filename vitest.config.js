import { defineConfig } from "vitest/config";

// Several tests spawn npm or a child CLI, which is slow on Windows and macOS runners.
export default defineConfig({
  test: { testTimeout: 60_000, hookTimeout: 120_000 },
});
