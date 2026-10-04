import { describe, expect, test } from "vitest";
import {
  buildGroundedFullSermon,
  buildGroundedFullSermonText,
} from "../app/tools/khateeb-studio/engine/groundedFullSermon";
import { verifiedHadithForDossierText } from "../app/tools/khateeb-studio/engine/verifiedHadithCorpus";

describe("Khateeb grounded full sermon composer", () => {
  test("builds a ready 30-minute Sabr sermon only from verified source blocks plus labeled editorial layers", () => {
    const sermon = buildGroundedFullSermon("sabr", 30, "ur");
    expect(sermon).not.toBeNull();
    expect(sermon?.ready).toBe(true);
    expect(sermon?.verifiedHadithCount).toBeGreaterThanOrEqual(3);
    expect(
      sermon?.blocks
        .filter((block) => block.kind === "hadith")
        .every((block) => block.provenance === "source-grounded"),
    ).toBe(true);
    expect(
      sermon?.blocks
        .filter((block) => block.kind === "editorial")
        .every((block) => block.provenance === "editorial"),
    ).toBe(true);
  });

  test("uses exact verified hadith text rather than dossier candidate text", () => {
    const sermon = buildGroundedFullSermon("sabr", 30, "ur")!;
    const headOfFaith = sermon.blocks.find(
      (block) => block.id === "hadith-sabr-head-of-faith",
    );
    const verified = verifiedHadithForDossierText("sabr-head-of-faith");

    expect(headOfFaith?.arabic).toBe(verified?.exactArabic);
    expect(headOfFaith?.citationUr).toBe(verified?.verifiedReferenceUr);
    expect(headOfFaith?.arabic).not.toContain("...");
  });

  test("never includes the pending Tanbih Dua candidate as source-grounded text", () => {
    const sermon = buildGroundedFullSermon("dua", 30, "ur")!;
    expect(sermon.ready).toBe(true);
    expect(
      sermon.blocks.some((block) => block.id === "hadith-dua-best-worship"),
    ).toBe(false);

    const text = buildGroundedFullSermonText(sermon, "ur");
    expect(text).not.toContain("أفضَلُ العِبادَةِ الدُّعاءُ");
  });

  test("restores verified full Qur'an/Hidayat humility wording without ellipsis", () => {
    const sermon = buildGroundedFullSermon("quran-hidayat", 45, "ur")!;
    const humility = sermon.blocks.find(
      (block) => block.id === "hadith-quran-hidayat-humility",
    );

    expect(sermon.ready).toBe(true);
    expect(humility?.arabic).toContain(
      "يَا حَامِلَ الْقُرْآنِ تَوَاضَعْ بِهِ يَرْفَعْكَ اللَّهُ",
    );
    expect(humility?.arabic).toContain(
      "وَ لَكِنَّهُ يَعْفُو وَ يَصْفَحُ وَ يَغْفِرُ",
    );
    expect(humility?.arabic).not.toContain("...");
  });

  test("uses AhmedGraf text for every linked Quran block", () => {
    const sermon = buildGroundedFullSermon("parents-barsi", 30, "ur")!;
    const quran = sermon.blocks.filter((block) => block.kind === "quran");

    expect(quran.length).toBeGreaterThan(0);
    expect(quran.every((block) => Boolean(block.arabic))).toBe(true);
    expect(
      quran.every((block) => block.provenance === "source-grounded"),
    ).toBe(true);
  });

  test("copy text makes provenance impossible to miss", () => {
    const sermon = buildGroundedFullSermon("imamate", 30, "ur")!;
    const text = buildGroundedFullSermonText(sermon, "ur");

    expect(text).toContain("30 منٹ — مصدقہ مجلس");
    expect(text).toContain("[ماخذی بنیاد]");
    expect(text).toContain("[تدوینی حصہ]");
    expect(text).toContain("تنبیہ: تدوینی حصوں کو حدیث");
    expect(text).toContain("الکافی، ج2، ص18، ح1");
    expect(text).not.toContain("الکافی، ج3، ص18، ح2");
  });

  test("45-minute composition demands a deeper verified core than 20-minute composition", () => {
    const twenty = buildGroundedFullSermon("dua", 20, "ur")!;
    const fortyFive = buildGroundedFullSermon("dua", 45, "ur")!;

    expect(twenty.ready).toBe(true);
    expect(fortyFive.ready).toBe(true);
    expect(fortyFive.verifiedHadithCount).toBeGreaterThanOrEqual(
      twenty.verifiedHadithCount,
    );
  });

  test("returns null for a topic without a prepared dossier", () => {
    expect(buildGroundedFullSermon("not-a-real-topic", 30, "ur")).toBeNull();
  });
});
