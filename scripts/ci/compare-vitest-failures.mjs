// Compare failing test identities between two Vitest JSON reports.
// Usage: node compare-vitest-failures.mjs <branch.json> <branchRoot> <base.json> <baseRoot>
// Exits 1 when the branch has any failure (test or whole file) absent on the base.
import fs from "node:fs";
import path from "node:path";

function failures(reportPath, root) {
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  if (!Array.isArray(report.testResults)) throw new Error(`${reportPath}: no testResults`);
  const ids = new Set();
  for (const file of report.testResults) {
    const rel = path.relative(root, file.name).split(path.sep).join("/");
    const failed = (file.assertionResults ?? []).filter((t) => t.status === "failed");
    for (const t of failed) ids.add(`${rel} > ${t.fullName}`);
    if (file.status === "failed" && failed.length === 0) ids.add(`${rel} > [file failed to run]`);
  }
  return { ids, total: report.numTotalTests, failed: report.numFailedTests };
}

const [branchJson, branchRoot, baseJson, baseRoot] = process.argv.slice(2);
const branch = failures(branchJson, branchRoot);
const base = failures(baseJson, baseRoot);
const added = [...branch.ids].filter((id) => !base.ids.has(id)).sort();
const fixed = [...base.ids].filter((id) => !branch.ids.has(id)).sort();
const shared = [...branch.ids].filter((id) => base.ids.has(id)).sort();
console.log(`branch: ${branch.failed} failed / ${branch.total} tests; base: ${base.failed} failed / ${base.total} tests`);
console.log(`unchanged baseline failures (${shared.length}):`);
for (const id of shared) console.log(`  = ${id}`);
console.log(`failures fixed on branch (${fixed.length}):`);
for (const id of fixed) console.log(`  - ${id}`);
console.log(`NEW branch failures (${added.length}):`);
for (const id of added) console.log(`  + ${id}`);
process.exit(added.length ? 1 : 0);
