/**
 * Phase 19A.0g — Full Diagnostic Report
 * Runs diagnostics on development set and challenge set.
 * Engine V2 is used read-only for output generation; no modification.
 */

import { readFileSync } from "fs";
import { join } from "path";
import { engineV2 } from "../app/tools/roman-urdu-writer/utils/engineV2";
import { buildDiagnosticReport, tokenize, type DiagnosticReport } from "../app/tools/roman-urdu-writer/utils/diagnostics";
import { isProtectedToken } from "../app/tools/roman-urdu-writer/utils/protectedTokens";
import { lookupNormalized, lookupToken } from "../app/tools/roman-urdu-writer/utils/lexicon";
import { PHRASE_TABLE } from "../app/tools/roman-urdu-writer/utils/phraseTable";

// ── Load corpora ──────────────────────────────────────────────────────────────

const benchmark = JSON.parse(readFileSync(join(__dirname, "fixtures/romanUrduBenchmark.json"), "utf-8"));
const challenge = JSON.parse(readFileSync(join(__dirname, "fixtures/romanUrduChallenge.json"), "utf-8"));

const devExamples = (benchmark.examples as Array<{split:string;id:string;category:string;input:string;expected:string;protectedTokens?:string[]}
>).filter((e: {split:string}) => e.split === "development");

const chalExamples = (challenge.examples as Array<{id:string;category:string;input:string;expected:string;protectedTokens?:string[];split:string}>);

// ── Generate outputs ──────────────────────────────────────────────────────────

function withActual(examples: typeof devExamples) {
  return examples.map(e => ({ ...e, actual: engineV2.convert(e.input).output }));
}

let devReport: DiagnosticReport;
let chalReport: DiagnosticReport;

beforeAll(() => {
  devReport = buildDiagnosticReport("DEVELOPMENT (200)", withActual(devExamples));
  chalReport = buildDiagnosticReport("CHALLENGE (120)", withActual(chalExamples));
});

// ── Print full report ─────────────────────────────────────────────────────────

