import { blockLeading, migrateLeading } from "./leading";
/**
 * Effective toolbar formatting — display only.
 * Does not write marks/attrs into the document.
 */
import type { Editor } from "@tiptap/react";
import { BLOCK_STYLES, type BlockStyleId } from "./documentStyles";
import { activeBlockStyleId, activeToolbarFontFamily, isTextOutlineActive } from "./documentCommands";
import {
  defaultDocumentSettings,
  resolveFontSizePt,
  validateIndentMm,
  validateSpacingPt,
  type DocumentStudioSettings,
} from "./documentSettings";
import { getFontById, normalizeEditorFontFamily } from "./fontRegistry";
import { isLatinFamilyName, hasScript } from "../extensions/LatinScriptRuns";
import { normalizeSafeHex } from "./studioColors";
import { readFormattingTarget } from "./formattingSafety";

export const MIXED_TOOLBAR_VALUE = "__mixed__";

export interface ActiveToolbarFormatting {
  fontFamily: string;
  latinFontFamily: string;
  fontSizePt: number | null;
  lineHeight: number | null;
  blockStyle: BlockStyleId;
  directionMode: "auto" | "rtl" | "ltr";
  blockDir: "rtl" | "ltr" | null;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  textEffect: string;
  textOutline: boolean;
  textAlign: "left" | "center" | "right" | "justify" | "justify-all" | "start" | null;
  bullet: boolean;
  ordered: boolean;
  color: string | null;
  highlight: string | null;
  spaceBeforePt: number | null;
  spaceAfterPt: number | null;
  lineGapPt: number | null;
  trackingPercent: number | null;
  scalePercent: number | null;
  firstLineIndentMm: number | null;
  indentStartMm: number | null;
  indentEndMm: number | null;
  mixed: {
    fontFamily: boolean;
    latinFontFamily: boolean;
    fontSize: boolean;
    lineHeight: boolean;
    lineGap: boolean;
    color: boolean;
    highlight: boolean;
    spaceBefore: boolean;
    spaceAfter: boolean;
    firstLineIndent: boolean;
    indentStart: boolean;
    indentEnd: boolean;
    tracking: boolean;
    scale: boolean;
  };
}

function blockDirAt(editor: Editor, pos: number, globalDir: "rtl" | "ltr"): "rtl" | "ltr" {
  const $pos = editor.state.doc.resolve(Math.min(pos, editor.state.doc.content.size));
  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    const dir = $pos.node(depth).attrs.dir;
    if (dir === "rtl" || dir === "ltr") return dir;
  }
  return globalDir;
}

function lineHeightAt(editor: Editor, pos: number, settings: DocumentStudioSettings): number | null {
  const node = textblockAt(editor,pos);
  const fallback = settings.typography.leading ?? (settings.typography.lineHeight === 1.5 ? { mode: "auto" as const } : migrateLeading(settings.typography.lineHeight,settings.typography.bodyFontSizePt));
  const leading = node ? blockLeading(node.toJSON(),fallback,settings.typography.bodyFontSizePt) : fallback;
  return leading.mode === "points" ? leading.value : null;
}

function textblockAt(editor: Editor, pos: number) {
  const $pos = editor.state.doc.resolve(Math.min(pos, editor.state.doc.content.size));
  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    const node = $pos.node(depth);
    if (node.type.name === "paragraph" || node.type.name === "heading") return node;
  }
  return null;
}

function spacingFromNode(node: { type: { name: string }; attrs: Record<string, unknown> } | null, settings: DocumentStudioSettings) {
  const isHeading = node?.type.name === "heading";
  return {
    spaceBeforePt: validateSpacingPt(node?.attrs.spaceBeforePt) ?? (isHeading ? 0 : settings.typography.paragraphBeforePt),
    spaceAfterPt: validateSpacingPt(node?.attrs.spaceAfterPt) ?? (isHeading ? 0 : settings.typography.paragraphAfterPt),
    firstLineIndentMm: validateIndentMm(node?.attrs.firstLineIndentMm) ?? (isHeading ? 0 : settings.typography.firstLineIndentMm),
    indentStartMm: validateIndentMm(node?.attrs.indentStartMm) ?? 0,
    indentEndMm: validateIndentMm(node?.attrs.indentEndMm) ?? 0,
  };
}

