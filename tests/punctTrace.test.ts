/**
 * Punctuation trace — 19A.2b blocker check
 * Tests writerEngine directly, no UI.
 */
import { convertRomanUrdu } from "../app/tools/roman-urdu-writer/utils/writerEngine";
import { engineV2 } from "../app/tools/roman-urdu-writer/utils/engineV2";

const PUNCT_CASES = [
  "theek?",
  "haan!",
  "kya haal hai?",
  "wah! bohat acha",
  "hello, kya haal hai?",
  "line1\nline2!",
  "main theek, tum?",
];

describe("Punctuation preservation — writerEngine", () => {
  for (const input of PUNCT_CASES) {
    test(`writerEngine preserves punctuation in: "${input.replace(/\n/g,"\\n")}"`, () => {
      const r = convertRomanUrdu(input);
      const lost: string[] = [];
      for (const ch of ["?", "!", ",", "\n"]) {
        if (input.includes(ch) && !r.output.includes(ch)) lost.push(ch);
      }
      if (lost.length) {
        process.stdout.write(`  LOST in output: ${JSON.stringify(lost)}  output="${r.output}"\n`);
      }
      expect(lost).toHaveLength(0);
    });
  }
});

describe("Punctuation preservation — engineV2 (baseline)", () => {
  for (const input of PUNCT_CASES) {
    test(`engineV2 preserves punctuation in: "${input.replace(/\n/g,"\\n")}"`, () => {
      const out = engineV2.convert(input).output;
      const lost: string[] = [];
      for (const ch of ["?", "!", ",", "\n"]) {
        if (input.includes(ch) && !out.includes(ch)) lost.push(ch);
      }
      if (lost.length) {
        process.stdout.write(`  V2 LOST: ${JSON.stringify(lost)}  output="${out}"\n`);
      }
      expect(lost).toHaveLength(0);
    });
  }
});

describe("Punctuation — original failing case: 'theek? haan!'", () => {
  test("writerEngine preserves ? and ! in 'theek? haan!'", () => {
    const r = convertRomanUrdu("theek? haan!");
    process.stdout.write(`  input: "theek? haan!"  output: "${r.output}"\n`);
    expect(r.output).toContain("?");
    expect(r.output).toContain("!");
  });
  test("engineV2 preserves ? and ! in 'theek? haan!'", () => {
    const out = engineV2.convert("theek? haan!").output;
    process.stdout.write(`  V2 output: "${out}"\n`);
    expect(out).toContain("?");
    expect(out).toContain("!");
  });
});
