"use client";
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import type { Editor } from "@tiptap/react";
import { createPortal } from "react-dom";
import { studioOverlayRoot } from "../utils/inpageToolbar";
import type { DocumentStudioSettings } from "../utils/documentSettings";
import {
  PARAGRAPH_ALIGNS,
  PARAGRAPH_BREAKS,
  applyParagraphPreferences,
  preferencesFromForm,
  readParagraphForm,
  type ParagraphForm,
} from "../utils/paragraphPreferences";

const FIELD = "data-paragraph-field";
const inputStyle: CSSProperties = { width: 72, height: 18, boxSizing: "border-box", border: "1px solid #808080", background: "#fff", color: "#000", font: "11px Tahoma, sans-serif", padding: "0 2px" };
const groupStyle: CSSProperties = { border: "1px solid #808080", margin: 0, padding: "8px 8px 6px", minWidth: 0 };
const legendStyle: CSSProperties = { padding: "0 3px", font: "11px Tahoma, sans-serif" };
const buttonStyle: CSSProperties = { width: 72, height: 22, boxSizing: "border-box", background: "#f0f0f0", border: "1px solid #808080", boxShadow: "inset 1px 1px #fff, inset -1px -1px #404040", font: "11px Tahoma, sans-serif", color: "#000" };

function Mark({ text, at }: { text: string; at: number }) {
  return <>{text.slice(0, at)}<u>{text[at]}</u>{text.slice(at + 1)}</>;
}

function Row({ label, at, children }: { label: string; at: number; children: ReactNode }) {
  return <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 3 }}><span><Mark text={label} at={at} /></span>{children}</label>;
}

