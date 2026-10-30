// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { Schema } from "@tiptap/pm/model";
import { documentNavigationPosition } from "../app/tools/document-studio/utils/studioDocumentNavigation";
const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "text*" },
    heading: { group: "block", content: "text*" },
    text: { group: "inline" },
  },
});
const p = (text: string) => schema.nodes.paragraph.create(null, text ? schema.text(text) : undefined);
const doc = schema.nodes.doc.create(null, [p("abc"), schema.nodes.heading.create(null, schema.text("Heading")), p("اختتام")]);
const starts: number[] = [];
doc.descendants((node, pos) => { if (node.isTextblock) { starts.push(pos + 1); return false; } });

describe("InPage-style document navigation", () => {
  it("Ctrl+Up moves to current start then previous paragraph start", () => {
    expect(documentNavigationPosition(doc, starts[1] + 3, "ArrowUp")).toBe(starts[1]);
    expect(documentNavigationPosition(doc, starts[1], "ArrowUp")).toBe(starts[0]);
    expect(documentNavigationPosition(doc, starts[0], "ArrowUp")).toBe(starts[0]);
  });
  it("Ctrl+Down moves to next textblock start and eventually the document end", () => {
    expect(documentNavigationPosition(doc, starts[0] + 1, "ArrowDown")).toBe(starts[1]);
    expect(documentNavigationPosition(doc, starts[1], "ArrowDown")).toBe(starts[2]);
    expect(documentNavigationPosition(doc, starts[2], "ArrowDown")).toBe(doc.content.size - 1);
  });
  it("Ctrl+Home/End navigate to actual document boundaries", () => {
    expect(documentNavigationPosition(doc, starts[1] + 2, "Home")).toBe(starts[0]);
    expect(documentNavigationPosition(doc, starts[0], "End")).toBe(doc.content.size - 1);
  });
});
