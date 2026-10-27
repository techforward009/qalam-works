import type { Editor } from "@tiptap/react";
import { scriptRanges, isLatinFamilyName, bareFamily } from "../extensions/LatinScriptRuns";
import { getFontById, listEditorFonts, normalizeEditorFontFamily, quoteEditorFontFamily } from "./fontRegistry";
import { INPAGE_TEXT_COLOURS, TEXT_EFFECTS, formatToolbarFontSize, parseToolbarFontSize, parseToolbarPercent } from "./inpageToolbar";
import { resolveFontSizePt, type DocumentStudioSettings } from "./documentSettings";
import { normalizeSafeHex } from "./studioColors";

export const CHARACTER_STYLES = TEXT_EFFECTS;
export const CHARACTER_HATCHES = ["none", "horizontal", "vertical", "diagonal", "cross"] as const;
export const CHARACTER_KASHIDA = ["none", "low", "medium", "high"] as const;
export const CHARACTER_LANGUAGES = [
  { value: "ur", label: "Urdu" },
  { value: "ar", label: "Arabic" },
  { value: "en", label: "English" },
  { value: "sd", label: "Sindhi" },
  { value: "ps", label: "Pashto" },
] as const;

const LETTERS = ["meem", "be", "jeem", "ain", "kaaf"] as const;
type Letter = (typeof LETTERS)[number];
type Script = "arabic" | "latin" | "other" | "both";

export type CharacterForm = {
  size: string;
  style: string;
  color: string;
  hatch: string;
  latinFont: string;
  urduFont: string;
  language: string;
  bold: boolean | null;
  italics: boolean | null;
  outline: boolean | null;
  kashida: string;
  spacing: string;
  scaling: string;
  baseline: string;
  meem: boolean | null;
  be: boolean | null;
  jeem: boolean | null;
  ain: boolean | null;
  kaaf: boolean | null;
};

export type CharacterPatch = {
  fontSize?: string | null;
  fontFamily?: string | null;
  latinFontFamily?: string | null;
  clearLegacyLatin?: boolean;
  color?: string | null;
  textEffect?: string | null;
  textOutline?: boolean | null;
  trackingPercent?: number | null;
  charScale?: number | null;
  baselineShift?: number | null;
  hatch?: string | null;
  kashida?: string | null;
  charLanguage?: string | null;
  bold?: boolean | null;
  italic?: boolean | null;
  meem?: boolean | null;
  be?: boolean | null;
  jeem?: boolean | null;
  ain?: boolean | null;
  kaaf?: boolean | null;
};

function uniform<T>(values: T[]): T | undefined {
  if (!values.length || values.some((value) => value !== values[0])) return undefined;
  return values[0];
}

function flag(values: boolean[]): boolean | null {
  if (!values.length) return false;
  return values.every((value) => value === values[0]) ? values[0] : null;
}

export function latinFontChoices(): { value: string; label: string }[] {
  const fonts = listEditorFonts().filter((font) => font.category === "latin").map((font) => ({ value: font.editorFamily, label: font.label }));
  return [{ value: "Arial Unicode MS", label: "Arial Unicode MS" }, ...fonts];
}

export function urduFontChoices(): { value: string; label: string }[] {
  return listEditorFonts()
    .filter((font) => font.category === "urdu" || font.category === "arabic" || font.category === "persian")
    .map((font) => ({ value: font.editorFamily, label: font.label }));
}

export function hatchDeclarations(hatch: unknown): string {
  const line = "currentColor 0 0.6px, transparent 0.6px 3px";
  switch (hatch) {
    case "horizontal": return `background-image:repeating-linear-gradient(0deg, ${line});`;
    case "vertical": return `background-image:repeating-linear-gradient(90deg, ${line});`;
    case "diagonal": return `background-image:repeating-linear-gradient(135deg, ${line});`;
    case "cross": return `background-image:repeating-linear-gradient(0deg, ${line}),repeating-linear-gradient(90deg, ${line});`;
    default: return "";
  }
}

