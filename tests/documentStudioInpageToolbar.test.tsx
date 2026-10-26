/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it, vi } from "vitest";
import { Editor } from "@tiptap/core";
import { cleanup, fireEvent, render } from "@testing-library/react";
import DocumentToolbar from "../app/tools/document-studio/components/DocumentToolbar";
import DocumentMenuBar from "../app/tools/document-studio/components/DocumentMenuBar";
import { createDocumentStudioExtensions } from "../app/tools/document-studio/utils/documentSchema";
import { applyEnglishFont, applyLineGap, applyLineHeight, applyParagraphDirection, applyTextEffect, setAlign, toggleTextOutline } from "../app/tools/document-studio/utils/documentCommands";
import { buildPdfHtml } from "../app/tools/document-studio/utils/buildPdfHtml";
import { defaultDocumentSettings } from "../app/tools/document-studio/utils/documentSettings";
import { blockLeadingPt } from "../app/tools/document-studio/utils/autoLeading";
import { parseLeading } from "../app/tools/document-studio/utils/leading";
import { INPAGE_TEXT_COLOURS, TEXT_EFFECTS, TEXT_EFFECT_LABELS, insertKashida, mapToolbarLanguage, parseLineGap, parseToolbarFontSize, studioOverlayRoot } from "../app/tools/document-studio/utils/inpageToolbar";

const editors: Editor[] = [];
function make(content = "<p>یہ ایک لمبی عبارت ہے</p>") {
  const editor = new Editor({ extensions: createDocumentStudioExtensions(), content });
  editors.push(editor);
  return editor;
}
afterEach(() => { cleanup(); editors.splice(0).forEach((editor) => editor.destroy()); });

