"use client";
import {nativeCaretSnapshot} from "../utils/nativeCaretSnapshot";
import {pageProjection,projectPoint,facingArrowKey,facingTextRect,facingLineTop,requestCanonicalFrame,cancelCanonicalFrame,withCanonicalPages,facingSlot,unprojectPoint,facingExtent,type PageProjection} from "../utils/facingPages";
import { StudioScreenOverlay } from "./StudioScreenOverlay";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { useStudioCaretVisibility } from "./useStudioCaretVisibility";
import { caretGeometry } from "../utils/caretGeometry";
import { getQalamPaginationState } from "../extensions/QalamPagination";
import {hardBreakLineTop} from "../utils/hardBreakLineGrid";
import { renderedLineBoxTop } from "../utils/textLineBoxes";
import { firstLineRunAt } from "../extensions/FirstLineLayout";
import { StudioTextFrame } from "./StudioTextFrame";
import type { DocumentStudioSettings } from "../utils/documentSettings";
import type { Editor } from "@tiptap/react";
import type { StudioToolId } from "./InPageToolPalette";
import type { MenuActionId } from "../utils/documentMenus";

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
  imageSrc?: string;
  imageNaturalW?: number;
  imageNaturalH?: number;
  imageXMm?: number;
  imageYMm?: number;
  imageWMm?: number;
  imageHMm?: number;
};

export function isPictureBox(kind: string): boolean {
  return kind === "picture-rect" || kind === "picture-ellipse" || kind === "picture-round-rect";
}

/** The selected (targeted) picture box that Insert > Picture and Import Picture fill. */
export function selectedPictureBoxId(frames: StudioFrame[], selectedIds: readonly string[]): string | null {
  return frames.find((frame) => selectedIds.includes(frame.id) && isPictureBox(frame.kind))?.id ?? null;
}

/** InPage keeps Insert > Picture disabled until a picture box is targeted. */
export function pictureMenuDisabledIds(frames: StudioFrame[], selectedIds: readonly string[]): Set<MenuActionId> {
  return selectedPictureBoxId(frames, selectedIds)
    ? new Set<MenuActionId>()
    : new Set<MenuActionId>(["file.importPicture", "insert.image"]);
}

