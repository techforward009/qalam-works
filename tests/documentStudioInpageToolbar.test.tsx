/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it, vi } from "vitest";
import { Editor } from "@tiptap/core";
import { cleanup, fireEvent, render } from "@testing-library/react";
import DocumentToolbar from "../app/tools/document-studio/components/DocumentToolbar";
import DocumentMenuBar from "../app/tools/document-studio/components/DocumentMenuBar";
import { createDocumentStudioExtensions } from "../app/tools/document-studio/utils/documentSchema";
import { LatinScriptRuns, hasScript, latinScaleCss, scriptRanges } from "../app/tools/document-studio/extensions/LatinScriptRuns";
import { applyEnglishFont, applyFontFamily, applyLineGap, applyLineHeight, applyParagraphDirection, applyScale, applyTextEffect, applyTracking, setAlign, toggleTextOutline, undo } from "../app/tools/document-studio/utils/documentCommands";
import { buildPdfHtml, requiredPdfEmbedFonts } from "../app/tools/document-studio/utils/buildPdfHtml";
import { defaultDocumentSettings } from "../app/tools/document-studio/utils/documentSettings";
import { blockLeadingPt } from "../app/tools/document-studio/utils/autoLeading";
import { parseLeading } from "../app/tools/document-studio/utils/leading";
import { INPAGE_TEXT_COLOURS, TEXT_EFFECTS, TEXT_EFFECT_LABELS, insertKashida, mapToolbarLanguage, parseLineGap, parseToolbarFontSize, parseToolbarPercent, studioOverlayRoot } from "../app/tools/document-studio/utils/inpageToolbar";
import { resolveActiveToolbarFormatting } from "../app/tools/document-studio/utils/activeToolbarFormatting";

