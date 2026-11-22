"use client";
import {nativeCaretSnapshot} from "../utils/nativeCaretSnapshot";
import {pageProjection,projectPoint,facingArrowKey,facingTextRect,facingLineTop,requestCanonicalFrame,cancelCanonicalFrame,withCanonicalPages,facingSlot,unprojectPoint,facingExtent,type PageProjection} from "../utils/facingPages";
import { StudioScreenOverlay } from "./StudioScreenOverlay";

import { useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type CSSProperties, type Ref } from "react";
import { useStudioCaretVisibility } from "./useStudioCaretVisibility";
import { caretGeometry } from "../utils/caretGeometry";
import { getQalamPaginationState } from "../extensions/QalamPagination";
import {hardBreakLineTop} from "../utils/hardBreakLineGrid";
import { renderedLineBoxTop } from "../utils/textLineBoxes";
import { firstLineRunAt } from "../extensions/FirstLineLayout";
import { StudioTextFrame, type StudioFrameHistoryBridge } from "./StudioTextFrame";
import { defaultDocumentSettings, type DocumentStudioSettings } from "../utils/documentSettings";
import { singleLineLeadingPt, singleLineOuterHeightMm, singleLineOuterHeightPx } from "../utils/singleLineFrame";
import type { KeyboardLayout } from "../utils/inpageKeyboard";
import type { Editor } from "@tiptap/react";
import { type StudioToolId } from "./InPageToolPalette";
import type { MenuActionId } from "../utils/documentMenus";
import type { StudioTextAlign } from "../utils/documentCommands";
import { paragraphTextPatch, type ParagraphAlign, type TextEditRange } from "../utils/paragraphAlign";
import { pictureContentDeltaMm } from "../utils/pictureFit";
import { DEFAULT_PICTURE_TOOL_DEFAULTS, type PictureToolDefaults } from "../utils/objectAttributes";
import { resolveBorderStrokes, type BorderPatternId } from "../utils/borderPatterns";
import { isRunAroundBox } from "../utils/runAroundFlow";

export type FrameKind =
  | "rect"
  | "ellipse"
  | "round-rect"
  | "line"
  | "text"
  | "picture-rect"
  | "picture-ellipse"
  | "picture-round-rect";

export type StudioFrame = {
  id: string;
  kind: FrameKind;
  page: number;
  xMm: number;
  yMm: number;
  wMm: number;
  hMm: number;
  /** Line runs the other diagonal when true. */
  flip: boolean;
  text: string;
  typography?: DocumentStudioSettings["typography"];
  textColor?: string;
  textAlign?: StudioTextAlign;
  /** Per-paragraph alignment. Absent on legacy frames, which keep using textAlign for every paragraph. */
  paragraphAligns?: ParagraphAlign[];
  singleLine?: boolean;
  imageSrc?: string;
  imageName?: string;
  imageNaturalW?: number;
  imageNaturalH?: number;
  imageXMm?: number;
  imageYMm?: number;
  imageWMm?: number;
  imageHMm?: number;
  locked?: boolean;
  dontPrint?: boolean;
  template?: boolean;
  roundnessMm?: number;
  angle1Deg?: number;
  angle2Deg?: number;
  borderPosition?: "inside" | "outside";
  borderColor?: string;
  borderWidthMm?: number;
  borderPattern?: BorderPatternId;
  backgroundColor?: string;
  backgroundHatch?: "none";
  /** Story text flows around this box. Absent means off. */
  runAround?: boolean;
  /** Clearance outside the box when runAround is on. Absent uses 2.5 / 2.5 / 1.5 / 1.5 mm. */
  runAroundLeftMm?: number;
  runAroundRightMm?: number;
  runAroundTopMm?: number;
  runAroundBottomMm?: number;
};

export function isPictureBox(kind: string): boolean {
  return kind === "picture-rect" || kind === "picture-ellipse" || kind === "picture-round-rect";
}

/** The selected (targeted) picture box that Insert > Picture and Import Picture fill. */
export function selectedPictureBoxId(frames: StudioFrame[], selectedIds: readonly string[]): string | null {
  return frames.find((frame) => selectedIds.includes(frame.id) && isPictureBox(frame.kind))?.id ?? null;
}

/** Import Picture fills a selected picture box; Insert > Picture inserts at the story caret. */
export function pictureMenuDisabledIds(frames: StudioFrame[], selectedIds: readonly string[]): Set<MenuActionId> {
  return selectedPictureBoxId(frames, selectedIds)
    ? new Set<MenuActionId>()
    : new Set<MenuActionId>(["file.importPicture"]);
}

export const HAND_CURSOR_PNG_PATH = "/cursors/hand-cursor.png";

// 32x32 PNG cursor ensures reliable browser/OS cursor rendering with standard fallbacks.
export const PICTURE_HAND_CURSOR = `url("${HAND_CURSOR_PNG_PATH}") 16 2, grab`;
const PICTURE_HAND_CURSOR_DRAGGING = `url("${HAND_CURSOR_PNG_PATH}") 16 2, grabbing`;

const DRAW_TOOLS = new Set<StudioToolId>([
  "textbox",
  "title-text",
  "rect",
  "ellipse",
  "round-rect",
  "line",
  "cross-square",
  "cross-circle",
  "cross-round",
]);
const FRAME_KEY = "qalam-studio-frames-v1";

const VALID_FRAME_KINDS = new Set<string>([
  "rect",
  "ellipse",
  "round-rect",
  "line",
  "text",
  "picture-rect",
  "picture-ellipse",
  "picture-round-rect",
]);

export function readStoredFrames(id: string): StudioFrame[] {
  if (typeof window === "undefined" || !id) return [];
  try {
    const map = JSON.parse(window.localStorage.getItem(FRAME_KEY) || "{}") as Record<string, unknown>;
    const raw = map[id];
    if (!Array.isArray(raw)) return [];
    return raw.filter(isFrame);
  } catch {
    return [];
  }
}

export function writeStoredFrames(id: string, frames: StudioFrame[]): void {
  if (typeof window === "undefined" || !id) return;
  try {
    const map = JSON.parse(window.localStorage.getItem(FRAME_KEY) || "{}") as Record<string, unknown>;
    map[id] = frames;
    window.localStorage.setItem(FRAME_KEY, JSON.stringify(map));
  } catch {
    /* private mode */
  }
}

export function isFrame(value: unknown): value is StudioFrame {
  if (!value || typeof value !== "object") return false;
  const frame = value as StudioFrame;
  return typeof frame.id === "string" && typeof frame.kind === "string" && VALID_FRAME_KINDS.has(frame.kind) && typeof frame.xMm === "number";
}