/** Positive shift moves the run up. Relative offset leaves the line box alone. */
export function baselineShiftDeclarations(shift: unknown): string {
  if (typeof shift !== "number" || !Number.isFinite(shift) || shift === 0) return "";
  const top = Math.round(-shift * 1000) / 1000;
  return `position:relative;top:${top}pt;`;
}

function percentLabel(value: number): string {
  const n = Math.round(value * 10) / 10;
  return `${n}%`;
}

function ptLabel(value: number): string {
  const n = Math.round(value * 10) / 10;
  return `${n}pt`;
}

function urduFace(attrs: Record<string, unknown>, settings: DocumentStudioSettings): string {
  const explicit = normalizeEditorFontFamily(attrs.fontFamily);
  if (explicit && !isLatinFamilyName(explicit)) return explicit;
  const raw = bareFamily(attrs.fontFamily);
  if (raw && !isLatinFamilyName(raw)) return raw;
  return getFontById(settings.typography.defaultRtlFontId).editorFamily || "Mehr Nastaliq Web";
}

function latinFace(attrs: Record<string, unknown>): string {
  const direct = normalizeEditorFontFamily(attrs.latinFontFamily) || bareFamily(attrs.latinFontFamily);
  if (direct && isLatinFamilyName(direct)) return direct;
  const legacy = normalizeEditorFontFamily(attrs.fontFamily) || bareFamily(attrs.fontFamily);
  if (legacy && isLatinFamilyName(legacy)) return legacy;
  return "Arial Unicode MS";
}

function colorOf(attrs: Record<string, unknown>): string {
  return normalizeSafeHex(attrs.color) ?? "#000000";
}

function styleOf(attrs: Record<string, unknown>): string {
  return typeof attrs.textEffect === "string" && attrs.textEffect ? attrs.textEffect : "none";
}

function scaleOf(attrs: Record<string, unknown>): number {
  if (typeof attrs.charScale === "number") return attrs.charScale;
  if (typeof attrs.scalePercent === "number") return attrs.scalePercent;
  return 100;
}

type Sample = { attrs: Record<string, unknown>; bold: boolean; italic: boolean };

function samples(editor: Editor): Sample[] {
  const { from, to, empty } = editor.state.selection;
  if (empty) {
    return [{ attrs: { ...editor.getAttributes("textStyle") }, bold: editor.isActive("bold"), italic: editor.isActive("italic") }];
  }
  const found: Sample[] = [];
  editor.state.doc.nodesBetween(from, to, (node) => {
    if (!node.isText) return;
    const mark = node.marks.find((item) => item.type.name === "textStyle");
    found.push({
      attrs: { ...(mark?.attrs ?? {}) },
      bold: node.marks.some((item) => item.type.name === "bold"),
      italic: node.marks.some((item) => item.type.name === "italic"),
    });
  });
  return found.length ? found : [{ attrs: { ...editor.getAttributes("textStyle") }, bold: editor.isActive("bold"), italic: editor.isActive("italic") }];
}

