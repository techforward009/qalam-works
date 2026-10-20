"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
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

const DRAW_TOOLS = new Set<StudioToolId>(["rect", "ellipse", "round-rect", "line", "text"]);
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

export function StudioObjectLayer({
  editor,
  tool,
  frames,
  onFramesChange,
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
  pageCount: number;
  pageWidthPx: number;
  pageHeightPx: number;
  gapPx: number;
  marginTopPx: number;
  marginRightPx: number;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ x: number; y: number; w: number; h: number; flip: boolean } | null>(null);
  const dragRef = useRef<
    | { mode: "draw"; x: number; y: number; pointer: number }
    | { mode: "move"; id: string; dx: number; dy: number; pointer: number }
    | { mode: "resize"; id: string; edge: string; pointer: number }
    | null
  >(null);
  const drawing = DRAW_TOOLS.has(tool);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("textarea, input, [contenteditable='true']")) return;
      if (!selected) return;
      event.preventDefault();
      onFramesChange(frames.filter((frame) => frame.id !== selected));
      setSelected(null);
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
    const kind = tool === "text" || tool === "line" || tool === "ellipse" || tool === "round-rect" || tool === "rect" ? tool : null;
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
    if (w < 4 && h < 4) {
      w = 120;
      h = kind === "line" ? 40 : 72;
    }
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
    onChangeRef.current([...framesRef.current, frame]);
    setSelected(frame.id);
    if (kind === "text") {
      requestAnimationFrame(() => {
        rootRef.current?.querySelector<HTMLTextAreaElement>(`[data-studio-frame-id="${frame.id}"] textarea`)?.focus();
      });
    }
  };

  return (
    <div
      ref={rootRef}
      className="studio-no-print absolute inset-0 z-[6]"
      data-studio-objects="true"
      style={{ pointerEvents: drawing ? "auto" : "none", cursor: drawing ? "crosshair" : undefined }}
      onPointerDown={(event) => {
        if (!drawing) return;
        const point = localPoint(event);
        dragRef.current = { mode: "draw", x: point.x, y: point.y, pointer: event.pointerId };
        setDraft({ x: point.x, y: point.y, w: 0, h: 0, flip: false });
        setSelected(null);
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointer !== event.pointerId) return;
        const point = localPoint(event);
        if (drag.mode === "draw") {
          setDraft({ x: drag.x, y: drag.y, w: point.x - drag.x, h: point.y - drag.y, flip: false });
          return;
        }
        if (drag.mode === "move") {
          const frame = frames.find((item) => item.id === drag.id);
          if (!frame) return;
          const stride = pageHeightPx + gapPx;
          const origin = (frame.page - 1) * stride;
          updateFrame(frame.id, {
            xMm: (point.x - drag.dx) / PX_PER_MM,
            yMm: (point.y - origin - drag.dy) / PX_PER_MM,
          });
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
      onPointerUp={(event) => {
        const drag = dragRef.current;
        dragRef.current = null;
        if (drag?.mode === "draw") {
          const point = localPoint(event);
          commitBox({ x: drag.x, y: drag.y, w: point.x - drag.x, h: point.y - drag.y, flip: false });
        }
        setDraft(null);
        if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      }}
    >
      {frames.map((frame) => {
        const stride = pageHeightPx + gapPx;
        const left = frame.xMm * PX_PER_MM;
        const top = (frame.page - 1) * stride + frame.yMm * PX_PER_MM;
        const width = Math.max(1, frame.wMm * PX_PER_MM);
        const height = Math.max(1, frame.hMm * PX_PER_MM);
        const active = selected === frame.id;
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
              pointerEvents: "auto",
              cursor: tool === "select" || active ? "move" : "crosshair",
            }}
            onPointerDown={(event) => {
              if (DRAW_TOOLS.has(tool)) return;
              event.stopPropagation();
              setSelected(frame.id);
              if (tool !== "select" && !DRAW_TOOLS.has(tool)) return;
              if (DRAW_TOOLS.has(tool)) return;
              const point = localPoint(event);
              dragRef.current = {
                mode: "move",
                id: frame.id,
                dx: point.x - left,
                dy: point.y - top,
                pointer: event.pointerId,
              };
              (event.currentTarget.closest("[data-studio-objects]") as HTMLElement | null)?.setPointerCapture(event.pointerId);
            }}
          >
            <FrameShape frame={frame} active={active} onText={(text) => updateFrame(frame.id, { text })} />
            {active
              ? (["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const).map((edge) => (
                  <div
                    key={edge}
                    data-studio-frame-handle={edge}
                    style={{
                      position: "absolute",
                      width: 6,
                      height: 6,
                      background: "#fff",
                      border: "1px solid #000",
                      ...handlePos(edge),
                      cursor: edge.length === 2 ? `${edge}-resize` : edge === "n" || edge === "s" ? "ns-resize" : "ew-resize",
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
  onText,
}: {
  frame: StudioFrame;
  active: boolean;
  onText: (text: string) => void;
}) {
  if (frame.kind === "text") {
    return (
      <textarea
        value={frame.text}
        dir="rtl"
        aria-label="Text box"
        onChange={(event) => onText(event.target.value)}
        onPointerDown={(event) => event.stopPropagation()}
        style={{
          width: "100%",
          height: "100%",
          resize: "none",
          border: active ? "1px solid #000" : "1px dotted #404040",
          background: "transparent",
          color: "#000",
          fontFamily: '"Jameel Noori Nastaleeq", "Noto Nastaliq Urdu", serif',
          fontSize: 16,
          lineHeight: 1.6,
          padding: 2,
          outline: "none",
        }}
      />
    );
  }
  const stroke = "#111";
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${Math.max(1, frame.wMm)} ${Math.max(1, frame.hMm)}`} preserveAspectRatio="none" aria-hidden>
      {frame.kind === "ellipse" ? (
        <ellipse cx={frame.wMm / 2} cy={frame.hMm / 2} rx={Math.max(0.2, frame.wMm / 2 - 0.2)} ry={Math.max(0.2, frame.hMm / 2 - 0.2)} fill="none" stroke={stroke} strokeWidth={0.4} vectorEffect="non-scaling-stroke" />
      ) : null}
      {frame.kind === "rect" ? (
        <rect x={0.2} y={0.2} width={Math.max(0.4, frame.wMm - 0.4)} height={Math.max(0.4, frame.hMm - 0.4)} fill="none" stroke={stroke} strokeWidth={0.4} vectorEffect="non-scaling-stroke" />
      ) : null}
      {frame.kind === "round-rect" ? (
        <rect x={0.2} y={0.2} width={Math.max(0.4, frame.wMm - 0.4)} height={Math.max(0.4, frame.hMm - 0.4)} rx={1.6} fill="none" stroke={stroke} strokeWidth={0.4} vectorEffect="non-scaling-stroke" />
      ) : null}
      {frame.kind === "line" ? (
        <line
          x1={frame.flip ? frame.wMm : 0}
          y1={0}
          x2={frame.flip ? 0 : frame.wMm}
          y2={frame.hMm}
          stroke={stroke}
          strokeWidth={0.45}
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
      {active ? <rect x={0} y={0} width={frame.wMm} height={frame.hMm} fill="none" stroke="#1a4fbf" strokeWidth={0.3} vectorEffect="non-scaling-stroke" /> : null}
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
      if (editor.isEmpty) {
        setBox({
          left: pageWidthPx - marginRightPx - 3,
          top: marginTopPx,
          height: 27,
        });
        return;
      }
      const host = hostRef.current;
      if (!host) return;
      const coords = editor.view.coordsAtPos(editor.state.selection.head);
      const rect = host.getBoundingClientRect();
      const scale = rect.width > 0 ? rect.width / pageWidthPx : 1;
      setBox({
        left: (coords.left - rect.left) / scale,
        top: (Math.min(coords.top, coords.bottom) - rect.top) / scale,
        height: 27,
      });
    };
    place();
    editor.on("selectionUpdate", place);
    editor.on("transaction", place);
    editor.on("focus", place);
    editor.on("blur", place);
    return () => {
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
