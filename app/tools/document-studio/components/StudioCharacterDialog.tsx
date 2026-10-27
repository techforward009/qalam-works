"use client";
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import type { Editor } from "@tiptap/react";
import { createPortal } from "react-dom";
import { studioOverlayRoot, TEXT_EFFECT_LABELS, TOOLBAR_FONT_SIZE_PRESETS } from "../utils/inpageToolbar";
import type { DocumentStudioSettings } from "../utils/documentSettings";
import { listEditorFonts } from "../utils/fontRegistry";
import {
  CHARACTER_HATCHES,
  CHARACTER_KASHIDA,
  CHARACTER_LANGUAGES,
  CHARACTER_STYLES,
  INPAGE_TEXT_COLOURS,
  applyCharacterPreferences,
  characterPatchFromForm,
  hatchDeclarations,
  latinFontChoices,
  readCharacterForm,
  urduFontChoices,
  type CharacterForm,
} from "../utils/characterPreferences";

const FIELD = "data-character-field";
const FONT = "11px Tahoma, sans-serif";
const SUNKEN: CSSProperties = {
  boxSizing: "border-box",
  background: "#fff",
  borderStyle: "solid",
  borderWidth: 1,
  borderColor: "#A0A0A0 #FFFFFF #FFFFFF #A0A0A0",
  boxShadow: "inset 1px 1px 0 #696969, inset -1px -1px 0 #E3E3E3",
};
const RAISED: CSSProperties = {
  boxSizing: "border-box",
  background: "#F0F0F0",
  color: "#000",
  borderStyle: "solid",
  borderWidth: 1,
  borderColor: "#FFFFFF #696969 #696969 #FFFFFF",
  boxShadow: "inset 1px 1px 0 #E3E3E3, inset -1px -1px 0 #A0A0A0",
  font: FONT,
  padding: 0,
};
const ARROW_FACE: CSSProperties = {
  boxSizing: "border-box",
  background: "#F0F0F0",
  borderStyle: "solid",
  borderWidth: 1,
  borderColor: "#E3E3E3 #696969 #696969 #E3E3E3",
  boxShadow: "inset 1px 1px 0 #FFFFFF, inset -1px -1px 0 #A0A0A0",
  padding: 0,
};

function Mark({ text, at }: { text: string; at: number }) {
  return <>{text.slice(0, at)}<span style={{ textDecoration: "underline" }}>{text[at]}</span>{text.slice(at + 1)}</>;
}

function numberIn(raw: string, fallback: number): number {
  const match = raw.trim().match(/-?\d+(?:\.\d+)?/);
  const value = match ? Number(match[0]) : fallback;
  return Number.isFinite(value) ? value : fallback;
}

function withCurrent(options: { value: string; label: string }[], value: string) {
  return value && !options.some((item) => item.value === value) ? [{ value, label: value }, ...options] : options;
}

function triangle(direction: "up" | "down", width: number, height: number): CSSProperties {
  const side = width / 2;
  return direction === "down"
    ? { width: 0, height: 0, borderLeft: `${side}px solid transparent`, borderRight: `${side}px solid transparent`, borderTop: `${height}px solid #000` }
    : { width: 0, height: 0, borderLeft: `${side}px solid transparent`, borderRight: `${side}px solid transparent`, borderBottom: `${height}px solid #000` };
}

function Label({ text, at, x, capTop }: { text: string; at: number; x: number; capTop: number }) {
  return <span style={{ position: "absolute", left: x, top: capTop - 3, lineHeight: "13px", whiteSpace: "nowrap", font: FONT, color: "#000" }}><Mark text={text} at={at} /></span>;
}

