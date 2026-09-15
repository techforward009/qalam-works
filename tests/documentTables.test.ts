// @vitest-environment happy-dom
import { Editor } from "@tiptap/core";
import { createDocumentStudioExtensions } from "../app/tools/document-studio/utils/documentSchema";
import { extractPlainText, type DocNode } from "../app/tools/document-studio/utils/extractPlainText";

function makeEditor() {
  return new Editor({ extensions: createDocumentStudioExtensions(), content: "<p>Before</p>" });
}

describe("Document Studio v2.1 tables", () => {
  test("inserts a real header table and persists it in editor JSON", () => {
    const editor = makeEditor();
    expect(editor.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: true })).toBe(true);
    const table = (editor.getJSON() as DocNode).content?.find((node) => node.type === "table");
    expect(table?.content).toHaveLength(2);
    expect(table?.content?.[0].content?.every((cell) => cell.type === "tableHeader")).toBe(true);
    expect(table?.content?.[1].content?.every((cell) => cell.type === "tableCell")).toBe(true);
    editor.destroy();
  });

  test("uses real TipTap row, column, header, and delete commands", () => {
    const editor = makeEditor();
    editor.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: false });
    expect(editor.commands.addRowAfter()).toBe(true);
    expect(editor.commands.addColumnAfter()).toBe(true);
    expect(editor.commands.toggleHeaderRow()).toBe(true);
    const table = (editor.getJSON() as DocNode).content?.find((node) => node.type === "table");
    expect(table?.content).toHaveLength(3);
    expect(table?.content?.[0].content).toHaveLength(3);
    expect(editor.commands.deleteTable()).toBe(true);
    expect((editor.getJSON() as DocNode).content?.some((node) => node.type === "table")).toBe(false);
    editor.destroy();
  });

  test("extracts table cells as tab-separated rows without losing directed content", () => {
    const doc: DocNode = {
      type: "doc",
      content: [{
        type: "table",
        content: [{
          type: "tableRow",
          content: [
            { type: "tableCell", content: [{ type: "paragraph", attrs: { dir: "ltr" }, content: [{ type: "text", text: "Name" }] }] },
            { type: "tableCell", content: [{ type: "paragraph", attrs: { dir: "rtl" }, content: [{ type: "text", text: "علی" }] }] },
          ],
        }],
      }],
    };
    expect(extractPlainText(doc, "rtl")).toBe("Name\tعلی");
  });
});
