/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import { createDocumentStudioExtensions, shouldRefreshCaretForAlign } from "../app/tools/document-studio/utils/documentSchema";

let editor: Editor | null = null;
afterEach(() => { editor?.destroy(); editor = null; });

function make(html: string) {
  editor = new Editor({ extensions: createDocumentStudioExtensions(), content: html });
  return editor;
}

describe("empty-paragraph caret follows alignment changes", () => {
  for (const align of ["center", "left", "justify", "right"]) {
    it(`refreshes caret on empty first line for ${align}`, () => {
      const ed = make(align === "right" ? '<p data-text-align="center"></p>' : "<p></p>");
      ed.commands.setTextSelection(1);
      const prev = ed.state;
      ed.commands.setTextAlign(align);
      expect(ed.state.selection.$from.parent.attrs.textAlign).toBe(align);
      expect(shouldRefreshCaretForAlign(prev, ed.state)).toBe(true);
    });
  }

  it("refreshes caret on an empty line in the middle of the document", () => {
    const ed = make("<p>اول</p><p></p><p>آخر</p>");
    const pos = ed.state.doc.child(0).nodeSize + 1;
    ed.view.dispatch(ed.state.tr.setSelection(TextSelection.create(ed.state.doc, pos)));
    const prev = ed.state;
    ed.commands.setTextAlign("center");
    expect(ed.state.doc.child(1).attrs.textAlign).toBe("center");
    expect(ed.state.doc.child(0).attrs.textAlign ?? null).toBe(null);
    expect(shouldRefreshCaretForAlign(prev, ed.state)).toBe(true);
  });

  it("does not refresh for ordinary typing", () => {
    const ed = make("<p></p>");
    ed.commands.setTextSelection(1);
    const prev = ed.state;
    ed.commands.insertContent("ب");
    expect(shouldRefreshCaretForAlign(prev, ed.state)).toBe(false);
  });

  it("keeps the RTL default (no explicit align) for new Urdu paragraphs", () => {
    const ed = make("<p></p>");
    expect(ed.state.doc.child(0).attrs.textAlign ?? null).toBe(null);
  });
});

import { KEYBOARD_LAYOUT_LABELS } from "../app/tools/document-studio/utils/inpageKeyboard";
describe("keyboard layout English labels", () => {
  it("names the Arabic and Persian layouts as Monotype", () => {
    expect(KEYBOARD_LAYOUT_LABELS.arabic).toBe("Arabic (Monotype)");
    expect(KEYBOARD_LAYOUT_LABELS.persian).toBe("Persian (Monotype)");
  });
});