function urduMenu(): { value: string; label: string }[] {
  const toolbar = listEditorFonts()
    .filter((font) => font.category === "urdu" && font.editorFamily)
    .map((font) => ({ value: font.editorFamily, label: font.label, id: font.id }));
  const mehr = toolbar.filter((font) => font.id === "mehr-nastaliq-web" || /mehr/i.test(font.label));
  const rest = toolbar.filter((font) => !mehr.includes(font));
  const seen = new Set([...mehr, ...rest].map((font) => font.value));
  const extra = urduFontChoices().filter((font) => !seen.has(font.value));
  return [...mehr, ...rest, ...extra].map(({ value, label }) => ({ value, label }));
}

function hatchPreview(hatch: string): CSSProperties {
  const css = hatchDeclarations(hatch);
  if (!css) return { background: "#fff" };
  return { backgroundColor: "#fff", backgroundImage: css.replace(/^background-image:/, "").replace(/;$/, "") };
}

export function StudioCharacterDialog({ editor, settings, onClose }: { editor: Editor; settings: DocumentStudioSettings; onClose: () => void }) {
  const [form, setForm] = useState<CharacterForm>(() => readCharacterForm(editor, settings));
  const initial = useRef(form);
  const [error, setError] = useState("");
  const [help, setHelp] = useState(false);
  const [menu, setMenu] = useState<null | "size" | "color" | "hatch">(null);
  const root = useRef<HTMLFormElement>(null);
  const sizeRef = useRef<HTMLInputElement>(null);
  const patch = (next: Partial<CharacterForm>) => setForm((current) => ({ ...current, ...next }));
  const close = () => { onClose(); if (!editor.isDestroyed) editor.view.focus(); };
  const apply = () => {
    const parsed = characterPatchFromForm(form, initial.current);
    if (!parsed.ok) {
      setError("Value not typed properly.");
      root.current?.querySelector<HTMLElement>(`[name="${parsed.field}"]`)?.focus();
      return;
    }
    applyCharacterPreferences(editor, parsed.patch);
    close();
  };
  useEffect(() => {
    const input = sizeRef.current;
    input?.focus();
    input?.select();
  }, []);
  const tab = (event: KeyboardEvent) => {
    if (help && event.key !== "Escape") setHelp(false);
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); return; }
    if (event.key !== "Tab") return;
    const items = [...root.current!.querySelectorAll<HTMLElement>(`[${FIELD}]`)];
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (index < 0) return;
    event.preventDefault();
    const next = items[(index + (event.shiftKey ? items.length - 1 : 1)) % items.length];
    next?.focus();
  };
  const bump = (key: "spacing" | "scaling" | "baseline", suffix: string, step: number, min: number, max: number, fallback: number, direction: 1 | -1) => {
    const next = Math.round((numberIn(form[key], fallback) + direction * step) * 10) / 10;
    patch({ [key]: `${Math.min(max, Math.max(min, next))}${suffix}` });
  };
  const openSizeList = () => {
    setMenu("size");
    sizeRef.current?.focus();
    try { sizeRef.current?.showPicker?.(); } catch { /* the drawn list is the fallback */ }
  };
  const latinFonts = withCurrent(latinFontChoices(), form.latinFont);
  const urduFonts = withCurrent(urduMenu(), form.urduFont);
  const languages = CHARACTER_LANGUAGES.filter((item) => item.value === "ur" || item.value === "en");
  const languageOptions = form.language && !languages.some((item) => item.value === form.language)
    ? [{ value: form.language, label: form.language }, ...languages]
    : languages;
  const colors = form.color && !INPAGE_TEXT_COLOURS.some((item) => item.hex.toLowerCase() === form.color.toLowerCase())
    ? [{ label: form.color, hex: form.color }, ...INPAGE_TEXT_COLOURS]
    : INPAGE_TEXT_COLOURS;
  const blank = (value: string) => value === "" ? <option value="">—</option> : null;
  return createPortal(<div data-studio-dialog="en" data-studio-zoom-scope className="fixed inset-0 z-[120] grid place-items-center bg-black/30 p-3" onKeyDown={tab} onMouseDown={(event) => event.stopPropagation()}>
    <style>{`
      [data-studio-character-dialog] select { appearance: none; -webkit-appearance: none; }
      [data-studio-character-dialog] input[list]::-webkit-calendar-picker-indicator { display: none; opacity: 0; pointer-events: none; width: 0; }
      [data-studio-character-dialog] :is(input, select, button):focus { outline: 1px dotted #000; outline-offset: -2px; }
      [data-studio-character-dialog] input[type="checkbox"] { appearance: none; -webkit-appearance: none; margin: 0; }
      [data-studio-character-dialog] input[type="checkbox"]:indeterminate { background: #C0C0C0; }
      [data-studio-character-dialog] input[type="checkbox"]:checked + [data-character-tick],
      [data-studio-character-dialog] input[type="checkbox"]:indeterminate + [data-character-tick] { display: block; }
      [data-studio-character-dialog] input[type="checkbox"]:indeterminate + [data-character-tick] { border-color: #808080; }
    `}</style>
    <form ref={root} role="dialog" aria-modal="true" aria-label="Character" data-studio-character-dialog="true" dir="ltr" onSubmit={(event) => { event.preventDefault(); apply(); }} style={{ position: "relative", width: 390, height: 270, minWidth: 390, maxWidth: 390, minHeight: 270, maxHeight: 270, boxSizing: "border-box", overflow: "hidden", justifySelf: "center", alignSelf: "center", padding: 0, border: 0, color: "#000", background: "linear-gradient(#E3F1FE, #BBDCFD)", boxShadow: "inset 0 0 0 1px #252C33", font: FONT }}>
      <span style={{ position: "absolute", left: 9, top: 7, lineHeight: "13px", font: "12px Segoe UI, Tahoma, sans-serif", fontWeight: 400, color: "#000" }}>Character</span>
      <button type="button" aria-label="Help" tabIndex={-1} onClick={() => setHelp(true)} style={{ position: "absolute", left: 307, top: 0, width: 28, height: 20, boxSizing: "border-box", border: "1px solid #535C66", background: "linear-gradient(#F4F7FB, #C9D4E0)", color: "#000", font: FONT, padding: 0 }}>?</button>
      <button type="button" aria-label="Close" tabIndex={-1} onClick={close} style={{ position: "absolute", left: 335, top: 0, width: 48, height: 20, boxSizing: "border-box", border: "1px solid #5A2318", background: "linear-gradient(#E0A9A3, #C7463A)", color: "#fff", font: "700 12px Tahoma, sans-serif", padding: 0 }}>X</button>
      <div aria-hidden style={{ position: "absolute", left: 7, top: 29, width: 376, height: 234, boxSizing: "border-box", border: "1px solid #5D6C7A", pointerEvents: "none" }} />
      <div data-character-client="true" style={{ position: "absolute", left: 8, top: 30, width: 374, height: 232, background: "#F0F0F0" }} onMouseDown={(event) => { if (!(event.target as HTMLElement).closest("[data-character-menu], [data-character-opener]")) setMenu(null); }}>
        <Label text="Size:" at={2} x={4} capTop={9} />
        <span data-character-box="size" style={{ ...SUNKEN, position: "absolute", left: 38, top: 5, width: 113, height: 21 }}>
          <input ref={sizeRef} name="size" aria-label="Size" accessKey="z" data-character-field="true" list="character-size-presets" value={form.size} onChange={(event) => patch({ size: event.target.value })} style={{ position: "absolute", left: 0, top: 0, width: 94, height: 21, boxSizing: "border-box", border: 0, background: "transparent", color: "#000", font: FONT, padding: "0 0 0 4px" }} />
          <datalist id="character-size-presets">{TOOLBAR_FONT_SIZE_PRESETS.map((pt) => <option key={pt} value={`${pt}pt`} />)}</datalist>
          <button type="button" tabIndex={-1} data-character-opener="size" aria-label="Size list" onMouseDown={(event) => event.stopPropagation()} onClick={openSizeList} style={{ ...ARROW_FACE, position: "absolute", left: 94, top: 2, width: 17, height: 17, display: "grid", placeItems: "center" }}><span style={triangle("down", 7, 4)} /></button>
        </span>
        <Label text="Style:" at={2} x={156} capTop={9} />
        <span data-character-box="style" style={{ ...SUNKEN, position: "absolute", left: 191, top: 5, width: 113, height: 21 }}>
          <select name="textStyle" aria-label="Style" accessKey="y" data-character-field="true" value={form.style} onChange={(event) => patch({ style: event.target.value })} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0, background: "transparent", color: "#000", font: FONT, padding: "0 18px 0 5px" }}>
            {blank(form.style)}
            {CHARACTER_STYLES.map((item) => <option key={item} value={item}>{TEXT_EFFECT_LABELS[item]}</option>)}
          </select>
          <span aria-hidden style={{ ...ARROW_FACE, position: "absolute", left: 94, top: 2, width: 17, height: 17, display: "grid", placeItems: "center", pointerEvents: "none" }}><span style={triangle("down", 7, 4)} /></span>
        </span>
        <button type="submit" data-character-field="true" data-character-box="ok" style={{ position: "absolute", left: 309, top: 5, width: 60, height: 23, boxSizing: "border-box", border: "1px solid #646464", background: "#F0F0F0", color: "#000", font: FONT, padding: 0, boxShadow: "inset 1px 1px 0 #FFFFFF, inset 2px 2px 0 #E3E3E3, inset -1px -1px 0 #696969, inset -2px -2px 0 #A0A0A0" }}>OK</button>
        <Label text="Color:" at={0} x={3} capTop={35} />
        <span data-character-box="color" style={{ ...SUNKEN, position: "absolute", left: 38, top: 29, width: 113, height: 20 }}>
          <select name="color" aria-label="Color" accessKey="c" data-character-field="true" data-character-opener="color" value={form.color} onMouseDown={(event) => { event.preventDefault(); event.stopPropagation(); setMenu("color"); }} onChange={(event) => patch({ color: event.target.value })} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0, background: "transparent", color: "#000", font: FONT, padding: "0 18px 0 19px" }}>
            {blank(form.color)}
            {colors.map((item) => <option key={item.hex} value={item.hex.toUpperCase()}>{item.label}</option>)}
          </select>
          <span aria-hidden style={{ position: "absolute", left: 4, top: 4, width: 12, height: 12, boxSizing: "border-box", border: "1px solid #808080", background: form.color || "transparent", pointerEvents: "none" }} />
          <span aria-hidden style={{ ...ARROW_FACE, position: "absolute", left: 94, top: 2, width: 17, height: 16, display: "grid", placeItems: "center", pointerEvents: "none" }}><span style={triangle("down", 7, 4)} /></span>
        </span>
        <Label text="Hatch:" at={0} x={155} capTop={35} />
        <span data-character-box="hatch" style={{ ...SUNKEN, position: "absolute", left: 191, top: 29, width: 113, height: 20 }}>
          <select name="hatch" aria-label="Hatch" accessKey="h" data-character-field="true" data-character-opener="hatch" value={form.hatch} onMouseDown={(event) => { event.preventDefault(); event.stopPropagation(); setMenu("hatch"); }} onChange={(event) => patch({ hatch: event.target.value })} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0, background: "transparent", color: "#000", font: FONT, padding: "0 18px 0 5px" }}>
            {blank(form.hatch)}
            {CHARACTER_HATCHES.map((item) => <option key={item} value={item}>{item === "none" ? "None" : item[0].toUpperCase() + item.slice(1)}</option>)}
          </select>
          <span aria-hidden style={{ ...ARROW_FACE, position: "absolute", left: 94, top: 2, width: 17, height: 16, display: "grid", placeItems: "center", pointerEvents: "none" }}><span style={triangle("down", 7, 4)} /></span>
        </span>
        <button type="button" data-character-field="true" data-character-box="cancel" onClick={close} style={{ ...RAISED, position: "absolute", left: 309, top: 31, width: 60, height: 23 }}>Cancel</button>
        <Label text="Latin Font Name:" at={2} x={3} capTop={59} />
        <span data-character-box="latinFont" style={{ ...SUNKEN, position: "absolute", left: 95, top: 54, width: 210, height: 20 }}>
          <select name="latinFont" aria-label="Latin Font Name" accessKey="t" data-character-field="true" value={form.latinFont} onChange={(event) => patch({ latinFont: event.target.value })} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0, background: "transparent", color: "#000", font: FONT, padding: "0 20px 0 5px" }}>
            {blank(form.latinFont)}
            {latinFonts.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <span aria-hidden style={{ ...ARROW_FACE, position: "absolute", left: 191, top: 2, width: 17, height: 16, display: "grid", placeItems: "center", pointerEvents: "none" }}><span style={triangle("down", 7, 4)} /></span>
        </span>
        <button type="button" data-character-field="true" data-character-box="help" onClick={() => setHelp(true)} style={{ ...RAISED, position: "absolute", left: 309, top: 57, width: 60, height: 23 }}>Help</button>
        <Label text="Urdu Font Name:" at={0} x={2} capTop={87} />
        <span data-character-box="urduFont" style={{ ...SUNKEN, position: "absolute", left: 95, top: 83, width: 210, height: 21 }}>
          <select name="urduFont" aria-label="Urdu Font Name" accessKey="u" data-character-field="true" value={form.urduFont} onChange={(event) => patch({ urduFont: event.target.value })} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0, background: "transparent", color: "#000", font: FONT, padding: "0 20px 0 5px" }}>
            {blank(form.urduFont)}
            {urduFonts.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <span aria-hidden style={{ ...ARROW_FACE, position: "absolute", left: 191, top: 2, width: 17, height: 17, display: "grid", placeItems: "center", pointerEvents: "none" }}><span style={triangle("down", 7, 4)} /></span>
        </span>
        <Label text="Language:" at={0} x={2} capTop={113} />
        <span data-character-box="language" style={{ ...SUNKEN, position: "absolute", left: 95, top: 109, width: 210, height: 21 }}>
          <select name="language" aria-label="Language" accessKey="l" data-character-field="true" value={form.language} onChange={(event) => patch({ language: event.target.value })} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0, background: "transparent", color: "#000", font: FONT, padding: "0 20px 0 5px" }}>
            {blank(form.language)}
            {languageOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <span aria-hidden style={{ ...ARROW_FACE, position: "absolute", left: 191, top: 2, width: 17, height: 17, display: "grid", placeItems: "center", pointerEvents: "none" }}><span style={triangle("down", 7, 4)} /></span>
        </span>
        <Check name="bold" accessKey="b" value={form.bold} onChange={(bold) => patch({ bold })} x={2} y={146} text="Bold" at={0} textX={20} capTop={148} />
        <Check name="italics" accessKey="i" value={form.italics} onChange={(italics) => patch({ italics })} x={50} y={146} text="Italics" at={0} textX={68} capTop={148} />
        <Check name="outline" accessKey="o" value={form.outline} onChange={(outline) => patch({ outline })} x={105} y={146} text="Outline" at={0} textX={123} capTop={148} />
        <Label text="Kashida:" at={0} x={195} capTop={145} />
        <span data-character-box="kashida" style={{ ...SUNKEN, position: "absolute", left: 239, top: 138, width: 113, height: 21 }}>
          <select name="kashida" aria-label="Kashida" accessKey="k" data-character-field="true" value={form.kashida} onChange={(event) => patch({ kashida: event.target.value })} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0, background: "transparent", color: "#000", font: FONT, padding: "0 18px 0 5px" }}>
            {blank(form.kashida)}
            {CHARACTER_KASHIDA.map((item) => <option key={item} value={item}>{item === "none" ? "None" : item[0].toUpperCase() + item.slice(1)}</option>)}
          </select>
          <span aria-hidden style={{ ...ARROW_FACE, position: "absolute", left: 94, top: 2, width: 17, height: 17, display: "grid", placeItems: "center", pointerEvents: "none" }}><span style={triangle("down", 7, 4)} /></span>
        </span>
        <Label text="Spacing:" at={0} x={2} capTop={171} />
        <Spin box="spacing" name="spacing" label="Spacing" accessKey="s" x={47} y={166} value={form.spacing} onChange={(spacing) => patch({ spacing })} onUp={() => bump("spacing", "%", 1, -200, 200, 0, 1)} onDown={() => bump("spacing", "%", 1, -200, 200, 0, -1)} />
        <Label text="Scaling:" at={3} x={111} capTop={171} />
        <Spin box="scaling" name="scaling" label="Scaling" accessKey="l" x={155} y={166} value={form.scaling} onChange={(scaling) => patch({ scaling })} onUp={() => bump("scaling", "%", 1, 1, 400, 100, 1)} onDown={() => bump("scaling", "%", 1, 1, 400, 100, -1)} />
        <Label text="Baseline Shift:" at={6} x={222} capTop={171} />
        <Spin box="baseline" name="baseline" label="Baseline Shift" accessKey="n" x={293} y={166} value={form.baseline} onChange={(baseline) => patch({ baseline })} onUp={() => bump("baseline", "pt", 1, -96, 96, 0, 1)} onDown={() => bump("baseline", "pt", 1, -96, 96, 0, -1)} />
        <Check name="meem" accessKey="m" value={form.meem} onChange={(meem) => patch({ meem })} x={5} y={198} text="Meem" at={0} textX={23} capTop={200} />
        <Check name="be" accessKey="r" ariaLabel="Re" value={form.be} onChange={(be) => patch({ be })} x={62} y={198} text="Re" at={0} textX={80} capTop={200} />
        <Check name="jeem" accessKey="j" value={form.jeem} onChange={(jeem) => patch({ jeem })} x={104} y={199} text="Jeem" at={0} textX={122} capTop={201} />
        <Check name="ain" accessKey="a" value={form.ain} onChange={(ain) => patch({ ain })} x={155} y={199} text="Ain" at={0} textX={173} capTop={201} />
        <Check name="kaaf" accessKey="f" value={form.kaaf} onChange={(kaaf) => patch({ kaaf })} x={194} y={199} text="Kaaf" at={3} textX={213} capTop={201} />
        {menu === "size" ? <div data-character-menu="size" style={menuStyle(38, 27, 113)}>
          {TOOLBAR_FONT_SIZE_PRESETS.map((pt) => <button key={pt} type="button" tabIndex={-1} onMouseDown={(event) => event.preventDefault()} onClick={() => { patch({ size: `${pt}pt` }); setMenu(null); }} style={menuItem}>{pt}pt</button>)}
        </div> : null}
        {menu === "color" ? <div data-character-menu="color" style={menuStyle(38, 50, 140)}>
          {colors.map((item) => <button key={item.hex} type="button" tabIndex={-1} onMouseDown={(event) => event.preventDefault()} onClick={() => { patch({ color: item.hex.toUpperCase() }); setMenu(null); }} style={menuItem}><span style={{ width: 12, height: 12, boxSizing: "border-box", border: "1px solid #808080", background: item.hex, flex: "0 0 auto" }} />{item.label}</button>)}
        </div> : null}
        {menu === "hatch" ? <div data-character-menu="hatch" style={menuStyle(191, 50, 140)}>
          {CHARACTER_HATCHES.map((item) => <button key={item} type="button" tabIndex={-1} onMouseDown={(event) => event.preventDefault()} onClick={() => { patch({ hatch: item }); setMenu(null); }} style={menuItem}><span style={{ width: 28, height: 12, boxSizing: "border-box", border: "1px solid #808080", flex: "0 0 auto", ...hatchPreview(item) }} />{item === "none" ? "None" : item[0].toUpperCase() + item.slice(1)}</button>)}
        </div> : null}
        {error ? <p role="alert" data-studio-character-error="true" title={error} style={{ position: "absolute", left: 5, top: 213, width: 300, margin: 0, font: FONT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{error}</p> : null}
        {help ? <div data-studio-character-help="true" onMouseDown={() => setHelp(false)} style={{ position: "absolute", left: 5, top: 168, width: 300, zIndex: 6, background: "#fff", border: "1px solid #000", padding: 4, font: FONT }}>These values apply to every selected character. Size, fonts, bold and italics use the same commands as the ribbon. Cancel or Escape leaves the text unchanged.</div> : null}
      </div>
    </form>
  </div>, studioOverlayRoot());
}