/** Blank fields mean the selection disagrees. Checkboxes use null for the mixed state. */
export function readCharacterForm(editor: Editor, settings: DocumentStudioSettings): CharacterForm {
  const runs = samples(editor);
  const pick = <T>(read: (sample: Sample) => T) => uniform(runs.map(read));
  const size = pick((sample) => resolveFontSizePt(sample.attrs.fontSize) ?? settings.typography.bodyFontSizePt);
  const style = pick((sample) => styleOf(sample.attrs));
  const color = pick((sample) => colorOf(sample.attrs));
  const hatch = pick((sample) => (typeof sample.attrs.hatch === "string" && sample.attrs.hatch ? sample.attrs.hatch : "none"));
  const latin = pick((sample) => latinFace(sample.attrs));
  const urdu = pick((sample) => urduFace(sample.attrs, settings));
  const language = pick((sample) => (typeof sample.attrs.charLanguage === "string" && sample.attrs.charLanguage ? sample.attrs.charLanguage : "ur"));
  const kashida = pick((sample) => (typeof sample.attrs.kashida === "string" && sample.attrs.kashida ? sample.attrs.kashida : "none"));
  const spacing = pick((sample) => (typeof sample.attrs.trackingPercent === "number" ? sample.attrs.trackingPercent : 0));
  const scaling = pick((sample) => scaleOf(sample.attrs));
  const baseline = pick((sample) => (typeof sample.attrs.baselineShift === "number" ? sample.attrs.baselineShift : 0));
  const letters = Object.fromEntries(LETTERS.map((key) => [key, flag(runs.map((sample) => sample.attrs[key] === true))])) as Record<Letter, boolean | null>;
  return {
    size: size == null ? "" : formatToolbarFontSize(size),
    style: style ?? "",
    color: color ?? "",
    hatch: hatch ?? "",
    latinFont: latin ?? "",
    urduFont: urdu ?? "",
    language: language ?? "",
    bold: flag(runs.map((sample) => sample.bold)),
    italics: flag(runs.map((sample) => sample.italic)),
    outline: flag(runs.map((sample) => sample.attrs.textOutline === true || sample.attrs.textOutline === "true")),
    kashida: kashida ?? "",
    spacing: spacing == null ? "" : percentLabel(spacing),
    scaling: scaling == null ? "" : percentLabel(scaling),
    baseline: baseline == null ? "" : ptLabel(baseline),
    ...letters,
  };
}

function parseBaseline(raw: string): number | null {
  const match = raw.trim().match(/^(-?\d+(?:\.\d+)?)\s*pt?$/i);
  if (!match) return null;
  const value = Math.round(parseFloat(match[1]) * 10) / 10;
  if (!Number.isFinite(value) || value < -96 || value > 96) return null;
  return value;
}

/** Writes only fields that differ from the values shown when the dialog opened. */
export function characterPatchFromForm(form: CharacterForm, initial: CharacterForm): { ok: true; patch: CharacterPatch } | { ok: false; field: string } {
  const patch: CharacterPatch = {};
  if (form.size !== initial.size) {
    if (!form.size.trim()) patch.fontSize = null;
    else {
      const size = parseToolbarFontSize(form.size);
      if (!size.ok) return { ok: false, field: "size" };
      patch.fontSize = `${size.pt}pt`;
    }
  }
  if (form.style !== initial.style && form.style) {
    if (!CHARACTER_STYLES.some((item) => item === form.style)) return { ok: false, field: "textStyle" };
    patch.textEffect = form.style === "none" ? null : form.style;
  }
  if (form.color !== initial.color && form.color) {
    const color = normalizeSafeHex(form.color);
    if (!color) return { ok: false, field: "color" };
    patch.color = color;
  }
  if (form.hatch !== initial.hatch && form.hatch) {
    if (!CHARACTER_HATCHES.some((item) => item === form.hatch)) return { ok: false, field: "hatch" };
    patch.hatch = form.hatch === "none" ? null : form.hatch;
  }
  if (form.latinFont !== initial.latinFont && form.latinFont) {
    const clear = form.latinFont === "Arial Unicode MS";
    patch.latinFontFamily = clear ? null : quoteEditorFontFamily(form.latinFont);
    patch.clearLegacyLatin = clear;
  }
  if (form.urduFont !== initial.urduFont && form.urduFont) patch.fontFamily = quoteEditorFontFamily(form.urduFont);
  if (form.language !== initial.language && form.language) {
    if (!CHARACTER_LANGUAGES.some((item) => item.value === form.language)) return { ok: false, field: "language" };
    patch.charLanguage = form.language === "ur" ? null : form.language;
  }
  if (form.bold !== initial.bold && form.bold !== null) patch.bold = form.bold;
  if (form.italics !== initial.italics && form.italics !== null) patch.italic = form.italics;
  if (form.outline !== initial.outline && form.outline !== null) patch.textOutline = form.outline ? true : null;
  if (form.kashida !== initial.kashida && form.kashida) {
    if (!CHARACTER_KASHIDA.some((item) => item === form.kashida)) return { ok: false, field: "kashida" };
    patch.kashida = form.kashida === "none" ? null : form.kashida;
  }
  if (form.spacing !== initial.spacing) {
    if (!form.spacing.trim()) patch.trackingPercent = null;
    else {
      const spacing = parseToolbarPercent(form.spacing, "tracking");
      if (!spacing.ok) return { ok: false, field: "spacing" };
      patch.trackingPercent = spacing.value === 0 ? null : spacing.value;
    }
  }
  if (form.scaling !== initial.scaling) {
    if (!form.scaling.trim()) patch.charScale = null;
    else {
      const scaling = parseToolbarPercent(form.scaling, "scale");
      if (!scaling.ok) return { ok: false, field: "scaling" };
      patch.charScale = scaling.value === 100 ? null : scaling.value;
    }
  }
  if (form.baseline !== initial.baseline) {
    if (!form.baseline.trim()) patch.baselineShift = null;
    else {
      const baseline = parseBaseline(form.baseline);
      if (baseline === null) return { ok: false, field: "baseline" };
      patch.baselineShift = baseline === 0 ? null : baseline;
    }
  }
  for (const key of LETTERS) {
    if (form[key] !== initial[key] && form[key] !== null) patch[key] = form[key] ? true : null;
  }
  return { ok: true, patch };
}