const editors: Editor[] = [];
function make(content = "<p>یہ ایک لمبی عبارت ہے</p>") {
  const editor = new Editor({ extensions: [...createDocumentStudioExtensions(), LatinScriptRuns], content });
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
    expect(parseToolbarPercent("10", "tracking")).toMatchObject({ ok: true, value: 10, label: "10%" });
    expect(parseToolbarPercent("-5%", "tracking")).toMatchObject({ ok: true, value: -5, label: "-5%" });
    expect(parseToolbarPercent("80%", "scale")).toMatchObject({ ok: true, value: 80, label: "80%" });
    expect(parseToolbarPercent("abc", "scale")).toMatchObject({ ok: false, message: "Value not typed properly." });
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

  it("keeps the Urdu face and the Latin face on separate marks", () => {
    const editor = make("<p>اردو Hello عبارت</p>");
    editor.commands.selectAll();
    applyEnglishFont(editor, "Inter");
    applyFontFamily(editor, "Gulzar");
    const parts = (editor.getJSON().content?.[0]?.content ?? []) as { text?: string; marks?: { type?: string; attrs?: { fontFamily?: string; latinFontFamily?: string } }[] }[];
    const hello = parts.find((node) => node.text?.includes("Hello"));
    const urdu = parts.find((node) => node.text && /\p{Script=Arabic}/u.test(node.text));
    const helloStyle = hello?.marks?.find((mark) => mark.type === "textStyle")?.attrs;
    const urduStyle = urdu?.marks?.find((mark) => mark.type === "textStyle")?.attrs;
    expect(String(helloStyle?.latinFontFamily ?? "")).toContain("Inter");
    expect(String(helloStyle?.fontFamily ?? "")).not.toContain("Inter");
    expect(String(urduStyle?.fontFamily ?? "")).toContain("Gulzar");
    expect(String(urduStyle?.latinFontFamily ?? "")).not.toContain("Inter");
    const ui = resolveActiveToolbarFormatting(editor, defaultDocumentSettings(), "rtl");
    expect(ui.mixed.fontFamily).toBe(false);
    expect(ui.fontFamily).toBe("Gulzar");
    expect(ui.mixed.latinFontFamily).toBe(false);
    expect(ui.latinFontFamily).toContain("Inter");
    render(<DocumentToolbar editor={editor} dir="rtl" setDir={() => {}} isUr={false} />);
    expect((document.querySelector("[data-studio-font-family]") as HTMLSelectElement).value).toBe("Gulzar");
    expect((document.querySelector("[data-studio-latin-font]") as HTMLSelectElement).value).toBe("Inter");
  });

  it("does not store the Latin face on Urdu typed after an English font", () => {
    const editor = make("<p></p>");
    editor.commands.focus("end");
    applyEnglishFont(editor, "Inter");
    editor.view.dispatch(editor.state.tr.insertText("اردو"));
    editor.state.doc.descendants((node) => {
      if (!node.isText || !/\p{Script=Arabic}/u.test(node.text ?? "")) return;
      const attrs = node.marks.find((mark) => mark.type.name === "textStyle")?.attrs ?? {};
      expect(String(attrs.latinFontFamily ?? "")).not.toContain("Inter");
      expect(String(attrs.fontFamily ?? "")).not.toMatch(/Inter|Arial Unicode/i);
    });
    editor.view.dispatch(editor.state.tr.insertText("A"));
    let latin = false;
    editor.state.doc.descendants((node) => {
      if (!node.isText || !node.text?.includes("A")) return;
      latin = true;
      expect(String(node.marks.find((mark) => mark.type.name === "textStyle")?.attrs?.latinFontFamily ?? "")).toContain("Inter");
    });
    expect(latin).toBe(true);
  });

  it("saves tracking and scale, reloads them, and undoes them", () => {
    const editor = make("<p>Hello اردو</p>");
    editor.commands.selectAll();
    applyTracking(editor, 12);
    applyScale(editor, 80);
    const again = new Editor({ extensions: [...createDocumentStudioExtensions(), LatinScriptRuns], content: editor.getJSON() });
    editors.push(again);
    again.commands.selectAll();
    expect(again.getAttributes("textStyle").trackingPercent).toBe(12);
    expect(again.getAttributes("textStyle").scalePercent).toBe(80);
    undo(editor);
    undo(editor);
    editor.commands.selectAll();
    expect(editor.getAttributes("textStyle").trackingPercent ?? null).toBeNull();
    expect(editor.getAttributes("textStyle").scalePercent ?? null).toBeNull();
    render(<DocumentToolbar editor={editor} dir="rtl" setDir={() => {}} isUr={false} />);
    const tracking = document.querySelector("[data-studio-tracking]") as HTMLInputElement;
    const scale = document.querySelector("[data-studio-scale]") as HTMLInputElement;
    expect(tracking.disabled).toBe(false);
    expect(scale.disabled).toBe(false);
    expect((document.querySelector("[aria-label='K-None']") as HTMLSelectElement).disabled).toBe(false);
    fireEvent.change(tracking, { target: { value: "abc" } });
    fireEvent.keyDown(tracking, { key: "Enter" });
    expect(document.querySelector("[data-studio-field-error='tracking']")?.textContent).toBe("Value not typed properly.");
    editor.commands.selectAll();
    fireEvent.change(tracking, { target: { value: "15" } });
    fireEvent.keyDown(tracking, { key: "Enter" });
    expect(tracking.value).toBe("15%");
    expect(editor.getAttributes("textStyle").trackingPercent).toBe(15);
  });

  it("saves the English font on selected Latin and not on Urdu", () => {
    const editor = make("<p>اردو Hello عبارت</p>");
    editor.commands.selectAll();
    applyEnglishFont(editor, "Inter");
    const parts = (editor.getJSON().content?.[0]?.content ?? []) as { text?: string; marks?: { type?: string; attrs?: { fontFamily?: string; latinFontFamily?: string } }[] }[];
    const hello = parts.find((node) => node.text?.includes("Hello"));
    const urdu = parts.find((node) => node.text && /\p{Script=Arabic}/u.test(node.text));
    expect(String(hello?.marks?.find((mark) => mark.type === "textStyle")?.attrs?.latinFontFamily ?? "")).toContain("Inter");
    expect(String(urdu?.marks?.find((mark) => mark.type === "textStyle")?.attrs?.fontFamily ?? "")).not.toContain("Inter");
    expect(String(urdu?.marks?.find((mark) => mark.type === "textStyle")?.attrs?.latinFontFamily ?? "")).not.toContain("Inter");
    editor.commands.focus("end");
    applyEnglishFont(editor, "Inter");
    const stored = editor.state.storedMarks ?? editor.state.selection.$from.marks();
    expect(stored.some((mark) => String(mark.attrs.latinFontFamily ?? "").includes("Inter"))).toBe(true);
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
    const colour = document.querySelector("[data-studio-geom='colour']")!;
    expect(colour.nextElementSibling?.getAttribute("data-studio-geom")).toBe("scale-icon");
    expect(format.querySelector("[aria-label='Outline']")).toBeNull();
    expect(document.querySelector("[data-studio-toolbar] [data-studio-highlight-button]")).toBeNull();
    expect(document.querySelector("[aria-label='Shade']")).toBeTruthy();
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

  it("keeps zer, comma, question mark and tatweel on the Urdu face", () => {
    const editor = make("<p>کِتاب، کیا؟ کتـــاب Hello</p>");
    editor.commands.selectAll();
    applyFontFamily(editor, "Gulzar");
    applyEnglishFont(editor, "Inter");
    const texts: string[] = [];
    editor.state.doc.descendants((node) => {
      if (!node.isText || !node.text) return;
      texts.push(node.text);
      const attrs = node.marks.find((mark) => mark.type.name === "textStyle")?.attrs ?? {};
      if (hasScript(node.text, "arabic")) {
        expect(node.text.includes("\u0650") || node.text.includes("\u060C") || node.text.includes("\u061F") || node.text.includes("\u0640") || /\p{Script_Extensions=Arabic}/u.test(node.text)).toBe(true);
        expect(String(attrs.fontFamily ?? "")).toContain("Gulzar");
        expect(String(attrs.latinFontFamily ?? "")).not.toContain("Inter");
      }
      if (hasScript(node.text, "latin") && !hasScript(node.text, "arabic")) {
        expect(String(attrs.latinFontFamily ?? "")).toContain("Inter");
        expect(String(attrs.fontFamily ?? "")).not.toContain("Gulzar");
      }
    });
    expect(texts.some((text) => text.includes("کِتاب،"))).toBe(true);
    expect(texts.some((text) => text.includes("کیا؟"))).toBe(true);
    expect(texts.some((text) => text.includes("\u0640"))).toBe(true);
    const ui = resolveActiveToolbarFormatting(editor, defaultDocumentSettings(), "rtl");
    expect(ui.fontFamily).toBe("Gulzar");
    expect(ui.mixed.latinFontFamily).toBe(false);
    expect(ui.latinFontFamily).toContain("Inter");
  });

  it("keeps a Latin phrase with spaces and digits in one run", () => {
    const text = "یہ اردو عبارت ہے Hello Qalam 2026 اور پھر اردو۔";
    const ranges = scriptRanges(text, "latin");
    expect(ranges).toHaveLength(1);
    expect(text.slice(ranges[0].start, ranges[0].end)).toBe("Hello Qalam 2026 ");
    const arabic = scriptRanges("کِتاب، کیا؟ کتـــاب", "arabic").map((range) => "کِتاب، کیا؟ کتـــاب".slice(range.start, range.end));
    expect(arabic).toEqual(["کِتاب،", "کیا؟", "کتـــاب"]);
  });

  it("round-trips Urdu, English, tracking and scale through HTML", () => {
    const editor = make("<p>کِتاب Hello</p>");
    editor.commands.selectAll();
    applyFontFamily(editor, "Gulzar");
    applyEnglishFont(editor, "Inter");
    applyTracking(editor, 15);
    applyScale(editor, 80);
    const html = editor.getHTML();
    expect(html).toContain("data-latin-font");
    expect(html).toContain("data-tracking=\"15\"");
    expect(html).toContain("data-scale=\"80\"");
    const fresh = new Editor({ extensions: [...createDocumentStudioExtensions(), LatinScriptRuns], content: html });
    editors.push(fresh);
    let sawLatin = false;
    let sawArabic = false;
    fresh.state.doc.descendants((node) => {
      if (!node.isText || !node.text) return;
      const attrs = node.marks.find((mark) => mark.type.name === "textStyle")?.attrs ?? {};
      if (node.text.includes("Hello")) {
        sawLatin = true;
        expect(String(attrs.latinFontFamily ?? "")).toContain("Inter");
        expect(attrs.trackingPercent).toBe(15);
        expect(attrs.scalePercent).toBe(80);
      }
      if (hasScript(node.text, "arabic")) {
        sawArabic = true;
        expect(String(attrs.fontFamily ?? "")).toContain("Gulzar");
        expect(attrs.trackingPercent).toBe(15);
        expect(attrs.scalePercent).toBe(80);
      }
    });
    expect(sawLatin && sawArabic).toBe(true);
  });

  it("exports the Latin face, tracking and scale, and leaves Urdu unscaled", () => {
    const editor = make("<p>Hello کِتاب</p>");
    editor.commands.selectAll();
    applyFontFamily(editor, "Gulzar");
    applyEnglishFont(editor, "Inter");
    applyTracking(editor, 20);
    applyScale(editor, 50);
    const doc = editor.getJSON();
    const embedded = requiredPdfEmbedFonts(doc, "rtl", defaultDocumentSettings().typography).map((font) => font.pdf.familyName ?? font.editorFamily);
    expect(embedded).toContain("Inter");
    expect(embedded).toContain("Gulzar");
    const face = (family: string) => ({ familyName: family, regularSources: ["data:font/woff2,abc"], complete: true, declaredRegular: 1, declaredBold: 0, loadedRegular: 1, loadedBold: 0 });
    const pdf = buildPdfHtml(doc, "rtl", { faces: [face("Inter"), face("Gulzar"), face("Noto Nastaliq Urdu")] }, defaultDocumentSettings().typography);
    expect(pdf.fontsUsed).toContain("Inter");
    expect(pdf.fontsUsed).toContain("Gulzar");
    expect(pdf.html).toContain("letter-spacing:0.2em");
    expect(pdf.html).toContain("scaleX(0.5)");
    expect(pdf.html).not.toContain("margin-inline-end");
    expect(pdf.html).toContain('data-pdf-scale="0.5"');
    const spans = [...pdf.html.matchAll(/<span\b[^>]*>[\s\S]*?<\/span>/g)].map((match) => match[0]);
    expect(spans.find((span) => span.includes("Hello"))).toContain("scaleX(0.5)");
    expect(spans.find((span) => span.includes("data-pdf-urdu")) ?? "").not.toContain("scaleX");
    applyScale(editor, 25);
    expect(editor.view.dom.querySelector("[data-studio-latin-run]")?.getAttribute("style")).toContain("scaleX(0.25)");
    applyScale(editor, 400);
    expect(editor.view.dom.querySelector("[data-studio-latin-run]")?.getAttribute("style")).toContain("scaleX(4)");
    applyScale(editor, 100);
    expect(editor.view.dom.querySelector("[data-studio-latin-run]")?.getAttribute("style") ?? "").not.toContain("scaleX");
    expect(latinScaleCss(25, "Hello")).not.toBe(latinScaleCss(400, "Hello"));
    const wrapped = make("<p dir=\"ltr\">Hello Qalam 2026</p>");
    wrapped.commands.selectAll();
    applyScale(wrapped, 400);
    const runs = [...wrapped.view.dom.querySelectorAll("[data-studio-latin-scale]")];
    expect(runs.map((run) => run.textContent)).toEqual(["Hello", " ", "Qalam", " ", "2026"]);
    for (const run of runs) {
      expect(run.getAttribute("style")).toContain("scaleX(4)");
      expect(run.getAttribute("style")).not.toContain("margin-inline-end");
      expect((run as HTMLElement).style.display).toBe("inline");
    }
  });

  it("shows Times for a legacy Latin run", () => {
    const editor = make("<p><span style=\"font-family:Times\">Hello</span> اردو</p>");
    editor.commands.selectAll();
    const ui = resolveActiveToolbarFormatting(editor, defaultDocumentSettings(), "rtl");
    expect(ui.latinFontFamily).toBe("Times");
    expect(ui.mixed.fontFamily).toBe(false);
    render(<DocumentToolbar editor={editor} dir="rtl" setDir={() => {}} isUr={false} />);
    expect((document.querySelector("[data-studio-latin-font]") as HTMLSelectElement).value).toBe("Times");
    expect((document.querySelector("[data-studio-font-family]") as HTMLSelectElement).value).not.toBe("Times");
  });

  it("tabs the ribbon in order and keeps hidden tools clickable", () => {
    const editor = make("<p>Hello</p>");
    render(<DocumentToolbar editor={editor} dir="rtl" setDir={() => {}} isUr={false} />);
    const root = document.querySelector("[data-studio-toolbar]")!;
    const labels = [...root.querySelectorAll<HTMLElement>("button, input, select")].filter((el) => el.tabIndex >= 0).map((el) => el.getAttribute("aria-label"));
    expect(labels).toEqual([
      "Style", "Line spacing options", "Line spacing", "English font", "Bold", "Italic", "Size",
      "Tracking", "Tracking", "Tabs & Indent", "Language",
      "Align left", "Align right", "Align center", "Justify", "Full justify",
      "Interline gap", "Interline gap", "Urdu font", "Left to right", "Right to left", "Colour",
      "Horizontal scale", "Horizontal scale", "Outline", "Text style", "K-None",
    ]);
    expect((document.querySelector("[aria-label='Size presets']") as HTMLElement).tabIndex).toBe(-1);
    for (const label of ["Text color", "Shade", "Dictate"]) {
      const control = document.querySelector(`[aria-label='${label}']`) as HTMLElement;
      expect(control.tabIndex).toBe(-1);
      expect(control.getAttribute("aria-hidden")).toBe("true");
      expect(control.closest("[aria-hidden='true']")).toBeTruthy();
    }
    fireEvent.click(document.querySelector("[aria-label='Shade']")!);
    expect(document.querySelector("[data-studio-highlight-palette]")).toBeTruthy();
    const leading = document.querySelector("[data-studio-leading]") as HTMLInputElement;
    const english = document.querySelector("[data-studio-latin-font]") as HTMLSelectElement;
    leading.focus();
    fireEvent.blur(leading, { relatedTarget: english });
    expect(document.activeElement).toBe(english);
    const gap = document.querySelector("[data-studio-line-gap]") as HTMLInputElement;
    const urdu = document.querySelector("[data-studio-font-family]") as HTMLSelectElement;
    gap.focus();
    fireEvent.blur(gap, { relatedTarget: urdu });
    expect(document.activeElement).toBe(urdu);
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