const DRAW_TOOLS = new Set<StudioToolId>([
  "textbox",
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

const PX_PER_MM = 96 / 25.4;
const PICTURE_CORNER_RX_PX = 6.35 * PX_PER_MM;

export function isUndraggedShape(w: number, h: number): boolean {
  return Math.abs(w) < 4 && Math.abs(h) < 4;
}

function isPictureDrawTool(tool: StudioToolId): boolean {
  return tool === "cross-square" || tool === "cross-circle" || tool === "cross-round";
}

function pictureKindForTool(tool: StudioToolId): "picture-rect" | "picture-ellipse" | "picture-round-rect" | null {
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

export function StudioObjectLayer({
  editor,
  tool,
  frames,
  onFramesChange,
  onToolAction,
  onSelectedChange,
  onDoubleClickFrame,
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
}: {
  editor: Editor | null;
  tool: StudioToolId;
  frames: StudioFrame[];
  typography?: DocumentStudioSettings["typography"];
  zoom?:number;
  projection?:PageProjection;
  onFramesChange: (frames: StudioFrame[]) => void;
  onToolAction: (tool: StudioToolId) => void;
  onSelectedChange?: (selectedIds: string[]) => void;
  onDoubleClickFrame?: (frame: StudioFrame) => void;
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
  const dragRef = useRef<
    | { mode: "draw"; x: number; y: number; pointer: number }
    | { mode: "marquee"; x: number; y: number; pointer: number }
    | { mode: "move"; frames: StudioFrame[]; x: number; y: number; pointer: number; pressedId: string }
    | { mode: "resize"; id: string; edge: string; pointer: number }
    | null
  >(null);
  const drawing = DRAW_TOOLS.has(tool);
  const pendingTextFocus = useRef<string | null>(null);
  // A new picture frame stays targeted when the draw tool hands over to the
  // Hand (content) tool, as in InPage.
  const pictureSelectionRef = useRef<string | null>(null);
  const pictureOpenAt = useRef(0);
  const pictureDraggedRef = useRef(false);
  // Frame pressed by the last Arrow pointerdown, and whether it was dragged.
  // Under pointer capture the browser targets click/dblclick at the layer, so
  // the layer opens the chooser from this record instead of frame handlers.
  const lastPressRef = useRef<{ id: string; moved: boolean } | null>(null);
  const framesRef = useRef(frames);
  framesRef.current = frames;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  // Switching to a drawing tool clears the object selection. Switching between
  // the Arrow and Hand tools keeps a targeted picture box, so Insert > Picture
  // and Import Picture still fill it.
  useEffect(() => {
    const pictureIds = new Set(framesRef.current.filter((frame) => isPictureBox(frame.kind)).map((frame) => frame.id));
    const fresh = pictureSelectionRef.current;
    pictureSelectionRef.current = null;
    if (tool === "select" || tool === "text") {
      const keep = selectedRef.current.filter((id) => pictureIds.has(id));
      if (fresh && !keep.includes(fresh)) keep.push(fresh);
      setSelected(keep);
      return;
    }
    setSelected([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool]);

  useLayoutEffect(() => {
    if (tool !== "text" || !pendingTextFocus.current) return;
    const frame = rootRef.current?.querySelector<HTMLElement>(`[data-studio-frame-id="${pendingTextFocus.current}"]`);
    const textarea = frame?.querySelector("textarea");
    if (!textarea) return;
    pendingTextFocus.current = null;
    textarea.focus({ preventScroll: true });
  }, [frames, tool]);

  useEffect(() => {
    const clearOnEmpty = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      // Any click in the document/pasteboard away from a frame dismisses the
      // previous object selection, whether the active tool is Arrow or Text.
      if (target?.closest("[data-studio-scroller]") && !target.closest("[data-studio-frame]")) setSelected([]);
    };
    const clearOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
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
      if (tool !== "select" || (event.key !== "Delete" && event.key !== "Backspace")) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("textarea, input, [contenteditable='true']")) return;
      if (!selected.length) return;
      event.preventDefault();
      onFramesChange(frames.filter((frame) => !selected.includes(frame.id)));
      setSelected([]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [frames, onFramesChange, selected, tool]);

  const localPoint = (event: { clientX: number; clientY: number }) => {
    const root = rootRef.current;
    if (!root) return { x: 0, y: 0 };
    const rect = root.getBoundingClientRect();
    const surface=root.closest<HTMLElement>("[data-studio-zoom-surface]");
    const scale = surface ? surface.getBoundingClientRect().width/pageWidthPx : zoom;
    const point={x:(event.clientX-rect.left)/scale,y:(event.clientY-rect.top)/scale};
    const projection=editor?pageProjection(editor.view.dom):undefined;
    return projection?unprojectPoint(point.x,point.y,projection):point;
  };

  const pageOf = (y: number) => {
    const stride = pageHeightPx + gapPx;
    return Math.min(pageCount, Math.max(1, Math.floor(y / stride) + 1));
  };

  const onChangeRef = useRef(onFramesChange);
  onChangeRef.current = onFramesChange;

  const updateFrame = (id: string, patch: Partial<StudioFrame>) => {
    onChangeRef.current(framesRef.current.map((frame) => (frame.id === id ? { ...frame, ...patch } : frame)));
  };

  const commitBox = (box: { x: number; y: number; w: number; h: number; flip: boolean }) => {
    const kind: FrameKind | null =
      tool === "textbox"
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
    const flip = (w < 0) !== (h < 0);
    if (w < 0) {
      x += w;
      w = -w;
    }
    if (h < 0) {
      y += h;
      h = -h;
    }
    if (tool === "textbox" && (w < 4 || h < 4)) return;
    if (isUndraggedShape(w, h)) return;
    const stride = pageHeightPx + gapPx;
    const page = pageOf(y);
    const yOnPage = y - (page - 1) * stride;
    const frame: StudioFrame = {
      id: newId(),
      kind,
      page,
      xMm: x / PX_PER_MM,
      yMm: Math.max(0, yOnPage) / PX_PER_MM,
      wMm: Math.max(1, w) / PX_PER_MM,
      hMm: Math.max(1, h) / PX_PER_MM,
      flip,
      text: "",
      typography,
    };
    if (tool === "textbox") pendingTextFocus.current = frame.id;
    onChangeRef.current([...framesRef.current, frame]);
    setSelected([frame.id]);
    if (tool === "textbox") onToolAction("text");
    else if (isPictureDrawTool(tool)) {
      // InPage: after drawing a picture box the Hand (content) tool is active
      // and the new box stays targeted, so one click opens the chooser.
      pictureSelectionRef.current = frame.id;
      framesRef.current = [...framesRef.current, frame];
      onToolAction("text");
    }
  };

  const openEmptyPicture = (frame: StudioFrame) => {
    if (!isPictureBox(frame.kind) || frame.imageSrc) return;
    const now = Date.now();
    if (now - pictureOpenAt.current < 400) return;
    pictureOpenAt.current = now;
    onDoubleClickFrame?.(frame);
  };

  return (
    <div
      ref={rootRef}
      className="studio-no-print absolute inset-0 z-[6]"
      data-studio-objects="true"
      style={{ width:projectionProp?facingExtent(projectionProp).width:undefined,height:projectionProp?facingExtent(projectionProp).height:undefined, pointerEvents: drawing || tool === "select" ? "auto" : "none", cursor: tool === "select" ? "default" : tool === "text" ? "text" : drawing ? "crosshair" : undefined }}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => {
        if (tool !== "select" && tool !== "text") return;
        const target = event.target as HTMLElement | null;
        if (target?.closest?.("[data-studio-frame-handle]")) return;
        const hitId = target?.closest?.("[data-studio-frame-id]")?.getAttribute("data-studio-frame-id");
        const press = lastPressRef.current;
        const id = hitId ?? (press && !press.moved ? press.id : null);
        if (!id || (press?.id === id && press.moved)) return;
        const frame = framesRef.current.find((item) => item.id === id);
        if (!frame || !isPictureBox(frame.kind) || frame.imageSrc) return;
        event.stopPropagation();
        event.preventDefault();
        openEmptyPicture(frame);
      }}
      onPointerDown={(event) => {
        if (tool === "select") {
          event.preventDefault();
          event.stopPropagation();
          setSelected([]);
          const point = localPoint(event);
          dragRef.current = { mode: "marquee", x: point.x, y: point.y, pointer: event.pointerId };
          setDraft({ x: point.x, y: point.y, w: 0, h: 0, flip: false });
          event.currentTarget.setPointerCapture(event.pointerId);
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
          const dx = dxPx / PX_PER_MM;
          const dy = dyPx / PX_PER_MM;
          const moved = new Map(drag.frames.map((frame) => [frame.id, frame]));
          onChangeRef.current(framesRef.current.map((frame) => {
            const original = moved.get(frame.id);
            // Offsets stay box-relative so the picture travels with the box.
            // Top/left resize, below, is what keeps the picture on the page.
            return original
              ? {
                  ...frame,
                  xMm: original.xMm + dx,
                  yMm: original.yMm + dy,
                  ...(isPictureBox(original.kind)
                    ? {
                        imageXMm: original.imageXMm,
                        imageYMm: original.imageYMm,
                        imageWMm: original.imageWMm,
                        imageHMm: original.imageHMm,
                      }
                    : {}),
                }
              : frame;
          }));
          return;
        }
        const frame = frames.find((item) => item.id === drag.id);
        if (!frame) return;
        const stride = pageHeightPx + gapPx;
        const origin = (frame.page - 1) * stride;
        const left = frame.xMm * PX_PER_MM;
        const top = origin + frame.yMm * PX_PER_MM;
        const right = left + frame.wMm * PX_PER_MM;
        const bottom = top + frame.hMm * PX_PER_MM;
        let x1 = left;
        let y1 = top;
        let x2 = right;
        let y2 = bottom;
        if (drag.edge.includes("w")) x1 = point.x;
        if (drag.edge.includes("e")) x2 = point.x;
        if (drag.edge.includes("n")) y1 = point.y;
        if (drag.edge.includes("s")) y2 = point.y;
        const x = Math.min(x1, x2);
        const y = Math.min(y1, y2);
        const newXMm = x / PX_PER_MM;
        const newYMm = (y - origin) / PX_PER_MM;
        const dxMm = newXMm - frame.xMm;
        const dyMm = newYMm - frame.yMm;
        const patch: Partial<StudioFrame> = {
          xMm: newXMm,
          yMm: newYMm,
          wMm: Math.max(1, Math.abs(x2 - x1)) / PX_PER_MM,
          hMm: Math.max(1, Math.abs(y2 - y1)) / PX_PER_MM,
        };
        pictureDraggedRef.current = true;
        lastPressRef.current = null;
        if (frame.imageSrc && (drag.edge.includes("w") || drag.edge.includes("n"))) {
          if (dxMm !== 0) patch.imageXMm = (frame.imageXMm ?? 0) - dxMm;
          if (dyMm !== 0) patch.imageYMm = (frame.imageYMm ?? 0) - dyMm;
        }
        updateFrame(frame.id, patch);
      }}
      onPointerCancel={() => { dragRef.current = null; setDraft(null); }}
      onPointerUp={(event) => {
        const drag = dragRef.current;
        dragRef.current = null;
        if (drag?.mode === "draw") {
          const point = localPoint(event);
          let w = point.x - drag.x;
          let h = point.y - drag.y;
          if (isPictureDrawTool(tool)) ({ w, h } = constrainPictureDrag(w, h, event.shiftKey));
          commitBox({ x: drag.x, y: drag.y, w, h, flip: false });
        }
        if (drag?.mode === "marquee") {
          const point = localPoint(event);
          const left = Math.min(drag.x, point.x), right = Math.max(drag.x, point.x);
          const top = Math.min(drag.y, point.y), bottom = Math.max(drag.y, point.y);
          const stride = pageHeightPx + gapPx;
          setSelected(isUndraggedShape(point.x - drag.x, point.y - drag.y) ? [] : framesRef.current.filter((frame) => {
            const x = frame.xMm * PX_PER_MM;
            const y = (frame.page - 1) * stride + frame.yMm * PX_PER_MM;
            return x >= left && y >= top && x + frame.wMm * PX_PER_MM <= right && y + frame.hMm * PX_PER_MM <= bottom;
          }).map((frame) => frame.id));
        }
        setDraft(null);
        if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
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
        // The Hand tool targets picture boxes; show their selection too.
        const active = selected.includes(frame.id) && (tool === "select" || (tool === "text" && isPictureBox(frame.kind)));
        const handTarget = tool === "text" && isPictureBox(frame.kind);
        return (
          <div
            key={frame.id}
            data-studio-frame={frame.kind}
            data-studio-frame-id={frame.id}
            style={{
              position: "absolute",
              left,
              top,
              width,
              height,
              pointerEvents: tool === "text" && frame.kind !== "text" && !isPictureBox(frame.kind) ? "none" : "auto",
              cursor: handTarget ? "pointer" : tool === "text" ? "text" : drawing ? "crosshair" : tool === "select" ? "move" : "default",
            }}
            onClick={(event) => {
              // Hand tool: one click on an empty picture box opens the chooser
              // from the real pointer gesture. No capture is taken here, so the
              // click reaches the frame.
              if (!handTarget || frame.imageSrc) return;
              const target = event.target as HTMLElement | null;
              if (target?.closest?.("[data-studio-frame-handle]")) return;
              event.stopPropagation();
              event.preventDefault();
              openEmptyPicture(frame);
            }}
            onPointerDown={(event) => {
              pictureDraggedRef.current = false;
              lastPressRef.current = null;
              if (handTarget) {
                event.stopPropagation();
                event.preventDefault();
                setSelected([frame.id]);
                if (editor?.isFocused) editor.commands.blur();
                return;
              }
              if (frame.kind === "text" && tool === "text") {
                event.stopPropagation();
                setSelected([]);
                event.currentTarget.querySelector("textarea")?.focus({ preventScroll: true });
                return;
              }
              if (DRAW_TOOLS.has(tool)) return;
              if (tool === "select") event.preventDefault();
              event.stopPropagation();
              const next = event.shiftKey
                ? selected.includes(frame.id) ? selected.filter((id) => id !== frame.id) : [...selected, frame.id]
                : selected.includes(frame.id) ? selected : [frame.id];
              setSelected(next);
              if (tool !== "select" || !next.includes(frame.id)) return;
              const point = localPoint(event);
              lastPressRef.current = { id: frame.id, moved: false };
              dragRef.current = {
                mode: "move",
                frames: framesRef.current.filter((item) => next.includes(item.id)),
                x: point.x,
                y: point.y,
                pointer: event.pointerId,
                pressedId: frame.id,
              };
              (event.currentTarget.closest("[data-studio-objects]") as HTMLElement | null)?.setPointerCapture(event.pointerId);
            }}
          >
            <FrameShape frame={frame} width={width} height={height} active={active} editable={tool === "text"} onTextFocus={() => setSelected([])} onText={(text) => updateFrame(frame.id, { text })} />
            {isPictureBox(frame.kind) && !frame.imageSrc ? (
              <svg
                data-studio-picture-hit={frame.kind}
                width={width}
                height={height}
                viewBox={`0 0 ${width} ${height}`}
                style={{ position: "absolute", left: 0, top: 0 }}
              >
                {frame.kind === "picture-ellipse" ? (
                  <ellipse cx={width / 2} cy={height / 2} rx={width / 2} ry={height / 2} fill="transparent" />
                ) : (
                  <rect x={0} y={0} width={width} height={height} rx={frame.kind === "picture-round-rect" ? PICTURE_CORNER_RX_PX : undefined} fill="transparent" />
                )}
              </svg>
            ) : null}
            {active
              ? (["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const).map((edge) => (
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
                      cursor: tool !== "select" ? "inherit" : edge.length === 2 ? `${edge}-resize` : edge === "n" || edge === "s" ? "ns-resize" : "ew-resize",
                    }}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      dragRef.current = { mode: "resize", id: frame.id, edge, pointer: event.pointerId };
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
            top: Math.min(draft.y, draft.y + draft.h),
            width: Math.abs(draft.w),
            height: Math.abs(draft.h),
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
}: {
  frame: StudioFrame;
  active: boolean;
  editable: boolean;
  width: number;
  height: number;
  onTextFocus: () => void;
  onText: (text: string) => void;
}) {
  if (frame.kind === "text") {
    return <StudioTextFrame text={frame.text} typography={frame.typography} editable={editable} onFocus={onTextFocus} onText={onText} />;
  }
  // Pixel-space geometry: the 1px stroke is centred on half-pixel edges.
  const inset = 0.5;
  const innerWidth = Math.max(0, width - 1);
  const innerHeight = Math.max(0, height - 1);
  const stroke = { fill: "none", stroke: "#000", strokeWidth: 1, vectorEffect: "non-scaling-stroke" } as const;

  if (isPictureBox(frame.kind)) {
    const rx = frame.kind === "picture-round-rect" ? PICTURE_CORNER_RX_PX : undefined;
    const clipStyle: CSSProperties =
      frame.kind === "picture-ellipse"
        ? { clipPath: "ellipse(50% 50% at 50% 50%)", borderRadius: "50%" }
        : frame.kind === "picture-round-rect"
          ? { clipPath: `inset(0 round ${PICTURE_CORNER_RX_PX}px)`, borderRadius: PICTURE_CORNER_RX_PX }
          : { clipPath: "inset(0)", borderRadius: 0 };

    const imgX = (frame.imageXMm ?? 0) * PX_PER_MM;
    const imgY = (frame.imageYMm ?? 0) * PX_PER_MM;
    const imgW = (frame.imageWMm ?? frame.wMm) * PX_PER_MM;
    const imgH = (frame.imageHMm ?? frame.hMm) * PX_PER_MM;

    return (
      <div data-studio-picture-clip={frame.kind} style={{ position: "relative", width, height, overflow: "hidden", ...clipStyle, backgroundColor: frame.imageSrc ? "#fff" : "transparent" }}>
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
              userSelect: "none",
              pointerEvents: "none",
            }}
          />
        ) : null}
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          aria-hidden
          style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
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
                    <line x1={0} y1={0} x2={width} y2={height} {...stroke} />
                    <line x1={width} y1={0} x2={0} y2={height} {...stroke} />
                  </g>
                </>
              ) : null}
              <ellipse cx={width / 2} cy={height / 2} rx={innerWidth / 2} ry={innerHeight / 2} {...stroke} />
            </>
          ) : (
            <>
              {!frame.imageSrc ? (
                <>
                  <line x1={0} y1={0} x2={width} y2={height} {...stroke} />
                  <line x1={width} y1={0} x2={0} y2={height} {...stroke} />
                </>
              ) : null}
              <rect x={inset} y={inset} width={innerWidth} height={innerHeight} rx={rx} {...stroke} />
            </>
          )}
          {active ? <rect x={0} y={0} width={width} height={height} fill="none" stroke="#808080" strokeWidth={1} vectorEffect="non-scaling-stroke" /> : null}
        </svg>
      </div>
    );
  }

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden>
      {frame.kind === "ellipse" ? <ellipse cx={width / 2} cy={height / 2} rx={innerWidth / 2} ry={innerHeight / 2} {...stroke} /> : null}
      {frame.kind === "rect" || frame.kind === "round-rect" ? (
        <rect x={inset} y={inset} width={innerWidth} height={innerHeight} rx={frame.kind === "round-rect" ? 6.35 * PX_PER_MM : undefined} {...stroke} />
      ) : null}
      {frame.kind === "line" ? (
        <line x1={frame.flip ? width - inset : inset} y1={inset} x2={frame.flip ? inset : width - inset} y2={height - inset} {...stroke} />
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
      // belongs at its real paragraph edge, independently of that width.
      const point = emptyLine ? (rtl ? bounds.right : bounds.left) : coords.left;
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