function live(attrs: Record<string, unknown>): boolean {
  return Object.values(attrs).some((value) => value != null && value !== false && value !== "");
}

function paint(attrs: Record<string, unknown>, patch: CharacterPatch, script: Script): Record<string, unknown> {
  const next = { ...attrs };
  const set = (key: string, value: unknown) => { next[key] = value; };
  if (patch.fontSize !== undefined) set("fontSize", patch.fontSize);
  if (patch.fontFamily !== undefined && (script === "arabic" || script === "both")) set("fontFamily", patch.fontFamily);
  if (patch.latinFontFamily !== undefined && (script === "latin" || script === "both")) {
    set("latinFontFamily", patch.latinFontFamily);
    if (patch.clearLegacyLatin && isLatinFamilyName(next.fontFamily)) set("fontFamily", null);
  }
  if (patch.color !== undefined) set("color", patch.color);
  if (patch.textEffect !== undefined) set("textEffect", patch.textEffect);
  if (patch.textOutline !== undefined) set("textOutline", patch.textOutline);
  if (patch.trackingPercent !== undefined) set("trackingPercent", patch.trackingPercent);
  if (patch.charScale !== undefined) {
    set("charScale", patch.charScale);
    set("scalePercent", patch.charScale);
  }
  if (patch.baselineShift !== undefined) set("baselineShift", patch.baselineShift);
  if (patch.hatch !== undefined) set("hatch", patch.hatch);
  if (patch.kashida !== undefined) set("kashida", patch.kashida);
  if (patch.charLanguage !== undefined) set("charLanguage", patch.charLanguage);
  for (const key of LETTERS) if (patch[key] !== undefined) set(key, patch[key]);
  return next;
}

function pieces(text: string): Array<{ start: number; end: number; script: "arabic" | "latin" | "other" }> {
  const kinds: Array<"arabic" | "latin" | "other"> = new Array(text.length).fill("other");
  for (const range of scriptRanges(text, "arabic")) for (let index = range.start; index < range.end; index += 1) kinds[index] = "arabic";
  for (const range of scriptRanges(text, "latin")) for (let index = range.start; index < range.end; index += 1) kinds[index] = "latin";
  const out: Array<{ start: number; end: number; script: "arabic" | "latin" | "other" }> = [];
  let start = 0;
  for (let index = 1; index <= text.length; index += 1) {
    if (index === text.length || kinds[index] !== kinds[start]) {
      out.push({ start, end: index, script: kinds[start] });
      start = index;
    }
  }
  return out;
}

function sameAttrs(left: Record<string, unknown>, right: Record<string, unknown>): boolean {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  for (const key of keys) if (left[key] !== right[key]) return false;
  return true;
}

