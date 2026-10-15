import { describe, expect, it } from "vitest";
import { ayahsOnPage } from "../app/quran/reader/model";
import {
  indexTafsirCoverage,
  tafsirCoverageForRefs,
  tafsirCoverageRanges,
  tafsirDisplayTopicBody,
  tafsirDisplayTopicHeading,
} from "../app/quran/reader/tafsirVerseCoverage";

const verses = {
  "2:1": { refs: ["2:2"] },
  "2:2": { refs: ["2:2"] },
  "2:3": { refs: ["2:5"] },
  "2:4": { refs: ["2:5"] },
  "2:5": { refs: ["2:5"] },
  "2:6": { refs: ["2:7"] },
  "2:7": { refs: ["2:7"] },
  "8:60": { refs: ["8:64", "8:66"] },
  "8:61": { refs: ["8:64", "8:66"] },
  "10:3": { refs: ["demo"] },
  "10:5": { refs: ["demo"] },
  "11:2": { refs: ["demo"] },
};

describe("Tafsir commentary source verse coverage", () => {
  it("uses the actual Quran page map: first page has seven Al-Fatihah verses, second has five Al-Baqarah verses", () => {
    expect(ayahsOnPage(1).map((item) => item.surah + ":" + item.ayah)).toEqual([
      "1:1", "1:2", "1:3", "1:4", "1:5", "1:6", "1:7",
    ]);
    expect(ayahsOnPage(2).map((item) => item.surah + ":" + item.ayah)).toEqual([
      "2:1", "2:2", "2:3", "2:4", "2:5",
    ]);
  });

  const index = indexTafsirCoverage(verses);
  it("reports the actual original group, not an arbitrary Quran page boundary", () => {
    expect(tafsirCoverageForRefs(["2:2"], index)).toEqual([{ sourceKey: "2:2", verses: ["2:1", "2:2"] }]);
    expect(tafsirCoverageRanges(index.get("2:5")!)).toEqual([{ surah: 2, first: 3, last: 5 }]);
    expect(tafsirCoverageRanges(index.get("2:7")!)).toEqual([{ surah: 2, first: 6, last: 7 }]);
  });

  it("keeps legitimate multiple source links without inventing verse-specific paragraphs", () => {
    expect(tafsirCoverageForRefs(["8:64", "8:66"], index)).toHaveLength(2);
    expect(tafsirCoverageForRefs(["8:64", "8:66"], index).every(group => group.verses.length === 2)).toBe(true);
  });

  it("does not falsely join disjoint ranges or two different surahs", () => {
    expect(tafsirCoverageRanges(index.get("demo")!)).toEqual([
      { surah: 10, first: 3, last: 3 },
      { surah: 10, first: 5, last: 5 },
      { surah: 11, first: 2, last: 2 },
    ]);
  });

  it("displays the accurate printed Quran letters heading exactly once while preserving the raw source", () => {
    const badTitle = "قرآن کے جروف مقطعات کے متعلق تحقیق";
    const correctedTitle = "قرآن کے حروف مقطعات کے متعلق تحقیق";
    const originalBody = correctedTitle + "\nانیس سورتوں کی ابتداء میں حروف مقطعات ہیں۔";
    expect(tafsirDisplayTopicHeading(badTitle, originalBody)).toBe(correctedTitle);
    expect(tafsirDisplayTopicBody(badTitle, originalBody)).toBe("انیس سورتوں کی ابتداء میں حروف مقطعات ہیں۔");
    expect(tafsirDisplayTopicHeading(correctedTitle, originalBody)).toBe(correctedTitle);
    expect(tafsirDisplayTopicBody(correctedTitle, originalBody)).toBe("انیس سورتوں کی ابتداء میں حروف مقطعات ہیں۔");
    expect(originalBody.startsWith(correctedTitle)).toBe(true);
  });

  it("does not strip distinct source lines or change Quran/Arabic quotations", () => {
    const title = "کلام کی تفسیر";
    const quote = "اِنَّ اللّٰهَ غَفُورٌ رَّحِيمٌ";
    expect(tafsirDisplayTopicBody(title, quote)).toBe(quote);
    expect(tafsirDisplayTopicBody(title, title + " میں " + quote)).toBe(title + " میں " + quote);
  });
});
