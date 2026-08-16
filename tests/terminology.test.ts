// Batch 17B.1 — terminology, TM, and glossary tests

import {
  containsTerm,
  findTerminologyFindings,
  isDuplicateTerm,
  findExactMemorySuggestion,
  hasRepeatedSourceConflict,
} from "../app/tools/translation-studio/utils/terminology";
import { parseProject, defaultBrief, type GlossaryEntry, type TranslationProject, type TranslationSegment } from "../app/tools/translation-studio/utils/translationTypes";
import { makeSegmentId, segmentFingerprint } from "../app/tools/translation-studio/utils/segmentation";
import { generateProjectId } from "../app/tools/translation-studio/utils/projectId";

function makeSeg(overrides: Partial<TranslationSegment> & { source: string; id?: string; order?: number }): TranslationSegment {
  const { source, id, order, ...rest } = overrides;
  return {
    id: id ?? makeSegmentId(1),
    order: order ?? 1,
    source,
    target: "",
    sourceDir: "ltr",
    targetDir: "ltr",
    status: "untranslated",
    sourceFingerprint: segmentFingerprint(source),
    ...rest,
  };
}

function makeProject(overrides: Partial<TranslationProject> = {}): TranslationProject {
  return {
    schemaVersion: 1,
    id: generateProjectId(),
    name: "Test",
    sourceLanguage: "en",
    targetLanguage: "ur",
    brief: defaultBrief(),
    segments: [],
    glossary: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ── Old-project backward compatibility ────────────────────────────────────────

describe("old v1 project without glossary field", () => {
  test("parseProject succeeds and returns glossary: []", () => {
    const raw = {
      schemaVersion: 1, id: "old-id", name: "Old", sourceLanguage: "ur", targetLanguage: "en",
      brief: { approach: "faithful", audience: "general", additionalInstructions: "" },
      segments: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      // NO glossary field
    };
    const p = parseProject(raw);
    expect(p).not.toBeNull();
    expect(p?.glossary).toEqual([]);
  });
});

// ── containsTerm — Unicode-aware word boundaries ───────────────────────────────

describe("containsTerm — boundary checks", () => {
  test("English: 'art' found in 'art'", () => expect(containsTerm("art", "art")).toBe(true));
  test("English: 'art' NOT found in 'article'", () => expect(containsTerm("article", "art")).toBe(false));
  test("English: 'art' NOT found in 'start'", () => expect(containsTerm("start", "art")).toBe(false));
  test("English: case-insensitive by default", () => expect(containsTerm("Art is important", "art")).toBe(true));
  test("English: 'publication' found in sentence", () => expect(containsTerm("The publication is ready.", "publication")).toBe(true));
  test("Urdu term found in Urdu text", () => expect(containsTerm("یہ اشاعت تیار ہے", "اشاعت")).toBe(true));
  test("Urdu term does not match longer word", () => expect(containsTerm("اشاعتیں بہت ہیں", "اشاعت")).toBe(false));
  test("Arabic term found", () => expect(containsTerm("هذا النص مناسب", "النص")).toBe(true));
  test("Persian term found", () => expect(containsTerm("این متن فارسی است", "متن")).toBe(true));
  test("does not mutate input (source unchanged)", () => {
    const src = "The art of translation";
    containsTerm(src, "art");
    expect(src).toBe("The art of translation");
  });
});

// ── Terminology findings ──────────────────────────────────────────────────────

const entry1: GlossaryEntry = { id: "g1", sourceTerm: "publication", targetTerm: "اشاعت" };
const entry2: GlossaryEntry = { id: "g2", sourceTerm: "source text", targetTerm: "ماخذ متن" };

describe("findTerminologyFindings", () => {
  test("empty target → no findings", () => {
    expect(findTerminologyFindings("The publication is ready.", "", [entry1])).toHaveLength(0);
  });
  test("source term present, approved target missing → warning", () => {
    const findings = findTerminologyFindings("The publication is ready.", "یہ کتاب تیار ہے۔", [entry1]);
    expect(findings).toHaveLength(1);
    expect(findings[0].entry.id).toBe("g1");
  });
  test("approved target present → no warning", () => {
    expect(findTerminologyFindings("The publication is ready.", "یہ اشاعت تیار ہے۔", [entry1])).toHaveLength(0);
  });
  test("source term not in source → no finding", () => {
    expect(findTerminologyFindings("This is a sentence.", "یہ جملہ ہے۔", [entry1])).toHaveLength(0);
  });
  test("multiple glossary matches → multiple findings", () => {
    const findings = findTerminologyFindings("The publication and source text are ready.", "یہ تیار ہے۔", [entry1, entry2]);
    expect(findings).toHaveLength(2);
  });
});

// ── Duplicate term detection ──────────────────────────────────────────────────

describe("isDuplicateTerm", () => {
  const glossary: GlossaryEntry[] = [{ id: "g1", sourceTerm: "publication", targetTerm: "اشاعت" }];
  test("exact English duplicate detected", () => expect(isDuplicateTerm(glossary, "publication")).toBe(true));
  test("case-insensitive English duplicate", () => expect(isDuplicateTerm(glossary, "Publication")).toBe(true));
  test("non-duplicate returns false", () => expect(isDuplicateTerm(glossary, "source text")).toBe(false));
  test("excludeId skips the entry being edited", () => expect(isDuplicateTerm(glossary, "publication", "g1")).toBe(false));
});

// ── Exact TM suggestions ──────────────────────────────────────────────────────

describe("findExactMemorySuggestion", () => {
  test("A: Final seg suggests to empty same-source seg (earlier segment)", () => {
    const s1 = makeSeg({ id: "SEG-0001", order: 1, source: "Translation must remain faithful.", target: "ترجمہ اصل متن کے وفادار رہنا چاہیے۔", status: "final", targetDir: "rtl" });
    const s2 = makeSeg({ id: "SEG-0002", order: 2, source: "Translation must remain faithful." });
    const sug = findExactMemorySuggestion(s2, [s1, s2]);
    expect(sug).not.toBeNull();
    expect(sug?.target).toBe(s1.target);
    expect(sug?.status).toBe("final");
  });

  test("B: nearest earlier Final wins over oldest Final", () => {
    // SEG-0001 (Final A), SEG-0003 (Final B), SEG-0004 (current)
    // Expected: SEG-0003 suggested, not SEG-0001
    const s1 = makeSeg({ id: "SEG-0001", order: 1, source: "Test.", target: "A", status: "final" });
    const s3 = makeSeg({ id: "SEG-0003", order: 3, source: "Test.", target: "B", status: "final" });
    const cur = makeSeg({ id: "SEG-0004", order: 4, source: "Test." });
    const sug = findExactMemorySuggestion(cur, [s1, s3, cur]);
    expect(sug?.sourceSegmentId).toBe("SEG-0003");
    expect(sug?.target).toBe("B");
  });

  test("C: Final preferred over nearer Draft", () => {
    const draft = makeSeg({ id: "SEG-0002", order: 2, source: "Test.", target: "draft-tr", status: "draft" });
    const final = makeSeg({ id: "SEG-0001", order: 1, source: "Test.", target: "final-tr", status: "final" });
    const query = makeSeg({ id: "SEG-0003", order: 3, source: "Test." });
    const sug = findExactMemorySuggestion(query, [draft, final, query]);
    expect(sug?.status).toBe("final");
    expect(sug?.target).toBe("final-tr");
  });

  test("D: No matching source → null", () => {
    const s1 = makeSeg({ id: "SEG-0001", order: 1, source: "Different.", target: "X", status: "draft" });
    const s2 = makeSeg({ id: "SEG-0002", order: 2, source: "Unique source." });
    expect(findExactMemorySuggestion(s2, [s1, s2])).toBeNull();
  });

  test("E: future segment with same source is NEVER suggested", () => {
    const cur = makeSeg({ id: "SEG-0004", order: 4, source: "Test." });
    const future = makeSeg({ id: "SEG-0005", order: 5, source: "Test.", target: "future-tr", status: "final" });
    expect(findExactMemorySuggestion(cur, [cur, future])).toBeNull();
  });

  test("F: no earlier eligible target → null", () => {
    const s1 = makeSeg({ id: "SEG-0001", order: 1, source: "Match.", target: "", status: "untranslated" });
    const s2 = makeSeg({ id: "SEG-0002", order: 2, source: "Match." });
    expect(findExactMemorySuggestion(s2, [s1, s2])).toBeNull();
  });

  test("G: function returns suggestion even when target already filled (UI decides not to show)", () => {
    const s1 = makeSeg({ id: "SEG-0001", order: 1, source: "Same.", target: "A", status: "final" });
    const s2 = makeSeg({ id: "SEG-0002", order: 2, source: "Same.", target: "B", status: "draft" });
    expect(findExactMemorySuggestion(s2, [s1, s2])).not.toBeNull();
  });
});

// ── Repeated-source conflict ──────────────────────────────────────────────────

describe("hasRepeatedSourceConflict", () => {
  test("E: same source, distinct targets → conflict", () => {
    const s1 = makeSeg({ id: "SEG-0001", order: 1, source: "Repeat.", target: "A", status: "final" });
    const s2 = makeSeg({ id: "SEG-0002", order: 2, source: "Repeat.", target: "B", status: "draft" });
    expect(hasRepeatedSourceConflict(s1, [s1, s2])).toBe(true);
    expect(hasRepeatedSourceConflict(s2, [s1, s2])).toBe(true);
  });

  test("F: same source, identical targets → no conflict", () => {
    const s1 = makeSeg({ id: "SEG-0001", order: 1, source: "Repeat.", target: "ترجمہ", status: "final" });
    const s2 = makeSeg({ id: "SEG-0002", order: 2, source: "Repeat.", target: "ترجمہ", status: "final" });
    expect(hasRepeatedSourceConflict(s1, [s1, s2])).toBe(false);
  });

  test("no conflict when only one segment has the source", () => {
    const s1 = makeSeg({ id: "SEG-0001", order: 1, source: "Unique.", target: "X", status: "draft" });
    expect(hasRepeatedSourceConflict(s1, [s1])).toBe(false);
  });
});
