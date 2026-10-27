/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import { Slice, Fragment } from "@tiptap/pm/model";
import { createDocumentStudioExtensions } from "../app/tools/document-studio/utils/documentSchema";
import { AllahAutoMarks } from "../app/tools/document-studio/extensions/AllahAutoMarks";

let editor: Editor;
function open() {
  editor = new Editor({ extensions: [...createDocumentStudioExtensions(), AllahAutoMarks], content: "<p></p>" });
  return editor;
}
function type(text: string) {
  for (const character of text) {
    const { from, to } = editor.state.selection;
    const handled = editor.view.someProp("handleTextInput", handler => handler(editor.view, from, to, character, () => editor.state.tr.insertText(character, from, to)));
    if (!handled) editor.view.dispatch(editor.state.tr.insertText(character, from, to));
  }
}
afterEach(() => editor?.destroy());

describe("Allah auto marks through real editor transactions", () => {
  it.each([
    ["اللہ", "اللّٰہ"], ["الله", "اللّٰه"], ["ٱللہ", "ٱللّٰہ"],
    ["واللہ", "واللّٰہ"], ["باللہ", "باللّٰہ"], ["للہ", "للّٰہ"],
    ["لِلّٰہ", "لِلّٰہ"], ["اللہم", "اللّٰہم"], ["اللّٰہُمَّ", "اللّٰہُمَّ"],
    ["اللّٰہ", "اللّٰہ"], ["اللّہ", "اللّٰہ"], ["اللٰہ", "اللّٰہ"],
    ["اللّٰہ", "اللّٰہ"], ["اللَّهْو", "اللَّهْو"], ["اللَّهَب", "اللَّهَب"],
    ["الٰہ", "الٰہ"], ["الہام", "الہام"], ["xاللہ", "xاللہ"], ["اللہنام", "اللہنام"],
    ["اللِہ", "اللِہ"], ["اللُہ", "اللُہ"], ["اللْہ", "اللْہ"],
  ])("completes %s as %s once", (input, output) => {
    open(); type(input);
    expect(editor.getText()).toBe(input);
    type(" ");
    expect(editor.getText()).toBe(output + " ");
    type("۔ ");
    expect(editor.getText()).toBe(output + " ۔ ");
  });

  it.each(["Mehr Nastaliq Web", "Digital Khatt Indo-Pak", "Arial"])("works in %s and undo removes only the auto marks", font => {
    open(); editor.commands.setMark("textStyle", { fontFamily: font });
    type("اللہ ");
    expect(editor.getText()).toBe("اللّٰہ ");
    editor.commands.undo();
    expect(editor.getText()).toBe("اللہ ");
    editor.commands.redo();
    expect(editor.getText()).toBe("اللّٰہ ");
    type("اگلا"); editor.commands.undo();
    expect(editor.getText()).toBe("اللّٰہ ");
  });

  it.each(["اللّہ", "اللٰہ", "اللّٰہ"])("undo retains the original marks in %s", original => {
    open(); type(original + " ");
    expect(editor.getText()).toBe("اللّٰہ ");
    editor.commands.undo();
    expect(editor.getText()).toBe(original + " ");
  });

  it("completes on punctuation and Enter without replacing Enter behaviour", () => {
    open(); type("الله، اللہ");
    editor.view.someProp("handleKeyDown", handler => handler(editor.view, new KeyboardEvent("keydown", { key: "Enter" })));
    expect(editor.state.doc.childCount).toBe(2);
    expect(editor.state.doc.firstChild?.textContent).toBe("اللّٰه، اللّٰہ");
    editor.commands.undo();
    expect(editor.state.doc.childCount).toBe(2);
    expect(editor.state.doc.firstChild?.textContent).toBe("اللّٰه، اللہ");
  });

  it("normalises a multi-paragraph paste including its last word, preserving marks and undo", () => {
    open();
    const paragraphs = ["اللہ الله", "اللّہ اللَّهَب", "واللہ"].map(text => editor.schema.nodes.paragraph.create(null, editor.schema.text(text, [editor.schema.marks.bold.create()])));
    editor.view.dispatch(editor.state.tr.replaceSelection(new Slice(Fragment.from(paragraphs), 1, 1)).setMeta("uiEvent", "paste"));
    expect(editor.getText()).toBe("اللّٰہ اللّٰه\n\nاللّٰہ اللَّهَب\n\nواللّٰہ");
    expect(editor.state.doc.firstChild?.firstChild?.marks[0].type.name).toBe("bold");
    editor.commands.undo();
    expect(editor.getText()).toBe("اللہ الله\n\nاللّہ اللَّهَب\n\nواللہ");
  });

  it("does not modify loaded content, unrelated completed words, or other editor actions", () => {
    open(); editor.commands.setContent("<p>اللہ پہلے سے</p>");
    editor.commands.setTextSelection(editor.state.doc.content.size - 1);
    type(" نیا ");
    expect(editor.getText()).toBe("اللہ پہلے سے نیا ");
  });
});
