import { extractDocumentOutline } from "../app/tools/document-studio/utils/documentOutline";
import type { DocNode } from "../app/tools/document-studio/utils/extractPlainText";

function heading(level: number, text: string): DocNode {
  return { type: "heading", attrs: { level }, content: [{ type: "text", text }] };
}
function paragraph(text: string): DocNode {
  return { type: "paragraph", content: [{ type: "text", text }] };
}
function docWith(nodes: DocNode[]): DocNode {
  return { type: "doc", content: nodes };
}

describe("extractDocumentOutline", () => {
  test("extracts a single H1", () => {
    const outline = extractDocumentOutline(docWith([heading(1, "عنوان")]));
    expect(outline).toEqual([{ level: 1, text: "عنوان", blockIndex: 0 }]);
  });

  test("extracts H1-H4 in document order, with correct blockIndex positions", () => {
    const doc = docWith([
      heading(1, "پہلا"),
      paragraph("متن"),
      heading(2, "دوسرا"),
      heading(3, "تیسرا"),
      paragraph("مزید متن"),
      heading(4, "چوتھا"),
    ]);
    expect(extractDocumentOutline(doc)).toEqual([
      { level: 1, text: "پہلا", blockIndex: 0 },
      { level: 2, text: "دوسرا", blockIndex: 2 },
      { level: 3, text: "تیسرا", blockIndex: 3 },
      { level: 4, text: "چوتھا", blockIndex: 5 },
    ]);
  });

  test("excludes heading levels above 4 (H5/H6, if they ever occur)", () => {
    const doc = docWith([heading(1, "شامل"), heading(5, "خارج"), heading(6, "خارج")]);
    const outline = extractDocumentOutline(doc);
    expect(outline).toHaveLength(1);
    expect(outline[0].text).toBe("شامل");
  });

  test("a document with no headings returns an empty array", () => {
    expect(extractDocumentOutline(docWith([paragraph("صرف متن")]))).toEqual([]);
  });

  test("an empty document returns an empty array, not an error", () => {
    expect(extractDocumentOutline(docWith([]))).toEqual([]);
  });

  test("ignores non-heading, non-paragraph blocks (e.g. lists) without erroring", () => {
    const doc = docWith([
      heading(1, "عنوان"),
      { type: "bulletList", content: [{ type: "listItem", content: [paragraph("فہرست آئٹم")] }] },
    ]);
    expect(extractDocumentOutline(doc)).toEqual([{ level: 1, text: "عنوان", blockIndex: 0 }]);
  });

  test("a heading with no text content produces an empty text string, not a crash", () => {
    const doc = docWith([{ type: "heading", attrs: { level: 1 }, content: [] }]);
    expect(extractDocumentOutline(doc)).toEqual([{ level: 1, text: "", blockIndex: 0 }]);
  });
});
