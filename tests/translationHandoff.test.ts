// Batch 17D.4 — Translation → Document Studio handoff tests

import {
  buildHandoff,
  writeHandoff,
  consumeHandoff,
  isValidHandoff,
  HANDOFF_FORMAT,
  HANDOFF_VERSION,
} from "../app/tools/translation-studio/utils/translationHandoff";
import { buildTranslationExportModel } from "../app/tools/translation-studio/utils/translationExport";
import type { TranslationProject, TranslationSegment } from "../app/tools/translation-studio/utils/translationTypes";
import { defaultBrief } from "../app/tools/translation-studio/utils/translationTypes";
import { segmentFingerprint, makeSegmentId } from "../app/tools/translation-studio/utils/segmentation";
import { generateProjectId } from "../app/tools/translation-studio/utils/projectId";

// localStorage/sessionStorage mock for node environment
function makeStorageMock(): Storage {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] ?? null,
  } as Storage;
}

function makeSeg(order: number, target: string, dir: "rtl" | "ltr" = "rtl"): TranslationSegment {
  return {
    id: makeSegmentId(order), order, source: "source", target,
    sourceDir: "ltr", targetDir: dir,
    status: target.trim() ? "draft" : "untranslated",
    sourceFingerprint: segmentFingerprint("source"),
    reviewStatus: "unreviewed", reviewNote: "", reviewedTargetFingerprint: "",
  };
}

