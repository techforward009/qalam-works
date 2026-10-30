/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import { Slice, Fragment } from "@tiptap/pm/model";
import { createDocumentStudioExtensions } from "../app/tools/document-studio/utils/documentSchema";
import { AllahAutoMarks } from "../app/tools/document-studio/extensions/AllahAutoMarks";

let editor: Editor;
function open(font = "Digital Khatt Indo-Pak") {
  editor = new Editor({ extensions: [...createDocumentStudioExtensions(), AllahAutoMarks], content: "<p></p>" });
  if (font) editor.commands.setMark("textStyle", {fontFamily:font});
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
    ["اللّٰہ", "اللّٰہ"], ["اللَّهْو", "اللَّهْو"], ["اللَّهَب", "اللَّهَب"],
    ["الٰہ", "الٰہ"], ["الہام", "الہام"], ["xاللہ", "xاللہ"], ["اللہنام", "اللہنام"],
    ["اللِہ", "اللِّٰہ"], ["اللُہ", "اللُّٰہ"], ["اللْہ", "اللّْٰہ"],
  ])("completes %s as %s once", (input, output) => {
    open(); type(input);
    expect(editor.getText()).toBe(input);
    type(" ");
    expect(editor.getText()).toBe(output + " ");
    type("۔ ");
    expect(editor.getText()).toBe(output + " ۔ ");
  });

  it.each(["Digital Khatt Indo-Pak"])("works in %s and undo removes only the auto marks", font => {
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

  it.each(['Mehr Nastaliq Web','Gulzar','Jameel Noori Nastaleeq','Arial Unicode MS','Arial',''])("leaves typing and paste unchanged in %s", font=>{
    open(font);type('اللہ واللہ باللہ للہ ');
    expect(editor.getText()).toBe('اللہ واللہ باللہ للہ ');
    editor.view.dispatch(editor.state.tr.insertText('اللہ ').setMeta('uiEvent','paste'));
    expect(editor.getText()).toBe('اللہ واللہ باللہ للہ اللہ ');
  });
  it.each(['اللّٰہ','اللّٰہ','لِلّٰہ','اللّٰہُمَّ'])("never adds or normalises already authored marks in %s",original=>{
    open();type(original+' ');expect(editor.getText()).toBe(original+' ');
    editor.view.dispatch(editor.state.tr.insertText(original).setMeta('uiEvent','paste'));
    expect(editor.getText()).toBe(original+' '+original);
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
    const paragraphs = ["اللہ الله", "اللّہ اللَّهَب", "واللہ"].map(text => editor.schema.nodes.paragraph.create(null, editor.schema.text(text, [editor.schema.marks.bold.create(),editor.schema.marks.textStyle.create({fontFamily:"Digital Khatt Indo-Pak"})])));
    editor.view.dispatch(editor.state.tr.replaceSelection(new Slice(Fragment.from(paragraphs), 1, 1)).setMeta("uiEvent", "paste"));
    expect(editor.getText()).toBe("اللّٰہ اللّٰه\n\nاللّٰہ اللَّهَب\n\nواللّٰہ");
    expect(editor.state.doc.firstChild?.firstChild?.marks.some(mark=>mark.type.name === "bold")).toBe(true);
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

it('uses inherited registry font and leaves loaded documents unchanged',()=>{
 open('');document.body.append(editor.view.dom);editor.view.dom.style.setProperty('--qalam-rtl-font','"Digital Khatt Indo-Pak", serif');
 type('اللہ ');expect(editor.getText()).toBe('اللّٰہ ');
 editor.commands.setContent('<p>اللہ اللّہ</p>');expect(editor.getText()).toBe('اللہ اللّہ');
});
it('does not authorise an old Digital Khatt word when the caret font changes',()=>{
 open();type('اللہ');editor.commands.setMark('textStyle',{fontFamily:'Mehr Nastaliq Web'});type(' ');
 expect(editor.getText()).toBe('اللہ ');
});
it('preserves fonts in a mixed rich paste and completes only its unmarked Digital Khatt word',()=>{
 open('Mehr Nastaliq Web');
 const content=['Mehr Nastaliq Web','Digital Khatt Indo-Pak'].map(fontFamily=>editor.schema.nodes.paragraph.create(null,editor.schema.text('اللہ',[editor.schema.marks.textStyle.create({fontFamily})])));
 editor.view.dispatch(editor.state.tr.replaceSelection(new Slice(Fragment.from(content),1,1)).setMeta('uiEvent','paste'));
 expect(editor.getText()).toBe('اللہ\n\nاللّٰہ');
});

it.each(['Digital Khatt Indo-Pak','Mehr Nastaliq Web','Jameel Noori Nastaleeq','Gulzar'])(
 'real plain-text paste uses the active %s font for every Allah word',font=>{
 open(font);
 const input='اللہ اللہم واللہ باللہ للہ اللہ اللّٰہ اللّہ';
 editor.view.pasteText(input);
 const expected=font==='Digital Khatt Indo-Pak'?'اللّٰہ اللّٰہم واللّٰہ باللّٰہ للّٰہ اللّٰہ اللّٰہ اللّٰہ':input;
 expect(editor.getText()).toBe(expected);
 if(font==='Digital Khatt Indo-Pak') {
  expect(editor.state.doc.firstChild?.firstChild?.marks.find(mark=>mark.type.name==='textStyle')?.attrs.fontFamily).toBe(font);
  editor.commands.undo();expect(editor.getText()).toBe(input);
  editor.commands.undo();expect(editor.getText()).toBe('');
 }
});
it('plain multiline paste inherits Digital Khatt at the paste position without changing loaded text',()=>{
 open();editor.view.pasteText('اللہ\nاللہم\nاللّٰہ');
 expect(editor.getText()).toBe('اللّٰہ\n\nاللّٰہم\n\nاللّٰہ');
 editor.commands.setContent('<p>اللہ اللہم</p>');expect(editor.getText()).toBe('اللہ اللہم');
});

const partialForms=[
 ['اللّہ','اللّٰہ'],['اللٰہ','اللّٰہ'],['اللّٰہ','اللّٰہ'],['اللّٰہ','اللّٰہ'],
 ['واللّہ','واللّٰہ'],['باللٰہ','باللّٰہ'],['للّہ','للّٰہ'],['اللّہم','اللّٰہم'],
 ['بِاللّہ','بِاللّٰہ'],['اَللٰہُ','اَللّٰہُ'],['اللٰهم','اللّٰهم'],['اللَّهَب','اللَّهَب'],
];
for(const font of ['Digital Khatt Indo-Pak','Mehr Nastaliq Web','Jameel Noori Nastaleeq'])
 for(const mode of ['typing','paste'])it.each(partialForms)(`${font} ${mode}: completes %s without replacing authored marks`,(input,completed)=>{
  open(font);const expected=font==='Digital Khatt Indo-Pak'?completed:input;
  if(mode==='typing')type(input+' ');else editor.view.pasteText(input+' ');
  expect(editor.getText()).toBe(expected+' ');
  if(expected!==input){editor.commands.undo();expect(editor.getText()).toBe(input+' ');editor.commands.redo();expect(editor.getText()).toBe(expected+' ');}
 });