function menuStyle(left: number, top: number, width: number): CSSProperties {
  return { position: "absolute", left, top, width, zIndex: 5, background: "#fff", border: "1px solid #000", boxShadow: "1px 1px 0 #808080", maxHeight: 160, overflow: "auto" };
}

const menuItem: CSSProperties = { display: "flex", alignItems: "center", gap: 6, width: "100%", height: 18, border: 0, background: "#fff", color: "#000", font: FONT, textAlign: "left", padding: "0 4px" };

function Spin({ box, name, label, accessKey, x, y, value, onChange, onUp, onDown }: { box: string; name: string; label: string; accessKey: string; x: number; y: number; value: string; onChange: (next: string) => void; onUp: () => void; onDown: () => void }) {
  return <span data-character-box={box} style={{ ...SUNKEN, position: "absolute", left: x, top: y, width: 60, height: 20 }}>
    <input name={name} aria-label={label} accessKey={accessKey} data-character-field="true" value={value} onChange={(event) => onChange(event.target.value)} style={{ position: "absolute", left: 0, top: 0, width: 44, height: 20, boxSizing: "border-box", border: 0, background: "transparent", color: "#000", font: FONT, padding: "0 0 0 4px" }} />
    <span style={{ position: "absolute", left: 42, top: 2, width: 16, height: 16 }}>
      <button type="button" tabIndex={-1} aria-label={`${label} up`} onClick={onUp} style={{ ...ARROW_FACE, position: "absolute", left: 0, top: 0, width: 16, height: 8, display: "grid", placeItems: "center" }}><span style={triangle("up", 5, 3)} /></button>
      <button type="button" tabIndex={-1} aria-label={`${label} down`} onClick={onDown} style={{ ...ARROW_FACE, position: "absolute", left: 0, top: 8, width: 16, height: 8, display: "grid", placeItems: "center" }}><span style={triangle("down", 5, 3)} /></button>
    </span>
  </span>;
}

