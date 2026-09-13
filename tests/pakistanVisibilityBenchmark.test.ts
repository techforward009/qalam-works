import { describe, expect, it } from "vitest";
import { performance } from "node:perf_hooks";
import { runMapGrid } from "../app/tools/crescent-visibility/utils/mapGridRunner";
import { createPakistanMapGrid } from "../app/tools/crescent-visibility/utils/pakistanMapGrid";

/** Development-only measurement harness. Run with RUN_MAP_BENCHMARK=1. Machine results are not cross-device claims. */
const maybeBenchmark = process.env.RUN_MAP_BENCHMARK === "1" ? it : it.skip;
describe("Pakistan visibility map benchmark", () => {
  maybeBenchmark("measures each independent method at 50, 100, and masked-grid points", async () => {
    const grid = createPakistanMapGrid();
    for (const method of ["yallop", "pakistan-5year"] as const) for (const count of [...new Set([50, 100, grid.length])]) {
      const started = performance.now(); await runMapGrid(method, { year: 2026, month: 8, day: 13 }, grid.slice(0, count));
      console.info(`Pakistan map benchmark: method=${method} points=${count} elapsedMs=${(performance.now() - started).toFixed(1)} environment=node/vitest; not a cross-device claim`);
    }
    expect(grid.length).toBeGreaterThan(100);
  }, 120_000);
});
