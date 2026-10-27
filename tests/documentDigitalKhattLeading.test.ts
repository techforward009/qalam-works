import { expect, test } from "vitest";
import { blockLeadingPt } from "../app/tools/document-studio/utils/autoLeading";
import { buildPdfHtml } from "../app/tools/document-studio/utils/buildPdfHtml";
import { defaultDocumentSettings } from "../app/tools/document-studio/utils/documentSettings";
import type { DocNode } from "../app/tools/document-studio/utils/extractPlainText";

test("Digital Khatt Auto pitch follows the paragraph's main font in editor and PDF", () => {
  const typography = defaultDocumentSettings().typography;
  const dk = (text: string): DocNode => ({ type: "text", text, marks: [{ type: "textStyle", attrs: { fontFamily: "Digital Khatt Indo-Pak" } }] });
  const mehr = (text: string): DocNode => ({ type: "text", text });
  const cases = [
    { name: "pure Digital Khatt", content: [dk("بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ ۝ الحمد للّٰه")], pitch: 12 * 1.9 },
    { name: "Mehr with one inline Digital Khatt word", content: [mehr("یہ مہر نستعلیق میں ایک عام اردو پیراگراف ہے۔ "), dk("اللّٰه"), mehr(" باقی عبارت بھی مہر نستعلیق میں اپنی معمول کی سطر بندی رکھتی ہے۔")], pitch: 12 * 1.65 },
    { name: "plain Mehr", content: [mehr("یہ مہر نستعلیق میں ایک عام اردو پیراگراف ہے۔ باقی عبارت بھی اپنی معمول کی سطر بندی رکھتی ہے۔")], pitch: 12 * 1.65 },
    { name: "unset English font with one Digital Khatt word", content: [mehr("This mostly English paragraph has one short Arabic word: "), dk("اللّٰه")], pitch: 12 * 1.9 },
    { name: "Arial winner with one Digital Khatt word", content: [{ type: "text", text: "This mostly English paragraph has one short Arabic word: ", marks: [{ type: "textStyle", attrs: { fontFamily: "Arial" } }] }, dk("اللّٰه")], pitch: 12 * 1.9 },
    { name: "Digital Khatt ayah symbol only", content: [dk("۝")], pitch: 12 * 1.9 },
    { name: "Digital Khatt harakat only", content: [dk("َُِّٰ")], pitch: 12 * 1.9 },
    { name: "empty paragraph", content: [], pitch: 12 * 1.65 },
  ];
  const pitches: number[] = [];
  for (const item of cases) {
    const paragraph: DocNode = { type: "paragraph", attrs: { dir: "rtl" }, content: item.content };
    const pitch = blockLeadingPt(paragraph, "Mehr Nastaliq Web", typography, "rtl");
    pitches.push(pitch);
    expect.soft(pitch, item.name).toBeCloseTo(item.pitch, 6);
    const html = buildPdfHtml({ type: "doc", content: [paragraph] }, "rtl", { faces: [] }, typography).html;
    const pdfPitch = Number(html.match(/<p[^>]*style="[^"]*line-height:([\d.]+)pt/)?.[1]);
    expect.soft(pdfPitch, `${item.name}: PDF matches editor`).toBeCloseTo(pitch, 6);
  }
  expect(pitches[1]).toBe(pitches[2]);
});
