import { describe, expect, test } from "vitest";
import { auditGroundedFullSermon } from "../app/tools/khateeb-studio/engine/groundedSermonAudit";
import {
  buildGroundedFullSermon,
  type GroundedFullSermon,
} from "../app/tools/khateeb-studio/engine/groundedFullSermon";

describe("Khateeb grounded sermon audit", () => {
  test("audits every current prepared topic without structural errors", () => {
    for (const topicId of [
      "sabr",
      "dua",
      "imamate",
      "ismah",
      "parents-barsi",
      "quran-hidayat",
    ]) {
      for (const duration of [20, 30, 45] as const) {
        const sermon = buildGroundedFullSermon(topicId, duration, "ur");
        expect(sermon).not.toBeNull();
        const audit = auditGroundedFullSermon(sermon!);
        expect(audit.items.some((item) => item.level === "error")).toBe(false);
      }
    }
  });

  test("reports duration, Quran, hadith, source balance, and duplicate-text checks", () => {
    const sermon = buildGroundedFullSermon("imamate", 30, "ur")!;
    const audit = auditGroundedFullSermon(sermon);
    const ids = audit.items.map((item) => item.id);

    expect(ids).toEqual(
      expect.arrayContaining([
        "integrity",
        "duration",
        "source-diversity",
        "quran-foundation",
        "verified-hadith",
        "editorial-balance",
        "duplicate-primary-text",
      ]),
    );
    expect(
      audit.items.find((item) => item.id === "duration")?.level,
    ).toBe("pass");
    expect(
      audit.items.find((item) => item.id === "verified-hadith")?.level,
    ).toBe("pass");
  });

  test("source ledger size drives source-diversity audit", () => {
    const sermon = buildGroundedFullSermon("parents-barsi", 30, "ur")!;
    const audit = auditGroundedFullSermon(sermon);

    expect(audit.uniqueSourceCount).toBe(sermon.sourceLedger.length);
    expect(audit.uniqueSourceCount).toBeGreaterThan(0);
  });

  test("detects a composed sermon whose minutes no longer match duration", () => {
    const sermon = buildGroundedFullSermon("sabr", 20, "ur")!;
    const broken: GroundedFullSermon = {
      ...sermon,
      blocks: sermon.blocks.map((block, index) =>
        index === 0 ? { ...block, minutes: block.minutes + 3 } : block,
      ),
    };

    const audit = auditGroundedFullSermon(broken);
    expect(audit.status).toBe("error");
    expect(
      audit.items.find((item) => item.id === "duration")?.level,
    ).toBe("error");
  });

  test("detects duplicated exact Arabic primary text as a warning", () => {
    const sermon = buildGroundedFullSermon("sabr", 20, "ur")!;
    const firstHadith = sermon.blocks.find((block) => block.kind === "hadith")!;
    const otherHadith = sermon.blocks.find(
      (block) => block.kind === "hadith" && block.id !== firstHadith.id,
    )!;
    const broken: GroundedFullSermon = {
      ...sermon,
      blocks: sermon.blocks.map((block) =>
        block.id === otherHadith.id
          ? { ...block, arabic: firstHadith.arabic }
          : block,
      ),
    };

    const audit = auditGroundedFullSermon(broken);
    expect(
      audit.items.find((item) => item.id === "duplicate-primary-text")?.level,
    ).toBe("warning");
  });
});
