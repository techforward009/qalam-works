import { describe, expect, test } from "vitest";
import JSZip from "jszip";
import { Packer } from "docx";
import { createDocxDocument } from "../app/tools/document-studio/utils/buildDocxDocument";
import { listEditorFonts, resolveEditorFontFamily } from "../app/tools/document-studio/utils/fontRegistry";
import { defaultDocumentSettings } from "../app/tools/document-studio/utils/documentSettings";
import type { DocNode } from "../app/tools/document-studio/utils/extractPlainText";

const mark = (fontFamily: string, fontSize: string) =>
  [{ type: "textStyle", attrs: { fontFamily, fontSize } }];
function para(text: string, fontFamily: string, fontSize: string, attrs: Record<string, unknown> = {}): DocNode {
  return { type: "paragraph", attrs: { dir: "rtl", ...attrs }, content: [{ type: "text", text, marks: mark(fontFamily, fontSize) }] };
}
async function documentXml(doc: DocNode): Promise<string> {
  const settings = defaultDocumentSettings();
  settings.headerFooter.headerEnabled = false;
  settings.headerFooter.footerEnabled = false;
  const zip = await JSZip.loadAsync(await Packer.toBuffer(createDocxDocument(doc, "rtl", settings)));
  const file = zip.file("word/document.xml");
  if (!file) throw new Error("Missing document XML");
  return file.async("text");
}
function paragraphs(xml: string): string[] {
  const body = xml.split("<w:body>")[1]?.split("<w:sectPr")[0] ?? "";
  return [...body.matchAll(/<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g)].map(m => m[1]);
}
function textOf(pXml: string): string {
  return [...pXml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map(m => m[1]).join("");
}

const fasakh = "۴۔ فسخ العزیمہ حضرت آدمؑ سے آج تک چلا آرہا ہے اورہر دور میں اس میں تبدیلی آتی رہی ہے اور اس میں لوگوں کے شبہات داخل ہوتے رہے ہیں اوراب یہ بحث طولانی ہو گئی ہے ۔";
const theoryB = "(ب) تمام افعال انسان کے ارادے سے صادر ہوتے ہیں اور اللہ تعالیٰ کا کوئی عمل دخل نہیں ہے یہ تفویض ہے۔";
const theoryC = "(ج) الامر بین الامرین : یعنی دونوں اللہ تعالیٰ اور انسان اس میں مؤثر ہیں ،البتہ علت تامہ کے طور پر نہیں بلکہ اقتضا ء کے طور پر ان تینوں نظریات میں سےحق یہی تیسرا نظریہ ہے ۔";
const salam = "السلام علیک یا ابا صالح المہدی علیہ السلام";
const hadithStart = "1- حَدَّثَنَا عَلِيُّ بْنُ إِبْرَاهِيمَ عَنْ عَلِيِّ بْنِ إِسْحَاقَ عَنِ الْحَسَنِ بْنِ حَازِمٍ الْكَلْبِيِّ ابْنِ أُخْتِ هِشَامِ بْنِ سَالِمٍ عَنْ سُلَيْمَانَ بْنِ جَعْفَرٍ عَنْ أَبِي عَبْدِ اللَّهِ ع قَالَ قَالَ رَسُولُ اللَّهِ ص‏ مَنْ لَمْ يُحْسِنْ وَصِيَّت";
const digitalMark = mark('"Digital Khatt Indo-Pak"', "16pt");

function savedQalamExcerpt() {
  return {
    format: "qalam-document",
    content: {
      type: "doc", content: [
        para("آیات کریمہ سے چند مستفاد نکات", "Gulzar", "24pt"),
        para("متنِ اردو", '"Jameel Noori Nastaleeq", serif', "16pt"),
        para(fasakh, '"Alvi Nastaleeq"', "15pt", { textAlign: "right" }),
        para(theoryB, '"Alvi Nastaleeq"', "15pt"),
        para(theoryC, '"Alvi Nastaleeq"', "15pt"),
        { type: "paragraph", attrs: { dir: "rtl" }, content: [] },
        { type: "paragraph", attrs: { dir: "rtl" }, content: [] },
        para(salam, "Amiri", "24pt", { textAlign: "right" }),
        { type: "paragraph", attrs: { dir: "rtl" }, content: [] },
        { type: "paragraph", attrs: { dir: "rtl", textAlign: "justify", lineHeight: 2 }, content: [
          { type: "hardBreak", marks: digitalMark },
          { type: "text", text: hadithStart + " " + hadithStart.repeat(7), marks: digitalMark },
          { type: "hardBreak", marks: digitalMark }, { type: "hardBreak", marks: digitalMark },
        ] },
      ],
    } as DocNode,
    documentSettings: defaultDocumentSettings(),
  };
}

describe("DOCX source-replay regressions from supplied saved .qalam and DOCX", () => {
  test("Alvi, Gulzar, Jameel, Amiri and long Digital Khatt retain requested w:rFonts/w:szCs", async () => {
    const ps = paragraphs(await documentXml(savedQalamExcerpt().content));
    expect(ps).toHaveLength(10);
    const faces = ["Gulzar", "Jameel Noori Nastaleeq", "Alvi Nastaleeq", "Alvi Nastaleeq", "Alvi Nastaleeq", "", "", "Amiri", "", "Digital Khatt Indo-Pak"];
    faces.forEach((family, i) => {
      if (family) expect(ps[i]).toContain('w:cs="' + family + '"');
      else expect(textOf(ps[i])).toBe("");
    });
    [0, 1, 2, 3, 4, 7, 9].forEach(i => expect(ps[i]).not.toContain('w:cs="Noto Nastaliq Urdu"'));
    expect(ps[2]).toContain('w:szCs w:val="30"');
    expect(ps[7]).toContain('w:szCs w:val="48"');
    expect(ps[9]).toContain('w:szCs w:val="32"');
  });

  test("the two actual right-aligned and the two overflowing Urdu paragraphs have w:jc right with no forced break", async () => {
    const xml = await documentXml(savedQalamExcerpt().content);
    const ps = paragraphs(xml);
    for (const i of [2, 3, 4, 7]) {
      expect(ps[i]).toContain("<w:bidi");
      expect(ps[i]).toContain('w:jc w:val="right"');
    }
    expect(textOf(ps[2])).toBe(fasakh);
    expect(textOf(ps[3])).toBe(theoryB);
    expect(textOf(ps[4])).toBe(theoryC);
    expect(textOf(ps[7])).toBe(salam);
    expect(xml).not.toContain("<w:pageBreakBefore");
  });

  test("right, center, left and justified Urdu plus Arabic low Kashida remain distinct", async () => {
    const doc: DocNode = { type: "doc", content: [
      para("دائیں", "Alvi Nastaleeq", "15pt", { textAlign: "right" }),
      para("درمیان", "Alvi Nastaleeq", "15pt", { textAlign: "center" }),
      para("بائیں", "Alvi Nastaleeq", "15pt", { textAlign: "left" }),
      para("برابر", "Alvi Nastaleeq", "15pt", { textAlign: "justify" }),
      para("عربی متن", "Amiri", "24pt", { textAlign: "justify" }),
    ] };
    const ps = paragraphs(await documentXml(doc));
    expect(ps.map(p => /w:jc w:val="([^"]+)"/.exec(p)?.[1])).toEqual(["right", "center", "left", "both", "lowKashida"]);
  });

  test("three user hard breaks and three separate empty paragraphs are never discarded", async () => {
    const ps = paragraphs(await documentXml(savedQalamExcerpt().content));
    expect([5, 6, 8].map(i => textOf(ps[i]))).toEqual(["", "", ""]);
    expect((ps[9].match(/<w:br\s*\/>/g) ?? [])).toHaveLength(3);
    expect(textOf(ps[9])).toBe(hadithStart + " " + hadithStart.repeat(7));
    expect(ps[9]).toContain('w:lineRule="atLeast"');
    expect(ps[9]).toContain('w:line="640"');
  });


  test("terminal long Arabic paragraph preserves three authored breaks without a phantom Word paragraph or section", async () => {
    const source = savedQalamExcerpt().content;
    const last = source.content?.[source.content.length - 1];
    expect(last?.type).toBe("paragraph");
    expect((last?.content ?? []).map(node => node.type)).toEqual([
      "hardBreak", "text", "hardBreak", "hardBreak",
    ]);

    const xml = await documentXml(source);
    const ps = paragraphs(xml);
    expect(ps).toHaveLength(source.content?.length ?? 0);
    expect(textOf(ps[ps.length - 1])).toBe(hadithStart + " " + hadithStart.repeat(7));
    const lastParagraph = ps[ps.length - 1];
    // These are the source's three *real* manual line breaks, not page breaks.
    expect((lastParagraph.match(/<w:br\s*\/>/g) ?? [])).toHaveLength(3);
    expect(lastParagraph).not.toContain('w:type="page"');
    expect(lastParagraph).toContain('w:line="640"');
    expect(lastParagraph).toContain('w:lineRule="atLeast"');
    expect(lastParagraph).toContain('w:after="120"');
    for (const forbidden of ["<w:keepNext", "<w:keepLines", "<w:pageBreakBefore"]) {
      expect(lastParagraph).not.toContain(forbidden);
    }
    // The section properties are a direct child of the body. docx.js must not
    // manufacture an additional blank paragraph after the author's final one.
    expect(xml).toMatch(/<\/w:p><w:sectPr(?:\s|>)/);
    expect((xml.match(/<w:sectPr(?:\s|>)/g) ?? [])).toHaveLength(1);
    expect(xml).not.toContain('w:type="nextPage"');

    // OOXML checks cannot guarantee that the two trailing author-created
    // empty lines *fit* on the preceding Word page: that needs Word rendering.
  });

  test("re-export from the same serialized .qalam snapshot preserves body XML", async () => {
    const original = savedQalamExcerpt();
    const reopened = JSON.parse(JSON.stringify(original)) as typeof original;
    expect(reopened.content).toEqual(original.content);
    expect(paragraphs(await documentXml(reopened.content))).toEqual(paragraphs(await documentXml(original.content)));
  });

  test("mixed Arabic/Urdu headings and deliberate page breaks retain Unicode and order", async () => {
    const doc: DocNode = { type: "doc", content: [
      { type: "heading", attrs: { dir: "rtl", textAlign: "center", level: 2 }, content: [{ type: "text", text: "عنوان" }] },
      { type: "paragraph", attrs: { dir: "rtl" }, content: [
        { type: "text", text: "یہ حدیث ہے: ", marks: mark("Alvi Nastaleeq", "15pt") },
        { type: "text", text: "عَلَيْهِ السَّلَامُ", marks: mark("Amiri", "24pt") },
      ] },
      { type: "pageBreak" },
      para("صفحہ دوم", "Gulzar", "20pt"),
    ] };
    const xml = await documentXml(doc);
    const ps = paragraphs(xml);
    expect(ps[0]).toContain('w:jc w:val="center"');
    expect(ps[0]).toContain('w:pStyle w:val="Heading2"');
    expect(textOf(ps[1])).toBe("یہ حدیث ہے: عَلَيْهِ السَّلَامُ");
    expect(ps[1]).toContain('w:cs="Alvi Nastaleeq"');
    expect(ps[1]).toContain('w:cs="Amiri"');
    expect((xml.match(/<w:br w:type="page"\s*\/>/g) ?? [])).toHaveLength(1);
  });

  test("Noto is hidden from new choices but explicitly selected historical Noto remains available", () => {
    expect(listEditorFonts().some(f => f.id === "noto-nastaliq-urdu")).toBe(false);
    expect(resolveEditorFontFamily('"Noto Nastaliq Urdu"', "rtl").docxFamily).toBe("Noto Nastaliq Urdu");
    for (const [input, expected] of [
      ['"Alvi Nastaleeq"', "Alvi Nastaleeq"],
      ['"Jameel Noori Nastaleeq", serif', "Jameel Noori Nastaleeq"],
      ['"Gulzar"', "Gulzar"],
      ['"Digital Khatt Indo-Pak"', "Digital Khatt Indo-Pak"],
      ["Amiri", "Amiri"],
    ]) {
      const resolved = resolveEditorFontFamily(input, "rtl");
      expect(resolved.docxFamily).toBe(expected);
      expect(resolved.fellBack).toBe(false);
    }
  });
});
