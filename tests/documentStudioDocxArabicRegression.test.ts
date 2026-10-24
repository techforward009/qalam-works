import { describe, expect, test } from "vitest";
import JSZip from "jszip";
import { Packer } from "docx";
import { createDocxDocument } from "../app/tools/document-studio/utils/buildDocxDocument";
import { defaultDocumentSettings } from "../app/tools/document-studio/utils/documentSettings";
import type { DocNode } from "../app/tools/document-studio/utils/extractPlainText";

function docWith(content: DocNode[]): DocNode {
  return { type: "doc", content };
}

async function exportXml(content: DocNode[]): Promise<string> {
  const settings = defaultDocumentSettings();
  settings.headerFooter.headerEnabled = false;
  settings.headerFooter.footerEnabled = false;
  const zipped = await Packer.toBuffer(createDocxDocument(docWith(content), "rtl", settings));
  const zip = await JSZip.loadAsync(zipped);
  const file = zip.file("word/document.xml");
  if (!file) throw new Error("Missing document.xml");
  return file.async("text");
}

function paragraphs(xml: string): string[] {
  const body = xml.split("<w:body>")[1]?.split("<w:sectPr")[0] ?? "";
  return [...body.matchAll(/<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g)].map((m) => m[1]);
}

function textInParagraph(xml: string): string {
  return [...xml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map((m) => m[1]).join("");
}

const digitalMark = [{ type: "textStyle", attrs: { fontFamily: '"Digital Khatt Indo-Pak"', fontSize: "16pt" } }];
const amiriMark = [{ type: "textStyle", attrs: { fontFamily: "Amiri", fontSize: "24pt" } }];
const alviMark = [{ type: "textStyle", attrs: { fontFamily: "Alvi Nastaleeq", fontSize: "15pt" } }];

describe("Document Studio DOCX Arabic/Urdu Word regression", () => {
  test("long vowelled Arabic hadith keeps low-kashida justification, Unicode, and three styled hard breaks", async () => {
    const sentence = "هٰذَا نَصٌّ اِخْتِبَارِيٌّ مُشَكَّلٌ لِفَحْصِ الْحُرُوفِ وَعَلَامَاتِ الْوَقْفِ وَالْمَسَافَاتِ وَتَنْسِيقِ السُّطُورِ الْعَرَبِيَّةِ. ";
    const hadith = sentence.repeat(20);
    expect(hadith.length).toBeGreaterThan(1500);
    const xml = await exportXml([{
      type: "paragraph", attrs: { dir: "rtl", textAlign: "justify", lineHeight: 2 },
      content: [
        { type: "hardBreak", marks: digitalMark },
        { type: "text", text: hadith, marks: digitalMark },
        { type: "hardBreak", marks: digitalMark },
        { type: "hardBreak", marks: digitalMark },
      ],
    }]);
    const p = paragraphs(xml)[0];
    expect(p).toContain('w:jc w:val="lowKashida"');
    expect(p).toContain('w:line="640"');
    expect(p).toContain('w:lineRule="exact"');
    expect(p).toContain('w:cs="Digital Khatt Indo-Pak"');
    expect(textInParagraph(p)).toBe(hadith);
    expect((p.match(/<w:br\s*\/>/g) ?? []).length).toBe(3);
    expect((p.match(/<w:szCs w:val="32"\/>/g) ?? []).length).toBeGreaterThanOrEqual(4);
    expect((p.match(/<w:rtl\s*\/>/g) ?? []).length).toBeGreaterThanOrEqual(4);
    expect(p).not.toContain("<w:pageBreakBefore");
  });

  test("the saved empty paragraphs around an Amiri salam remain distinct Word paragraphs", async () => {
    const salam = "السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللّٰهِ";
    const xml = await exportXml([
      { type: "paragraph", attrs: { dir: "rtl" }, content: [{ type: "text", text: "اردو متن", marks: alviMark }] },
      { type: "paragraph", attrs: { dir: "rtl" }, content: [] },
      { type: "paragraph", attrs: { dir: "rtl" }, content: [] },
      { type: "paragraph", attrs: { dir: "rtl", textAlign: "right" }, content: [{ type: "text", text: salam, marks: amiriMark }] },
      { type: "paragraph", attrs: { dir: "rtl" }, content: [] },
      { type: "paragraph", attrs: { dir: "rtl" }, content: [{ type: "text", text: "حَدِيثٌ", marks: digitalMark }] },
    ]);
    const p = paragraphs(xml);
    expect(p).toHaveLength(6);
    expect([1, 2, 4].map((i) => textInParagraph(p[i]))).toEqual(["", "", ""]);
    expect(textInParagraph(p[3])).toBe(salam);
    expect(p[3]).toContain('w:cs="Amiri"');
    expect(p[3]).toContain('w:szCs w:val="48"');
    expect(p[3]).toContain("<w:bidi");
    expect(p[3]).toContain("<w:rtl");
    expect(p[3]).toContain('w:jc w:val="right"');
  });

  test("mixed Urdu and Arabic justified text does not switch an Urdu paragraph to Arabic kashida", async () => {
    const urdu = "یہ اردو عبارت ہے، اسے اپنی ترتیب میں رہنا چاہیے۔ ";
    const arabic = "قَالَ رَسُولُ اللّٰهِ ﷺ";
    const xml = await exportXml([{
      type: "paragraph", attrs: { dir: "rtl", textAlign: "justify" },
      content: [
        { type: "text", text: urdu.repeat(6), marks: alviMark },
        { type: "text", text: arabic, marks: amiriMark },
      ],
    }]);
    const p = paragraphs(xml)[0];
    expect(p).toContain('w:jc w:val="both"');
    expect(p).not.toContain("lowKashida");
    expect(p).toContain('w:cs="Mehr Nastaliq Web"');
    expect(p).toContain('w:cs="Amiri"');
    expect(textInParagraph(p)).toBe(urdu.repeat(6) + arabic);
  });

  test("heading and explicit page break preserve page transitions without adding implicit page breaks", async () => {
    const xml = await exportXml([
      { type: "heading", attrs: { level: 2, dir: "rtl" }, content: [{ type: "text", text: "عنوان", marks: amiriMark }] },
      { type: "paragraph", attrs: { dir: "rtl" }, content: [{ type: "text", text: "پہلا صفحہ" }] },
      { type: "pageBreak" },
      { type: "paragraph", attrs: { dir: "rtl" }, content: [{ type: "text", text: "دوسرا صفحہ" }] },
    ]);
    expect(xml).toContain('w:pStyle w:val="Heading2"');
    expect(xml).toContain("پہلا صفحہ");
    expect(xml).toContain("دوسرا صفحہ");
    expect((xml.match(/<w:br w:type="page"\s*\/>/g) ?? []).length).toBe(1);
    expect(xml).not.toContain("<w:pageBreakBefore");
  });

  test("Unicode combining marks, ZWNJ, and authored spaces survive without normalization", async () => {
    const text = "لّٰهُ  الْعِلْمِ\u200cوالْعَمَلِ — عربی  اور اردو";
    const xml = await exportXml([
      { type: "paragraph", attrs: { dir: "rtl" }, content: [{ type: "text", text, marks: amiriMark }] },
    ]);
    expect(textInParagraph(paragraphs(xml)[0])).toBe(text);
    expect(xml).toContain('w:cs="Amiri"');
  });
});
