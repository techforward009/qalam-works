import { describe, test, expect } from "vitest";
import { engineV2 } from "../app/tools/roman-urdu-writer/utils/engineV2";
import {
  lookupRomanUrduLexicon,
  lookupRomanUrduLexiconDetailed,
  phoneticKey,
} from "../app/tools/roman-urdu-writer/utils/romanUrduLexicon";

const cv = (s: string) => engineV2.convert(s).output;

describe("19A.9 fuzzy lexicon + phonetic keys", () => {
  test("phonetic keys group noisy variants", () => {
    expect(phoneticKey("mahrum")).toBe(phoneticKey("mharoom"));
    expect(phoneticKey("mahrum")).toBe(phoneticKey("mehrum"));
    expect(phoneticKey("bunyadi")).toBe(phoneticKey("bnyadi"));
    expect(phoneticKey("huqooq")).toBe(phoneticKey("hqooq"));
  });

  test("variant forms resolve to correct Urdu", () => {
    expect(lookupRomanUrduLexicon("shaks")).toBe("شخص");
    expect(lookupRomanUrduLexicon("mharoom")).toBe("محروم");
    expect(lookupRomanUrduLexicon("zimadary")).toBe("ذمہ داری");
    expect(lookupRomanUrduLexicon("bnyadi")).toBe("بنیادی");
    expect(lookupRomanUrduLexicon("hqooq")).toBe("حقوق");
    expect(lookupRomanUrduLexiconDetailed("mharoom")?.kind).toMatch(/phonetic|fuzzy|variant|exact/);
  });

  test("noisy sentence acceptance", () => {
    expect(cv("us k bnyadi hqooq sy mahrum")).toBe("اس کے بنیادی حقوق سے محروم");
    expect(cv("ghyr zimadarana guftgo")).toContain("ذمہ دارانہ");
    expect(cv("ghyr zimadarana guftgo")).toContain("غیر");
    expect(cv("muashry ki mushkilat")).toContain("معاشر");
  });

  test("pure English safe", () => {
    expect(cv("meeting starts at 5 pm")).toBe("meeting starts at 5 pm");
    expect(cv("please see the report now")).toBe("please see the report now");
  });

  test("protected URL unchanged", () => {
    expect(cv("see https://qalamworks.com now")).toBe("see https://qalamworks.com now");
  });
});
