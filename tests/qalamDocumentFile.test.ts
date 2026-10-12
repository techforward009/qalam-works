import { describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import { createDocumentStudioExtensions } from "../app/tools/document-studio/utils/documentSchema";
import { defaultDocumentSettings, parseDocumentSettings } from "../app/tools/document-studio/utils/documentSettings";
import { createMemoryDocumentLibrary, normalizeDocumentRecord } from "../app/tools/document-studio/utils/documentLibrary";
import { allMenuActionIds } from "../app/tools/document-studio/utils/documentMenus";
import {
  buildQalamDocumentFile,
  parseQalamDocument,
  qalamDocumentFilename,
  qalamReplaceConfirmMessage,
  serializeQalamDocument,
} from "../app/tools/document-studio/utils/qalamDocumentFile";
import type { DocNode } from "../app/tools/document-studio/utils/extractPlainText";

const QURAN = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ ۝١ ۚ";

const source: DocNode = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { dir: "rtl", level: 2, lineHeight: 1.5, spaceBeforePt: 8, spaceAfterPt: 4 },
      content: [
        {
          type: "text",
          text: QURAN,
          marks: [{ type: "textStyle", attrs: { fontFamily: "Digital Khatt Indo-Pak" } }],
        },
      ],
    },
    {
      type: "paragraph",
      attrs: { dir: "rtl", lineHeight: 1.8, spaceBeforePt: 6, spaceAfterPt: 10, firstLineIndentMm: 7.5 },
      content: [
        { type: "text", text: "الوی ", marks: [{ type: "textStyle", attrs: { fontFamily: "Alvi Nastaleeq" } }] },
        { type: "text", text: "جمیل ", marks: [{ type: "textStyle", attrs: { fontFamily: "Jameel Noori Nastaleeq", fontSize: "18pt" } }, { type: "bold" }] },
        { type: "text", text: "گلزار ", marks: [{ type: "textStyle", attrs: { fontFamily: "Gulzar" } }] },
        { type: "text", text: "نستعلیق ", marks: [{ type: "textStyle", attrs: { fontFamily: "Noto Nastaliq Urdu" } }] },
        { type: "text", text: "نسخ", marks: [{ type: "textStyle", attrs: { fontFamily: "Noto Naskh Arabic" } }] },
      ],
    },
  ],
};

function editorJson(content: DocNode): DocNode {
  const editor = new Editor({ extensions: createDocumentStudioExtensions(), content });
  try {
    return editor.getJSON() as DocNode;
  } finally {
    editor.destroy();
  }
}

function settings() {
  return parseDocumentSettings({
    ...defaultDocumentSettings(),
    presetId: "academic-paper",
    page: {
      size: "a5",
      orientation: "landscape",
      margins: { preset: "custom", topMm: 18, bottomMm: 16, startMm: 20, endMm: 14 },
    },
    typography: {
      bodyFontSizePt: 16,
      lineHeight: 1.8,
      paragraphBeforePt: 4,
      paragraphAfterPt: 10,
      firstLineIndentMm: 7.5,
      defaultRtlFontId: "digital-khatt-indo-pak",
      defaultLtrFontId: "inter",
    },
    headerFooter: {
      headerEnabled: true,
      headerMode: "custom",
      headerText: "قلم ورکس",
      footerEnabled: false,
      footerText: "صفحہ",
      pageNumbers: "current-total",
    },
  });
}

describe("qalam document backup", () => {
  it("round-trips content, font marks, Quranic text, paragraph formatting, and settings", async () => {
    const content = editorJson(source);
    const documentSettings = settings();
    const file = buildQalamDocumentFile({
      title: "  قرآن اور اردو  ",
      content,
      documentSettings,
    });
    const parsed = parseQalamDocument(serializeQalamDocument(file));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    expect(parsed.document.title).toBe("قرآن اور اردو");
    expect(parsed.document.schemaVersion).toBe(1);
    expect(parsed.document.format).toBe("qalam-document");
    expect(parsed.document.documentSettings).toEqual(documentSettings);
    expect(parsed.document.content).toEqual(content);
    expect(JSON.stringify(parsed.document.content)).toContain(QURAN);
    expect(JSON.stringify(parsed.document.content)).toContain("Digital Khatt Indo-Pak");
    expect(JSON.stringify(parsed.document.content)).toContain("Alvi Nastaleeq");
    expect(JSON.stringify(parsed.document.content)).toContain("Jameel Noori Nastaleeq");
    expect(JSON.stringify(parsed.document.content)).toContain("Gulzar");
    expect(JSON.stringify(parsed.document.content)).toContain("Noto Nastaliq Urdu");
    expect(JSON.stringify(parsed.document.content)).toContain("Noto Naskh Arabic");

    const reloaded = editorJson(parsed.document.content);
    expect(reloaded).toEqual(content);

    const library = createMemoryDocumentLibrary();
    const saved = await library.createDocument({
      title: parsed.document.title,
      content: parsed.document.content,
      documentSettings: parsed.document.documentSettings,
    });
    const loaded = await library.getDocument(saved.id);
    expect(loaded?.content).toEqual(content);
    expect(loaded?.documentSettings).toEqual(documentSettings);
    expect(loaded?.schemaVersion).toBe(1);
  });

  it("rejects invalid files and does not coerce settings that would change", () => {
    expect(parseQalamDocument("not json").ok).toBe(false);
    expect(parseQalamDocument(JSON.stringify({ glossary: [] })).ok).toBe(false);
    expect(parseQalamDocument(JSON.stringify({ format: "qalam-document", schemaVersion: 2 })).ok).toBe(false);

    const broken = buildQalamDocumentFile({
      title: "Test",
      content: editorJson(source),
      documentSettings: settings(),
    });
    const raw = JSON.parse(serializeQalamDocument(broken)) as { documentSettings: { page: { margins: { topMm: number } } } };
    raw.documentSettings.page.margins.topMm = 999;
    const rejected = parseQalamDocument(JSON.stringify(raw));
    expect(rejected.ok).toBe(false);
  });

  it("asks before replacing the open document and keeps TXT DOCX PDF actions", () => {
    const message = qalamReplaceConfirmMessage("قرآن اور اردو");
    expect(message).toContain("قرآن اور اردو");
    expect(message).toContain("Cancel leaves the current document unchanged");
    expect(message).toContain("منسوخ کرنے سے موجودہ دستاویز نہیں بدلے گی");
    expect(qalamDocumentFilename("قرآن: اردو")).toBe("قرآن اردو.qalam");
    const ids = allMenuActionIds();
    expect(ids).toContain("file.saveQalam");
    expect(ids).toContain("file.openQalam");
    expect(ids).toContain("file.downloadTxt");
    expect(ids).toContain("file.downloadDocx");
    expect(ids).toContain("file.downloadPdf");
  });

  it("still accepts an existing library record that is not a .qalam file", () => {
    const legacy = {
      id: "doc-old",
      title: "پرانا مسودہ",
      content: source,
      documentSettings: defaultDocumentSettings(),
      createdAt: 10,
      updatedAt: 20,
      schemaVersion: 1 as const,
    };
    expect(parseQalamDocument(JSON.stringify(legacy)).ok).toBe(false);
    const normalized = normalizeDocumentRecord(legacy);
    expect(normalized?.content).toEqual(source);
    expect(normalized?.title).toBe("پرانا مسودہ");
    expect(normalized?.documentSettings.typography.defaultRtlFontId).toBe("noto-nastaliq-urdu");
  });
});
