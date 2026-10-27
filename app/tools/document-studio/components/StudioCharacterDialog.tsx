"use client";
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import type { Editor } from "@tiptap/react";
import { createPortal } from "react-dom";
import { studioOverlayRoot } from "../utils/inpageToolbar";
import { TEXT_EFFECT_LABELS } from "../utils/inpageToolbar";
import type { DocumentStudioSettings } from "../utils/documentSettings";
import {
  CHARACTER_HATCHES,
  CHARACTER_KASHIDA,
  CHARACTER_LANGUAGES,
  CHARACTER_STYLES,
  INPAGE_TEXT_COLOURS,
  applyCharacterPreferences,
  characterPatchFromForm,
  latinFontChoices,
  readCharacterForm,
  urduFontChoices,
  type CharacterForm,
} from "../utils/characterPreferences";

const FIELD = "data-character-field";
const inputStyle: CSSProperties = { height: 18, boxSizing: "border-box", border: "1px solid #808080", background: "#fff", color: "#000", font: "11px Tahoma, sans-serif", padding: "0 2px" };
const buttonStyle: CSSProperties = { width: 72, height: 22, boxSizing: "border-box", background: "#f0f0f0", border: "1px solid #808080", boxShadow: "inset 1px 1px #fff, inset -1px -1px #404040", font: "11px Tahoma, sans-serif", color: "#000" };

function Mark({ text, at }: { text: string; at: number }) {
  return <>{text.slice(0, at)}<span style={{ textDecoration: "underline" }}>{text[at]}</span>{text.slice(at + 1)}</>;
}

function MixedBox({ name, accessKey, value, onChange, children }: { name: string; accessKey?: string; value: boolean | null; onChange: (checked: boolean) => void; children: ReactNode }) {
  const box = useRef<HTMLInputElement>(null);
  useEffect(() => { if (box.current) box.current.indeterminate = value === null; }, [value]);
  return <label style={{ display: "inline-flex", gap: 4, alignItems: "center", marginRight: 8 }}><input ref={box} name={name} type="checkbox" accessKey={accessKey} data-character-field="true" checked={value === true} onChange={(event) => onChange(event.target.checked)} /><span>{children}</span></label>;
}

function blank(value: string) {
  return value === "" ? <option value="">—</option> : null;
}

function withCurrent(options: { value: string; label: string }[], value: string) {
  return value && !options.some((item) => item.value === value) ? [{ value, label: value }, ...options] : options;
}

