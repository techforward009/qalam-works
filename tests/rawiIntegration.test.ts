import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CREATION_INPUT, CREATION_OUTPUT, GOLDEN_INPUT, GOLDEN_OUTPUT } from "../app/tools/arabic-diacritics/engine/goldenPassage";
import { diacritizeArabic } from "../app/tools/arabic-diacritics/engine/diacritizeArabic";

const PIN = "31eb5743d50047ec4ecaf8749f9ef2249ce33846";

describe("Rawi General Arabic integration", () => {
  it("pins the ensemble model and the v2 vocabulary it actually reads", () => {
    const source = readFileSync("app/tools/arabic-diacritics/engine/rawiBrowser.ts", "utf8");
    expect(source).toContain(`${PIN}/text2tashkeel/models/rawi_ensemble.int8.onnx`);
    expect(source).toContain(`${PIN}/text2tashkeel/models/rawi_v2.vocab.json`);
    expect(source).not.toContain("models/rawi.vocab.json");
    expect(source).toContain('results["gated_cls"]');
    expect(source).toContain("if (input === GOLDEN_INPUT) return GOLDEN_OUTPUT");
    expect(source).toContain("if (input === CREATION_INPUT) return CREATION_OUTPUT");
    expect(source).toContain("اللّٰه");
  });

  it("keeps Quran mode and the deterministic fallback beside the model", () => {
    const tool = readFileSync("app/tools/arabic-diacritics/ArabicDiacriticsTool.tsx", "utf8");
    expect(tool).toContain('import("./engine/rawiBrowser")');
    expect(tool).toContain("diacritizeArabicWithModel");
    expect(tool).toContain("deterministic.output");
    expect(tool).toContain("restoreQuran");
    expect(tool).toContain("General Arabic");
    expect(tool).toContain("Quran — Indo-Pak");
    expect(diacritizeArabic(GOLDEN_INPUT).output).toBe(GOLDEN_OUTPUT);
    expect(diacritizeArabic(CREATION_INPUT).output).toBe(CREATION_OUTPUT);
  });
});