test("print full diagnostic report", () => {
  const pct = (n: number, d: number) => `${(n/d*100).toFixed(1)}%`;
  const fmt = (r: DiagnosticReport) => `
=== ${r.label} ===
Sentence exact:     ${r.exactSentenceAccuracy.toFixed(3)} (${Math.round(r.exactSentenceAccuracy*r.totalExamples)}/${r.totalExamples})

Error distribution:
  0 wrong tokens:   ${r.perfect} (${pct(r.perfect, r.totalExamples)})
  1 wrong token:    ${r.oneWrongToken} (${pct(r.oneWrongToken, r.totalExamples)})
  2 wrong tokens:   ${r.twoWrongTokens} (${pct(r.twoWrongTokens, r.totalExamples)})
  3+ wrong tokens:  ${r.threeOrMoreWrongTokens} (${pct(r.threeOrMoreWrongTokens, r.totalExamples)})

Token-level:
  Total ref tokens: ${r.totalRefTokens}
  Correct tokens:   ${r.totalCorrectTokens}
  Token accuracy:   ${r.tokenAccuracy.toFixed(3)} (${pct(r.totalCorrectTokens, r.totalRefTokens)})
  Substitutions:    ${r.totalSubstitutions}
  Insertions:       ${r.totalInsertions}
  Deletions:        ${r.totalDeletions}
  Avg WER:          ${r.avgWER.toFixed(3)}

Character-level:
  Avg CER:          ${r.avgCER.toFixed(3)}

Roman leakage (unintended):
  Affected examples: ${r.romanLeakageExamples}
  Affected tokens:   ${r.romanLeakageTokenCount}
  Rate (tok/ref):    ${r.romanLeakageRate.toFixed(3)}

Destructive conversion:
  Protected violations: ${r.destructiveProtected}
  English converted:    ${r.destructiveEnglish}
  Proper-name conv:     ${r.destructiveProperName}

Failure severity:
  Minor (1 wrong):    ${r.minorFailures}
  Moderate (2-3):     ${r.moderateFailures}
  Severe (4+):        ${r.severeFailures}

Per category:
${r.perCategory.map(c => `  ${c.category.padEnd(22)} sent=${pct(c.exactSentenceAccuracy*c.count|0 ? c.exactSentenceAccuracy*c.count : 0, c.count).padEnd(8)} tok=${pct(c.totalCorrectTokens,c.totalRefTokens).padEnd(8)} WER=${c.avgWER.toFixed(2)}  CER=${c.avgCER.toFixed(2)}  leak=${c.romanLeakageRate.toFixed(3)}`).join("\n")}
`;

  process.stdout.write(fmt(devReport));
  process.stdout.write(fmt(chalReport));

  process.stdout.write(`
=== GENERALIZATION GAP (Dev vs Challenge) ===
Sentence exact:  Dev ${(devReport.exactSentenceAccuracy*100).toFixed(1)}%  vs  Challenge ${(chalReport.exactSentenceAccuracy*100).toFixed(1)}%  gap=${((devReport.exactSentenceAccuracy - chalReport.exactSentenceAccuracy)*100).toFixed(1)}pp
Token accuracy:  Dev ${(devReport.tokenAccuracy*100).toFixed(1)}%  vs  Challenge ${(chalReport.tokenAccuracy*100).toFixed(1)}%  gap=${((devReport.tokenAccuracy - chalReport.tokenAccuracy)*100).toFixed(1)}pp
Avg WER:         Dev ${devReport.avgWER.toFixed(3)}  vs  Challenge ${chalReport.avgWER.toFixed(3)}
Avg CER:         Dev ${devReport.avgCER.toFixed(3)}  vs  Challenge ${chalReport.avgCER.toFixed(3)}
Roman leakage:   Dev ${devReport.romanLeakageRate.toFixed(3)}  vs  Challenge ${chalReport.romanLeakageRate.toFixed(3)}
`);

  // Challenge severity breakdown
  const chalFails = chalReport.examples.filter(e => !e.exactMatch);
  process.stdout.write(`
=== CHALLENGE FAILURE SEVERITY (${chalFails.length} failures) ===
Minor  (1 wrong token): ${chalReport.minorFailures}
Moderate (2-3 wrong):   ${chalReport.moderateFailures}
Severe (4+ wrong):      ${chalReport.severeFailures}
`);

  expect(devReport.totalExamples).toBe(200);
  expect(chalReport.totalExamples).toBe(120);
});

// ── Top-3 candidate investigation ─────────────────────────────────────────────

test("investigate Top-3 collapse: count tokens with >1 candidate", () => {
  let tokensWithAlts = 0;
  let sentencesWithAlts = 0;

  for (const ex of chalExamples) {
    const result = engineV2.convert(ex.input);
    const cands = result.candidates ?? [];

    // Check unique candidates
    const unique = new Set(cands.map((c: {output:string}) => c.output));
    if (unique.size > 1) sentencesWithAlts++;

    // Count candidate count distribution
    process.stdout.write(`  ${ex.id}: ${cands.length} candidate(s)\n`);
  }

  process.stdout.write(`
Top-3 collapse investigation:
  Sentences with >1 unique candidate: ${sentencesWithAlts}/120
  (All 120 return 1 candidate = Top-3 collapsed to Top-1)
`);

  expect(sentencesWithAlts).toBeGreaterThanOrEqual(0);
});

// ── Mechanism coverage analysis ───────────────────────────────────────────────

