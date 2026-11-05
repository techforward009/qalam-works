/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import { createDocumentStudioExtensions } from "../app/tools/document-studio/utils/documentSchema";
import { AllahAutoMarks } from "../app/tools/document-studio/extensions/AllahAutoMarks";
import { InpageKeyboard } from "../app/tools/document-studio/utils/inpageKeyboardExtension";
import type { KeyboardLayout } from "../app/tools/document-studio/utils/inpageKeyboard";
import layouts from "../app/tools/document-studio/utils/keyboardLayouts.json";

const arabic = (layouts as unknown as Record<string, KeyboardLayout>).arabic;
let editor: Editor;
function open() {
  editor = new Editor({ extensions: [InpageKeyboard.configure({ getLayout: () => arabic }), ...createDocumentStudioExtensions(), AllahAutoMarks], content: "<p></p>" });
  editor.commands.setMark("textStyle", { fontFamily: "Digital Khatt Indo-Pak" });
}
function key(code: string) {
  const event = new KeyboardEvent("keydown", { code, key: "x", bubbles: true, cancelable: true });
  expect(editor.view.someProp("handleKeyDown", (f) => f(editor.view, event))).toBe(true);
}
function nativeType(character: string) {
  const { from, to } = editor.state.selection;
  const handled = editor.view.someProp("handleTextInput", (f) => f(editor.view, from, to, character, () => editor.state.tr.insertText(character, from, to)));
  if (!handled) editor.view.dispatch(editor.state.tr.insertText(character, from, to));
}
afterEach(() => editor?.destroy());

describe("built-in Arabic keyboard + Allah auto marks", () => {
  it("completes on a native Space", () => {
    open();
    ["KeyH", "KeyG", "KeyG", "KeyU"].forEach(key);
    expect(editor.getText()).toBe("الله");
    nativeType(" ");
    expect(editor.getText()).toBe("اللّٰه ");
  });

  it("completes on a layout punctuation key (Arabic comma)", () => {
    open();
    ["KeyH", "KeyG", "KeyG", "KeyU", "BracketRight"].forEach(key);
    expect(editor.getText()).toBe("اللّٰه،");
  });
});