function Check({ name, accessKey, ariaLabel, value, onChange, x, y, text, at, textX, capTop }: { name: string; accessKey?: string; ariaLabel?: string; value: boolean | null; onChange: (checked: boolean) => void; x: number; y: number; text: string; at: number; textX: number; capTop: number }) {
  const box = useRef<HTMLInputElement>(null);
  useEffect(() => { if (box.current) box.current.indeterminate = value === null; }, [value]);
  return <label style={{ position: "absolute", left: x, top: y, width: textX - x + 32, height: 16, margin: 0 }}>
    <span data-character-box={name} style={{ ...SUNKEN, position: "absolute", left: 0, top: 0, width: 13, height: 13 }}>
      <input ref={box} name={name} type="checkbox" aria-label={ariaLabel ?? text} accessKey={accessKey} data-character-field="true" checked={value === true} onChange={(event) => onChange(event.target.checked)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0, background: "transparent" }} />
      <span data-character-tick aria-hidden style={{ display: "none", position: "absolute", left: 2, top: 3, width: 7, height: 4, boxSizing: "border-box", borderLeft: "2px solid #000", borderBottom: "2px solid #000", transform: "rotate(-45deg)", pointerEvents: "none" }} />
    </span>
    <span style={{ position: "absolute", left: textX - x, top: capTop - 3 - y, lineHeight: "13px", whiteSpace: "nowrap", font: FONT }}><Mark text={text} at={at} /></span>
  </label>;
}
