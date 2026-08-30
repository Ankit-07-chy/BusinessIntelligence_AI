import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // listAnomalies computes weekly/monthly trend aggregates across every
    // KPI x period combination, so /anomalies responses can take several
    // seconds on a slower CI runner — comfortably past vitest's 5s default
    // for a test that hits it more than once.
    testTimeout: 40_000,
  },
});
