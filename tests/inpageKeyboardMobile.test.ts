/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import { CellSelection } from "@tiptap/pm/tables";
import { createDocumentStudioExtensions } from "../app/tools/document-studio/utils/documentSchema";
import { InpageKeyboard } from "../app/tools/document-studio/utils/inpageKeyboardExtension";
import layouts from "../app/tools/document-studio/utils/keyboardLayouts.json";
import type { KeyboardLayout } from "../app/tools/document-studio/utils/inpageKeyboard";

const monotype = (layouts as unknown as Record<string, KeyboardLayout>).inpageMonotype;
let editor: Editor;

function open() {
  editor = new Editor({
    extensions: [InpageKeyboard.configure({ getLayout: () => monotype }), ...createDocumentStudioExtensions()],
    content: "<p></p>",
  });
}

afterEach(() => editor?.destroy());

describe("mobile in-page keyboard text routes", () => {
  it("maps text received by handleTextInput once", () => {
    open();
    const { from, to } = editor.state.selection;
    const handled = editor.view.someProp("handleTextInput", f => f(
      editor.view, from, to, "ab", () => editor.state.tr.insertText("ab", from, to),
    ));
    if (!handled) editor.view.dispatch(editor.state.tr.insertText("ab", from, to));
    expect(editor.getText()).toBe("قگ");
  });

  it("intercepts cancelable virtual-keyboard beforeinput without a Latin duplicate", () => {
    open();
    const event = new InputEvent("beforeinput", { inputType: "insertText", data: "ab", bubbles: true, cancelable: true });
    editor.view.dom.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(editor.getText()).toBe("قگ");
  });

  it("routes mapped beforeinput through the table-cell selection guard once", () => {
    editor = new Editor({
      extensions: [InpageKeyboard.configure({ getLayout: () => monotype }), ...createDocumentStudioExtensions()],
      content: {
        type: "doc", content: [{ type: "table", content: [{ type: "tableRow", content: ["old one", "old two"].map(text => ({
          type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text }] }],
        })) }] }],
      },
    });
    const cells: number[] = [];
    editor.state.doc.descendants((node, pos) => { if (node.type.name === "tableCell") cells.push(pos); });
    editor.view.dispatch(editor.state.tr.setSelection(CellSelection.create(editor.state.doc, cells[0], cells[1])));
    editor.view.dom.dispatchEvent(new InputEvent("beforeinput", { inputType: "insertText", data: "ab", bubbles: true, cancelable: true }));
    const values: string[] = [];
    editor.state.doc.descendants(node => { if (node.type.name === "tableCell") values.push(node.textContent); });
    expect(values).toEqual(["قگ", "old two"]);
  });
});