function blockStyleAt(editor: Editor, pos: number): BlockStyleId {
  const $pos = editor.state.doc.resolve(Math.min(pos, editor.state.doc.content.size));
  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    const node = $pos.node(depth);
    if (node.type.name === "heading") {
      const level = node.attrs.level as number;
      if (level === 1) return "heading-1";
      if (level === 2) return "heading-2";
      if (level === 3) return "heading-3";
      if (level === 4) return "heading-4";
    }
    if (node.type.name === "blockquote") return "quote";
    if (node.type.name === "paragraph") {
      const attr = node.attrs.blockStyle as string | undefined;
      if (attr === "title" || attr === "subtitle" || attr === "caption") return attr;
    }
  }
  return "normal";
}

function isLatinToolbarFamily(family: string): boolean {
  return isLatinFamilyName(family);
}

function latinFaceFromAttrs(attrs: Record<string, unknown> | null | undefined): string {
  const direct = normalizeEditorFontFamily(attrs?.latinFontFamily);
  if (direct && isLatinToolbarFamily(direct)) return direct;
  const raw = String(attrs?.latinFontFamily ?? "").replace(/["']/g, "").split(",")[0].trim();
  if (raw && isLatinToolbarFamily(raw)) return raw;
  const legacy = normalizeEditorFontFamily(attrs?.fontFamily);
  if (legacy && isLatinToolbarFamily(legacy)) return legacy;
  const legacyRaw = String(attrs?.fontFamily ?? "").replace(/["']/g, "").split(",")[0].trim();
  if (legacyRaw && isLatinToolbarFamily(legacyRaw)) return legacyRaw;
  return "Arial Unicode MS";
}

function metricOf(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function effectiveFamily(
  explicit: string,
  _dir: "rtl" | "ltr",
  settings: DocumentStudioSettings,
): string {
  if (explicit && !isLatinToolbarFamily(explicit)) return explicit;
  const id = settings.typography.defaultRtlFontId;
  return getFontById(id).editorFamily || "Mehr Nastaliq Web";
}

function effectiveSize(explicit: number | null, blockStyle: BlockStyleId, settings: DocumentStudioSettings): number {
  if (explicit !== null) return explicit;
  return BLOCK_STYLES[blockStyle].defaultFontSizePt ?? settings.typography.bodyFontSizePt;
}

export function resolveActiveToolbarFormatting(
  editor: Editor,
  settings: DocumentStudioSettings = defaultDocumentSettings(),
  globalDir: "rtl" | "ltr" = "rtl",
): ActiveToolbarFormatting {
  const blockStyle = activeBlockStyleId(editor);
  const style = BLOCK_STYLES[blockStyle];
  const { from, empty, ranges } = editor.state.selection;
  const families = new Set<string>();
  const latinFamilies = new Set<string>();
  const sizes = new Set<number>();
  const lineHeights = new Set<number | null>();
  const lineGaps = new Set<number>();
  const colors = new Set<string>();
  const highlights = new Set<string>();
  const effects = new Set<string>();
  const spaceBefores = new Set<number>();
  const spaceAfters = new Set<number>();
  const firstIndents = new Set<number>();
  const startIndents = new Set<number>();
  const endIndents = new Set<number>();
  const trackings = new Set<number>();
  const scales = new Set<number>();
  const aligns = new Set<"left" | "center" | "right" | "justify" | "justify-all">();
  const directionModes = new Set<"auto" | "rtl" | "ltr">();
  const blockDirs = new Set<"rtl" | "ltr">();

  const addSpacingFromPos = (pos: number) => {
    const spacing = spacingFromNode(textblockAt(editor, pos), settings);
    spaceBefores.add(spacing.spaceBeforePt);
    spaceAfters.add(spacing.spaceAfterPt);
    firstIndents.add(spacing.firstLineIndentMm);
    startIndents.add(spacing.indentStartMm);
    endIndents.add(spacing.indentEndMm);
  };

  const addBlockAt = (node: { type: { name: string }; attrs: Record<string, unknown> } | null, pos: number) => {
    addSpacingFromPos(pos);
    lineHeights.add(lineHeightAt(editor, pos, settings));
    lineGaps.add(typeof node?.attrs.lineGapPt === "number" ? node.attrs.lineGapPt : 0);
    const dir = blockDirAt(editor, pos, globalDir);
    blockDirs.add(dir);
    const mode = node?.attrs.directionMode;
    directionModes.add(mode === "rtl" || mode === "ltr" ? mode : "auto");
    const localStyle = blockStyleAt(editor, pos);
    const rawAlign = node?.attrs.textAlign;
    const effectiveAlign =
      rawAlign === "justify-all" || rawAlign === "justify" || rawAlign === "center" || rawAlign === "right" || rawAlign === "left"
        ? rawAlign
        : (BLOCK_STYLES[localStyle].align ?? (dir === "rtl" ? "right" : "left"));
    aligns.add(effectiveAlign);
  };

  const addFromText = (pos: number, explicitFamily: string, explicitSize: number | null, attrs?: Record<string, unknown>) => {
    const dir = blockDirAt(editor, pos, globalDir);
    const localStyle = blockStyleAt(editor, pos);
    families.add(effectiveFamily(explicitFamily, dir, settings));
    latinFamilies.add(latinFaceFromAttrs(attrs));
    sizes.add(effectiveSize(explicitSize, localStyle, settings));
    lineHeights.add(lineHeightAt(editor, pos, settings));
    trackings.add(metricOf(attrs?.trackingPercent, 0));
    scales.add(metricOf(attrs?.scalePercent, 100));
    addBlockAt(textblockAt(editor, pos), pos);
  };

  if (empty) {
    const stored = editor.getAttributes("textStyle") as Record<string, unknown>;
    addFromText(
      from,
      activeToolbarFontFamily(editor),
      resolveFontSizePt(stored.fontSize),
      stored,
    );
    const storedColor = normalizeSafeHex(stored.color);
    colors.add(storedColor ?? "");
    const storedHi = normalizeSafeHex(editor.getAttributes("highlight").color);
    highlights.add(storedHi ?? "");
    effects.add(String(stored.textEffect || "none"));
  } else {
    let sawText = false;
    const seenBlocks = new Set<number>();
    const blockInnerPositions: number[] = [];
    for (const { $from, $to } of ranges) {
      const rangeFrom = $from.pos;
      const rangeTo = $to.pos;
      editor.state.doc.nodesBetween(rangeFrom, rangeTo, (node, pos) => {
        if (node.type.name === "paragraph" || node.type.name === "heading") {
          if (!seenBlocks.has(pos)) {
            seenBlocks.add(pos);
            const inner = Math.min(pos + 1, editor.state.doc.content.size);
            blockInnerPositions.push(inner);
            addBlockAt(node, inner);
          }
        }
        if (!node.isText) return;
        const sliceFrom = Math.max(0, rangeFrom - pos);
        const sliceTo = Math.min(node.text?.length ?? 0, rangeTo - pos);
        if (sliceTo <= sliceFrom) return;
        sawText = true;
        const mark = node.marks.find((item) => item.type.name === "textStyle");
        const attrs = (mark?.attrs ?? {}) as Record<string, unknown>;
        const slice = node.text?.slice(sliceFrom, sliceTo) ?? "";
        const hasArabic = hasScript(slice, "arabic");
        const hasLatin = hasScript(slice, "latin");
        const dir = blockDirAt(editor, pos, globalDir);
        const localStyle = blockStyleAt(editor, pos);
        if (hasArabic) {
          families.add(effectiveFamily(normalizeEditorFontFamily(attrs.fontFamily), dir, settings));
        }
        if (hasLatin) latinFamilies.add(latinFaceFromAttrs(attrs));
        sizes.add(effectiveSize(resolveFontSizePt(attrs.fontSize), localStyle, settings));
        lineHeights.add(lineHeightAt(editor, pos, settings));
        trackings.add(metricOf(attrs.trackingPercent, 0));
        scales.add(metricOf(attrs.scalePercent, 100));
        colors.add(normalizeSafeHex(attrs.color) ?? "");
        effects.add(String(attrs.textEffect || "none"));
        const hi = node.marks.find((item) => item.type.name === "highlight");
        highlights.add(normalizeSafeHex(hi?.attrs?.color) ?? "");
      });
    }
    if (!sawText) {
      const stored = editor.getAttributes("textStyle") as Record<string, unknown>;
      const targets = blockInnerPositions.length ? blockInnerPositions : [from];
      for (const targetPos of targets) {
        addFromText(
          targetPos,
          activeToolbarFontFamily(editor),
          resolveFontSizePt(stored.fontSize),
          stored,
        );
      }
      effects.add(String(stored.textEffect || "none"));
    }
  }

  const mixed = {
    fontFamily: families.size > 1,
    latinFontFamily: latinFamilies.size > 1,
    fontSize: sizes.size > 1,
    lineHeight: lineHeights.size > 1,
    lineGap: lineGaps.size > 1,
    color: colors.size > 1,
    highlight: highlights.size > 1,
    spaceBefore: spaceBefores.size > 1,
    spaceAfter: spaceAfters.size > 1,
    firstLineIndent: firstIndents.size > 1,
    indentStart: startIndents.size > 1,
    indentEnd: endIndents.size > 1,
    tracking: trackings.size > 1,
    scale: scales.size > 1,
  };

  const frameTarget = readFormattingTarget(editor.view.dom);
  const frameInput = frameTarget?.owner === "frame" ? frameTarget.input : null;
  if (frameInput?.isConnected) {
    const frameFamily = frameInput.dataset.studioFrameFontFamily;
    const frameSize = Number(frameInput.dataset.studioFrameFontSizePt);
    const frameAlign = frameInput.dataset.studioFrameTextAlign;
    const frameColor = normalizeSafeHex(frameInput.dataset.studioFrameTextColor);
    families.clear(); families.add(frameFamily || effectiveFamily("", "rtl", settings));
    sizes.clear(); sizes.add(Number.isFinite(frameSize) && frameSize > 0 ? frameSize : settings.typography.bodyFontSizePt);
    colors.clear(); colors.add(frameColor ?? "");
    aligns.clear(); if (frameAlign && ["left", "center", "right", "justify", "justify-all"].includes(frameAlign)) aligns.add(frameAlign as "left" | "center" | "right" | "justify" | "justify-all");
    mixed.fontFamily = false; mixed.fontSize = false; mixed.color = false;
  }

  return {
    fontFamily: mixed.fontFamily ? MIXED_TOOLBAR_VALUE : [...families][0] ?? effectiveFamily("", globalDir, settings),
    latinFontFamily: mixed.latinFontFamily ? MIXED_TOOLBAR_VALUE : [...latinFamilies][0] ?? "Arial Unicode MS",
    fontSizePt: mixed.fontSize ? null : [...sizes][0] ?? settings.typography.bodyFontSizePt,
    lineHeight: mixed.lineHeight ? null : [...lineHeights][0] ?? null,
    blockStyle,
    bold: editor.isActive("bold") || Boolean(style.bold),
    italic: editor.isActive("italic"),
    underline: editor.isActive("underline"),
    textEffect: effects.size === 1 ? [...effects][0] : "none",
    textOutline: isTextOutlineActive(editor),
    textAlign: frameInput ? (aligns.size === 1 ? [...aligns][0] : "start") : aligns.size === 1 ? [...aligns][0] : aligns.size > 1 ? null : (style.align ?? (blockDirAt(editor, from, globalDir) === "rtl" ? "right" : "left")),
    directionMode: directionModes.size === 1 ? [...directionModes][0] : "auto",
    blockDir: blockDirs.size === 1 ? [...blockDirs][0] : null,
    color: frameInput ? ([...colors][0] || null) : mixed.color ? null : ([...colors][0] || null),
    highlight: mixed.highlight ? null : ([...highlights][0] || null),
    spaceBeforePt: mixed.spaceBefore ? null : [...spaceBefores][0] ?? settings.typography.paragraphBeforePt,
    spaceAfterPt: mixed.spaceAfter ? null : [...spaceAfters][0] ?? settings.typography.paragraphAfterPt,
    lineGapPt: mixed.lineGap ? null : ([...lineGaps][0] ?? 0),
    trackingPercent: mixed.tracking ? null : [...trackings][0] ?? 0,
    scalePercent: mixed.scale ? null : [...scales][0] ?? 100,
    firstLineIndentMm: mixed.firstLineIndent ? null : [...firstIndents][0] ?? settings.typography.firstLineIndentMm,
    indentStartMm: mixed.indentStart ? null : [...startIndents][0] ?? 0,
    indentEndMm: mixed.indentEnd ? null : [...endIndents][0] ?? 0,
    bullet: editor.isActive("bulletList"),
    ordered: editor.isActive("orderedList"),
    mixed,
  };
}