function makeProject(segs: TranslationSegment[]): TranslationProject {
  return {
    schemaVersion: 1, id: generateProjectId(), name: "Handoff Test",
    sourceLanguage: "en", targetLanguage: "ur",
    brief: defaultBrief(), segments: segs, glossary: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
}

beforeAll(() => {
  (globalThis as Record<string, unknown>)["localStorage"] = makeStorageMock();
  (globalThis as Record<string, unknown>)["sessionStorage"] = makeStorageMock();
});

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

// ── buildHandoff ───────────────────────────────────────────────────────────────

describe("buildHandoff — canonical model", () => {
  test("1. blocks follow canonical segment order (not array position)", () => {
    const segs = [makeSeg(3, "تین"), makeSeg(1, "ایک"), makeSeg(2, "دو")];
    const model = buildTranslationExportModel(makeProject(segs));
    const handoff = buildHandoff(model);
    expect(handoff.blocks.map(b => b.text)).toEqual(["ایک", "دو", "تین"]);
  });

  test("2. target text preserved verbatim", () => {
    const target = "علی کتاب پڑھ رہے ہیں۔";
    const model = buildTranslationExportModel(makeProject([makeSeg(1, target)]));
    expect(buildHandoff(model).blocks[0].text).toBe(target);
  });

  test("3a. Urdu text preserved", () => {
    const u = "قلم ورکس دستاویز";
    expect(buildHandoff(buildTranslationExportModel(makeProject([makeSeg(1, u)]))).blocks[0].text).toBe(u);
  });

  test("3b. Arabic text preserved (not normalized to Urdu forms)", () => {
    const arabic = "علي عليه السلام";
    expect(buildHandoff(buildTranslationExportModel(makeProject([makeSeg(1, arabic)]))).blocks[0].text).toBe(arabic);
  });

  test("3c. English text preserved", () => {
    const en = "The Chamber of Commerce issued a statement.";
    expect(buildHandoff(buildTranslationExportModel(makeProject([makeSeg(1, en, "ltr")]))).blocks[0].text).toBe(en);
  });

  test("3d. mixed Unicode preserved", () => {
    const mixed = "Qalam Works میں Translation Studio کھولیں۔";
    expect(buildHandoff(buildTranslationExportModel(makeProject([makeSeg(1, mixed)]))).blocks[0].text).toBe(mixed);
  });

  test("4. critical: علي كتاب stays as-is", () => {
    const arabicScript = "علي كتاب";
    const handoff = buildHandoff(buildTranslationExportModel(makeProject([makeSeg(1, arabicScript)])));
    expect(handoff.blocks[0].text).toBe(arabicScript);
    expect(handoff.blocks[0].text).not.toContain("علی");
  });

  test("5. directions preserved per block", () => {
    const segs = [makeSeg(1, "اردو", "rtl"), makeSeg(2, "English", "ltr")];
    const handoff = buildHandoff(buildTranslationExportModel(makeProject(segs)));
    expect(handoff.blocks[0].direction).toBe("rtl");
    expect(handoff.blocks[1].direction).toBe("ltr");
  });

  test("6. source text never substitutes empty target", () => {
    const segs = [makeSeg(1, "", "rtl")];
    const handoff = buildHandoff(buildTranslationExportModel(makeProject(segs)));
    expect(handoff.blocks[0].text).toBe("");
    expect(handoff.blocks[0].text).not.toContain("source");
  });

  test("7. handoff has correct format and version", () => {
    const handoff = buildHandoff(buildTranslationExportModel(makeProject([makeSeg(1, "x")])));
    expect(handoff.format).toBe(HANDOFF_FORMAT);
    expect(handoff.version).toBe(HANDOFF_VERSION);
  });

  test("12. empty project → zero blocks, no crash", () => {
    const handoff = buildHandoff(buildTranslationExportModel(makeProject([])));
    expect(handoff.blocks).toHaveLength(0);
  });
});

// ── isValidHandoff ─────────────────────────────────────────────────────────────

describe("isValidHandoff", () => {
  test("9. invalid format → false", () => {
    expect(isValidHandoff({ format: "wrong", version: 1, blocks: [] })).toBe(false);
  });
  test("9b. wrong version → false", () => {
    expect(isValidHandoff({ format: HANDOFF_FORMAT, version: 99, blocks: [] })).toBe(false);
  });
  test("9c. missing blocks → false", () => {
    expect(isValidHandoff({ format: HANDOFF_FORMAT, version: HANDOFF_VERSION })).toBe(false);
  });
  test("valid handoff → true", () => {
    const handoff = buildHandoff(buildTranslationExportModel(makeProject([makeSeg(1, "x")])));
    expect(isValidHandoff(handoff)).toBe(true);
  });
});

// ── writeHandoff / consumeHandoffSentinel ──────────────────────────────────────

describe("writeHandoff + consumeHandoff — sessionStorage only", () => {
  const DS_DRAFT_KEY = "qalam-document-studio-draft";

  test("writeHandoff does NOT touch localStorage draft key", () => {
    localStorage.setItem(DS_DRAFT_KEY, JSON.stringify({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "existing draft" }] }] }));
    const handoff = buildHandoff(buildTranslationExportModel(makeProject([makeSeg(1, "ترجمہ", "rtl")])));
    writeHandoff(handoff);
    // Existing draft must be untouched
    const raw = localStorage.getItem(DS_DRAFT_KEY);
    expect(JSON.parse(raw!).content[0].content[0].text).toBe("existing draft");
  });

  test("8. consumeHandoff returns valid DocNode from sessionStorage", () => {
    const handoff = buildHandoff(buildTranslationExportModel(makeProject([makeSeg(1, "ترجمہ", "rtl")])));
    writeHandoff(handoff);
    const docNode = consumeHandoff() as Record<string, unknown>;
    expect(docNode).not.toBeNull();
    expect(docNode.type).toBe("doc");
    const content = docNode.content as Array<{ attrs: { dir: string }; content?: Array<{ text: string }> }>;
    expect(content[0].attrs.dir).toBe("rtl");
    expect(content[0].content![0].text).toBe("ترجمہ");
  });

  test("11. handoff removed after consumeHandoff", () => {
    const handoff = buildHandoff(buildTranslationExportModel(makeProject([makeSeg(1, "x")])));
    writeHandoff(handoff);
    consumeHandoff();
    expect(consumeHandoff()).toBeNull(); // second call: cleared
  });

  test("10. no handoff → consumeHandoff returns null, localStorage untouched", () => {
    localStorage.setItem(DS_DRAFT_KEY, "existing");
    expect(consumeHandoff()).toBeNull();
    expect(localStorage.getItem(DS_DRAFT_KEY)).toBe("existing");
  });

  test("invalid handoff removed and returns null (does not destroy existing draft)", () => {
    localStorage.setItem(DS_DRAFT_KEY, JSON.stringify({ type: "doc", content: [] }));
    sessionStorage.setItem("qalam-translation-handoff", JSON.stringify({ format: "wrong", version: 99 }));
    const result = consumeHandoff();
    expect(result).toBeNull();
    // Draft untouched
    expect(JSON.parse(localStorage.getItem(DS_DRAFT_KEY)!).type).toBe("doc");
    // Invalid handoff removed
    expect(sessionStorage.getItem("qalam-translation-handoff")).toBeNull();
  });
});