/** One transaction, so one Undo restores every selected character. */
export function applyCharacterPreferences(editor: Editor, patch: CharacterPatch): boolean {
  if (!Object.keys(patch).length) return false;
  const { state } = editor;
  const type = state.schema.marks.textStyle;
  if (!type) return false;
  const boldType = state.schema.marks.bold;
  const italicType = state.schema.marks.italic;
  const { from, to } = state.selection;
  let tr = state.tr;
  let changed = false;
  if (from === to) {
    const marks = state.storedMarks ?? state.selection.$from.marks();
    const current = marks.find((mark) => mark.type === type);
    const next = paint({ ...(current?.attrs ?? {}) }, patch, "both");
    if (!sameAttrs(next, { ...(current?.attrs ?? {}) })) {
      tr = tr.removeStoredMark(type);
      if (live(next)) tr = tr.addStoredMark(type.create(next));
      changed = true;
    }
    const storedFlag = (markType: typeof boldType, on: boolean | null | undefined) => {
      if (!markType || on == null) return;
      const has = marks.some((mark) => mark.type === markType);
      if (has === on) return;
      tr = tr.removeStoredMark(markType);
      if (on) tr = tr.addStoredMark(markType.create());
      changed = true;
    };
    storedFlag(boldType, patch.bold);
    storedFlag(italicType, patch.italic);
  } else {
    const jobs: { from: number; to: number; attrs: Record<string, unknown> }[] = [];
    state.doc.nodesBetween(from, to, (node, pos) => {
      if (!node.isText || !node.text) return;
      const localFrom = Math.max(0, from - pos);
      const localTo = Math.min(node.text.length, to - pos);
      const slice = node.text.slice(localFrom, localTo);
      const base = { ...(node.marks.find((mark) => mark.type === type)?.attrs ?? {}) };
      for (const piece of pieces(slice)) {
        const next = paint(base, patch, piece.script);
        if (sameAttrs(next, base)) continue;
        jobs.push({ from: pos + localFrom + piece.start, to: pos + localFrom + piece.end, attrs: next });
      }
    });
    jobs.sort((a, b) => b.from - a.from);
    for (const job of jobs) {
      tr = tr.removeMark(job.from, job.to, type);
      if (live(job.attrs)) tr = tr.addMark(job.from, job.to, type.create(job.attrs));
      changed = true;
    }
    const paintMark = (markType: typeof boldType, on: boolean | null | undefined) => {
      if (!markType || on == null) return;
      if (on) tr = tr.addMark(from, to, markType.create());
      else tr = tr.removeMark(from, to, markType);
      changed = true;
    };
    paintMark(boldType, patch.bold);
    paintMark(italicType, patch.italic);
  }
  if (changed) editor.view.dispatch(tr);
  return changed;
}

/** Data and CSS the PDF already knows how to carry for one text run. */
export function characterPdfExtras(attrs: Record<string, unknown> | undefined): { style: string; attrs: string } {
  if (!attrs) return { style: "", attrs: "" };
  const styles: string[] = [];
  const data: string[] = [];
  if (typeof attrs.baselineShift === "number" && attrs.baselineShift !== 0) {
    styles.push(baselineShiftDeclarations(attrs.baselineShift));
    data.push(`data-baseline="${attrs.baselineShift}"`);
  }
  const hatch = hatchDeclarations(attrs.hatch);
  if (hatch) {
    styles.push(hatch);
    data.push(`data-hatch="${String(attrs.hatch)}"`);
  }
  if (typeof attrs.charScale === "number") data.push(`data-char-scale="${attrs.charScale}"`);
  if (typeof attrs.trackingPercent === "number") data.push(`data-tracking="${attrs.trackingPercent}"`);
  if (typeof attrs.kashida === "string" && attrs.kashida) data.push(`data-kashida="${attrs.kashida}"`);
  if (typeof attrs.charLanguage === "string" && attrs.charLanguage) data.push(`lang="${attrs.charLanguage}" data-char-lang="${attrs.charLanguage}"`);
  for (const key of LETTERS) if (attrs[key] === true) data.push(`data-${key}="true"`);
  return { style: styles.join(""), attrs: data.length ? ` ${data.join(" ")}` : "" };
}

export { INPAGE_TEXT_COLOURS };
