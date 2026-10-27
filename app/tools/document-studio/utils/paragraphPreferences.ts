import type { Editor } from "@tiptap/react";
import type { Node as PMNode } from "@tiptap/pm/model";
import { resolveActiveToolbarFormatting } from "./activeToolbarFormatting";
import { validateIndentMm, validateSpacingPt, type DocumentStudioSettings } from "./documentSettings";
import { formatLeading, parseLeading } from "./leading";

/** Same millimetre used by the ruler and InPage setup import. */
const PT_PER_MM = 72 / 25.4;

export const PARAGRAPH_ALIGNS = [
  { value: "right", label: "Right" },
  { value: "left", label: "Left" },
  { value: "center", label: "Centre" },
  { value: "justify", label: "Justify" },
  { value: "justify-all", label: "Force Justify" },
] as const;

export const PARAGRAPH_BREAKS = [
  { value: "none", label: "None" },
  { value: "column", label: "Before Column" },
  { value: "page", label: "Before Page" },
  { value: "odd-page", label: "Before Odd Page" },
  { value: "even-page", label: "Before Even Page" },
] as const;

export type ParagraphAlign = (typeof PARAGRAPH_ALIGNS)[number]["value"];
export type ParagraphBreak = (typeof PARAGRAPH_BREAKS)[number]["value"];

export type ParagraphForm = {
  alignment: string;
  beginning: string;
  end: string;
  firstLine: string;
  lineHeight: string;
  interlineGap: string;
  tabStop: string;
  breaks: string;
  keepTogether: boolean | null;
  keepWithNext: boolean | null;
  widows: string;
  orphans: string;
  before: string;
  after: string;
  characterAlign: "" | "latin" | "arabic";
  toc: boolean | null;
};

export function mmToPt(mm: number): number {
  return Math.round(mm * PT_PER_MM * 1000) / 1000;
}

export function ptToMm(pt: number): number {
  return pt / PT_PER_MM;
}

export function formatMm(mm: number): string {
  const n = Math.round(mm * 100) / 100;
  return `${n}mm`;
}

export function formatPt(pt: number): string {
  const n = Math.round(pt * 100) / 100;
  return `${n}pt`;
}

export function parseMmField(raw: string): number | null {
  const trimmed = raw.trim().replace(/mm$/i, "").trim();
  if (!trimmed) return null;
  return validateIndentMm(Number(trimmed));
}

export function parsePtField(raw: string): number | null {
  const trimmed = raw.trim().replace(/pt$/i, "").trim();
  if (!trimmed) return null;
  return validateSpacingPt(Number(trimmed));
}

function selectedBlocks(editor: Editor): PMNode[] {
  const { from, to } = editor.state.selection;
  const blocks: PMNode[] = [];
  editor.state.doc.nodesBetween(from, to, (node) => {
    if (node.type.name !== "paragraph" && node.type.name !== "heading") return;
    blocks.push(node);
    return false;
  });
  return blocks;
}

function uniform<T>(values: T[]): T | undefined {
  if (!values.length || values.some((value) => value !== values[0])) return undefined;
  return values[0];
}

/** Current dialog values. Blank numeric fields mean the selection disagrees. */
export function readParagraphForm(editor: Editor, settings: DocumentStudioSettings): ParagraphForm {
  const ui = resolveActiveToolbarFormatting(editor, settings);
  const blocks = selectedBlocks(editor);
  const attr = <T>(pick: (node: PMNode) => T) => uniform(blocks.map(pick));
  const aligns = blocks.map((node) => {
    const stored = node.attrs.textAlign;
    if (typeof stored === "string" && stored) return stored;
    return node.attrs.dir === "ltr" ? "left" : "right";
  });
  const gaps = blocks.map((node) => (typeof node.attrs.lineGapPt === "number" ? node.attrs.lineGapPt : 0));
  const breakValues = blocks.map((node) => (typeof node.attrs.breakBefore === "string" ? node.attrs.breakBefore : "none"));
  const character = uniform(blocks.map((node) => (node.attrs.characterAlign === "latin" ? "latin" : "arabic")));
  const widows = attr((node) => (typeof node.attrs.widows === "number" ? node.attrs.widows : 1));
  const orphans = attr((node) => (typeof node.attrs.orphans === "number" ? node.attrs.orphans : 1));
  const tabStops = blocks.map((node) => (typeof node.attrs.tabStopMm === "number" ? node.attrs.tabStopMm : 12.7));
  const flag = (key: "keepTogether" | "keepWithNext" | "toc") => {
    if (!blocks.length) return false;
    const values = blocks.map((node) => node.attrs[key] === true);
    return values.every((value) => value === values[0]) ? values[0] : null;
  };
  return {
    alignment: uniform(aligns) ?? "",
    beginning: ui.mixed.indentStart || ui.indentStartMm == null ? "" : formatMm(ui.indentStartMm),
    end: ui.mixed.indentEnd || ui.indentEndMm == null ? "" : formatMm(ui.indentEndMm),
    firstLine: ui.mixed.firstLineIndent || ui.firstLineIndentMm == null ? "" : formatMm(ui.firstLineIndentMm),
    lineHeight: ui.mixed.lineHeight ? "" : ui.lineHeight == null ? "Auto" : formatLeading({ mode: "points", value: ui.lineHeight }),
    interlineGap: uniform(gaps) == null ? "" : formatPt(uniform(gaps) ?? 0),
    tabStop: uniform(tabStops) == null ? "" : formatMm(uniform(tabStops) ?? 12.7),
    breaks: uniform(breakValues) ?? "",
    keepTogether: flag("keepTogether"),
    keepWithNext: flag("keepWithNext"),
    widows: widows == null ? "" : String(widows),
    orphans: orphans == null ? "" : String(orphans),
    before: ui.mixed.spaceBefore || ui.spaceBeforePt == null ? "" : formatMm(ptToMm(ui.spaceBeforePt)),
    after: ui.mixed.spaceAfter || ui.spaceAfterPt == null ? "" : formatMm(ptToMm(ui.spaceAfterPt)),
    characterAlign: character ?? "",
    toc: flag("toc"),
  };
}