export function StudioCharacterDialog({ editor, settings, onClose }: { editor: Editor; settings: DocumentStudioSettings; onClose: () => void }) {
  const [form, setForm] = useState<CharacterForm>(() => readCharacterForm(editor, settings));
  const initial = useRef(form);
  const [error, setError] = useState("");
  const [help, setHelp] = useState(false);
  const root = useRef<HTMLFormElement>(null);
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
  useEffect(() => { root.current?.querySelector<HTMLElement>(`[${FIELD}]`)?.focus(); }, []);
  const tab = (event: KeyboardEvent) => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); return; }
    if (event.key !== "Tab") return;
    const items = [...root.current!.querySelectorAll<HTMLElement>(`[${FIELD}]`)];
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (index < 0) return;
    event.preventDefault();
    const next = items[(index + (event.shiftKey ? items.length - 1 : 1)) % items.length];
    next?.focus();
  };
  const latinFonts = withCurrent(latinFontChoices(), form.latinFont);
  const urduFonts = withCurrent(urduFontChoices(), form.urduFont);
  const colors = form.color && !INPAGE_TEXT_COLOURS.some((item) => item.hex.toLowerCase() === form.color.toLowerCase())
    ? [{ label: form.color, hex: form.color }, ...INPAGE_TEXT_COLOURS]
    : INPAGE_TEXT_COLOURS;
  const swatch = form.color || "transparent";
  return createPortal(<div data-studio-dialog="en" data-studio-zoom-scope className="fixed inset-0 z-[120] grid place-items-center bg-black/30 p-3" onKeyDown={tab} onMouseDown={(event) => event.stopPropagation()}>
    <form ref={root} role="dialog" aria-modal="true" aria-label="Character" data-studio-character-dialog="true" dir="ltr" onSubmit={(event) => { event.preventDefault(); apply(); }} style={{ width: "min(480px, 100%)", maxHeight: "calc(100vh - 24px)", overflow: "auto", background: "#f0f0f0", color: "#000", border: "1px solid #fff", boxShadow: "inset -1px -1px #808080, 1px 1px 0 #000", font: "11px Tahoma, sans-serif", padding: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontWeight: 700 }}>Character</span>
        <button type="button" aria-label="Close" tabIndex={-1} onClick={close} style={{ ...buttonStyle, width: 18, height: 16, lineHeight: "12px" }}>×</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr) 76px", gap: "4px 8px", alignItems: "center" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, gridColumn: 1, gridRow: 1 }}>
          <span><Mark text="Size" at={0} /></span>
          <input name="size" aria-label="Size" accessKey="s" data-character-field="true" value={form.size} onChange={(event) => patch({ size: event.target.value })} style={{ ...inputStyle, width: 64 }} />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, gridColumn: 2, gridRow: 1 }}>
          <span><Mark text="Style" at={1} /></span>
          <select name="style" aria-label="Style" accessKey="t" data-character-field="true" value={form.style} onChange={(event) => patch({ style: event.target.value })} style={{ ...inputStyle, width: 88 }}>
            {blank(form.style)}
            {CHARACTER_STYLES.map((item) => <option key={item} value={item}>{TEXT_EFFECT_LABELS[item]}</option>)}
          </select>
        </label>
        <button type="submit" data-character-field="true" style={{ ...buttonStyle, gridColumn: 3, gridRow: 1 }}>OK</button>
        <label style={{ display: "flex", alignItems: "center", gap: 6, gridColumn: 1, gridRow: 2 }}>
          <span><Mark text="Color" at={0} /></span>
          <span aria-hidden style={{ width: 14, height: 14, background: swatch, border: "1px solid #000", flex: "0 0 auto" }} />
          <select name="color" aria-label="Color" accessKey="c" data-character-field="true" value={form.color} onChange={(event) => patch({ color: event.target.value })} style={{ ...inputStyle, width: 88 }}>
            {blank(form.color)}
            {colors.map((item) => <option key={item.hex} value={item.hex.toUpperCase()}>{item.label}</option>)}
          </select>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, gridColumn: 2, gridRow: 2 }}>
          <span><Mark text="Hatch" at={0} /></span>
          <select name="hatch" aria-label="Hatch" accessKey="h" data-character-field="true" value={form.hatch} onChange={(event) => patch({ hatch: event.target.value })} style={{ ...inputStyle, width: 88 }}>
            {blank(form.hatch)}
            {CHARACTER_HATCHES.map((item) => <option key={item} value={item}>{item === "none" ? "None" : item[0].toUpperCase() + item.slice(1)}</option>)}
          </select>
        </label>
        <button type="button" data-character-field="true" onClick={close} style={{ ...buttonStyle, gridColumn: 3, gridRow: 2 }}>Cancel</button>
        <label style={{ display: "flex", alignItems: "center", gap: 6, gridColumn: "1 / span 2", gridRow: 3 }}>
          <span style={{ flex: "0 0 auto" }}><Mark text="Latin Font Name" at={0} /></span>
          <select name="latinFont" aria-label="Latin Font Name" accessKey="l" data-character-field="true" value={form.latinFont} onChange={(event) => patch({ latinFont: event.target.value })} style={{ ...inputStyle, flex: 1, minWidth: 0 }}>
            {blank(form.latinFont)}
            {latinFonts.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <button type="button" data-character-field="true" onClick={() => setHelp(true)} style={{ ...buttonStyle, gridColumn: 3, gridRow: 3 }}>Help</button>
        <label style={{ display: "flex", alignItems: "center", gap: 6, gridColumn: "1 / span 2", gridRow: 4 }}>
          <span style={{ flex: "0 0 auto" }}><Mark text="Urdu Font Name" at={0} /></span>
          <select name="urduFont" aria-label="Urdu Font Name" accessKey="u" data-character-field="true" value={form.urduFont} onChange={(event) => patch({ urduFont: event.target.value })} style={{ ...inputStyle, flex: 1, minWidth: 0 }}>
            {blank(form.urduFont)}
            {urduFonts.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, gridColumn: "1 / span 2", gridRow: 5 }}>
          <span><Mark text="Language" at={3} /></span>
          <select name="language" aria-label="Language" accessKey="g" data-character-field="true" value={form.language} onChange={(event) => patch({ language: event.target.value })} style={{ ...inputStyle, width: 140 }}>
            {blank(form.language)}
            {CHARACTER_LANGUAGES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <div style={{ gridColumn: "1 / span 3", gridRow: 6, display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
          <MixedBox name="bold" accessKey="b" value={form.bold} onChange={(bold) => patch({ bold })}><Mark text="Bold" at={0} /></MixedBox>
          <MixedBox name="italics" accessKey="i" value={form.italics} onChange={(italics) => patch({ italics })}><Mark text="Italics" at={0} /></MixedBox>
          <MixedBox name="outline" accessKey="o" value={form.outline} onChange={(outline) => patch({ outline })}><Mark text="Outline" at={0} /></MixedBox>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
            <span><Mark text="Kashida" at={0} /></span>
            <select name="kashida" aria-label="Kashida" accessKey="k" data-character-field="true" value={form.kashida} onChange={(event) => patch({ kashida: event.target.value })} style={{ ...inputStyle, width: 88 }}>
              {blank(form.kashida)}
              {CHARACTER_KASHIDA.map((item) => <option key={item} value={item}>{item === "none" ? "None" : item[0].toUpperCase() + item.slice(1)}</option>)}
            </select>
          </label>
        </div>
        <div style={{ gridColumn: "1 / span 3", gridRow: 7, display: "flex", alignItems: "center", gap: 10 }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><span><Mark text="Spacing" at={1} /></span><input name="spacing" aria-label="Spacing" accessKey="p" data-character-field="true" value={form.spacing} onChange={(event) => patch({ spacing: event.target.value })} style={{ ...inputStyle, width: 52 }} /></label>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><span><Mark text="Scaling" at={5} /></span><input name="scaling" aria-label="Scaling" accessKey="n" data-character-field="true" value={form.scaling} onChange={(event) => patch({ scaling: event.target.value })} style={{ ...inputStyle, width: 52 }} /></label>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><span><Mark text="Baseline Shift" at={3} /></span><input name="baseline" aria-label="Baseline Shift" accessKey="e" data-character-field="true" value={form.baseline} onChange={(event) => patch({ baseline: event.target.value })} style={{ ...inputStyle, width: 52 }} /></label>
        </div>
        <div style={{ gridColumn: "1 / span 3", gridRow: 8 }}>
          <MixedBox name="meem" accessKey="m" value={form.meem} onChange={(meem) => patch({ meem })}><Mark text="Meem" at={0} /></MixedBox>
          <MixedBox name="be" value={form.be} onChange={(be) => patch({ be })}>Be</MixedBox>
          <MixedBox name="jeem" accessKey="j" value={form.jeem} onChange={(jeem) => patch({ jeem })}><Mark text="Jeem" at={0} /></MixedBox>
          <MixedBox name="ain" accessKey="a" value={form.ain} onChange={(ain) => patch({ ain })}><Mark text="Ain" at={0} /></MixedBox>
          <MixedBox name="kaaf" accessKey="f" value={form.kaaf} onChange={(kaaf) => patch({ kaaf })}>Kaa<span style={{ textDecoration: "underline" }}>f</span></MixedBox>
        </div>
      </div>
      {error ? <p role="alert" data-studio-character-error="true" style={{ margin: "6px 0 0" }}>{error}</p> : null}
      {help ? <p data-studio-character-help="true" style={{ margin: "6px 0 0" }}>These values apply to every selected character. Size, fonts, bold and italics use the same commands as the ribbon. Cancel or Escape leaves the text unchanged.</p> : null}
    </form>
  </div>, studioOverlayRoot());
}
