
import { describe, test, expect } from "vitest";
import { readFileSync } from "fs";
import { engineV2 } from "../app/tools/roman-urdu-writer/utils/engineV2";
const set = JSON.parse(readFileSync("tests/fixtures/romanUrduRealLife.json","utf-8"));
describe("19A.5 real-life", () => {
  test("size", () => expect(set.examples.length).toBeGreaterThanOrEqual(40));
  test("target", () => expect(engineV2.convert(set.examples[0].input).output).toContain("دلوں"));
  test("protected", () => {
    for (const id of ["rl-09","rl-10","rl-11"]) {
      const ex = set.examples.find((e:any)=>e.id===id);
      if (ex) expect(engineV2.convert(ex.input).output).toBe(ex.input);
    }
  });
});