function newId(): string {
  return `f-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function releaseCapturedPointer(node: EventTarget | null, pointerId: number) {
  if (!(node instanceof Element) || !node.hasPointerCapture?.(pointerId)) return;
  node.releasePointerCapture(pointerId);
}

const PX_PER_MM = 96 / 25.4;
const PX_PER_POINT = 96 / 72;
const PICTURE_CORNER_RX_PX = 6.35 * PX_PER_MM;
const pictureCornerRadiusPx = (frame: StudioFrame) => (frame.roundnessMm ?? 6.35) * PX_PER_MM;

/** Reassign destination page and page-local yMm when a move crosses a page boundary. */
export function resolveMovedFramePlacement(
  original: Pick<StudioFrame, "page" | "xMm" | "yMm" | "wMm" | "hMm">,
  dxPx: number,
  dyPx: number,
  options: {
    pageCount: number;
    pageHeightPx: number;
    gapPx: number;
    projection?: PageProjection;
  },
): { page: number; xMm: number; yMm: number } {
  const { pageCount, pageHeightPx, gapPx, projection } = options;
  const maxPage = Math.max(1, pageCount, original.page);
  if (projection) {
    const origSlot = facingSlot(original.page - 1, projection);
    const projX = origSlot.x + original.xMm * PX_PER_MM + dxPx;
    const projY = origSlot.y + original.yMm * PX_PER_MM + dyPx;
    const centerX = projX + (original.wMm * PX_PER_MM) / 2;
    const centerY = projY + (original.hMm * PX_PER_MM) / 2;
    const mapped = unprojectPoint(centerX, centerY, { ...projection, count: Math.max(maxPage, projection.count) });
    const page = Math.min(Math.max(maxPage, projection.count), Math.max(1, mapped.page + 1));
    const destSlot = facingSlot(page - 1, projection);
    return {
      page,
      xMm: (projX - destSlot.x) / PX_PER_MM,
      yMm: (projY - destSlot.y) / PX_PER_MM,
    };
  }
  const stride = pageHeightPx + gapPx;
  if (!(stride > 0)) {
    return {
      page: original.page,
      xMm: original.xMm + dxPx / PX_PER_MM,
      yMm: original.yMm + dyPx / PX_PER_MM,
    };
  }
  const nextLeftPx = original.xMm * PX_PER_MM + dxPx;
  const nextTopPx = (original.page - 1) * stride + original.yMm * PX_PER_MM + dyPx;
  const centerY = nextTopPx + (original.hMm * PX_PER_MM) / 2;
  const page = Math.min(maxPage, Math.max(1, Math.floor((centerY + gapPx / 2) / stride) + 1));
  return {
    page,
    xMm: nextLeftPx / PX_PER_MM,
    yMm: (nextTopPx - (page - 1) * stride) / PX_PER_MM,
  };
}

/** Move selected, unlocked frames by a document-space arrow-key nudge. */
export function nudgeSelectedFrames(
  frames: readonly StudioFrame[],
  selectedIds: readonly string[],
  key: "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown",
  shiftKey: boolean,
  options: Parameters<typeof resolveMovedFramePlacement>[3],
): StudioFrame[] {
  const distancePx = PX_PER_POINT * (shiftKey ? 10 : 1);
  const dxPx = key === "ArrowLeft" ? -distancePx : key === "ArrowRight" ? distancePx : 0;
  const dyPx = key === "ArrowUp" ? -distancePx : key === "ArrowDown" ? distancePx : 0;
  const selected = new Set(selectedIds);
  let changed = false;
  const next = frames.map((frame) => {
    if (!selected.has(frame.id) || frame.locked) return frame;
    const placement = resolveMovedFramePlacement(frame, dxPx, dyPx, options);
    if (placement.page === frame.page && placement.xMm === frame.xMm && placement.yMm === frame.yMm) return frame;
    changed = true;
    return { ...frame, ...placement };
  });
  return changed ? next : [...frames];
}

/**
 * Compute resized frame bounds against the pointer-down snapshot, keeping the
 * frame anchored to its owning page and clamping handles within that page.
 */
export function resolveResizedFrameBounds(
  startFrame: Pick<StudioFrame, "page" | "xMm" | "yMm" | "wMm" | "hMm" | "singleLine" | "imageSrc" | "imageXMm" | "imageYMm">,
  edge: string,
  point: { x: number; y: number },
  options: {
    startSlot: { x: number; y: number };
    pageWidthPx: number;
    pageHeightPx: number;
  },
): (Pick<StudioFrame, "page" | "xMm" | "yMm" | "wMm" | "hMm"> & Partial<Pick<StudioFrame, "imageXMm" | "imageYMm">>) | null {
  const { startSlot, pageWidthPx, pageHeightPx } = options;
  const startLeft = startSlot.x + startFrame.xMm * PX_PER_MM;
  const startTop = startSlot.y + startFrame.yMm * PX_PER_MM;
  const startRight = startLeft + startFrame.wMm * PX_PER_MM;
  const startBottom = startTop + startFrame.hMm * PX_PER_MM;
  const minX = pageWidthPx > 0 ? Math.min(startSlot.x, startLeft) : Number.NEGATIVE_INFINITY;
  const maxX = pageWidthPx > 0 ? Math.max(startSlot.x + pageWidthPx, startRight) : Number.POSITIVE_INFINITY;
  const minY = pageHeightPx > 0 ? Math.min(startSlot.y, startTop) : Number.NEGATIVE_INFINITY;
  const maxY = pageHeightPx > 0 ? Math.max(startSlot.y + pageHeightPx, startBottom) : Number.POSITIVE_INFINITY;
  const px = Math.min(maxX, Math.max(minX, point.x));
  const py = Math.min(maxY, Math.max(minY, point.y));
  if (startFrame.singleLine) {
    if (!edge.includes("e") && !edge.includes("w")) return null;
    let x1 = startLeft;
    let x2 = startRight;
    if (edge.includes("w")) x1 = px;
    if (edge.includes("e")) x2 = px;
    const x = Math.min(x1, x2);
    return {
      page: startFrame.page,
      xMm: x === startLeft ? startFrame.xMm : (x - startSlot.x) / PX_PER_MM,
      yMm: startFrame.yMm,
      wMm: Math.max(1, Math.abs(x2 - x1)) / PX_PER_MM,
      hMm: startFrame.hMm,
    };
  }
  let x1 = startLeft;
  let y1 = startTop;
  let x2 = startRight;
  let y2 = startBottom;
  if (edge.includes("w")) x1 = px;
  if (edge.includes("e")) x2 = px;
  if (edge.includes("n")) y1 = py;
  if (edge.includes("s")) y2 = py;
  const x = Math.min(x1, x2);
  const y = Math.min(y1, y2);
  const wPx = Math.max(1, Math.abs(x2 - x1));
  const hPx = Math.max(1, Math.abs(y2 - y1));
  const newXMm = x === startLeft ? startFrame.xMm : (x - startSlot.x) / PX_PER_MM;
  const newYMm = y === startTop ? startFrame.yMm : (y - startSlot.y) / PX_PER_MM;
  const dxMm = newXMm - startFrame.xMm;
  const dyMm = newYMm - startFrame.yMm;
  const next: Pick<StudioFrame, "page" | "xMm" | "yMm" | "wMm" | "hMm"> & Partial<Pick<StudioFrame, "imageXMm" | "imageYMm">> = {
    page: startFrame.page,
    xMm: newXMm,
    yMm: newYMm,
    wMm: wPx / PX_PER_MM,
    hMm: hPx / PX_PER_MM,
  };
  if (startFrame.imageSrc && (edge.includes("w") || edge.includes("n"))) {
    if (edge.includes("w")) next.imageXMm = (startFrame.imageXMm ?? 0) - dxMm;
    if (edge.includes("n")) next.imageYMm = (startFrame.imageYMm ?? 0) - dyMm;
  }
  return next;
}

export function isUndraggedShape(w: number, h: number): boolean {
  return Math.abs(w) < 4 && Math.abs(h) < 4;
}

export function marqueeSelectedFrameIds(
  frames: readonly StudioFrame[],
  start: { x: number; y: number },
  end: { x: number; y: number },
  {
    stride,
    projection,
    shiftKey = false,
    initialSelected = [],
  }: {
    stride: number;
    projection?: PageProjection;
    shiftKey?: boolean;
    initialSelected?: readonly string[];
  },
): string[] {
  if (isUndraggedShape(end.x - start.x, end.y - start.y)) {
    return shiftKey ? [...initialSelected] : [];
  }
  const left = Math.min(start.x, end.x);
  const right = Math.max(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const bottom = Math.max(start.y, end.y);
  // Left-to-right selects fully enclosed objects; right-to-left selects intersected objects.
  const requireEnclosed = end.x >= start.x;
  const matched = frames
    .filter((frame) => {
      const slot = projection ? facingSlot(frame.page - 1, projection) : { x: 0, y: (frame.page - 1) * stride };
      const fx1 = slot.x + frame.xMm * PX_PER_MM;
      const fy1 = slot.y + frame.yMm * PX_PER_MM;
      const fx2 = fx1 + frame.wMm * PX_PER_MM;
      const fy2 = fy1 + frame.hMm * PX_PER_MM;
      return requireEnclosed
        ? fx1 >= left && fy1 >= top && fx2 <= right && fy2 <= bottom
        : fx2 >= left && fx1 <= right && fy2 >= top && fy1 <= bottom;
    })
    .map((frame) => frame.id);
  if (!shiftKey) return matched;
  const next = new Set(initialSelected);
  for (const id of matched) {
    if (next.has(id)) next.delete(id);
    else next.add(id);
  }
  return frames.filter((frame) => next.has(frame.id)).map((frame) => frame.id);
}

export function isPictureDrawTool(tool: StudioToolId): boolean {
  return tool === "cross-square" || tool === "cross-circle" || tool === "cross-round";
}

export function pictureKindForTool(tool: StudioToolId): "picture-rect" | "picture-ellipse" | "picture-round-rect" | null {
  if (tool === "cross-square") return "picture-rect";
  if (tool === "cross-circle") return "picture-ellipse";
  if (tool === "cross-round") return "picture-round-rect";
  return null;
}

/** Shift while drawing a picture box locks the drag to a square (circle for the ellipse tool). */
function constrainPictureDrag(w: number, h: number, shift: boolean): { w: number; h: number } {
  if (!shift) return { w, h };
  const size = Math.max(Math.abs(w), Math.abs(h));
  return { w: (w < 0 ? -1 : 1) * size, h: (h < 0 ? -1 : 1) * size };
}

export type StudioObjectLayerHandle = {
  startMarquee: (event: { clientX: number; clientY: number; pointerId: number; shiftKey: boolean }) => void;
  moveMarquee: (event: { clientX: number; clientY: number; pointerId: number }) => void;
  endMarquee: (event: { clientX: number; clientY: number; pointerId: number; shiftKey: boolean }) => void;
  cancelMarquee: () => void;
};

export function StudioObjectLayer({
  editor,
  tool,
  frames,
  onFramesChange,
  onToolAction,
  onSelectedChange,
  onDoubleClickFrame,
  onGestureBegin,
  onGestureEnd,
  frameHistoryBridge,
  layerRef,
  selectedIds: selectedIdsProp,
  pageCount,
  pageWidthPx,
  pageHeightPx,
  gapPx,
  marginTopPx,
  marginRightPx,
  typography,
  zoom = 1,
  projection: projectionProp,
  keyboardLayout,
  pictureBoxDefaults,
}: {
  editor: Editor | null;
  tool: StudioToolId;
  frames: StudioFrame[];
  typography?: DocumentStudioSettings["typography"];
  zoom?:number;
  projection?:PageProjection;
  keyboardLayout?: KeyboardLayout | null;
  pictureBoxDefaults?: PictureToolDefaults;
  onFramesChange: (frames: StudioFrame[], source?: "gesture") => void;
  onToolAction: (tool: StudioToolId) => void;
  onSelectedChange?: (selectedIds: string[]) => void;
  onDoubleClickFrame?: (frame: StudioFrame) => void;
  onGestureBegin?: () => void;
  onGestureEnd?: () => void;
  frameHistoryBridge?: StudioFrameHistoryBridge;
  layerRef?: Ref<StudioObjectLayerHandle>;
  selectedIds?: string[];
  pageCount: number;
  pageWidthPx: number;
  pageHeightPx: number;
  gapPx: number;
  marginTopPx: number;
  marginRightPx: number;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [selectedInternal, setSelectedInternal] = useState<string[]>([]);
  const selected = selectedIdsProp ?? selectedInternal;
  const setSelected = (next: string[] | ((prev: string[]) => string[])) => {
    const prev = selectedIdsProp ?? selectedInternal;
    const resolved = typeof next === "function" ? next(prev) : next;
    setSelectedInternal(resolved);
    onSelectedChange?.(resolved);
  };
  const [draft, setDraft] = useState<{ x: number; y: number; w: number; h: number; flip: boolean } | null>(null);
  const [panningFrameId, setPanningFrameId] = useState<string | null>(null);
  const dragRef = useRef<
    | { mode: "draw"; x: number; y: number; pointer: number }
    | { mode: "marquee"; x: number; y: number; pointer: number; initialSelected: string[] }
    | { mode: "move"; frames: StudioFrame[]; x: number; y: number; pointer: number; pressedId: string; peeled?: boolean }
    | { mode: "resize"; id: string; edge: string; pointer: number; startFrame: StudioFrame; startSlot: { x: number; y: number } }
    | { mode: "pan"; id: string; x: number; y: number; pointer: number; startX: number; startY: number; angle: number }
    | null
  >(null);
  const drawing = DRAW_TOOLS.has(tool);
  const pendingTextFocus = useRef<string | null>(null);
  // A new picture frame stays targeted when the draw tool hands over to the
  // Hand (content) tool, as in InPage.
  const pictureSelectionRef = useRef<string | null>(null);
  const pictureDraggedRef = useRef(false);
  // Frame pressed by the last Arrow pointerdown, and whether it was dragged.
  // Under pointer capture the browser targets click/dblclick at the layer, so
  // the layer opens the chooser from this record instead of frame handlers.
  const lastPressRef = useRef<{ id: string; moved: boolean } | null>(null);
  const framesRef = useRef(frames);
  framesRef.current = frames;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const toolRef = useRef(tool);
  toolRef.current = tool;
  const onChangeRef = useRef(onFramesChange);
  onChangeRef.current = onFramesChange;
  const nudgePlacementOptionsRef = useRef({ pageCount, pageHeightPx, gapPx, projection: projectionProp });
  nudgePlacementOptionsRef.current = { pageCount, pageHeightPx, gapPx, projection: projectionProp };

  // Preserve existing selection across tool switches so returning to the Arrow tool
  // restores the selected object state; only select a freshly committed picture box
  // or drop IDs that no longer exist.
  useEffect(() => {
    const existingIds = new Set(framesRef.current.map((frame) => frame.id));
    const fresh = pictureSelectionRef.current;
    pictureSelectionRef.current = null;
    if (fresh) {
      setSelected(existingIds.has(fresh) ? [fresh] : []);
      return;
    }
    const keep = selectedRef.current.filter((id) => existingIds.has(id));
    if (keep.length !== selectedRef.current.length) setSelected(keep);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool]);

  useLayoutEffect(() => {
    if (tool !== "text" || !pendingTextFocus.current) return;
    const frame = rootRef.current?.querySelector<HTMLElement>(`[data-studio-frame-id="${pendingTextFocus.current}"]`);
    const textarea = frame?.querySelector<HTMLInputElement | HTMLTextAreaElement>("textarea, input[data-studio-text-frame]");
    if (!textarea) return;
    pendingTextFocus.current = null;
    textarea.focus({ preventScroll: true });
  }, [frames, tool]);

  useEffect(() => {
    const clearOnEmpty = (event: PointerEvent) => {
      if (event.shiftKey && toolRef.current === "select") return;
      const target = event.target as HTMLElement | null;
      // Any click in the document/pasteboard away from a frame dismisses the
      // previous object selection, whether the active tool is Arrow or Text.
      if (target?.closest("[data-studio-scroller]") && !target.closest("[data-studio-frame]")) setSelected([]);
    };
    const clearOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (event.target instanceof Element && event.target.closest("[data-studio-object-ribbon]")) {
          return;
        }
        if (
          document.querySelector(
            '[data-studio-picture-menu], [data-studio-picture-context-zoom], [data-studio-text-menu], [data-menu-dropdown], [role="dialog"], [role="listbox"]',
          )
        ) {
          return;
        }
        setSelected([]);
        setDraft(null);
        dragRef.current = null;
      }
    };
    document.addEventListener("pointerdown", clearOnEmpty, true);
    document.addEventListener("keydown", clearOnEscape, true);
    return () => {
      document.removeEventListener("pointerdown", clearOnEmpty, true);
      document.removeEventListener("keydown", clearOnEscape, true);
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (toolRef.current !== "select") return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
      const target = event.target as HTMLElement | null;
      const inStoryEditor = Boolean(target?.closest(".ProseMirror"));
      if (!inStoryEditor && target?.closest("textarea, input, select, button, [contenteditable='true']")) return;
      const selectedIds = selectedRef.current;
      if (!selectedIds.length) return;
      if (event.ctrlKey || event.altKey || event.metaKey || event.isComposing) return;
      if (document.querySelector('[data-studio-picture-menu], [data-studio-picture-context-zoom], [data-studio-text-menu], [data-menu-dropdown], [role="dialog"], [role="listbox"]')) return;
      const next = nudgeSelectedFrames(
        framesRef.current,
        selectedIds,
        event.key,
        event.shiftKey,
        nudgePlacementOptionsRef.current,
      );
      if (next.every((frame, index) => frame === framesRef.current[index])) return;
      event.preventDefault();
      onChangeRef.current(next);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (tool !== "select" || (event.key !== "Delete" && event.key !== "Backspace")) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("textarea, input, [contenteditable='true']")) return;
      if (!selected.length) return;
      event.preventDefault();
      const deletable = frames.filter((frame) => selected.includes(frame.id) && !frame.locked);
      if (!deletable.length) return;
      onFramesChange(frames.filter((frame) => !selected.includes(frame.id) || frame.locked));
      setSelected(selected.filter((id) => frames.some((frame) => frame.id === id && frame.locked)));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [frames, onFramesChange, selected, tool]);

  const localPoint = (event: { clientX: number; clientY: number }) => {
    const root = rootRef.current;
    if (!root) return { x: 0, y: 0 };
    const rect = root.getBoundingClientRect();
    const surface = root.closest<HTMLElement>("[data-studio-zoom-surface]");
    const scale = projectionProp ? zoom : surface ? surface.getBoundingClientRect().width / pageWidthPx : zoom;
    const point = { x: (event.clientX - rect.left) / scale, y: (event.clientY - rect.top) / scale };
    if (projectionProp) return point;
    const projection = editor ? pageProjection(editor.view.dom) : undefined;
    return projection ? unprojectPoint(point.x, point.y, projection) : point;
  };

  const pageOf = (y: number) => {
    const stride = pageHeightPx + gapPx;
    return Math.min(pageCount, Math.max(1, Math.floor(y / stride) + 1));
  };

  const onGestureBeginRef = useRef(onGestureBegin);
  onGestureBeginRef.current = onGestureBegin;
  const onGestureEndRef = useRef(onGestureEnd);
  onGestureEndRef.current = onGestureEnd;
  const gestureOpenRef = useRef(false);

  const beginGesture = () => {
    if (gestureOpenRef.current) return;
    gestureOpenRef.current = true;
    onGestureBeginRef.current?.();
  };

  const endGesture = () => {
    if (!gestureOpenRef.current) return;
    gestureOpenRef.current = false;
    onGestureEndRef.current?.();
  };

  const emitFrames = (next: StudioFrame[], source?: "gesture") => {
    onChangeRef.current(next, source);
  };

  useImperativeHandle(layerRef, () => ({
    startMarquee(event) {
      if (tool !== "select") return;
      const initialSelected = event.shiftKey ? [...selectedRef.current] : [];
      if (!event.shiftKey) setSelected([]);
      const point = localPoint(event);
      dragRef.current = { mode: "marquee", x: point.x, y: point.y, pointer: event.pointerId, initialSelected };
      setDraft({ x: point.x, y: point.y, w: 0, h: 0, flip: false });
    },
    moveMarquee(event) {
      const drag = dragRef.current;
      if (!drag || drag.mode !== "marquee" || drag.pointer !== event.pointerId) return;
      const point = localPoint(event);
      setDraft({ x: drag.x, y: drag.y, w: point.x - drag.x, h: point.y - drag.y, flip: false });
    },
    endMarquee(event) {
      const drag = dragRef.current;
      if (!drag || drag.mode !== "marquee" || drag.pointer !== event.pointerId) return;
      dragRef.current = null;
      const point = localPoint(event);
      setSelected(
        marqueeSelectedFrameIds(framesRef.current, { x: drag.x, y: drag.y }, point, {
          stride: pageHeightPx + gapPx,
          projection: projectionProp,
          shiftKey: event.shiftKey,
          initialSelected: drag.initialSelected,
        }),
      );
      setDraft(null);
    },
    cancelMarquee() {
      if (dragRef.current?.mode !== "marquee") return;
      dragRef.current = null;
      setDraft(null);
    },
  }));

  const updateFrame = (id: string, patch: Partial<Omit<StudioFrame, "paragraphAligns" | "textAlign">> & { textAlign?: StudioTextAlign | null; paragraphAligns?: ParagraphAlign[] | null }, source?: "gesture") => {
    emitFrames(framesRef.current.map((frame) => {
      if (frame.id !== id) return frame;
      const { paragraphAligns, textAlign, ...rest } = patch;
      const next: StudioFrame = { ...frame, ...rest };
      if (paragraphAligns !== undefined) {
        if (paragraphAligns === null) delete next.paragraphAligns;
        else next.paragraphAligns = paragraphAligns;
      }
      if (textAlign !== undefined) {
        if (textAlign === null) delete next.textAlign;
        else next.textAlign = textAlign;
      }
      return next;
    }), source);
  };

  const commitBox = (box: { x: number; y: number; w: number; h: number; flip: boolean }) => {
    const textTool = tool === "textbox" || tool === "title-text";
    const kind: FrameKind | null =
      textTool
        ? "text"
        : tool === "cross-square"
          ? "picture-rect"
          : tool === "cross-circle"
            ? "picture-ellipse"
            : tool === "cross-round"
              ? "picture-round-rect"
              : tool === "line" || tool === "ellipse" || tool === "round-rect" || tool === "rect"
                ? tool
                : null;
    if (!kind) return;
    let { x, y, w, h } = box;
    const singleLine = tool === "title-text";
    const flip = (w < 0) !== (h < 0);
    if (w < 0) {
      x += w;
      w = -w;
    }
    if (!singleLine && h < 0) {
      y += h;
      h = -h;
    }
    if (singleLine) {
      if (w < 4) return;
    } else if (textTool && (w < 4 || h < 4)) return;
    if (!singleLine && isUndraggedShape(w, h)) return;
    const stride = pageHeightPx + gapPx;
    let page: number;
    let xOnPage: number;
    let yOnPage: number;
    if (projectionProp) {
      const count = Math.max(1, pageCount, projectionProp.count);
      const mapped = unprojectPoint(x + w / 2, y + (singleLine ? 0 : h / 2), { ...projectionProp, count });
      page = Math.min(count, Math.max(1, mapped.page + 1));
      const slot = facingSlot(page - 1, projectionProp);
      xOnPage = x - slot.x;
      yOnPage = Math.max(0, y - slot.y);
    } else {
      page = pageOf(y);
      xOnPage = x;
      yOnPage = Math.max(0, y - (page - 1) * stride);
    }
    const frameTypography = typography ?? defaultDocumentSettings().typography;
    const defaults = pictureBoxDefaults ?? DEFAULT_PICTURE_TOOL_DEFAULTS;
    const runAroundDefault = isRunAroundBox({
      kind,
      angle1Deg: isPictureBox(kind) ? defaults.angle1Deg : 0,
    });
    const frame: StudioFrame = {
      id: newId(),
      kind,
      page,
      xMm: xOnPage / PX_PER_MM,
      yMm: yOnPage / PX_PER_MM,
      wMm: Math.max(1, w) / PX_PER_MM,
      hMm: singleLine ? singleLineOuterHeightMm(frameTypography) : Math.max(1, h) / PX_PER_MM,
      flip,
      text: "",
      typography,
      ...(singleLine ? { singleLine: true } : {}),
      ...(runAroundDefault ? { runAround: true } : {}),
      ...(isPictureBox(kind)
        ? {
            borderColor: defaults.borderColor,
            borderWidthMm: defaults.borderWidthMm,
            borderPattern: defaults.borderPattern,
            borderPosition: defaults.borderPosition,
            ...(defaults.backgroundColor ? { backgroundColor: defaults.backgroundColor } : {}),
            backgroundHatch: defaults.backgroundHatch,
            ...(kind === "picture-round-rect" || defaults.roundnessMm !== 6.35 ? { roundnessMm: defaults.roundnessMm } : {}),
            ...(defaults.angle1Deg !== 0 ? { angle1Deg: defaults.angle1Deg } : {}),
          }
        : {}),
    };
    if (textTool) pendingTextFocus.current = frame.id;
    onChangeRef.current([...framesRef.current, frame]);
    setSelected([frame.id]);
    if (textTool) onToolAction("text");
    else if (isPictureDrawTool(tool)) {
      // InPage: after drawing a picture box the Hand (content) tool is active
      // and the new box stays targeted, so one click opens the chooser.
      pictureSelectionRef.current = frame.id;
      framesRef.current = [...framesRef.current, frame];
      onToolAction("text");
    }
  };

  const openPictureBox = (frame: StudioFrame) => {
    if (!isPictureBox(frame.kind)) return;
    onDoubleClickFrame?.(frame);
  };

  return (
    <div
      ref={rootRef}
      className="studio-no-print absolute inset-0 z-[6]"
      data-studio-objects="true"
      style={{ left: projectionProp ? 0 : undefined, right: projectionProp ? "auto" : undefined, bottom: projectionProp ? "auto" : undefined, width:projectionProp?facingExtent(projectionProp).width:undefined,height:projectionProp?facingExtent(projectionProp).height:undefined, pointerEvents: drawing || tool === "select" ? "auto" : "none", cursor: tool === "select" ? "default" : tool === "text" ? "text" : drawing ? "crosshair" : undefined }}
      onClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => {
        if (tool !== "select") return;
        const target = event.target instanceof HTMLElement ? event.target : null;
        if (target?.closest?.("[data-studio-frame-id]")) return;
        event.preventDefault();
        event.stopPropagation();
        const detail = { id: "", x: event.clientX, y: event.clientY, tool: "select-empty" };
        (window as Window & { __studioPictureContextRequest?: typeof detail }).__studioPictureContextRequest = detail;
        window.dispatchEvent(new CustomEvent("studio-picture-context", { detail }));
      }}
      onDoubleClick={(event) => {
        if (tool !== "select" && tool !== "text") return;
        const target = event.target as HTMLElement | null;
        if (target?.closest?.("[data-studio-frame-handle]")) return;
        const hitId = target?.closest?.("[data-studio-frame-id]")?.getAttribute("data-studio-frame-id");
        const press = lastPressRef.current;
        const id = hitId ?? (press && !press.moved ? press.id : null);
        if (!id || (press?.id === id && press.moved)) return;
        const frame = framesRef.current.find((item) => item.id === id);
        if (!frame || !isPictureBox(frame.kind)) return;
        event.stopPropagation();
        event.preventDefault();
        openPictureBox(frame);
      }}
      onPointerDown={(event) => {
        // Secondary clicks belong to the browser context-menu path; they must
        // never begin a marquee (or clear the current object selection).
        if (event.button === 2) return;
        if (tool === "select") {
          event.preventDefault();
          event.stopPropagation();
          const initialSelected = event.shiftKey ? [...selected] : [];
          if (!event.shiftKey) setSelected([]);
          const point = localPoint(event);
          dragRef.current = { mode: "marquee", x: point.x, y: point.y, pointer: event.pointerId, initialSelected };
          setDraft({ x: point.x, y: point.y, w: 0, h: 0, flip: false });
          event.currentTarget.setPointerCapture?.(event.pointerId);
          return;
        }
        if (!drawing) return;
        event.preventDefault();
        event.stopPropagation();
        const point = localPoint(event);
        dragRef.current = { mode: "draw", x: point.x, y: point.y, pointer: event.pointerId };
        setDraft({ x: point.x, y: point.y, w: 0, h: 0, flip: false });
        setSelected([]);
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointer !== event.pointerId) return;
        const point = localPoint(event);
        if (drag.mode === "draw" || drag.mode === "marquee") {
          let w = point.x - drag.x;
          let h = point.y - drag.y;
          if (drag.mode === "draw" && isPictureDrawTool(tool)) ({ w, h } = constrainPictureDrag(w, h, event.shiftKey));
          setDraft({ x: drag.x, y: drag.y, w, h, flip: false });
          return;
        }
        if (drag.mode === "move") {
          const dxPx = point.x - drag.x;
          const dyPx = point.y - drag.y;
          if (Math.hypot(dxPx, dyPx) >= 4) {
            pictureDraggedRef.current = true;
            if (lastPressRef.current?.id === drag.pressedId) lastPressRef.current.moved = true;
          }
          const placementOptions = { pageCount, pageHeightPx, gapPx, projection: projectionProp };
          if (!drag.peeled && Math.hypot(dxPx, dyPx) >= 4) {
            const template = drag.frames.find((frame) => frame.id === drag.pressedId && frame.template);
            if (template) {
              let id = newId();
              while (framesRef.current.some((frame) => frame.id === id)) id = newId();
              const { template: _templateFlag, ...ordinaryFields } = template;
              // Keep the clone's snapshot at the pad's start position so later moves apply dx/dy from pointer-down once.
              const clone: StudioFrame = { ...ordinaryFields, id, locked: false };
              drag.frames = [...drag.frames.filter((frame) => frame.id !== template.id), clone];
              drag.peeled = true;
              setSelected([id]);
              const withClone = [...framesRef.current, clone];
              const peeled = new Map(drag.frames.map((frame) => [frame.id, frame]));
              emitFrames(withClone.map((frame) => {
                const original = peeled.get(frame.id);
                if (!original) return frame;
                const placement = resolveMovedFramePlacement(original, dxPx, dyPx, placementOptions);
                return {
                  ...frame,
                  page: placement.page,
                  xMm: placement.xMm,
                  yMm: placement.yMm,
                  ...(isPictureBox(original.kind)
                    ? {
                        imageXMm: original.imageXMm,
                        imageYMm: original.imageYMm,
                        imageWMm: original.imageWMm,
                        imageHMm: original.imageHMm,
                      }
                    : {}),
                };
              }), "gesture");
              return;
            }
          }
          const moved = new Map(drag.frames.map((frame) => [frame.id, frame]));
          emitFrames(framesRef.current.map((frame) => {
            const original = moved.get(frame.id);
            // Offsets stay box-relative so the picture travels with the box.
            // Top/left resize, below, is what keeps the picture on the page.
            if (!original) return frame;
            const placement = resolveMovedFramePlacement(original, dxPx, dyPx, placementOptions);
            return {
              ...frame,
              page: placement.page,
              xMm: placement.xMm,
              yMm: placement.yMm,
              ...(isPictureBox(original.kind)
                ? {
                    imageXMm: original.imageXMm,
                    imageYMm: original.imageYMm,
                    imageWMm: original.imageWMm,
                    imageHMm: original.imageHMm,
                  }
                : {}),
            };
          }), "gesture");
          return;
        }
        if (drag.mode === "pan") {
          const dxPx = point.x - drag.x;
          const dyPx = point.y - drag.y;
          if (Math.hypot(dxPx, dyPx) >= 4) {
            pictureDraggedRef.current = true;
            if (lastPressRef.current?.id === drag.id) lastPressRef.current.moved = true;
          }
          const delta = pictureContentDeltaMm(dxPx, dyPx, drag.angle, PX_PER_MM);
          updateFrame(drag.id, { imageXMm: drag.startX + delta.xMm, imageYMm: drag.startY + delta.yMm }, "gesture");
          return;
        }
        const live = framesRef.current.find((item) => item.id === drag.id);
        if (!live || live.locked) return;
        const patch = resolveResizedFrameBounds(drag.startFrame, drag.edge, point, {
          startSlot: drag.startSlot,
          pageWidthPx,
          pageHeightPx,
        });
        if (!patch) return;
        pictureDraggedRef.current = true;
        lastPressRef.current = null;
        updateFrame(live.id, patch, "gesture");
      }}
      onPointerCancel={(event) => {
        dragRef.current = null;
        setPanningFrameId(null);
        setDraft(null);
        endGesture();
        releaseCapturedPointer(event.currentTarget, event.pointerId);
        releaseCapturedPointer(event.target, event.pointerId);
      }}
      onLostPointerCapture={() => {
        dragRef.current = null;
        setPanningFrameId(null);
        setDraft(null);
        endGesture();
      }}
      onPointerUp={(event) => {
        const drag = dragRef.current;
        dragRef.current = null;
        setPanningFrameId(null);
        if (drag?.mode === "draw") {
          const point = localPoint(event);
          let w = point.x - drag.x;
          let h = point.y - drag.y;
          if (isPictureDrawTool(tool)) ({ w, h } = constrainPictureDrag(w, h, event.shiftKey));
          commitBox({ x: drag.x, y: drag.y, w, h, flip: false });
        }
        if (drag?.mode === "marquee") {
          const point = localPoint(event);
          setSelected(
            marqueeSelectedFrameIds(framesRef.current, { x: drag.x, y: drag.y }, point, {
              stride: pageHeightPx + gapPx,
              projection: projectionProp,
              shiftKey: event.shiftKey,
              initialSelected: drag.initialSelected,
            }),
          );
        }
        setDraft(null);
        endGesture();
        releaseCapturedPointer(event.currentTarget, event.pointerId);
        releaseCapturedPointer(event.target, event.pointerId);
      }}
    >
      {frames.map((frame) => {
        const stride = pageHeightPx + gapPx;
        // Snap the frame to screen pixels, including a fractional page origin.
        const rootBox = rootRef.current?.getBoundingClientRect();
        const scale = projectionProp ? zoom : rootBox && rootBox.width > 0 ? rootBox.width/pageWidthPx : 1;
        const snap = (value: number, origin = 0) => (Math.round(origin + value * scale) - origin) / scale;
        const projection=projectionProp,slot=projection?facingSlot(frame.page-1,projection):{x:0,y:(frame.page-1)*stride};
        const left = snap(slot.x+frame.xMm * PX_PER_MM, rootBox?.left);
        const top = snap(slot.y+frame.yMm * PX_PER_MM, rootBox?.top);
        const width = Math.max(1, snap(frame.wMm * PX_PER_MM));
        const height = Math.max(1, snap(frame.hMm * PX_PER_MM));
        const active = selected.includes(frame.id) && tool === "select";
        const handTarget = tool === "text" && isPictureBox(frame.kind);
        return (
          <div
            key={frame.id}
            data-studio-frame={frame.kind}
            data-studio-frame-id={frame.id}
            onContextMenu={(event) => {
              const isPicture = isPictureBox(frame.kind);
              if (tool !== "select" && !isPicture) return;
              event.preventDefault();
              event.stopPropagation();
              if (!selected.includes(frame.id)) setSelected([frame.id]);
              const detail = { id: frame.id, x: event.clientX, y: event.clientY, tool };
              (window as Window & { __studioPictureContextRequest?: typeof detail }).__studioPictureContextRequest = detail;
              window.dispatchEvent(new CustomEvent("studio-picture-context", { detail }));
            }}
            style={{
              position: "absolute",
              left,
              top,
              width,
              height,
              // Bounds rotation uses the unrotated frame center; positive help angles are anticlockwise, opposite CSS in Y-down screen coordinates.
              transform: frame.angle1Deg !== undefined && Math.abs(frame.angle1Deg) > 1e-9 ? `rotate(${-frame.angle1Deg}deg)` : undefined,
              transformOrigin: "50% 50%",
              overflow: frame.borderPosition === "outside" || frame.angle1Deg !== undefined && Math.abs(frame.angle1Deg) > 1e-9 ? "visible" : undefined,
              pointerEvents: tool === "text" && frame.kind !== "text" && !isPictureBox(frame.kind) ? "none" : "auto",
              cursor: handTarget ? (panningFrameId === frame.id ? PICTURE_HAND_CURSOR_DRAGGING : PICTURE_HAND_CURSOR) : tool === "text" ? "text" : drawing ? "crosshair" : tool === "select" ? "move" : "default",
            }}
            onPointerDown={(event) => {
              if (event.button === 2) return;
              pictureDraggedRef.current = false;
              lastPressRef.current = null;
              if (handTarget) {
                event.stopPropagation();
                event.preventDefault();
                setSelected([frame.id]);
                if (editor?.isFocused) editor.commands.blur();
                if (frame.imageSrc && !frame.locked) {
                  const point = localPoint(event);
                  lastPressRef.current = { id: frame.id, moved: false };
                  beginGesture();
                  setPanningFrameId(frame.id);
                  dragRef.current = {
                    mode: "pan",
                    id: frame.id,
                    x: point.x,
                    y: point.y,
                    pointer: event.pointerId,
                    startX: frame.imageXMm ?? 0,
                    startY: frame.imageYMm ?? 0,
                    angle: frame.angle1Deg ?? 0,
                  };
                  event.currentTarget.setPointerCapture(event.pointerId);
                }
                return;
              }
              if (frame.kind === "text" && tool === "text") {
                event.stopPropagation();
                setSelected([]);
                event.currentTarget.querySelector<HTMLInputElement | HTMLTextAreaElement>("textarea, input[data-studio-text-frame]")?.focus({ preventScroll: true });
                return;
              }
              if (DRAW_TOOLS.has(tool)) return;
              if (tool === "select") event.preventDefault();
              event.stopPropagation();
              const next = event.shiftKey
                ? selected.includes(frame.id) ? selected.filter((id) => id !== frame.id) : [...selected, frame.id]
                : selected.includes(frame.id) ? selected : [frame.id];
              setSelected(next);
              if (tool !== "select" || !next.includes(frame.id) || frame.locked) return;
              const point = localPoint(event);
              lastPressRef.current = { id: frame.id, moved: false };
              beginGesture();
              dragRef.current = {
                mode: "move",
                frames: framesRef.current.filter((item) => next.includes(item.id) && !item.locked),
                x: point.x,
                y: point.y,
                pointer: event.pointerId,
                pressedId: frame.id,
              };
              (event.currentTarget.closest("[data-studio-objects]") as HTMLElement | null)?.setPointerCapture(event.pointerId);
            }}
          >
            <FrameShape frame={frame} width={width} height={height} active={active} editable={tool === "text"} keyboardLayout={keyboardLayout} historyBridge={frameHistoryBridge} onTextFocus={() => setSelected([])} onText={(next, edit) => { const current = framesRef.current.find((item) => item.id === frame.id); updateFrame(frame.id, current ? paragraphTextPatch(current, next, edit) : { text: next }); }} onRestore={(snap) => updateFrame(frame.id, snap)} onStyle={(patch) => updateFrame(frame.id, frame.singleLine && patch.typography ? { ...patch, hMm: singleLineOuterHeightMm(patch.typography) } : patch)} />
            {isPictureBox(frame.kind) && !frame.imageSrc ? (
              <svg
                data-studio-picture-hit={frame.kind}
                width={width}
                height={height}
                viewBox={`0 0 ${width} ${height}`}
                style={{ position: "absolute", left: 0, top: 0, cursor: handTarget ? (panningFrameId === frame.id ? PICTURE_HAND_CURSOR_DRAGGING : PICTURE_HAND_CURSOR) : "inherit" }}
              >
                {frame.kind === "picture-ellipse" ? (
                  <ellipse cx={width / 2} cy={height / 2} rx={width / 2} ry={height / 2} fill="transparent" style={{ cursor: handTarget ? (panningFrameId === frame.id ? PICTURE_HAND_CURSOR_DRAGGING : PICTURE_HAND_CURSOR) : "inherit", pointerEvents: "all" }} />
                ) : (
                  <rect x={0} y={0} width={width} height={height} rx={frame.kind === "picture-round-rect" ? pictureCornerRadiusPx(frame) : undefined} fill="transparent" style={{ cursor: handTarget ? (panningFrameId === frame.id ? PICTURE_HAND_CURSOR_DRAGGING : PICTURE_HAND_CURSOR) : "inherit", pointerEvents: "all" }} />
                )}
              </svg>
            ) : null}
            {active && !(frame.angle1Deg !== undefined && Math.abs(frame.angle1Deg) > 1e-9)
              ? (frame.singleLine ? ["e", "w"] as const : ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const).map((edge) => (
                  <div
                    key={edge}
                    data-studio-frame-handle={edge}
                    style={{
                      position: "absolute",
                      width: 6,
                      height: 6,
                      background: "#000",
                      border: "1px solid #000",
                      ...handlePos(edge),
                      pointerEvents: tool === "select" ? "auto" : "none",
                      userSelect: "none",
                      cursor: tool !== "select" ? "inherit" : edge.length === 2 ? `${edge}-resize` : edge === "n" || edge === "s" ? "ns-resize" : "ew-resize",
                    }}
                    onPointerDown={(event) => {
                      if (event.button === 2) return;
                      event.preventDefault();
                      event.stopPropagation();
                      const live = framesRef.current.find((item) => item.id === frame.id) ?? frame;
                      if (live.locked) return;
                      const stride = pageHeightPx + gapPx;
                      const startSlot = projectionProp
                        ? facingSlot(live.page - 1, projectionProp)
                        : { x: 0, y: (live.page - 1) * stride };
                      beginGesture();
                      dragRef.current = {
                        mode: "resize",
                        id: live.id,
                        edge,
                        pointer: event.pointerId,
                        startFrame: { ...live },
                        startSlot,
                      };
                      (event.currentTarget.closest("[data-studio-objects]") as HTMLElement | null)?.setPointerCapture(event.pointerId);
                    }}
                  />
                ))
              : null}
          </div>
        );
      })}
      {draft && dragRef.current?.mode === "draw" && pictureKindForTool(tool) ? (
        <PictureDrawPreview kind={pictureKindForTool(tool)!} draft={draft} />
      ) : draft ? (
        <div
          data-studio-marquee={dragRef.current?.mode === "marquee" ? "true" : undefined}
          style={{
            position: "absolute",
            left: Math.min(draft.x, draft.x + draft.w),
            top: tool === "title-text" ? draft.y : Math.min(draft.y, draft.y + draft.h),
            width: Math.abs(draft.w),
            height: tool === "title-text" ? singleLineOuterHeightPx(singleLineLeadingPt(typography ?? defaultDocumentSettings().typography)) : Math.abs(draft.h),
            border: "1px dashed #000",
            pointerEvents: "none",
          }}
        />
      ) : null}
      <StudioCaret zoom={zoom} projection={projectionProp}
        editor={editor}
        hostRef={rootRef}
        pageWidthPx={pageWidthPx}
        marginTopPx={marginTopPx}
        marginRightPx={marginRightPx}
      />
    </div>
  );
}

function PictureDrawPreview({
  kind,
  draft,
}: {
  kind: "picture-rect" | "picture-ellipse" | "picture-round-rect";
  draft: { x: number; y: number; w: number; h: number };
}) {
  const left = Math.min(draft.x, draft.x + draft.w);
  const top = Math.min(draft.y, draft.y + draft.h);
  const width = Math.abs(draft.w);
  const height = Math.abs(draft.h);
  const stroke = { fill: "none", stroke: "#000", strokeWidth: 1, strokeDasharray: "4 3" } as const;
  const rx = kind === "picture-round-rect" ? PICTURE_CORNER_RX_PX : 0;
  return (
    <div data-studio-draw-preview={kind} style={{ position: "absolute", left, top, width, height, pointerEvents: "none" }}>
      <svg width={width} height={height} viewBox={`0 0 ${Math.max(width, 0.01)} ${Math.max(height, 0.01)}`} aria-hidden>
        {kind === "picture-ellipse" ? (
          <ellipse data-studio-draw-shape="ellipse" cx={width / 2} cy={height / 2} rx={width / 2} ry={height / 2} {...stroke} />
        ) : (
          <rect data-studio-draw-shape={kind === "picture-round-rect" ? "round-rect" : "rect"} x={0.5} y={0.5} width={Math.max(0, width - 1)} height={Math.max(0, height - 1)} rx={rx || undefined} {...stroke} />
        )}
        <defs>
          <clipPath id="studio-picture-draft-clip">
            {kind === "picture-ellipse" ? (
              <ellipse cx={width / 2} cy={height / 2} rx={width / 2} ry={height / 2} />
            ) : (
              <rect x={0} y={0} width={width} height={height} rx={rx || undefined} />
            )}
          </clipPath>
        </defs>
        <g clipPath="url(#studio-picture-draft-clip)">
          <line x1={0} y1={0} x2={width} y2={height} {...stroke} />
          <line x1={width} y1={0} x2={0} y2={height} {...stroke} />
        </g>
      </svg>
    </div>
  );
}

function handlePos(edge: string): CSSProperties {
  const x = edge.includes("w") ? 0 : edge.includes("e") ? "100%" : "50%";
  const y = edge.includes("n") ? 0 : edge.includes("s") ? "100%" : "50%";
  return { left: x, top: y, transform: "translate(-50%, -50%)" };
}

function FrameShape({
  frame,
  active,
  editable,
  width,
  height,
  onTextFocus,
  onText,
  onRestore,
  onStyle,
  keyboardLayout,
  historyBridge,
}: {
  frame: StudioFrame;
  active: boolean;
  editable: boolean;
  width: number;
  height: number;
  onTextFocus: () => void;
  onText: (text: string, edit?: TextEditRange) => void;
  onRestore: (snap: { text: string; textAlign?: StudioTextAlign | null; paragraphAligns?: ParagraphAlign[] | null }) => void;
  onStyle: (patch: Partial<Pick<StudioFrame, "typography" | "textColor">> & { textAlign?: StudioTextAlign | null; paragraphAligns?: ParagraphAlign[] | null }) => void;
  keyboardLayout?: KeyboardLayout | null;
  historyBridge?: StudioFrameHistoryBridge;
}) {
  if (frame.kind === "text") {
    return <StudioTextFrame frameId={frame.id} historyBridge={historyBridge} text={frame.text} singleLine={frame.singleLine} paragraphAligns={frame.paragraphAligns} typography={frame.typography} textColor={frame.textColor} textAlign={frame.textAlign} keyboardLayout={keyboardLayout} editable={editable} onFocus={onTextFocus} onText={onText} onRestore={onRestore} onStyle={onStyle} />;
  }
  // Pixel-space geometry: the 1px stroke is centred on half-pixel edges.
  const hasExplicitNonePattern = frame.borderPattern === "none";
  const hasExplicitPattern = frame.borderPattern !== undefined && !hasExplicitNonePattern;
  const strokeWidth = frame.borderWidthMm === undefined ? 1 : frame.borderWidthMm * PX_PER_MM;
  const inset = hasExplicitNonePattern ? 0 : frame.borderPosition === "outside" ? -strokeWidth / 2 : strokeWidth / 2;
  const innerWidth = Math.max(0, width - 2 * inset);
  const innerHeight = Math.max(0, height - 2 * inset);
  const clipInset = !hasExplicitNonePattern && frame.borderPosition === "inside" ? strokeWidth : 0;
  const borderColor = frame.borderColor ?? "#000";
  const stroke = frame.borderWidthMm === undefined
    ? { fill: "none" as const, stroke: borderColor, strokeWidth: 1, vectorEffect: "non-scaling-stroke" as const }
    : { fill: "none" as const, stroke: borderColor, strokeWidth: frame.borderWidthMm * PX_PER_MM };
  const hairlineGuideStroke = {
    fill: "none" as const,
    stroke: "#a0a0a0",
    strokeWidth: 0.5,
    vectorEffect: "non-scaling-stroke" as const,
  };
  const patternParts = hasExplicitPattern ? resolveBorderStrokes(frame.borderPattern, strokeWidth) : null;

  if (isPictureBox(frame.kind)) {
    const rx = frame.kind === "picture-round-rect" ? Math.max(0, pictureCornerRadiusPx(frame) - inset) : undefined;
    const clipStyle: CSSProperties =
      frame.kind === "picture-ellipse"
        ? !hasExplicitNonePattern && frame.borderPosition === "inside"
          ? { clipPath: `ellipse(calc(50% - ${clipInset}px) calc(50% - ${clipInset}px) at 50% 50%)` }
          : { clipPath: "ellipse(50% 50% at 50% 50%)", borderRadius: "50%" }
        : frame.kind === "picture-round-rect"
          ? { clipPath: `inset(${clipInset}px round ${Math.max(0, pictureCornerRadiusPx(frame) - clipInset)}px)`, borderRadius: pictureCornerRadiusPx(frame) }
          : { clipPath: `inset(${clipInset}px)`, borderRadius: 0 };

    const imgX = (frame.imageXMm ?? 0) * PX_PER_MM;
    const imgY = (frame.imageYMm ?? 0) * PX_PER_MM;
    const imgW = (frame.imageWMm ?? frame.wMm) * PX_PER_MM;
    const imgH = (frame.imageHMm ?? frame.hMm) * PX_PER_MM;
    const diagStroke = hasExplicitNonePattern
      ? hairlineGuideStroke
      : hasExplicitPattern
        ? { fill: "none" as const, stroke: borderColor, strokeWidth: 1, vectorEffect: "non-scaling-stroke" as const }
        : stroke;

    return (
      <div style={{ position: "relative", width, height, overflow: "visible", cursor: "inherit" }}>
        <div data-studio-picture-clip={frame.kind} style={{ position: "absolute", inset: 0, overflow: "hidden", cursor: "inherit", ...clipStyle, backgroundColor: frame.backgroundColor ?? (frame.imageSrc ? "#fff" : "transparent") }}>
        {frame.imageSrc ? (
          <img
            src={frame.imageSrc}
            alt=""
            draggable={false}
            style={{
              position: "absolute",
              left: imgX,
              top: imgY,
              width: imgW,
              height: imgH,
              maxWidth: "none",
              maxHeight: "none",
              objectFit: "fill",
              userSelect: "none",
              pointerEvents: "none",
              transform: frame.angle2Deg !== undefined && Math.abs(frame.angle2Deg) > 1e-9 ? `rotate(${-frame.angle2Deg}deg)` : undefined,
              transformOrigin: "50% 50%",
            }}
          />
        ) : null}
        </div>
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          aria-hidden
          style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: !hasExplicitNonePattern && frame.borderPosition === "outside" ? "visible" : undefined }}
        >
          {frame.kind === "picture-ellipse" ? (
            <>
              {!frame.imageSrc ? (
                <>
                  <defs>
                    <clipPath id={`clip-${frame.id}`}>
                      <ellipse cx={width / 2} cy={height / 2} rx={innerWidth / 2} ry={innerHeight / 2} />
                    </clipPath>
                  </defs>
                  <g clipPath={`url(#clip-${frame.id})`}>
                    <line x1={0} y1={0} x2={width} y2={height} {...diagStroke} />
                    <line x1={width} y1={0} x2={0} y2={height} {...diagStroke} />
                  </g>
                </>
              ) : null}
              {hasExplicitNonePattern ? (
                <ellipse
                  cx={width / 2}
                  cy={height / 2}
                  rx={width / 2}
                  ry={height / 2}
                  data-studio-hairline-guide="true"
                  {...hairlineGuideStroke}
                />
              ) : patternParts ? (
                patternParts.map((part, idx) => {
                  const pi = inset + part.insetDelta;
                  return (
                    <ellipse
                      key={idx}
                      cx={width / 2}
                      cy={height / 2}
                      rx={Math.max(0, width / 2 - pi)}
                      ry={Math.max(0, height / 2 - pi)}
                      fill="none"
                      stroke={borderColor}
                      strokeWidth={part.strokeWidth}
                      strokeDasharray={part.dashArray}
                    />
                  );
                })
              ) : (
                <ellipse cx={width / 2} cy={height / 2} rx={innerWidth / 2} ry={innerHeight / 2} {...stroke} />
              )}
            </>
          ) : (
            <>
              {!frame.imageSrc ? (
                <>
                  <defs>
                    <clipPath id={`clip-${frame.id}`}>
                      <rect x={inset} y={inset} width={innerWidth} height={innerHeight} rx={rx} />
                    </clipPath>
                  </defs>
                  <g clipPath={`url(#clip-${frame.id})`}>
                    <line x1={0} y1={0} x2={width} y2={height} {...diagStroke} />
                    <line x1={width} y1={0} x2={0} y2={height} {...diagStroke} />
                  </g>
                </>
              ) : null}
              {hasExplicitNonePattern ? (
                <rect
                  x={0}
                  y={0}
                  width={width}
                  height={height}
                  rx={frame.kind === "picture-round-rect" ? pictureCornerRadiusPx(frame) : undefined}
                  data-studio-hairline-guide="true"
                  {...hairlineGuideStroke}
                />
              ) : patternParts ? (
                patternParts.map((part, idx) => {
                  const pi = inset + part.insetDelta;
                  const pw = Math.max(0, width - 2 * pi);
                  const ph = Math.max(0, height - 2 * pi);
                  const prx = frame.kind === "picture-round-rect" ? Math.max(0, pictureCornerRadiusPx(frame) - pi) : undefined;
                  return (
                    <rect
                      key={idx}
                      x={pi}
                      y={pi}
                      width={pw}
                      height={ph}
                      rx={prx}
                      fill="none"
                      stroke={borderColor}
                      strokeWidth={part.strokeWidth}
                      strokeDasharray={part.dashArray}
                    />
                  );
                })
              ) : (
                <rect x={inset} y={inset} width={innerWidth} height={innerHeight} rx={rx} {...stroke} />
              )}
            </>
          )}
          {active ? <rect x={0} y={0} width={width} height={height} fill="none" stroke="#808080" strokeWidth={1} vectorEffect="non-scaling-stroke" /> : null}
        </svg>
      </div>
    );
  }

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden style={{ overflow: !hasExplicitNonePattern && frame.borderPosition === "outside" ? "visible" : undefined }}>
      {frame.kind === "ellipse" ? (
        hasExplicitNonePattern ? (
          <>
            {frame.backgroundColor ? <ellipse cx={width / 2} cy={height / 2} rx={width / 2} ry={height / 2} fill={frame.backgroundColor} stroke="none" /> : null}
            <ellipse cx={width / 2} cy={height / 2} rx={width / 2} ry={height / 2} data-studio-hairline-guide="true" {...hairlineGuideStroke} />
          </>
        ) : patternParts ? (
          <>
            {frame.backgroundColor ? <ellipse cx={width / 2} cy={height / 2} rx={width / 2} ry={height / 2} fill={frame.backgroundColor} stroke="none" /> : null}
            {patternParts.map((part, idx) => {
              const pi = inset + part.insetDelta;
              return (
                <ellipse
                  key={idx}
                  cx={width / 2}
                  cy={height / 2}
                  rx={Math.max(0, width / 2 - pi)}
                  ry={Math.max(0, height / 2 - pi)}
                  fill="none"
                  stroke={borderColor}
                  strokeWidth={part.strokeWidth}
                  strokeDasharray={part.dashArray}
                />
              );
            })}
          </>
        ) : (
          <ellipse cx={width / 2} cy={height / 2} rx={innerWidth / 2} ry={innerHeight / 2} {...stroke} fill={frame.backgroundColor ?? "none"} />
        )
      ) : null}
      {frame.kind === "rect" || frame.kind === "round-rect" ? (
        hasExplicitNonePattern ? (
          <>
            {frame.backgroundColor ? (
              <rect
                x={0}
                y={0}
                width={width}
                height={height}
                rx={frame.kind === "round-rect" ? pictureCornerRadiusPx(frame) : undefined}
                fill={frame.backgroundColor}
                stroke="none"
              />
            ) : null}
            <rect
              x={0}
              y={0}
              width={width}
              height={height}
              rx={frame.kind === "round-rect" ? pictureCornerRadiusPx(frame) : undefined}
              data-studio-hairline-guide="true"
              {...hairlineGuideStroke}
            />
          </>
        ) : patternParts ? (
          <>
            {frame.backgroundColor ? (
              <rect
                x={0}
                y={0}
                width={width}
                height={height}
                rx={frame.kind === "round-rect" ? pictureCornerRadiusPx(frame) : undefined}
                fill={frame.backgroundColor}
                stroke="none"
              />
            ) : null}
            {patternParts.map((part, idx) => {
              const pi = inset + part.insetDelta;
              return (
                <rect
                  key={idx}
                  x={pi}
                  y={pi}
                  width={Math.max(0, width - 2 * pi)}
                  height={Math.max(0, height - 2 * pi)}
                  rx={frame.kind === "round-rect" ? Math.max(0, pictureCornerRadiusPx(frame) - pi) : undefined}
                  fill="none"
                  stroke={borderColor}
                  strokeWidth={part.strokeWidth}
                  strokeDasharray={part.dashArray}
                />
              );
            })}
          </>
        ) : (
          <rect x={inset} y={inset} width={innerWidth} height={innerHeight} rx={frame.kind === "round-rect" ? Math.max(0, pictureCornerRadiusPx(frame) - inset) : undefined} {...stroke} fill={frame.backgroundColor ?? "none"} />
        )
      ) : null}
      {frame.kind === "line" ? (
        hasExplicitNonePattern ? (
          <line x1={frame.flip ? width : 0} y1={0} x2={frame.flip ? 0 : width} y2={height} data-studio-hairline-guide="true" {...hairlineGuideStroke} />
        ) : patternParts ? (
          patternParts.map((part, idx) => {
            const tx = frame.flip ? -width : width;
            const ty = height;
            const len = Math.hypot(tx, ty) || 1;
            const nx = -ty / len;
            const ny = tx / len;
            const x1 = (frame.flip ? width - inset : inset) + nx * part.insetDelta;
            const y1 = inset + ny * part.insetDelta;
            const x2 = (frame.flip ? inset : width - inset) + nx * part.insetDelta;
            const y2 = (height - inset) + ny * part.insetDelta;
            return (
              <line
                key={idx}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                fill="none"
                stroke={borderColor}
                strokeWidth={part.strokeWidth}
                strokeDasharray={part.dashArray}
              />
            );
          })
        ) : (
          <line x1={frame.flip ? width - inset : inset} y1={inset} x2={frame.flip ? inset : width - inset} y2={height - inset} {...stroke} />
        )
      ) : null}
      {active ? <rect x={0} y={0} width={width} height={height} fill="none" stroke="#808080" strokeWidth={1} vectorEffect="non-scaling-stroke" /> : null}
    </svg>
  );
}