export function StudioParagraphDialog({ editor, settings, onClose }: { editor: Editor; settings: DocumentStudioSettings; onClose: () => void }) {
  const [form, setForm] = useState<ParagraphForm>(() => readParagraphForm(editor, settings));
  const [error, setError] = useState("");
  const [help, setHelp] = useState(false);
  const root = useRef<HTMLFormElement>(null);
  const patch = (next: Partial<ParagraphForm>) => setForm((current) => ({ ...current, ...next }));
  const close = () => { onClose(); if (!editor.isDestroyed) editor.view.focus(); };
  const apply = () => {
    const parsed = preferencesFromForm(form);
    if (!parsed.ok) {
      setError("Value not typed properly.");
      root.current?.querySelector<HTMLElement>(`[name="${parsed.field}"]`)?.focus();
      return;
    }
    applyParagraphPreferences(editor, parsed.attrs);
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
  return createPortal(<div data-studio-dialog="en" data-studio-zoom-scope className="fixed inset-0 z-[120] grid place-items-center bg-black/30 p-3" onKeyDown={tab} onMouseDown={(event) => event.stopPropagation()}>
    <form ref={root} role="dialog" aria-modal="true" aria-label="Paragraph Preferences" data-studio-paragraph-dialog="true" dir="ltr" onSubmit={(event) => { event.preventDefault(); apply(); }} style={{ width: "min(520px, 100%)", maxHeight: "calc(100vh - 24px)", overflow: "auto", background: "#f0f0f0", color: "#000", border: "1px solid #fff", boxShadow: "inset -1px -1px #808080, 1px 1px 0 #000", font: "11px Tahoma, sans-serif", padding: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontWeight: 700 }}>Paragraph Preferences</span>
        <button type="button" aria-label="Close" tabIndex={-1} onClick={close} style={{ ...buttonStyle, width: 18, height: 16, lineHeight: "12px" }}>×</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.35fr) minmax(0,1fr) 80px", gap: 8, alignItems: "start" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, gridColumn: 1, gridRow: 1 }}>
          <span><Mark text="Alignment" at={0} /></span>
          <select name="alignment" aria-label="Alignment" accessKey="a" data-paragraph-field="true" value={form.alignment} onChange={(event) => patch({ alignment: event.target.value })} style={{ ...inputStyle, width: 110 }}>
            {form.alignment === "" ? <option value="">—</option> : null}
            {PARAGRAPH_ALIGNS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <fieldset role="group" aria-label="Breaks" style={{ ...groupStyle, gridColumn: 2, gridRow: "1 / span 2" }}>
          <legend style={legendStyle}><Mark text="Breaks" at={5} /></legend>
          <select name="breaks" aria-label="Breaks" accessKey="s" data-paragraph-field="true" value={form.breaks} onChange={(event) => patch({ breaks: event.target.value })} style={{ ...inputStyle, width: "100%" }}>
            {PARAGRAPH_BREAKS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <label style={{ display: "flex", gap: 4, marginTop: 4, alignItems: "center" }}><input name="keepTogether" type="checkbox" accessKey="k" data-paragraph-field="true" checked={form.keepTogether} onChange={(event) => patch({ keepTogether: event.target.checked })} /><span><Mark text="Keep Together" at={0} /></span></label>
          <label style={{ display: "flex", gap: 4, marginTop: 2, alignItems: "center" }}><input name="keepWithNext" type="checkbox" accessKey="n" data-paragraph-field="true" checked={form.keepWithNext} onChange={(event) => patch({ keepWithNext: event.target.checked })} /><span>Keep With <u>N</u>ext</span></label>
          <Row label="Widows" at={0}><input name="widows" aria-label="Widows" accessKey="w" data-paragraph-field="true" value={form.widows} onChange={(event) => patch({ widows: event.target.value })} style={{ ...inputStyle, width: 42 }} /></Row>
          <Row label="Orphans" at={0}><input name="orphans" aria-label="Orphans" accessKey="o" data-paragraph-field="true" value={form.orphans} onChange={(event) => patch({ orphans: event.target.value })} style={{ ...inputStyle, width: 42 }} /></Row>
        </fieldset>
        <fieldset role="group" aria-label="Indents" style={{ ...groupStyle, gridColumn: 1, gridRow: 2 }}>
          <legend style={legendStyle}>Indents</legend>
          <Row label="Beginning" at={0}><input name="beginning" aria-label="Beginning" accessKey="b" data-paragraph-field="true" value={form.beginning} onChange={(event) => patch({ beginning: event.target.value })} style={inputStyle} /></Row>
          <Row label="End" at={0}><input name="end" aria-label="End" accessKey="e" data-paragraph-field="true" value={form.end} onChange={(event) => patch({ end: event.target.value })} style={inputStyle} /></Row>
          <Row label="First Line" at={0}><input name="firstLine" aria-label="First Line" accessKey="f" data-paragraph-field="true" value={form.firstLine} onChange={(event) => patch({ firstLine: event.target.value })} style={inputStyle} /></Row>
        </fieldset>
        <fieldset role="group" aria-label="Line Spacing" style={{ ...groupStyle, gridColumn: 1, gridRow: 3 }}>
          <legend style={legendStyle}>Line Spacing</legend>
          <Row label="Line Height" at={5}><input name="lineHeight" aria-label="Line Height" accessKey="h" data-paragraph-field="true" value={form.lineHeight} onChange={(event) => patch({ lineHeight: event.target.value })} style={inputStyle} /></Row>
          <Row label="Interline Gap" at={0}><input name="interlineGap" aria-label="Interline Gap" accessKey="i" data-paragraph-field="true" value={form.interlineGap} onChange={(event) => patch({ interlineGap: event.target.value })} style={inputStyle} /></Row>
        </fieldset>
        <fieldset role="group" aria-label="Paragraph Spacing" style={{ ...groupStyle, gridColumn: 2, gridRow: 3 }}>
          <legend style={legendStyle}>Paragraph Spacing</legend>
          <Row label="Before" at={4}><input name="before" aria-label="Before" accessKey="r" data-paragraph-field="true" value={form.before} onChange={(event) => patch({ before: event.target.value })} style={inputStyle} /></Row>
          <Row label="After" at={2}><input name="after" aria-label="After" accessKey="t" data-paragraph-field="true" value={form.after} onChange={(event) => patch({ after: event.target.value })} style={inputStyle} /></Row>
        </fieldset>
        <fieldset role="group" aria-label="Tab" style={{ ...groupStyle, gridColumn: 1, gridRow: 4 }}>
          <legend style={legendStyle}>Tab</legend>
          <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <input name="tabDefault" type="checkbox" accessKey="d" data-paragraph-field="true" checked={form.tabDefault} onChange={(event) => patch({ tabDefault: event.target.checked })} />
            <span><Mark text="Default Stop" at={0} /></span>
            <input name="tabStop" aria-label="Default Stop" data-paragraph-field="true" value={form.tabStop} onChange={(event) => patch({ tabStop: event.target.value })} style={{ ...inputStyle, width: 64 }} />
          </label>
        </fieldset>
        <fieldset role="group" aria-label="Character Alignment" style={{ ...groupStyle, gridColumn: 2, gridRow: 4 }}>
          <legend style={legendStyle}>Character Alignment</legend>
          <label style={{ marginRight: 8 }}><input type="radio" name="characterAlign" value="latin" accessKey="l" data-paragraph-field="true" checked={form.characterAlign === "latin"} onChange={() => patch({ characterAlign: "latin" })} /> <span><u>L</u>atin</span></label>
          <label><input type="radio" name="characterAlign" value="arabic" accessKey="c" data-paragraph-field="true" checked={form.characterAlign === "arabic"} onChange={() => patch({ characterAlign: "arabic" })} /> <span>Arabi<u>c</u></span></label>
        </fieldset>
        <label style={{ gridColumn: "1 / span 2", gridRow: 5, display: "flex", gap: 4, alignItems: "center" }}>
          <input name="toc" type="checkbox" accessKey="u" data-paragraph-field="true" checked={form.toc} onChange={(event) => patch({ toc: event.target.checked })} />
          <span>Add to table of co<u>u</u>ntents</span>
        </label>
        <div style={{ gridColumn: 3, gridRow: "1 / span 2", display: "flex", flexDirection: "column", gap: 6 }}>
          <button type="submit" data-paragraph-field="true" style={buttonStyle}>OK</button>
          <button type="button" data-paragraph-field="true" onClick={close} style={buttonStyle}>Cancel</button>
          <button type="button" data-paragraph-field="true" onClick={() => setHelp(true)} style={buttonStyle}>Help</button>
        </div>
      </div>
      {error ? <p role="alert" data-studio-paragraph-error="true" style={{ margin: "6px 0 0" }}>{error}</p> : null}
      {help ? <p data-studio-paragraph-help="true" style={{ margin: "6px 0 0" }}>These values apply to every selected paragraph. Line Height and Interline Gap use the same spacing as the ribbon. Cancel or Escape leaves the text unchanged.</p> : null}
    </form>
  </div>, studioOverlayRoot());
}
