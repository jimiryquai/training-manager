import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    pool: "@cloudflare/vitest-pool-workers",
    include: ["src/**/*.test.{ts,tsx}", "tests/**/*.test.{ts,tsx}"],
    setupFiles: ["./tests/setup.ts"],
    poolOptions: {
      workers: {
        isolatedStorage: true,
        wrangler: {
          configPath: "./dist/worker/wrangler.json",
        },
      },
    },
  },
});