/** Writes only fields that differ from the values shown when the dialog opened. */
export function preferencesFromForm(form: ParagraphForm, initial: ParagraphForm): { ok: true; attrs: Record<string, unknown> } | { ok: false; field: string } {
  const attrs: Record<string, unknown> = {};
  if (form.alignment !== initial.alignment && form.alignment) {
    if (!PARAGRAPH_ALIGNS.some((item) => item.value === form.alignment)) return { ok: false, field: "alignment" };
    attrs.textAlign = form.alignment;
  }
  const mm = (raw: string, initialRaw: string, key: string) => {
    if (raw === initialRaw) return true;
    if (!raw.trim()) { attrs[key] = null; return true; }
    const value = parseMmField(raw);
    if (value === null) return false;
    attrs[key] = value;
    return true;
  };
  if (!mm(form.beginning, initial.beginning, "indentStartMm")) return { ok: false, field: "beginning" };
  if (!mm(form.end, initial.end, "indentEndMm")) return { ok: false, field: "end" };
  if (!mm(form.firstLine, initial.firstLine, "firstLineIndentMm")) return { ok: false, field: "firstLine" };
  if (form.lineHeight !== initial.lineHeight) {
    if (!form.lineHeight.trim()) { attrs.leading = null; attrs.lineHeight = null; }
    else {
      const leading = parseLeading(form.lineHeight);
      if (!leading) return { ok: false, field: "lineHeight" };
      attrs.leading = leading;
      attrs.lineHeight = null;
    }
  }
  if (form.interlineGap !== initial.interlineGap) {
    if (!form.interlineGap.trim()) attrs.lineGapPt = null;
    else {
      const gap = parsePtField(form.interlineGap);
      if (gap === null) return { ok: false, field: "interlineGap" };
      attrs.lineGapPt = gap;
    }
  }
  if (form.tabStop !== initial.tabStop) {
    if (!form.tabStop.trim()) attrs.tabStopMm = null;
    else {
      const stop = parseMmField(form.tabStop);
      if (stop === null) return { ok: false, field: "tabStop" };
      attrs.tabStopMm = stop;
    }
  }
  if (form.breaks !== initial.breaks) {
    if (form.breaks && !PARAGRAPH_BREAKS.some((item) => item.value === form.breaks)) return { ok: false, field: "breaks" };
    if (form.breaks) attrs.breakBefore = form.breaks;
  }
  if (form.keepTogether !== initial.keepTogether && form.keepTogether !== null) attrs.keepTogether = form.keepTogether;
  if (form.keepWithNext !== initial.keepWithNext && form.keepWithNext !== null) attrs.keepWithNext = form.keepWithNext;
  const count = (raw: string, initialRaw: string, key: string) => {
    if (raw === initialRaw) return true;
    if (!raw.trim()) { attrs[key] = null; return true; }
    if (!/^\d+$/.test(raw.trim())) return false;
    const value = Number(raw);
    if (value < 0 || value > 20) return false;
    attrs[key] = value;
    return true;
  };
  if (!count(form.widows, initial.widows, "widows")) return { ok: false, field: "widows" };
  if (!count(form.orphans, initial.orphans, "orphans")) return { ok: false, field: "orphans" };
  const space = (raw: string, initialRaw: string, key: string) => {
    if (raw === initialRaw) return true;
    if (!raw.trim()) { attrs[key] = null; return true; }
    const value = parseMmField(raw);
    if (value === null) return false;
    const pt = validateSpacingPt(mmToPt(value));
    if (pt === null) return false;
    attrs[key] = pt;
    return true;
  };
  if (!space(form.before, initial.before, "spaceBeforePt")) return { ok: false, field: "before" };
  if (!space(form.after, initial.after, "spaceAfterPt")) return { ok: false, field: "after" };
  if (form.characterAlign !== initial.characterAlign && form.characterAlign) attrs.characterAlign = form.characterAlign;
  if (form.toc !== initial.toc && form.toc !== null) attrs.toc = form.toc;
  return { ok: true, attrs };
}

const HEADING_INDENT_KEYS = new Set(["firstLineIndentMm", "indentStartMm", "indentEndMm"]);

/** One transaction, so one Undo restores every selected paragraph. */
export function applyParagraphPreferences(editor: Editor, attrs: Record<string, unknown>): boolean {
  const { state } = editor;
  const { from, to } = state.selection;
  let tr = state.tr;
  let changed = false;
  state.doc.nodesBetween(from, to, (node, pos) => {
    if (node.type.name !== "paragraph" && node.type.name !== "heading") return;
    const next = { ...node.attrs };
    let nodeChanged = false;
    for (const [key, value] of Object.entries(attrs)) {
      if (node.type.name === "heading" && HEADING_INDENT_KEYS.has(key)) continue;
      const current = next[key];
      const equal = typeof value === "object" && value !== null ? JSON.stringify(current) === JSON.stringify(value) : current === value;
      if (!equal) {
        next[key] = value;
        nodeChanged = true;
      }
    }
    if (nodeChanged) {
      tr = tr.setNodeMarkup(pos, undefined, next);
      changed = true;
    }
    return false;
  });
  if (changed) editor.view.dispatch(tr);
  return changed;
}
