import { describe, expect, it } from "vitest";
import { lookupRomanUrduLexicon } from "../app/tools/roman-urdu-writer/utils/romanUrduLexicon";
import { WORD_LEXICON } from "../app/tools/urdu-roman-writer/utils/urduRomanLexicon";

const pairs = [
  ["qalam", "قلم"],
  ["urdu", "اردو"],
  ["tool", "ٹول"],
  ["works", "ورکس"],
  ["jumla", "جملہ"],
  ["test", "ٹیسٹ"],
] as const;

describe("common vocabulary is reversible in both Roman Urdu tools", () => {
  for (const [roman, urdu] of pairs) {
    it(`${roman} ↔ ${urdu}`, () => {
      expect(lookupRomanUrduLexicon(roman)).toBe(urdu);
      expect(WORD_LEXICON[urdu]).toBe(roman);
    });
  }
});
