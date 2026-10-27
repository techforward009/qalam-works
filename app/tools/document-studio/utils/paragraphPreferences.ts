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
  tabDefault: boolean;
  tabStop: string;
  breaks: string;
  keepTogether: boolean;
  keepWithNext: boolean;
  widows: string;
  orphans: string;
  before: string;
  after: string;
  characterAlign: "" | "latin" | "arabic";
  toc: boolean;
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
  const breakBefore = attr((node) => (typeof node.attrs.breakBefore === "string" ? node.attrs.breakBefore : "none"));
  const character = attr((node) => (node.attrs.characterAlign === "arabic" || node.attrs.characterAlign === "latin" ? node.attrs.characterAlign : "latin"));
  const widows = attr((node) => (typeof node.attrs.widows === "number" ? node.attrs.widows : 1));
  const orphans = attr((node) => (typeof node.attrs.orphans === "number" ? node.attrs.orphans : 1));
  const tabStop = attr((node) => (typeof node.attrs.tabStopMm === "number" ? node.attrs.tabStopMm : 12.7));
  const tabDefault = attr((node) => (typeof node.attrs.tabStopDefault === "boolean" ? node.attrs.tabStopDefault : true));
  return {
    alignment: uniform(aligns) ?? (ui.textAlign ?? ""),
    beginning: ui.mixed.indentStart || ui.indentStartMm == null ? "" : formatMm(ui.indentStartMm),
    end: ui.mixed.indentEnd || ui.indentEndMm == null ? "" : formatMm(ui.indentEndMm),
    firstLine: ui.mixed.firstLineIndent || ui.firstLineIndentMm == null ? "" : formatMm(ui.firstLineIndentMm),
    lineHeight: ui.mixed.lineHeight ? "" : ui.lineHeight == null ? "Auto" : formatLeading({ mode: "points", value: ui.lineHeight }),
    interlineGap: uniform(gaps) == null ? "" : formatPt(uniform(gaps) ?? 0),
    tabDefault: tabDefault ?? true,
    tabStop: tabStop == null ? "" : formatMm(tabStop),
    breaks: breakBefore ?? "none",
    keepTogether: attr((node) => node.attrs.keepTogether === true) ?? false,
    keepWithNext: attr((node) => node.attrs.keepWithNext === true) ?? false,
    widows: widows == null ? "" : String(widows),
    orphans: orphans == null ? "" : String(orphans),
    before: ui.mixed.spaceBefore || ui.spaceBeforePt == null ? "" : formatMm(ptToMm(ui.spaceBeforePt)),
    after: ui.mixed.spaceAfter || ui.spaceAfterPt == null ? "" : formatMm(ptToMm(ui.spaceAfterPt)),
    characterAlign: character ?? "",
    toc: attr((node) => node.attrs.toc === true) ?? false,
  };
}

export function preferencesFromForm(form: ParagraphForm): { ok: true; attrs: Record<string, unknown> } | { ok: false; field: string } {
  const attrs: Record<string, unknown> = {};
  if (form.alignment) {
    if (!PARAGRAPH_ALIGNS.some((item) => item.value === form.alignment)) return { ok: false, field: "alignment" };
    attrs.textAlign = form.alignment;
  }
  const mm = (raw: string, key: string, field: string) => {
    if (!raw.trim()) return true;
    const value = parseMmField(raw);
    if (value === null) return false;
    attrs[key] = value;
    void field;
    return true;
  };
  if (!mm(form.beginning, "indentStartMm", "beginning")) return { ok: false, field: "beginning" };
  if (!mm(form.end, "indentEndMm", "end")) return { ok: false, field: "end" };
  if (!mm(form.firstLine, "firstLineIndentMm", "firstLine")) return { ok: false, field: "firstLine" };
  if (form.lineHeight.trim()) {
    const leading = parseLeading(form.lineHeight);
    if (!leading) return { ok: false, field: "lineHeight" };
    attrs.leading = leading;
    attrs.lineHeight = null;
  }
  if (form.interlineGap.trim()) {
    const gap = parsePtField(form.interlineGap);
    if (gap === null) return { ok: false, field: "interlineGap" };
    attrs.lineGapPt = gap;
  }
  if (form.tabStop.trim()) {
    const stop = parseMmField(form.tabStop);
    if (stop === null) return { ok: false, field: "tabStop" };
    attrs.tabStopMm = stop;
  }
  attrs.tabStopDefault = form.tabDefault;
  if (!PARAGRAPH_BREAKS.some((item) => item.value === form.breaks)) return { ok: false, field: "breaks" };
  attrs.breakBefore = form.breaks;
  attrs.keepTogether = form.keepTogether;
  attrs.keepWithNext = form.keepWithNext;
  const count = (raw: string, key: string) => {
    if (!raw.trim()) return true;
    if (!/^\d+$/.test(raw.trim())) return false;
    const value = Number(raw);
    if (value < 0 || value > 20) return false;
    attrs[key] = value;
    return true;
  };
  if (!count(form.widows, "widows")) return { ok: false, field: "widows" };
  if (!count(form.orphans, "orphans")) return { ok: false, field: "orphans" };
  const space = (raw: string, key: string) => {
    if (!raw.trim()) return true;
    const value = parseMmField(raw);
    if (value === null) return false;
    const pt = validateSpacingPt(mmToPt(value));
    if (pt === null) return false;
    attrs[key] = pt;
    return true;
  };
  if (!space(form.before, "spaceBeforePt")) return { ok: false, field: "before" };
  if (!space(form.after, "spaceAfterPt")) return { ok: false, field: "after" };
  if (form.characterAlign) attrs.characterAlign = form.characterAlign;
  attrs.toc = form.toc;
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
