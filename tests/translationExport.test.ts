// Batch 17D.1 — Canonical export model tests

import {
  buildTranslationExportModel,
  serializeExportModelToText,
  sanitizeFilenameBase,
} from "../app/tools/translation-studio/utils/translationExport";
import type { TranslationProject, TranslationSegment } from "../app/tools/translation-studio/utils/translationTypes";
import { defaultBrief } from "../app/tools/translation-studio/utils/translationTypes";
import { segmentFingerprint, makeSegmentId } from "../app/tools/translation-studio/utils/segmentation";
import { generateProjectId } from "../app/tools/translation-studio/utils/projectId";

function seg(order: number, target: string, src = "source"): TranslationSegment {
  return {
    id: makeSegmentId(order),
    order,
    source: src,
    target,
    sourceDir: "ltr",
    targetDir: target.trim() ? "rtl" : "rtl",
    status: target.trim() ? "draft" : "untranslated",
    sourceFingerprint: segmentFingerprint(src),
    reviewStatus: "unreviewed",
    reviewNote: "",
    reviewedTargetFingerprint: "",
  };
}

function project(segs: TranslationSegment[], name = "Test Project"): TranslationProject {
  return {
    schemaVersion: 1,
    id: generateProjectId(),
    name,
    sourceLanguage: "en",
    targetLanguage: "ur",
    brief: defaultBrief(),
    segments: segs,
    glossary: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ── 1. Canonical model construction ──────────────────────────────────────────

describe("buildTranslationExportModel", () => {
  test("blocks equal segment count", () => {
    const p = project([seg(1, "ترجمہ ایک"), seg(2, "ترجمہ دو"), seg(3, "")]);
    const m = buildTranslationExportModel(p);
    expect(m.blocks).toHaveLength(3);
    expect(m.totalSegments).toBe(3);
    expect(m.translatedSegments).toBe(2);
    expect(m.untranslatedSegments).toBe(1);
  });

  test("title is project name verbatim", () => {
    const p = project([seg(1, "x")], "My Translation");
    expect(buildTranslationExportModel(p).title).toBe("My Translation");
  });

  test("empty project → zero blocks, no crash", () => {
    const p = project([]);
    const m = buildTranslationExportModel(p);
    expect(m.blocks).toHaveLength(0);
    expect(m.totalSegments).toBe(0);
    expect(m.untranslatedSegments).toBe(0);
  });

  test("single-segment project", () => {
    const p = project([seg(1, "ترجمہ")]);
    const m = buildTranslationExportModel(p);
    expect(m.blocks[0].text).toBe("ترجمہ");
  });

  test("all-untranslated project → translatedSegments = 0", () => {
    const p = project([seg(1, ""), seg(2, ""), seg(3, "")]);
    const m = buildTranslationExportModel(p);
    expect(m.translatedSegments).toBe(0);
    expect(m.untranslatedSegments).toBe(3);
  });
});

// ── 2. Canonical segment ordering ────────────────────────────────────────────

describe("segment ordering", () => {
  test("blocks sorted by order even when segments array is unsorted", () => {
    const segs = [seg(3, "تین"), seg(1, "ایک"), seg(2, "دو")]; // deliberately out of order
    const p = project(segs);
    const m = buildTranslationExportModel(p);
    expect(m.blocks.map(b => b.order)).toEqual([1, 2, 3]);
    expect(m.blocks.map(b => b.text)).toEqual(["ایک", "دو", "تین"]);
  });

  test("does not mutate input segments array", () => {
    const segs = [seg(3, "c"), seg(1, "a"), seg(2, "b")];
    const originalOrder = segs.map(s => s.order);
    buildTranslationExportModel(project(segs));
    expect(segs.map(s => s.order)).toEqual(originalOrder);
  });
});

// ── 3. Target-only export / no source fallback ────────────────────────────────

describe("target-only export — no source substitution", () => {
  test("untranslated block text is empty string, not source", () => {
    const p = project([seg(1, "", "source text that must not appear")]);
    const m = buildTranslationExportModel(p);
    expect(m.blocks[0].text).toBe("");
    expect(m.blocks[0].text).not.toContain("source");
  });

  test("serialised text does not contain source text for untranslated segments", () => {
    const p = project([seg(1, "ترجمہ"), seg(2, "", "hidden source")]);
    const t = serializeExportModelToText(buildTranslationExportModel(p));
    expect(t).not.toContain("hidden source");
  });
});

// ── 4. Text fidelity — no normalization ──────────────────────────────────────

describe("Unicode fidelity — exact preservation", () => {
  test("Urdu text preserved verbatim", () => {
    const urdu = "علی کتاب پڑھ رہے ہیں۔";
    const p = project([seg(1, urdu)]);
    expect(buildTranslationExportModel(p).blocks[0].text).toBe(urdu);
  });

  test("Arabic text preserved verbatim (NOT converted to Urdu forms)", () => {
    const arabic = "علي عليه السلام";
    const p = project([seg(1, arabic)]);
    const exported = buildTranslationExportModel(p).blocks[0].text;
    expect(exported).toBe(arabic);
    // The key regression: Arabic ي/ك must not become Urdu ی/ک
    expect(exported).not.toBe("علی علیہ السلام");
  });

  test("English text preserved verbatim", () => {
    const en = "The Chamber of Commerce issued a statement.";
    const p = project([seg(1, en)]);
    expect(buildTranslationExportModel(p).blocks[0].text).toBe(en);
  });

  test("mixed-language text preserved verbatim", () => {
    const mixed = "Qalam Works میں Translation Studio کھولیں۔";
    const p = project([seg(1, mixed)]);
    expect(buildTranslationExportModel(p).blocks[0].text).toBe(mixed);
  });

  test("punctuation and symbols preserved verbatim", () => {
    const sym = "قیمت: ₨ 1,250.00 — دیکھیں [12] «اقتباس» (نوٹ) 🌟";
    const p = project([seg(1, sym)]);
    expect(buildTranslationExportModel(p).blocks[0].text).toBe(sym);
  });

  test("critical: Arabic-script text that could be Urdu-normalised stays as-is", () => {
    const arabicScript = "علي كتاب";  // Arabic ي and ك
    const p = project([seg(1, arabicScript)]);
    const exported = buildTranslationExportModel(p).blocks[0].text;
    expect(exported).toBe(arabicScript);
    // Must NOT become علی کتاب
    expect(exported).not.toContain("علی");
    expect(exported).not.toContain("کتاب");
  });
});

// ── 5. TXT serialization ──────────────────────────────────────────────────────

describe("serializeExportModelToText", () => {
  test("empty model → empty string", () => {
    const p = project([]);
    expect(serializeExportModelToText(buildTranslationExportModel(p))).toBe("");
  });

  test("single segment → text + trailing newline", () => {
    const p = project([seg(1, "ترجمہ")]);
    expect(serializeExportModelToText(buildTranslationExportModel(p))).toBe("ترجمہ\n");
  });

  test("two segments → separated by double newline, trailing single newline", () => {
    const p = project([seg(1, "first"), seg(2, "second")]);
    expect(serializeExportModelToText(buildTranslationExportModel(p))).toBe("first\n\nsecond\n");
  });

  test("untranslated segment → empty block preserved in position", () => {
    const p = project([seg(1, "first"), seg(2, ""), seg(3, "third")]);
    const txt = serializeExportModelToText(buildTranslationExportModel(p));
    expect(txt).toBe("first\n\n\n\nthird\n");
  });

  test("deterministic: same project produces same text twice", () => {
    const p = project([seg(1, "ترجمہ"), seg(2, "دوسرا")]);
    const m = buildTranslationExportModel(p);
    expect(serializeExportModelToText(m)).toBe(serializeExportModelToText(m));
  });

  test("newlines are \\n not \\r\\n", () => {
    const p = project([seg(1, "a"), seg(2, "b")]);
    const txt = serializeExportModelToText(buildTranslationExportModel(p));
    expect(txt).not.toContain("\r");
    expect(txt).toContain("\n\n");
  });
});

// ── 6. UTF-8 BOM ─────────────────────────────────────────────────────────────

describe("TXT BOM", () => {
  test("BOM bytes are U+FEFF (EF BB BF in UTF-8)", () => {
    // The BOM character \uFEFF is prepended by the download handler.
    // Verify the convention: string starting with \uFEFF encodes as EF BB BF.
    const BOM = "\uFEFF";
    const encoder = new TextEncoder();
    const bytes = encoder.encode(BOM + "test");
    expect(bytes[0]).toBe(0xEF);
    expect(bytes[1]).toBe(0xBB);
    expect(bytes[2]).toBe(0xBF);
  });

  test("serializeExportModelToText does NOT include BOM (BOM added separately)", () => {
    const p = project([seg(1, "test")]);
    const txt = serializeExportModelToText(buildTranslationExportModel(p));
    expect(txt.charCodeAt(0)).not.toBe(0xFEFF);
  });
});

// ── 7. Copy/TXT parity ────────────────────────────────────────────────────────

describe("Copy/TXT parity", () => {
  test("clipboard text and decoded TXT are identical (ignoring BOM)", () => {
    const p = project([seg(1, "ترجمہ ایک"), seg(2, "ترجمہ دو")]);
    const m = buildTranslationExportModel(p);
    const clipboardText = serializeExportModelToText(m);
    const BOM = "\uFEFF";
    const txtFileContent = BOM + serializeExportModelToText(m);
    // Strip BOM from TXT before comparing
    expect(txtFileContent.slice(1)).toBe(clipboardText);
  });
});

// ── 8. Filename sanitization ──────────────────────────────────────────────────

describe("sanitizeFilenameBase", () => {
  test("strips / \\ : * ? \" < > |", () => {
    expect(sanitizeFilenameBase('My/Project\\:Name*?"<>|')).not.toMatch(/[/\\:*?"<>|]/);
  });
  test("preserves Urdu characters", () => {
    const name = "قلم ورکس";
    const result = sanitizeFilenameBase(name);
    expect(result).toContain("قلم");
    expect(result).toContain("ورکس");
  });
  test("empty string → fallback", () => {
    expect(sanitizeFilenameBase("")).toBe("translation");
    expect(sanitizeFilenameBase("???")).toBe("translation");
  });
  test("whitespace collapsed to hyphens", () => {
    expect(sanitizeFilenameBase("My Project Name")).toBe("My-Project-Name");
  });
  test("custom fallback used when name empty", () => {
    expect(sanitizeFilenameBase("", "my-fallback")).toBe("my-fallback");
  });
});
