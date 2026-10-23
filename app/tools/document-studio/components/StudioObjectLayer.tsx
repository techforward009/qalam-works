"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { firstLineRunAt } from "../extensions/FirstLineLayout";
import { autoLineHeight } from "../utils/autoLeading";
import type { Editor } from "@tiptap/react";
import type { StudioToolId } from "./InPageToolPalette";

export type FrameKind = "rect" | "ellipse" | "round-rect" | "line" | "text";

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
};

const DRAW_TOOLS = new Set<StudioToolId>(["textbox", "rect", "ellipse", "round-rect", "line"]);
const FRAME_KEY = "qalam-studio-frames-v1";

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

function isFrame(value: unknown): value is StudioFrame {
  if (!value || typeof value !== "object") return false;
  const frame = value as StudioFrame;
  return typeof frame.id === "string" && typeof frame.kind === "string" && typeof frame.xMm === "number";
}

function newId(): string {
  return `f-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

const PX_PER_MM = 96 / 25.4;

export function isUndraggedShape(w: number, h: number): boolean {
  return Math.abs(w) < 4 && Math.abs(h) < 4;
}

export function StudioObjectLayer({
  editor,
  tool,
  frames,
  onFramesChange,
  onToolAction,
  pageCount,
  pageWidthPx,
  pageHeightPx,
  gapPx,
  marginTopPx,
  marginRightPx,
}: {
  editor: Editor | null;
  tool: StudioToolId;
  frames: StudioFrame[];
  onFramesChange: (frames: StudioFrame[]) => void;
  onToolAction: (tool: StudioToolId) => void;
  pageCount: number;
  pageWidthPx: number;
  pageHeightPx: number;
  gapPx: number;
  marginTopPx: number;
  marginRightPx: number;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [draft, setDraft] = useState<{ x: number; y: number; w: number; h: number; flip: boolean } | null>(null);
  const dragRef = useRef<
    | { mode: "draw"; x: number; y: number; pointer: number }
    | { mode: "marquee"; x: number; y: number; pointer: number }
    | { mode: "move"; frames: StudioFrame[]; x: number; y: number; pointer: number }
    | { mode: "resize"; id: string; edge: string; pointer: number }
    | null
  >(null);
  const drawing = DRAW_TOOLS.has(tool);
  const pendingTextFocus = useRef<string | null>(null);

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
      if (tool !== "select") return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-studio-scroller]") && !target.closest("[data-studio-objects]")) setSelected([]);
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
  }, [tool]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("textarea, input, [contenteditable='true']")) return;
      if (!selected.length) return;
      event.preventDefault();
      onFramesChange(frames.filter((frame) => !selected.includes(frame.id)));
      setSelected([]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [frames, onFramesChange, selected]);

  const localPoint = (event: { clientX: number; clientY: number }) => {
    const root = rootRef.current;
    if (!root) return { x: 0, y: 0 };
    const rect = root.getBoundingClientRect();
    const scale = rect.width > 0 ? rect.width / pageWidthPx : 1;
    return { x: (event.clientX - rect.left) / scale, y: (event.clientY - rect.top) / scale };
  };

  const pageOf = (y: number) => {
    const stride = pageHeightPx + gapPx;
    return Math.min(pageCount, Math.max(1, Math.floor(y / stride) + 1));
  };

  const framesRef = useRef(frames);
  framesRef.current = frames;
  const onChangeRef = useRef(onFramesChange);
  onChangeRef.current = onFramesChange;

  const updateFrame = (id: string, patch: Partial<StudioFrame>) => {
    onChangeRef.current(framesRef.current.map((frame) => (frame.id === id ? { ...frame, ...patch } : frame)));
  };

  const commitBox = (box: { x: number; y: number; w: number; h: number; flip: boolean }) => {
    const kind = tool === "textbox" ? "text" : tool === "line" || tool === "ellipse" || tool === "round-rect" || tool === "rect" ? tool : null;
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
    };
    if (tool === "textbox") pendingTextFocus.current = frame.id;
    onChangeRef.current([...framesRef.current, frame]);
    setSelected([frame.id]);
    if (tool === "textbox") onToolAction("text");
  };

  return (
    <div
      ref={rootRef}
      className="studio-no-print absolute inset-0 z-[6]"
      data-studio-objects="true"
      style={{ pointerEvents: drawing || tool === "select" ? "auto" : "none", cursor: tool === "select" ? "default" : tool === "text" ? "text" : drawing ? "crosshair" : undefined }}
      onClick={(event) => event.stopPropagation()}
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
          setDraft({ x: drag.x, y: drag.y, w: point.x - drag.x, h: point.y - drag.y, flip: false });
          return;
        }
        if (drag.mode === "move") {
          const dx = (point.x - drag.x) / PX_PER_MM;
          const dy = (point.y - drag.y) / PX_PER_MM;
          const moved = new Map(drag.frames.map((frame) => [frame.id, frame]));
          onChangeRef.current(framesRef.current.map((frame) => {
            const original = moved.get(frame.id);
            return original ? { ...frame, xMm: original.xMm + dx, yMm: original.yMm + dy } : frame;
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
        updateFrame(frame.id, {
          xMm: x / PX_PER_MM,
          yMm: (y - origin) / PX_PER_MM,
          wMm: Math.max(1, Math.abs(x2 - x1)) / PX_PER_MM,
          hMm: Math.max(1, Math.abs(y2 - y1)) / PX_PER_MM,
        });
      }}
      onPointerCancel={() => { dragRef.current = null; setDraft(null); }}
      onPointerUp={(event) => {
        const drag = dragRef.current;
        dragRef.current = null;
        if (drag?.mode === "draw") {
          const point = localPoint(event);
          commitBox({ x: drag.x, y: drag.y, w: point.x - drag.x, h: point.y - drag.y, flip: false });
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
        const scale = rootBox && rootBox.width > 0 ? rootBox.width / pageWidthPx : 1;
        const snap = (value: number, origin = 0) => (Math.round(origin + value * scale) - origin) / scale;
        const left = snap(frame.xMm * PX_PER_MM, rootBox?.left);
        const top = snap((frame.page - 1) * stride + frame.yMm * PX_PER_MM, rootBox?.top);
        const width = Math.max(1, snap(frame.wMm * PX_PER_MM));
        const height = Math.max(1, snap(frame.hMm * PX_PER_MM));
        const active = selected.includes(frame.id);
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
              pointerEvents: tool === "text" && frame.kind !== "text" ? "none" : "auto",
              cursor: tool === "text" ? "text" : tool === "select" ? "move" : drawing ? "crosshair" : "default",
            }}
            onPointerDown={(event) => {
              if (frame.kind === "text" && tool === "text") {
                event.stopPropagation();
                setSelected([frame.id]);
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
              dragRef.current = {
                mode: "move",
                frames: framesRef.current.filter((item) => next.includes(item.id)),
                x: point.x,
                y: point.y,
                pointer: event.pointerId,
              };
              (event.currentTarget.closest("[data-studio-objects]") as HTMLElement | null)?.setPointerCapture(event.pointerId);
            }}
          >
            <FrameShape frame={frame} width={width} height={height} active={active} editable={tool === "text"} onTextFocus={() => setSelected([frame.id])} onText={(text) => updateFrame(frame.id, { text })} />
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
                      pointerEvents: drawing ? "none" : "auto",
                      cursor: drawing ? "crosshair" : edge.length === 2 ? `${edge}-resize` : edge === "n" || edge === "s" ? "ns-resize" : "ew-resize",
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
      {draft ? (
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
      <StudioCaret
        editor={editor}
        hostRef={rootRef}
        pageWidthPx={pageWidthPx}
        marginTopPx={marginTopPx}
        marginRightPx={marginRightPx}
      />
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
    return (
      <textarea
        data-studio-text-frame
        value={frame.text}
        readOnly={!editable}
        tabIndex={editable ? 0 : -1}
        dir="rtl"
        aria-label="Text box"
        onChange={(event) => onText(event.target.value)}
        onFocus={onTextFocus}
        onPointerDown={(event) => event.stopPropagation()}
        style={{
          width: "100%",
          height: "100%",
          resize: "none",
          pointerEvents: editable ? "auto" : "none",
          cursor: editable ? "text" : "inherit",
          border: "1px solid #000",
          background: "transparent",
          color: "#000",
          fontFamily: '"Jameel Noori Nastaleeq", "Noto Nastaliq Urdu", serif',
          fontVariantLigatures: "normal",
          fontFeatureSettings: "normal",
          fontSize: 16,
          lineHeight: autoLineHeight("Jameel Noori Nastaleeq"),
          padding: 2,
          outline: "none",
        }}
      />
    );
  }
  // Pixel-space geometry: the 1px stroke is centred on half-pixel edges.
  const inset = 0.5;
  const innerWidth = Math.max(0, width - 1);
  const innerHeight = Math.max(0, height - 1);
  const stroke = { fill: "none", stroke: "#000", strokeWidth: 1, vectorEffect: "non-scaling-stroke" } as const;
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
  editor,
  hostRef,
  pageWidthPx,
  marginTopPx,
  marginRightPx,
}: {
  editor: Editor | null;
  hostRef: React.RefObject<HTMLDivElement | null>;
  pageWidthPx: number;
  marginTopPx: number;
  marginRightPx: number;
}) {
  const [box, setBox] = useState<{ left: number; top: number; height: number } | null>(null);

  useEffect(() => {
    if (!editor) return;
    const place = () => {
      if (!editor.isFocused || editor.isDestroyed) {
        setBox(null);
        return;
      }
      const host = hostRef.current;
      if (!host) return;
      const domSelection = window.getSelection();
      let selectionRect: DOMRect | null = null;
      if (domSelection?.rangeCount && domSelection.isCollapsed && editor.view.dom.contains(domSelection.anchorNode)) {
        const rects = domSelection.getRangeAt(0).getClientRects();
        selectionRect = rects.length ? rects[rects.length - 1] : null;
      }
      const coords = selectionRect ?? editor.view.coordsAtPos(editor.state.selection.head);
      const firstLine = firstLineRunAt(editor.state, editor.state.selection.head);
      const rect = host.getBoundingClientRect();
      const scale = rect.width > 0 ? rect.width / pageWidthPx : 1;
      setBox({
        left: editor.isEmpty ? pageWidthPx - marginRightPx - 3 : (coords.left - rect.left) / scale,
        top: editor.isEmpty ? marginTopPx : (Math.min(coords.top, coords.bottom) - rect.top) / scale + (firstLine?.empty ? firstLine.offset : 0) + (firstLine?.selectionOffset ?? 0),
        height: Math.max(12, coords.bottom - coords.top) / scale,
      });
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
      document.removeEventListener("selectionchange", place);
      editor.off("selectionUpdate", place);
      editor.off("transaction", place);
      editor.off("focus", place);
      editor.off("blur", place);
    };
  }, [editor, hostRef, marginRightPx, marginTopPx, pageWidthPx]);

  if (!box) return null;
  return (
    <div
      data-studio-caret="true"
      style={{
        position: "absolute",
        left: box.left,
        top: box.top,
        width: 2,
        height: box.height,
        background: "#000",
        pointerEvents: "none",
        zIndex: 8,
      }}
    />
  );
}
