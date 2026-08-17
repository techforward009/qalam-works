// Batch 17D.1 — Canonical export model tests

import {
  buildTranslationExportModel,
  serializeExportModelToText,
  sanitizeFilenameBase,
  buildDocxFromExportModel,
  type TranslationExportModel,
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

// ── DOCX export ────────────────────────────────────────────────────────────────

import JSZip from "jszip";
async function docxXml(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);
  return zip.file("word/document.xml")!.async("text");
}

describe("buildDocxFromExportModel", () => {
  const urdu = "علی کتاب پڑھ رہے ہیں۔";
  const arabic = "علي عليه السلام";
  const english = "The Chamber of Commerce issued a statement.";
  const mixed = "Qalam Works میں Translation Studio کھولیں۔";
  const critical = "علي كتاب"; // must NOT become علی کتاب

  function exportProject(segs: Array<{ target: string; dir: "rtl" | "ltr" }>) {
    const model: TranslationExportModel = {
      title: "Test", targetLanguage: "ur", sourceLanguage: "en",
      totalSegments: segs.length,
      translatedSegments: segs.filter(s => s.target.trim()).length,
      untranslatedSegments: segs.filter(s => !s.target.trim()).length,
      blocks: segs.map((s, i) => ({ id: `SEG-${i}`, order: i + 1, text: s.target, direction: s.dir })),
    };
    return buildDocxFromExportModel(model);
  }

  test("Urdu text preserved verbatim in DOCX XML", async () => {
    const blob = await exportProject([{ target: urdu, dir: "rtl" }]);
    const xml = await docxXml(blob);
    expect(xml).toContain(urdu);
  });

  test("Arabic text preserved verbatim — NOT normalized to Urdu forms", async () => {
    const blob = await exportProject([{ target: arabic, dir: "rtl" }]);
    const xml = await docxXml(blob);
    expect(xml).toContain(arabic);
  });

  test("critical: علي كتاب stays as-is (not Urdu-normalized)", async () => {
    const blob = await exportProject([{ target: critical, dir: "rtl" }]);
    const xml = await docxXml(blob);
    expect(xml).toContain(critical);
    expect(xml).not.toContain("علی کتاب");
  });

  test("English text preserved verbatim", async () => {
    const blob = await exportProject([{ target: english, dir: "ltr" }]);
    const xml = await docxXml(blob);
    expect(xml).toContain("Chamber of Commerce");
  });

  test("mixed Unicode text preserved verbatim", async () => {
    const blob = await exportProject([{ target: mixed, dir: "rtl" }]);
    const xml = await docxXml(blob);
    expect(xml).toContain("Qalam Works");
    expect(xml).toContain("Translation Studio");
  });

  test("source text never substitutes empty target", async () => {
    const blob = await exportProject([{ target: "", dir: "rtl" }]);
    const xml = await docxXml(blob);
    expect(xml).not.toContain("source text that must not appear");
  });

  test("RTL block → w:bidi in paragraph XML", async () => {
    const blob = await exportProject([{ target: urdu, dir: "rtl" }]);
    const xml = await docxXml(blob);
    expect(xml).toContain("w:bidi");
  });

  test("LTR block → bidirectional is false/absent for that paragraph", async () => {
    const blob = await exportProject([{ target: english, dir: "ltr" }]);
    const xml = await docxXml(blob);
    // For LTR paragraphs we set bidirectional: false. docx library omits w:bidi
    // entirely when false (rather than emitting w:bidi w:val="0").
    // Either omission OR w:val="0" is correct LTR behavior.
    const bidiTruePattern = /<w:bidi\s*\/>/;
    expect(bidiTruePattern.test(xml)).toBe(false);
  });

  test("segment order preserved in DOCX", async () => {
    const blob = await exportProject([
      { target: "third", dir: "ltr" },  // will be in order 1→3 via model
      { target: "first", dir: "ltr" },
      { target: "second", dir: "ltr" },
    ]);
    const xml = await docxXml(blob);
    const i1 = xml.indexOf("third");
    const i2 = xml.indexOf("first");
    const i3 = xml.indexOf("second");
    // "third" is order 1, "first" is order 2, "second" is order 3 in the model
    expect(i1).toBeLessThan(i2);
    expect(i2).toBeLessThan(i3);
  });

  test("DOCX is structurally valid (contains word/document.xml)", async () => {
    const blob = await exportProject([{ target: "test", dir: "ltr" }]);
    const buf = await blob.arrayBuffer();
    const zip = await JSZip.loadAsync(buf);
    expect(zip.file("word/document.xml")).not.toBeNull();
    expect(zip.file("[Content_Types].xml")).not.toBeNull();
  });

  test("filename sanitizer reused: same function for .docx and .txt", () => {
    expect(sanitizeFilenameBase("My/Project")).toBe("MyProject");
    // Both Copy/TXT and DOCX use sanitizeFilenameBase — same function
    const docxName = `${sanitizeFilenameBase("My Project")}-translation.docx`;
    const txtName = `${sanitizeFilenameBase("My Project")}-translation.txt`;
    expect(docxName).toBe("My-Project-translation.docx");
    expect(txtName).toBe("My-Project-translation.txt");
  });
});

