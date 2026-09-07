import { describe, expect, it } from "vitest";
import { getSchema } from "@tiptap/core";
import { EditorState } from "@tiptap/pm/state";
import { Node as PMNode, Slice, Fragment } from "@tiptap/pm/model";
import { ParagraphWithDir, HeadingWithDir, createDocumentStudioExtensions } from "../app/tools/document-studio/utils/documentSchema";
import {
  buildDocumentStudioExample,
  buildReplaceAllTransaction,
  transformPastedSlice,
} from "../app/tools/document-studio/utils/documentCommands";

const schema = getSchema(createDocumentStudioExtensions());

function makeState(docJson: object): EditorState {
  return EditorState.create({ schema, doc: PMNode.fromJSON(schema, docJson) });
}

describe("documentCommands — extracted from editor", () => {
  it("buildDocumentStudioExample assigns per-block direction", () => {
    const doc = buildDocumentStudioExample("rtl");
    expect(doc.content!.map((p) => p.attrs?.dir)).toEqual(["rtl", "ltr", "rtl"]);
  });

  it("buildReplaceAllTransaction replaces from a schema document", () => {
    const state = makeState({
      type: "doc",
      content: [{ type: "paragraph", attrs: { dir: "ltr" }, content: [{ type: "text", text: "hello hello" }] }],
    });
    const tr = buildReplaceAllTransaction(state, "hello", "hi");
    expect(tr).not.toBeNull();
    const next = state.apply(tr!);
    expect(next.doc.textContent).toBe("hi hi");
  });

  it("transformPastedSlice re-detects dir without touching empty blocks", () => {
    const paragraphType = schema.nodes.paragraph;
    const nodes = [
      paragraphType.create({ dir: "rtl" }, schema.text("یہ اردو متن ہے۔")),
      paragraphType.create({ dir: "rtl" }, schema.text("This is English.")),
      paragraphType.create({ dir: "rtl" }, []),
    ];
    const slice = new Slice(Fragment.from(nodes), 0, 0);
    const result = transformPastedSlice(slice, "rtl");
    expect(result.content.child(0).attrs.dir).toBe("rtl");
    expect(result.content.child(1).attrs.dir).toBe("ltr");
    expect(result.content.child(2).attrs.dir).toBe("rtl");
  });
});

describe("documentSchema production extensions", () => {
  it("includes ParagraphWithDir and HeadingWithDir", () => {
    expect(ParagraphWithDir.name).toBe("paragraph");
    expect(HeadingWithDir.name).toBe("heading");
    expect(schema.nodes.paragraph.spec.attrs?.dir).toBeTruthy();
    expect(schema.nodes.heading.spec.attrs?.dir).toBeTruthy();
  });
});