function StudioCaret({
  projection: projectionProp,
  zoom,
  editor,
  hostRef,
  pageWidthPx,
  marginTopPx,
  marginRightPx,
}: {
  editor: Editor | null;
  zoom:number;
  projection?:PageProjection;
  hostRef: React.RefObject<HTMLDivElement | null>;
  pageWidthPx: number;
  marginTopPx: number;
  marginRightPx: number;
}) {
  const [box, setBox] = useState<{ left: number; top: number; height: number; width: number; pos:number; contentLeft:number; contentRight:number } | null>(null);
  const caretRef = useRef<HTMLDivElement>(null);
  useStudioCaretVisibility(editor, caretRef, box);

  useEffect(() => {
    if (!editor) return;
    let frame=0;
    const measure = () => {
     try { withCanonicalPages(editor.view.dom,() => {
      if (!editor.isFocused || editor.isDestroyed || !editor.state.selection.empty) {
        setBox(null);
        return;
      }
      const host = hostRef.current;
      if (!host) return;
      const facing=pageProjection(editor.view.dom);
      const resolvedDom=editor.view.domAtPos(editor.state.selection.head);
      const selectionHead=editor.state.selection.$head;
      const facingLeaf=facing?(selectionHead.nodeAfter?.isText?editor.view.nodeDOM(selectionHead.pos):selectionHead.nodeBefore?.isText?editor.view.nodeDOM(selectionHead.pos-1):null):null;
      // Resolve the model's text leaf, not a pagination widget adjacent to it.
      const facingAnchor=facingLeaf??resolvedDom?.node;
      const native = nativeCaretSnapshot(editor.view,window.getSelection());
      const coords = native?.rect ?? editor.view.coordsAtPos(editor.state.selection.head);
      const measuredRun = firstLineRunAt(editor.state, editor.state.selection.head);
      const firstLine = facing&&measuredRun&&!measuredRun.empty&&selectionHead.pos===measuredRun.to&&selectionHead.pos<selectionHead.end()?undefined:measuredRun;
      const rect = host.getBoundingClientRect();
      const scale = host.closest<HTMLElement>("[data-studio-zoom-surface]")!.getBoundingClientRect().width/pageWidthPx;
      const anchor = facingAnchor??native?.owner??resolvedDom.node;
      const candidate = anchor?.nodeType === Node.TEXT_NODE ? anchor.parentElement : anchor instanceof HTMLElement ? anchor : editor.view.dom;
      const owner = candidate && editor.view.dom.contains(candidate) ? candidate : editor.view.dom;
      const leading = parseFloat(getComputedStyle(owner?.closest("p,h1,h2,h3,h4,h5,h6") ?? editor.view.dom).lineHeight) * scale;
      const block = owner?.closest<HTMLElement>("p,h1,h2,h3,h4,h5,h6") ?? editor.view.dom;
      const bounds = block.getBoundingClientRect();
      let top = firstLine?.lineBoxTop !== undefined ? rect.top+firstLine.lineBoxTop*scale : firstLine ? coords.top + (firstLine.empty ? firstLine.offset * scale : 0) + (firstLine.selectionOffset ?? 0) * scale
        : renderedLineBoxTop(owner ?? editor.view.dom,{top:coords.top,height:coords.bottom-coords.top},Number.isFinite(leading) ? leading : coords.bottom-coords.top,scale);
      const geometry = getQalamPaginationState(editor)?.geometry;
      const contentLeft=geometry?.marginLeftPx ?? 0, contentRight=pageWidthPx-marginRightPx;
      const hardBreakTop=hardBreakLineTop(editor.view.dom,owner??editor.view.dom,coords,leading,scale);
      top=hardBreakTop??top;
      const arrow=facing?facingArrowKey.getState(editor.state):null;
      const arrowText=arrow?.head===selectionHead.pos?facingTextRect(editor.view,selectionHead.pos):null;
      if(facing&&geometry?.enabled&&(selectionHead.nodeAfter?.isText||selectionHead.nodeBefore?.isText)&&hardBreakTop===undefined)
        top=facingLineTop(top,arrowText?.top??coords.top,arrowText?.bottom??coords.bottom,leading,rect.top,scale,geometry,arrow?.head===selectionHead.pos?arrow.page:undefined,arrow?.head===selectionHead.pos&&arrow.lineTop!==undefined?rect.top+arrow.lineTop*scale:undefined);
      const page = geometry?.enabled ? Math.max(0,Math.floor(((top-rect.top)/scale-marginTopPx+1)/(geometry.pageHeightPx+geometry.gapPx))) : 0;
      const { nodeBefore, nodeAfter } = editor.state.selection.$head;
      const emptyLine = (!nodeBefore || nodeBefore.type.name === "hardBreak") && (!nodeAfter || nodeAfter.type.name === "hardBreak");
      const rtl = getComputedStyle(owner ?? editor.view.dom).direction === "rtl";
      // Layout-only struts consume one page pixel, but an empty line's caret
      // belongs at its paragraph's alignment point, independently of that width.
      const alignment = getComputedStyle(block).textAlign;
      const point = emptyLine
        ? alignment === "center" ? (bounds.left + bounds.right) / 2
          : alignment === "left" || (alignment === "start" && !rtl) || (alignment === "end" && rtl) ? bounds.left
            : bounds.right
        : coords.left;
      setBox({...caretGeometry({
        x: (point-rect.left)/scale, top: (top-rect.top)/scale,
        height: Number.isFinite(leading) ? leading/scale : (coords.bottom-coords.top)/scale, scale,
        rtl,
        blockLeft: (bounds.left-rect.left)/scale, blockRight: (bounds.right-rect.left)/scale,
        contentRight,
        contentLeft,
        contentBottom: geometry?.enabled ? page*(geometry.pageHeightPx+geometry.gapPx)+geometry.pageHeightPx-geometry.marginBottomPx : undefined,
        contentTop: marginTopPx+page*(geometry ? geometry.pageHeightPx+geometry.gapPx : 0),
      }),pos:editor.state.selection.head,contentLeft,contentRight});
    }); } catch { setBox(null); }
    };
    const place = () => {
      if(editor.isDestroyed)return;
      if(!pageProjection(editor.view.dom))return measure();
      if(!frame)frame=requestCanonicalFrame(editor.view.dom,()=>{frame=0;measure();});
    };
    place();
    // Native selection changes can follow the ProseMirror transaction, especially
    // at bidi boundaries. Read the final DOM range after those changes too.
    document.addEventListener("selectionchange", place);
    editor.on("selectionUpdate", place);
    editor.on("transaction", place);
    editor.on("focus", place);
    editor.on("blur", place);
    return () => {
      cancelCanonicalFrame(frame);
      document.removeEventListener("selectionchange", place);
      editor.off("selectionUpdate", place);
      editor.off("transaction", place);
      editor.off("focus", place);
      editor.off("blur", place);
    };
  }, [editor, hostRef, marginRightPx, marginTopPx, pageWidthPx, zoom]);

  if (!box) return null;
  const projection=projectionProp;
  const projected=projection?projectPoint(box.left,box.top,projection):{x:box.left,y:box.top,page:0};
  const pageX=projection?facingSlot(projected.page,projection).x:0;
  return (
    <StudioScreenOverlay zoom={zoom} zIndex={8}>{({x,y,scale})=><div
      key={`${box.left}:${box.top}:${box.height}`}
      ref={caretRef}
      data-studio-caret="true"
      data-studio-caret-pos={box.pos}
      style={{
        animation: "qalam-studio-caret-blink 1060ms step-end infinite",
        position: "absolute",
        left: Math.max(x(pageX+box.contentLeft)+2, Math.min(x(pageX+box.contentRight)-3,x(projected.x))),
        top: y(projected.y),
        width: 2,
        height: box.height*scale,
        background: "#000",
        pointerEvents: "none",
        zIndex: 8,
      }}
    />}</StudioScreenOverlay>
  );
}