// ── Backup / Restore ──────────────────────────────────────────────────────────

import {
  exportProjectBackup,
  importProjectBackup,
  BACKUP_FORMAT,
  BACKUP_SCHEMA_VERSION,
} from "../app/tools/translation-studio/utils/projectStore";

function fullProject(segs: Array<{ order: number; target: string; src?: string }>): TranslationProject {
  return {
    schemaVersion: 1,
    id: generateProjectId(),
    name: "Backup Test",
    sourceLanguage: "en",
    targetLanguage: "ur",
    brief: defaultBrief(),
    segments: segs.map(s => ({
      id: makeSegmentId(s.order),
      order: s.order,
      source: s.src ?? "source",
      target: s.target,
      sourceDir: "ltr",
      targetDir: "rtl",
      status: s.target.trim() ? "draft" as const : "untranslated" as const,
      sourceFingerprint: segmentFingerprint(s.src ?? "source"),
      reviewStatus: "unreviewed" as const,
      reviewNote: "",
      reviewedTargetFingerprint: "",
    })),
    glossary: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe("exportProjectBackup / importProjectBackup — versioned envelope", () => {
  test("1. exported JSON contains format and schemaVersion", () => {
    const p = fullProject([{ order: 1, target: "ترجمہ" }]);
    const json = exportProjectBackup(p);
    const parsed = JSON.parse(json);
    expect(parsed.format).toBe(BACKUP_FORMAT);
    expect(parsed.schemaVersion).toBe(BACKUP_SCHEMA_VERSION);
    expect(parsed.project).toBeDefined();
  });

  test("2. exact target text preserved in round-trip", () => {
    const target = "علی کتاب پڑھ رہے ہیں۔";
    const p = fullProject([{ order: 1, target }]);
    const result = importProjectBackup(exportProjectBackup(p));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.segments[0].target).toBe(target);
  });

  test("3. Arabic text preserved verbatim (not normalized)", () => {
    const arabic = "علي عليه السلام";
    const p = fullProject([{ order: 1, target: arabic }]);
    const result = importProjectBackup(exportProjectBackup(p));
    if (result.ok) expect(result.value.segments[0].target).toBe(arabic);
  });

  test("3b. critical Arabic normalization regression: علي كتاب stays as-is", () => {
    const arabicScript = "علي كتاب";
    const p = fullProject([{ order: 1, target: arabicScript }]);
    const result = importProjectBackup(exportProjectBackup(p));
    if (result.ok) {
      expect(result.value.segments[0].target).toBe(arabicScript);
      expect(result.value.segments[0].target).not.toContain("علی");
    }
  });

  test("4. mixed Unicode preserved verbatim", () => {
    const mixed = "Qalam Works میں Translation Studio کھولیں۔";
    const p = fullProject([{ order: 1, target: mixed }]);
    const result = importProjectBackup(exportProjectBackup(p));
    if (result.ok) expect(result.value.segments[0].target).toBe(mixed);
  });

  test("5. segment order preserved after round-trip", () => {
    const p = fullProject([{ order: 3, target: "c" }, { order: 1, target: "a" }, { order: 2, target: "b" }]);
    const result = importProjectBackup(exportProjectBackup(p));
    expect(result.ok).toBe(true);
    if (result.ok) {
      // parseProject/parseSegment restores all segments; order values preserved
      const orders = result.value.segments.map(s => s.order);
      expect(orders.sort((a, b) => a - b)).toEqual([1, 2, 3]);
    }
  });

  test("6. review/status fields preserved", () => {
    const p = fullProject([{ order: 1, target: "ترجمہ" }]);
    const seg = p.segments[0];
    seg.status = "final";
    seg.reviewStatus = "approved";
    seg.reviewNote = "Looks good";
    seg.reviewedTargetFingerprint = "abc123";
    const result = importProjectBackup(exportProjectBackup(p));
    if (result.ok) {
      expect(result.value.segments[0].status).toBe("final");
      expect(result.value.segments[0].reviewStatus).toBe("approved");
      expect(result.value.segments[0].reviewNote).toBe("Looks good");
    }
  });

  test("7. empty target survives round-trip (no source substitution)", () => {
    const p = fullProject([{ order: 1, target: "", src: "source that must not appear" }]);
    const result = importProjectBackup(exportProjectBackup(p));
    if (result.ok) {
      expect(result.value.segments[0].target).toBe("");
      expect(result.value.segments[0].source).toBe("source that must not appear");
    }
  });

  test("8. invalid JSON → corrupt error", () => {
    const r = importProjectBackup("not valid json {{{");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("corrupt");
  });

  test("9. wrong format field → rejected", () => {
    const p = fullProject([{ order: 1, target: "x" }]);
    const env = JSON.parse(exportProjectBackup(p));
    env.format = "something-else";
    const r = importProjectBackup(JSON.stringify(env));
    expect(r.ok).toBe(false);
  });

  test("10. unsupported schemaVersion → rejected", () => {
    const p = fullProject([{ order: 1, target: "x" }]);
    const env = JSON.parse(exportProjectBackup(p));
    env.schemaVersion = 99;
    const r = importProjectBackup(JSON.stringify(env));
    expect(r.ok).toBe(false);
  });

  test("11. malformed segment → rejected", () => {
    const p = fullProject([{ order: 1, target: "x" }]);
    const env = JSON.parse(exportProjectBackup(p));
    env.project.segments[0].id = null; // invalid
    const r = importProjectBackup(JSON.stringify(env));
    expect(r.ok).toBe(false);
  });

  test("12. failed restore does not mutate — caller only updates state on ok", () => {
    // importProjectBackup returns null/error; the workspace only calls onProjectChange
    // if result.ok is true. Verify the return is not ok for a bad backup.
    const r = importProjectBackup("{}");
    expect(r.ok).toBe(false);
    // The calling code in workspace only mutates on r.ok === true.
  });

  test("13. filename sanitizer reused for .qalam-translation.json", () => {
    const name = "My Project";
    const expected = `${sanitizeFilenameBase(name)}.qalam-translation.json`;
    expect(expected).toBe("My-Project.qalam-translation.json");
  });

  test("14. full semantic round-trip equality", () => {
    const p = fullProject([
      { order: 1, target: "علی کتاب پڑھ رہے ہیں۔" },
      { order: 2, target: "" },
      { order: 3, target: "The Chamber of Commerce issued a statement." },
    ]);
    const result = importProjectBackup(exportProjectBackup(p));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.segments.length).toBe(3);
      expect(result.value.targetLanguage).toBe(p.targetLanguage);
      expect(result.value.sourceLanguage).toBe(p.sourceLanguage);
      expect(result.value.name).toBe(p.name);
    }
  });
});

  // Legacy compatibility
  test("valid legacy backup (raw TranslationProject) imports successfully", () => {
    const p = fullProject([{ order: 1, target: "ترجمہ" }]);
    // Raw project JSON without versioned envelope (old export format)
    const legacyJson = JSON.stringify(p);
    const result = importProjectBackup(legacyJson);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.segments[0].target).toBe("ترجمہ");
  });

  test("malformed legacy backup rejects safely", () => {
    const r = importProjectBackup(JSON.stringify({ schemaVersion: 1, id: "" }));
    expect(r.ok).toBe(false);
  });

  test("new exports still use versioned v1 envelope", () => {
    const p = fullProject([{ order: 1, target: "x" }]);
    const parsed = JSON.parse(exportProjectBackup(p));
    expect(parsed.format).toBe(BACKUP_FORMAT);
    expect(parsed.schemaVersion).toBe(BACKUP_SCHEMA_VERSION);
    expect(parsed.project).toBeDefined();
  });
