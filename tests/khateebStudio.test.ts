import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { KHATEEB_CALENDAR_SOURCE_ARCHIVE } from "../app/tools/khateeb-studio/engine/calendarSourceArchive";
import { KHATEEB_CORPUS } from "../app/tools/khateeb-studio/engine/khateebCorpus";
import { RABI_AL_THANI_1448_EVENTS, SHIA_CALENDAR_1448_EVENTS } from "../app/tools/khateeb-studio/engine/shiaCalendar";
import { buildPreparationText, getSermonPrep, outlineMinutes } from "../app/tools/khateeb-studio/engine/sermonPrep";

describe("Khateeb Studio seed corpus", () => {
  test("contains the requested historical speakers", () => {
    const names = KHATEEB_CORPUS.map((item) => item.name).join("|");
    expect(names).toContain("علامہ سید رشید ترابیؒ");
    expect(names).toContain("علامہ اظہر حسن زیدیؒ");
    expect(names).toContain("آیت اللہ سید علی نقی نقوی لکھنویؒ (نقنؒ)");
    expect(names).toContain("علامہ سید ذیشان حیدر جوادیؒ");
    expect(names).toContain("علامہ سید شہنشاہ حسین نقوی");
  });

  test("covers all three regions without ranking", () => {
    expect(KHATEEB_CORPUS.length).toBeGreaterThanOrEqual(20);
    expect(new Set(KHATEEB_CORPUS.map((item) => item.region))).toEqual(new Set(["pk", "in", "ir"]));
    for (const item of KHATEEB_CORPUS) expect(item.corpusFocus.length).toBeGreaterThan(0);
  });
});

describe("Rabi al-Thani calendar seed", () => {
  test("contains a broad set of occasions", () => {
    expect(RABI_AL_THANI_1448_EVENTS.length).toBeGreaterThan(8);
    expect(RABI_AL_THANI_1448_EVENTS.some((item) => item.day === 14)).toBe(true);
    expect(RABI_AL_THANI_1448_EVENTS.some((item) => item.day === 22)).toBe(true);
  });

  test("keeps source attribution", () => {
    const archiveIds = new Set(KHATEEB_CALENDAR_SOURCE_ARCHIVE.map((item) => item.id));
    for (const item of SHIA_CALENDAR_1448_EVENTS) {
      expect(item.sourceLabel).toBeTruthy();
      expect(item.sourceUrl).toMatch(/^https:\/\//);
      expect(item.sourceCapturedAt).toBe("2026-10-02");
      expect(archiveIds.has(item.sourceId)).toBe(true);
    }
    const askari = RABI_AL_THANI_1448_EVENTS.filter((item) => item.title === "ولادت امام حسن عسکریؑ");
    expect(new Set(askari.map((item) => item.day))).toEqual(new Set([6, 8, 10]));
    expect(askari.some((item) => item.regions?.includes("pk") && item.day === 10)).toBe(true);
  });
});

describe("Khateeb Studio typography", () => {
  test("keeps Jameel on the studio body and Noto Nastaliq on headings only", () => {
    const studio = readFileSync("app/tools/khateeb-studio/KhateebStudioContent.tsx", "utf8");
    const globals = readFileSync("app/globals.css", "utf8");
    expect(studio).toContain("https://p7rvwadnelbqgqlm.public.blob.vercel-storage.com/jameel-noori-nastaleeq-400.woff2");
    expect(studio).toContain("khateeb-studio-ur");
    expect(studio).toContain(".khateeb-studio-ur h1");
    expect(studio).toContain("var(--font-nastaliq), var(--font-nastaliq-latin)");
    expect(studio).toContain("Visible occasions");
    expect(globals).not.toContain("khateeb-studio");
    expect(globals).not.toContain("jameel-noori-nastaleeq-400.woff2");
    expect(studio).not.toContain("max-h-[560px]");
  });
});

describe("Khateeb Studio sermon preparation", () => {
  test("provides a substantive Askari preparation pack", () => {
    const event = RABI_AL_THANI_1448_EVENTS.find((item) => item.title === "ولادت امام حسن عسکریؑ");
    const prep = getSermonPrep(event);
    expect(prep).not.toBeNull();
    expect(prep?.quran.length).toBeGreaterThanOrEqual(3);
    expect(prep?.sources.length).toBeGreaterThanOrEqual(3);
    expect(prep?.anglesUr.length).toBeGreaterThanOrEqual(3);
  });

  test("provides source-led preparation for Tawwabun", () => {
    const event = RABI_AL_THANI_1448_EVENTS.find((item) => item.title.includes("توابین"));
    const prep = getSermonPrep(event);
    expect(prep?.id).toBe("tawwabin");
    expect(prep?.sources.some((item) => item.labelEn.includes("Tabari"))).toBe(true);
  });

  test("every other occasion still gets a useful fallback", () => {
    const event = RABI_AL_THANI_1448_EVENTS.find((item) => item.title.includes("موسیٰ مبرقع"));
    const prep = getSermonPrep(event);
    expect(prep?.id.startsWith("generic-")).toBe(true);
    expect(prep?.anglesUr.length).toBeGreaterThanOrEqual(4);
    expect(prep?.titleEn).not.toMatch(/[\u0600-\u06FF]/u);
  });

  test("duration allocation is deterministic and sums correctly", () => {
    expect(outlineMinutes(20).reduce((a, b) => a + b, 0)).toBe(20);
    expect(outlineMinutes(30).reduce((a, b) => a + b, 0)).toBe(30);
    expect(outlineMinutes(45).reduce((a, b) => a + b, 0)).toBe(45);
  });

  test("copyable preparation includes evidence and outline", () => {
    const event = RABI_AL_THANI_1448_EVENTS.find((item) => item.title === "ولادت امام حسن عسکریؑ");
    const prep = getSermonPrep(event)!;
    const text = buildPreparationText(prep, "ur", 30, {
      name: "علامہ سید رشید ترابیؒ",
      focus: ["مجالس", "خطابت"],
    });
    expect(text).toContain("قرآنی بنیاد");
    expect(text).toContain("خطبہ خاکہ");
    expect(text).toContain("علامہ سید رشید ترابیؒ");
  });

  test("speaker list uses page flow rather than an internal scrollbar", () => {
    const studio = readFileSync("app/tools/khateeb-studio/KhateebStudioContent.tsx", "utf8");
    expect(studio).not.toContain("max-h-[560px] overflow-auto");
    expect(studio).toContain("Sermon preparation");
  });
});
