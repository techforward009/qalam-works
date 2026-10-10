import JSZip from "jszip";
import { Packer } from "docx";
import { createDocxDocument } from "../app/tools/document-studio/utils/buildDocxDocument";
import { buildPdfHtml, type PdfFontFace } from "../app/tools/document-studio/utils/buildPdfHtml";
import { defaultDocumentSettings } from "../app/tools/document-studio/utils/documentSettings";
import {
  editorFontFamilyStack,
  listEditorFonts,
  studioGulzarFontFaceCss,
  studioJameelFontFaceCss,
} from "../app/tools/document-studio/utils/fontRegistry";
import type { DocNode } from "../app/tools/document-studio/utils/extractPlainText";

const BIDI_CONTROLS = /[\u200E\u200F\u202A-\u202E\u2066-\u2069]/;

function face(familyName: string): PdfFontFace {
  return {
    familyName,
    regularSources: ["e30="],
    complete: true,
    declaredRegular: 1,
    declaredBold: 0,
    loadedRegular: 1,
    loadedBold: 0,
  };
}

async function documentXml(doc: DocNode, dir: "rtl" | "ltr", settings = defaultDocumentSettings()) {
  const buffer = await Packer.toBuffer(createDocxDocument(doc, dir, settings));
  const zip = await JSZip.loadAsync(buffer);
  return zip.file("word/document.xml")!.async("text");
}

describe("Document Studio typography 2A", () => {
  test("DOCX line spacing follows point size and does not use Word auto", async () => {
    const settings = defaultDocumentSettings();
    settings.typography.bodyFontSizePt = 13;
    settings.typography.lineHeight = 2;
    settings.typography.paragraphBeforePt = 4;
    settings.typography.paragraphAfterPt = 8;
    const xml = await documentXml(
      { type: "doc", content: [{ type: "paragraph", attrs: { dir: "rtl" }, content: [{ type: "text", text: "(الف) ایک سطر" }] }] },
      "rtl",
      settings,
    );
    expect(xml).toContain('w:line="520"');
    expect(xml).toContain('w:lineRule="atLeast"');
    expect(xml).not.toContain('w:lineRule="auto"');
    expect(xml).toContain('w:before="80"');
    expect(xml).toContain('w:after="160"');
    expect(xml).toContain('w:sz w:val="26"');
  });

  test("RTL brackets stay with Urdu and embedded English parentheses stay LTR", async () => {
    const source = "(الف) اردو English (123)";
    const xml = await documentXml(
      {
        type: "doc",
        content: [{
          type: "paragraph",
          attrs: { dir: "rtl", textAlign: "justify" },
          content: [{ type: "text", text: source, marks: [{ type: "textStyle", attrs: { fontFamily: "Gulzar", fontSize: "16pt" } }] }],
        }],
      },
      "rtl",
    );
    const runs = xml.match(/<w:r>[\s\S]*?<\/w:r>/g) ?? xml.match(/<w:r [\s\S]*?<\/w:r>/g) ?? [];
    const urdu = runs.find((run) => run.includes("الف"));
    const latin = runs.find((run) => run.includes("English"));
    expect(urdu).toBeTruthy();
    expect(latin).toBeTruthy();
    expect(urdu).toMatch(/<w:rtl(?:\s|\/|>)/);
    expect(urdu).toContain('w:cs="Gulzar"');
    expect(urdu).toContain('w:ascii="Gulzar"');
    expect(latin).not.toMatch(/<w:rtl(?:\s|\/|>)/);
    expect(latin).toContain('w:ascii="Inter"');
    const text = [...xml.matchAll(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g)].map((match) => match[1]).join("");
    expect(text).toBe(source);
    expect(xml).not.toMatch(BIDI_CONTROLS);
    expect(xml).toContain('w:val="both"');
    expect(xml).toContain('w:sz w:val="32"');
  });

  test("Jameel keeps its DOCX family on Arabic script", async () => {
    const xml = await documentXml(
      {
        type: "doc",
        content: [{
          type: "paragraph",
          attrs: { dir: "rtl" },
          content: [{ type: "text", text: "جمیل", marks: [{ type: "textStyle", attrs: { fontFamily: "Jameel Noori Nastaleeq" } }] }],
        }],
      },
      "rtl",
    );
    expect(xml).toContain('w:ascii="Jameel Noori Nastaleeq"');
    expect(xml).toContain('w:cs="Jameel Noori Nastaleeq"');
    expect(xml).not.toContain('w:ascii="Noto Nastaliq Urdu"');
  });

  test("PDF isolates embedded English without adding bidi controls", () => {
    const source = "(الف) اردو English (123)";
    const html = buildPdfHtml(
      {
        type: "doc",
        content: [{
          type: "paragraph",
          attrs: { dir: "rtl", textAlign: "justify", lineHeight: 1.8 },
          content: [{ type: "text", text: source, marks: [{ type: "textStyle", attrs: { fontFamily: "Gulzar", fontSize: "16pt" } }] }],
        }],
      },
      "rtl",
      { faces: [face("Gulzar"), face("Inter"), face("Noto Nastaliq Urdu")] },
      defaultDocumentSettings().typography,
    );
    expect(html.html).toContain("Gulzar");
    expect(html.html).toContain('dir="ltr"');
    expect(html.html).toContain("unicode-bidi:isolate");
    expect(html.html).toContain("English (123)");
    expect(html.html).toContain("line-height:1.8");
    expect(html.html).toContain("text-align:justify");
    expect(html.html).not.toMatch(BIDI_CONTROLS);
    expect(html.fontsUsed).toContain("Gulzar");
    expect(html.fontsUsed).toContain("Inter");
  });

  test("approved font groups and hidden choices stay unchanged", () => {
    const fonts = listEditorFonts();
    expect(fonts).toHaveLength(11);
    expect(new Set(fonts.map((font) => font.category))).toEqual(new Set(["urdu", "arabic", "persian", "latin"]));
    expect(fonts.map((font) => font.editorFamily)).toEqual(expect.arrayContaining(["Gulzar", "Jameel Noori Nastaleeq", "Noto Nastaliq Urdu", "Amiri", "Inter"]));
    for (const hidden of ["Nafees Nastaleeq", "Adobe Arabic", "Traditional Arabic", "Faiz Lahori Nastaleeq", "Al Majeed Quranic", "Asif Quranic", "Muhammadi Quranic"]) {
      expect(fonts.map((font) => font.editorFamily)).not.toContain(hidden);
    }
    expect(editorFontFamilyStack("gulzar")).toContain("Gulzar");
    expect(editorFontFamilyStack("jameel-noori-nastaleeq")).toContain("Jameel Noori Nastaleeq");
    expect(editorFontFamilyStack("noto-nastaliq-urdu")).toContain("var(--font-nastaliq)");
    expect(studioGulzarFontFaceCss()).toContain("Gulzar-Regular.woff2");
    expect(studioJameelFontFaceCss()).toContain("jameel-noori-nastaleeq-400.woff2");
  });
});
