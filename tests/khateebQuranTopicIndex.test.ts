import { describe, expect, test } from "vitest";
import { ahmedgrafQuranReference } from "../app/tools/arabic-diacritics/quran/ahmedgrafProvider";
import { buildLiveResearchPack } from "../app/tools/khateeb-studio/engine/liveResearchPack";
import {
  quranEvidenceForTopic,
  quranTopicIndexSize,
} from "../app/tools/khateeb-studio/engine/quranTopicIndex";
import { researchKhateebTopic } from "../app/tools/khateeb-studio/engine/researchEngine";

describe("Khateeb Quran topical index", () => {
  test("maps unknown sermon topics to internal AhmedGraf ayahs", () => {
    const rows = quranEvidenceForTopic("رزق میں برکت کے اسباب");
    expect(rows).toHaveLength(8);
    expect(rows.map((row) => row.citationUr)).toEqual([
      "سورۂ طلاق 65:2",
      "سورۂ طلاق 65:3",
      "سورۂ عنکبوت 29:60",
      "سورۂ ہود 11:6",
      "سورۂ نوح 71:10",
      "سورۂ نوح 71:11",
      "سورۂ نوح 71:12",
      "سورۂ بقرہ 2:267",
    ]);
    expect(rows.every((row) => row.kind === "quran" && row.status === "verified")).toBe(true);
    expect(rows.every((row) => row.providerId === "ahmedgraf-quran")).toBe(true);
  });

  test("always renders the unchanged AhmedGraf source line", () => {
    const row = quranEvidenceForTopic("غصے پر قابو پانے کے اسلامی طریقے")[0];
    expect(row).toBeTruthy();
    expect(row?.citationUr).toBe("سورۂ آل عمران 3:134");
    expect(row?.arabic).toBe(ahmedgrafQuranReference.getAyah(3, 134)?.text);
  });

  test("returns no guessed ayah for an unmapped topic", () => {
    expect(quranEvidenceForTopic("ایک بالکل غیر متعلق آزمائشی عنوان")).toEqual([]);
  });

  test("keeps the thematic index separate from the Quran corpus", () => {
    expect(quranTopicIndexSize()).toBeGreaterThanOrEqual(25);
    expect(ahmedgrafQuranReference.listAyahs()).toHaveLength(6236);
  });

  test("live research can expose a Quran foundation without pretending the sermon pack is ready", () => {
    const result = researchKhateebTopic({
      query: "رزق میں برکت کے اسباب",
      locale: "ur",
      maxEvidence: 24,
    });
    const quran = result.evidence.filter((row) => row.kind === "quran");
    expect(quran).toHaveLength(3);
    expect(result.gapsUr.join(" ")).toContain("قرآنی بنیاد");
    const pack = buildLiveResearchPack(result, 20);
    expect(pack.ready).toBe(false);
  });
});


describe("Khateeb Quran reviewed mappings", () => {
  test("adds Ahqaf 46:15 to parents", () => {
    const rows = quranEvidenceForTopic("والدین");
    expect(rows.map((row) => row.citationUr)).toContain("سورۂ احقاف 46:15");
  });

  test("uses Al Imran 3:200 for sabr instead of Zumar 39:10", () => {
    const rows = quranEvidenceForTopic("صبر");
    const refs = rows.map((row) => row.citationUr);
    expect(refs).toContain("سورۂ آل عمران 3:200");
    expect(refs).not.toContain("سورۂ زمر 39:10");
  });

  test("uses Araf and Naml for dua instead of Furqan 25:77", () => {
    const rows = quranEvidenceForTopic("دعا");
    const refs = rows.map((row) => row.citationUr);
    expect(refs).toContain("سورۂ اعراف 7:55");
    expect(refs).toContain("سورۂ نمل 27:62");
    expect(refs).not.toContain("سورۂ فرقان 25:77");
  });
});