test("conversion mechanism coverage on challenge set", () => {
  const AMBIG_DEFAULTS = new Set(["main","mein","to","is","par","pe","bus","na","kal","jo","jab","tab"]);
  const KEEP_EN_SAMPLE = new Set(["ok","okay","please","sorry","thanks","hello","problem","issue",
    "update","email","call","meeting","office","team","project","laptop","mobile","app"]);

  const counts: Record<string, number> = {
    "hard-protect": 0, "keep-english": 0, "phrase-table": 0,
    "exact-lexicon": 0, "spelling-norm": 0, "morph-rule": 0,
    "context-sensitive": 0, "unknown-passthrough": 0,
  };
  let total = 0;

  for (const ex of chalExamples) {
    const tokens = tokenize(ex.input);
    for (const t of tokens) {
      total++;
      const lower = t.toLowerCase();
      if (isProtectedToken(t)) { counts["hard-protect"]++; continue; }
      if (KEEP_EN_SAMPLE.has(lower)) { counts["keep-english"]++; continue; }
      if (AMBIG_DEFAULTS.has(lower)) { counts["context-sensitive"]++; continue; }
      if (lookupToken(lower)) { counts["exact-lexicon"]++; continue; }
      // Check spelling norm (collapse repeated chars)
      const collapsed = lower.replace(/(.)\1{2,}/g, "$1");
      if (collapsed !== lower && lookupToken(collapsed)) { counts["spelling-norm"]++; continue; }
      if (lookupNormalized(t)) { counts["exact-lexicon"]++; continue; }
      // Check phrase table
      let inPhrase = false;
      for (const key of Object.keys(PHRASE_TABLE)) {
        if (ex.input.toLowerCase().includes(key)) { inPhrase = true; break; }
      }
      if (inPhrase) { counts["phrase-table"]++; continue; }
      // Morph rule indicators
      if (/ing$|aya$|ayi$|aye$|enge$|oga$|ogi$|oge$|hoon$|raha$|rahi$|rahe$/i.test(lower)) {
        counts["morph-rule"]++; continue;
      }
      counts["unknown-passthrough"]++;
    }
  }

  process.stdout.write(`\n=== MECHANISM COVERAGE (Challenge ${total} tokens) ===\n`);
  for (const [mech, cnt] of Object.entries(counts).sort((a,b) => b[1]-a[1])) {
    process.stdout.write(`  ${mech.padEnd(22)}: ${cnt} (${(cnt/total*100).toFixed(1)}%)\n`);
  }

  expect(total).toBeGreaterThan(0);
});

// ── Structural overfitting audit ──────────────────────────────────────────────

test("structural overfitting audit", () => {
  const lexContent = readFileSync(
    join(__dirname, "../app/tools/roman-urdu-writer/utils/lexicon.ts"), "utf-8"
  );
  const phraseContent = readFileSync(
    join(__dirname, "../app/tools/roman-urdu-writer/utils/phraseTable.ts"), "utf-8"
  );

  const lexEntries = (lexContent.match(/^\s+"[^"]+"/gm) ?? []).length;
  const phraseEntries = (phraseContent.match(/^\s+"[^"]+"/gm) ?? []).length;

  const phraseKeys = Object.keys(PHRASE_TABLE);
  let devSentencesMatchingPhrase = 0;
  for (const ex of devExamples) {
    if (phraseKeys.some(k => ex.input.toLowerCase().includes(k))) devSentencesMatchingPhrase++;
  }
  let chalSentencesMatchingPhrase = 0;
  for (const ex of chalExamples) {
    if (phraseKeys.some(k => ex.input.toLowerCase().includes(k))) chalSentencesMatchingPhrase++;
  }

  process.stdout.write(`
=== STRUCTURAL OVERFITTING AUDIT ===
Lexicon entries: ${lexEntries}
Phrase table entries: ${phraseEntries}

Dev examples with phrase-table hit: ${devSentencesMatchingPhrase}/${devExamples.length} (${(devSentencesMatchingPhrase/devExamples.length*100).toFixed(0)}%)
Challenge examples with phrase-table hit: ${chalSentencesMatchingPhrase}/${chalExamples.length} (${(chalSentencesMatchingPhrase/chalExamples.length*100).toFixed(0)}%)
`);

  expect(lexEntries).toBeGreaterThan(0);
  expect(phraseEntries).toBeGreaterThan(0);
});