describe("InPage toolbar values", () => {
  it("parses custom sizes and rejects junk or out-of-range values", () => {
    expect(parseToolbarFontSize("13.5")).toMatchObject({ ok: true, pt: 13.5, label: "13.5pt" });
    expect(parseToolbarFontSize("13.5pt").ok && parseToolbarFontSize("13.5pt")).toMatchObject({ pt: 13.5 });
    expect(parseToolbarFontSize("1in")).toMatchObject({ ok: true, pt: 72 });
    expect(parseToolbarFontSize("abc")).toMatchObject({ ok: false, message: "Value not typed properly." });
    expect(parseToolbarFontSize("1000").ok).toBe(false);
    expect(parseToolbarFontSize("1000").ok ? "" : (parseToolbarFontSize("1000") as { message: string }).message).toContain("Minimum allowed is 6");
    expect(parseLineGap("0")).toBe(0);
    expect(parseLineGap("100")).toBe(100);
    expect(parseLineGap("6")).toBe(6);
    expect(parseLineGap("6pt")).toBe(6);
    expect(parseLineGap("6p")).toBeNull();
    expect(parseLeading("12")).toEqual({ mode: "points", value: 12 });
    expect(parseLeading("100")).toEqual({ mode: "points", value: 100 });
    expect(parseLeading("6p")).toBeNull();
    expect(mapToolbarLanguage("ar")).toBe("ur");
    expect(mapToolbarLanguage("fa")).toBe("ur");
    expect(mapToolbarLanguage("auto")).toBe("ur");
    expect(mapToolbarLanguage("en")).toBe("en");
    expect(insertKashida("سلام", 2)).toContain("\u0640");
    expect(insertKashida("راز", 3)).toBe("راز");
  });

  it("types 13.5 into the size box and shows an error for abc", () => {
    const editor = make("<p>abc</p>");
    render(<DocumentToolbar editor={editor} dir="rtl" setDir={() => {}} isUr={false} />);
    const input = document.querySelector("[data-studio-font-size]") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "13.5" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(editor.getAttributes("textStyle").fontSize).toBe("13.5pt");
    expect(input.value).toBe("13.5pt");
    fireEvent.change(input, { target: { value: "abc" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(document.querySelector("[data-studio-size-error]")?.textContent).toBe("Value not typed properly.");
    expect(editor.getAttributes("textStyle").fontSize).toBe("13.5pt");
  });

  it("does not report an error when a mixed size box is focused and left", () => {
    const editor = make('<p><span style="font-size:12pt">ab</span><span style="font-size:18pt">cd</span></p>');
    editor.commands.selectAll();
    render(<DocumentToolbar editor={editor} dir="rtl" setDir={() => {}} isUr={false} />);
    const input = document.querySelector("[data-studio-font-size]") as HTMLInputElement;
    expect(input.value).toBe("");
    fireEvent.focus(input);
    fireEvent.blur(input);
    expect(document.querySelector("[role='alert']")).toBeNull();
  });

  it("saves the English font on selected Latin and not on Urdu", () => {
    const editor = make("<p>اردو Hello عبارت</p>");
    editor.commands.selectAll();
    applyEnglishFont(editor, "Inter");
    const parts = (editor.getJSON().content?.[0]?.content ?? []) as { text?: string; marks?: { type?: string; attrs?: { fontFamily?: string } }[] }[];
    const hello = parts.find((node) => node.text?.includes("Hello"));
    const urdu = parts.find((node) => node.text && /\p{Script=Arabic}/u.test(node.text));
    expect(String(hello?.marks?.find((mark) => mark.type === "textStyle")?.attrs?.fontFamily ?? "")).toContain("Inter");
    expect(String(urdu?.marks?.find((mark) => mark.type === "textStyle")?.attrs?.fontFamily ?? "")).not.toContain("Inter");
    editor.commands.focus("end");
    applyEnglishFont(editor, "Inter");
    const stored = editor.state.storedMarks ?? editor.state.selection.$from.marks();
    expect(stored.some((mark) => String(mark.attrs.fontFamily ?? "").includes("Inter"))).toBe(true);
  });

  it("lists the InPage colours and text styles in order", () => {
    const editor = make();
    render(<DocumentToolbar editor={editor} dir="rtl" setDir={() => {}} isUr={false} setProcessingLanguage={() => {}} />);
    fireEvent.click(document.querySelector("[aria-label='Colour']")!);
    expect([...document.querySelectorAll("[data-studio-colour-option]")].map((node) => node.getAttribute("data-studio-colour-option"))).toEqual(INPAGE_TEXT_COLOURS.map((colour) => colour.label));
    expect(document.querySelector("[data-studio-colour-list]")?.closest("[data-studio-overlay-list]")).toBeTruthy();
    expect(INPAGE_TEXT_COLOURS.find((colour) => colour.label === "Green")?.hex).toBe("#00FF00");
    fireEvent.click(document.querySelector("[data-studio-text-style]")!);
    const style = document.querySelector("[data-studio-text-style]") as HTMLElement;
    expect([...document.querySelectorAll("[data-studio-text-style-option]")].map((node) => node.textContent)).toEqual(TEXT_EFFECTS.map((effect) => TEXT_EFFECT_LABELS[effect]));
    expect(document.querySelector("[data-studio-text-style-list]")?.closest("[data-studio-overlay-list]")).toBeTruthy();
    const format = document.querySelector("[data-studio-toolbar-row='format']")!;
    const documentRow = document.querySelector("[data-studio-toolbar-row='document']")!;
    const language = document.querySelector("[data-studio-document-language]") as HTMLSelectElement;
    expect([...language.options].map((option) => option.value)).toEqual(["ur", "en"]);
    expect([...language.options].map((option) => option.text)).toEqual(["Urdu", "English"]);
    expect(language.value).toBe("ur");
    expect(format.lastElementChild?.contains(language)).toBe(true);
    const kashida = document.querySelector("[aria-label='K-None']") as HTMLSelectElement;
    expect([...kashida.options].map((option) => option.text)).toEqual(["K-None"]);
    expect(kashida.value).toBe("k");
    expect(kashida.closest("[data-studio-toolbar-row='document']")).toBe(documentRow);
    expect(style.parentElement?.nextElementSibling?.contains(kashida)).toBe(true);
    expect(documentRow.lastElementChild?.contains(kashida)).toBe(true);
    const colour = document.querySelector("[data-studio-colour]")!;
    expect(colour.nextElementSibling?.getAttribute("aria-label")).toBe("Outline");
    expect(format.querySelector("[aria-label='Outline']")).toBeNull();
    expect(document.querySelector("[aria-label='Text direction']")).toBeNull();
    expect(document.querySelector("[aria-label='Automatic paragraph direction']")).toBeNull();
  });

  it("keeps an old colour that is not in the new list", () => {
    const editor = make('<p><span style="color:#1A3A2A">اردو</span></p>');
    render(<DocumentToolbar editor={editor} dir="rtl" setDir={() => {}} isUr={false} />);
    fireEvent.click(document.querySelector("[aria-label='Colour']")!);
    expect(document.body.textContent).toContain("#1A3A2A");
  });

  it("applies text styles and outline into the document and the PDF", () => {
    const editor = make("<p>اردو English</p>");
    editor.commands.selectAll();
    const pdf = () => buildPdfHtml(editor.getJSON(), "rtl", { faces: [] }, defaultDocumentSettings().typography).html;
    const expected: Record<string, string> = {
      single: "text-decoration-line:underline",
      double: "text-decoration-style:double",
      overline: "text-decoration-line:overline",
      box: "border:0.6pt solid",
      pattern: "repeating-linear-gradient",
      reverse: "background-color:#000",
    };
    for (const effect of ["single", "double", "overline", "box", "pattern", "reverse"] as const) {
      applyTextEffect(editor, effect);
      expect(editor.getAttributes("textStyle").textEffect).toBe(effect);
      expect(pdf()).toContain(expected[effect]);
    }
    toggleTextOutline(editor);
    expect(editor.getAttributes("textStyle").textOutline).toBe(true);
    expect(pdf()).toContain("-webkit-text-stroke");
    applyTextEffect(editor, "none");
    expect(editor.getAttributes("textStyle").textEffect).toBeNull();
  });

  it("full-justifies including the last line and keeps other alignments", () => {
    const editor = make("<p>یہ ایک لمبی عبارت ہے جو فریم بھرے</p>");
    setAlign(editor, "justify-all");
    expect(editor.getAttributes("paragraph").textAlign).toBe("justify-all");
    const html = editor.getHTML();
    expect(html).toMatch(/text-align-last:\s*justify/);
    const pdf = buildPdfHtml(editor.getJSON(), "rtl", { faces: [] }, defaultDocumentSettings().typography);
    expect(pdf.html).toMatch(/text-align-last:\s*justify/);
    setAlign(editor, "justify");
    expect(editor.getAttributes("paragraph").textAlign).toBe("justify");
    expect(editor.getHTML()).not.toContain("text-align-last");
  });

  it("defaults the interline gap to 0pt and adds 6pt to the line pitch", () => {
    const editor = make("<p>اردو</p>");
    render(<DocumentToolbar editor={editor} dir="rtl" setDir={() => {}} isUr={false} />);
    const gap = document.querySelector("[data-studio-line-gap]") as HTMLInputElement;
    expect(gap.value).toBe("0pt");
    const before = blockLeadingPt(editor.getJSON().content?.[0] ?? {}, "Mehr Nastaliq Web", defaultDocumentSettings().typography, "rtl");
    fireEvent.change(gap, { target: { value: "6pt" } });
    fireEvent.keyDown(gap, { key: "Enter" });
    expect(editor.getAttributes("paragraph").lineGapPt).toBe(6);
    const node = { ...(editor.getJSON().content?.[0] ?? {}), attrs: { ...(editor.getAttributes("paragraph")), lineGapPt: 6 } };
    expect(blockLeadingPt(node, "Mehr Nastaliq Web", defaultDocumentSettings().typography, "rtl") + 6).toBeCloseTo(before + 6);
  });

  it("keeps line pitch and the Urdu font when the direction arrow changes", () => {
    const editor = make("<p>اردو Hello</p>");
    applyLineHeight(editor, 22);
    applyParagraphDirection(editor, "ltr");
    expect(editor.getAttributes("paragraph").leading).toEqual({ mode: "points", value: 22 });
    expect(editor.getAttributes("paragraph").dir).toBe("ltr");
    applyParagraphDirection(editor, "rtl");
    expect(editor.getAttributes("paragraph").leading).toEqual({ mode: "points", value: 22 });
    const node = editor.getJSON().content?.[0] ?? {};
    expect(blockLeadingPt(node, "Mehr Nastaliq Web", defaultDocumentSettings().typography, "ltr")).toBeCloseTo(
      blockLeadingPt(node, "Mehr Nastaliq Web", defaultDocumentSettings().typography, "rtl"),
    );
    render(<DocumentToolbar editor={editor} dir="rtl" setDir={vi.fn()} isUr={false} />);
    expect((document.querySelector("[data-studio-font-family]") as HTMLSelectElement).value).not.toBe("Inter");
  });

  it("opens a menu inside the fullscreen element", () => {
    const shell = document.createElement("div");
    shell.setAttribute("data-studio-shell", "true");
    document.body.appendChild(shell);
    const previous = Object.getOwnPropertyDescriptor(Document.prototype, "fullscreenElement")
      ?? Object.getOwnPropertyDescriptor(document, "fullscreenElement");
    Object.defineProperty(document, "fullscreenElement", { configurable: true, get: () => shell });
    expect(studioOverlayRoot()).toBe(shell);
    render(<DocumentMenuBar isUr={false} onAction={vi.fn()} />, { container: shell });
    fireEvent(document, new Event("fullscreenchange"));
    fireEvent.click(shell.querySelector("[data-menu-root='file']")!);
    const menu = document.querySelector("[data-menu-dropdown='file']");
    expect(menu?.closest("[data-studio-shell]")).toBe(shell);
    if (previous) Object.defineProperty(document, "fullscreenElement", previous);
    else delete (document as { fullscreenElement?: Element }).fullscreenElement;
    shell.remove();
  });
});

describe("line gap command", () => {
  it("stores a typed gap without changing leading", () => {
    const editor = make();
    applyLineHeight(editor, null);
    applyLineGap(editor, 6);
    expect(editor.getAttributes("paragraph").lineGapPt).toBe(6);
    expect(editor.getAttributes("paragraph").leading).toEqual({ mode: "auto" });
  });
});
