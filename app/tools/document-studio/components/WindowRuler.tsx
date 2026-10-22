"use client";

import { useEffect, useRef } from "react";
import type { PhysicalMarginEdge } from "../utils/pageLayout";
import { calculateWindowRulerTicks, INPAGE_RULER_BAR_PX, INPAGE_VRULER_PX, type WindowTickKind } from "../utils/windowRuler";

const TICK_PX: Record<WindowTickKind, number> = { major: 9, minor: 4, micro: 2 };

// Fixed 5x7 bitmap glyphs: integer rectangles have no font rasterisation or antialiasing.
const DIGITS: Record<string, string[]> = {
  "0": ["01110","10001","10011","10101","11001","10001","01110"],
  "1": ["00100","01100","00100","00100","00100","00100","01110"],
  "2": ["01110","10001","00001","00010","00100","01000","11111"],
  "3": ["11110","00001","00001","01110","00001","00001","11110"],
  "4": ["00010","00110","01010","10010","11111","00010","00010"],
  "5": ["11111","10000","10000","11110","00001","00001","11110"],
  "6": ["01110","10000","10000","11110","10001","10001","01110"],
  "7": ["11111","00001","00010","00100","01000","01000","01000"],
  "8": ["01110","10001","10001","01110","10001","10001","01110"],
  "9": ["01110","10001","10001","01111","00001","00001","01110"],
  "-": ["00000","00000","00000","11111","00000","00000","00000"],
};

// Vertical labels use adjoining five-pixel digits; the small origin zero is four pixels wide.
const digitWidth = (text: string, vertical: boolean) => vertical ? (text === "0" ? 4 : text.length * 5) : text.length * 6 - 1;
function BitmapDigits({ text, vertical = false }: { text: string; vertical?: boolean }) {
  const pixels = [...text].flatMap((digit, index) => (vertical && text === "0" ? ["0110", "1001", "1001", "1001", "1001", "1001", "0110"] : DIGITS[digit] ?? []).flatMap((row, y) =>
    [...row].flatMap((pixel, x) => pixel === "1" ? [`M${index * (vertical ? 5 : 6) + x} ${y}h1v1h-1z`] : [])));
  return <svg width={digitWidth(text, vertical)} height="7" viewBox={`0 0 ${digitWidth(text, vertical)} 7`} shapeRendering="crispEdges" style={{ display: "block" }} aria-hidden="true" data-ruler-digits={text}><path d={pixels.join("")} fill="#000" /></svg>;
}

/**
 * InPage window ruler. Numbers are millimetres and continue past the page.
 * The 0 label is shifted 2px inward so it does not hang off the page edge.
 */
export function WindowRuler({
  axis,
  lengthPx,
  originPx,
  pageStartPx,
  pxPerMm,
  positiveDirection,
  originName,
  pageWidthMm,
  pageHeightMm,
  pageSize,
  orientation,
  handles = [],
  onPhysicalMarginChange,
}: {
  axis: "horizontal" | "vertical";
  lengthPx: number;
  /** Pixel where the 0 label sits. */
  originPx: number;
  /** Pixel where the page's left edge (or top) sits. */
  pageStartPx: number;
  pxPerMm: number;
  positiveDirection: 1 | -1;
  originName: "left" | "right" | "top";
  pageWidthMm: number;
  pageHeightMm: number;
  pageSize?: string;
  orientation?: string;
  handles?: { edge: PhysicalMarginEdge; offsetPx: number }[];
  onPhysicalMarginChange?: (edge: PhysicalMarginEdge, mm: number) => void;
}) {
  const vertical = axis === "vertical";
  const rootRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<PhysicalMarginEdge | null>(null);
  const ticks = calculateWindowRulerTicks({ lengthPx, originPx, pxPerMm, positiveDirection });
  const ready = lengthPx > 0 && pxPerMm > 0;
  const pageMm = vertical ? pageHeightMm : pageWidthMm;

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const edge = dragRef.current;
      const root = rootRef.current;
      if (!edge || !root || !onPhysicalMarginChange || !(pxPerMm > 0)) return;
      event.preventDefault();
      const rect = root.getBoundingClientRect();
      const local = (vertical ? event.clientY : event.clientX) - (vertical ? rect.top : rect.left);
      const fromPageStart = (local - pageStartPx) / pxPerMm;
      const mm = edge === "right" || edge === "bottom" ? pageMm - fromPageStart : fromPageStart;
      if (Number.isFinite(mm)) onPhysicalMarginChange(edge, mm);
    };
    const onUp = () => {
      dragRef.current = null;
      document.body.style.removeProperty("user-select");
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [onPhysicalMarginChange, pageMm, pageStartPx, pxPerMm, vertical]);

  return (
    <div
      ref={rootRef}
      className="relative select-none overflow-hidden bg-white"
      style={{
        boxSizing: "border-box",
        width: vertical ? INPAGE_VRULER_PX : Math.max(1, lengthPx),
        height: vertical ? Math.max(1, lengthPx) : INPAGE_RULER_BAR_PX - 2,
        borderBottom: vertical ? undefined : "2px solid #000",
        borderRight: vertical ? "2px solid #000" : undefined,
        background: "#fff",
        fontFamily: "Tahoma, 'Segoe UI', sans-serif",
      }}
      data-studio-ruler={vertical ? undefined : "true"}
      data-studio-vertical-ruler={vertical ? "true" : undefined}
      data-ruler-axis={axis}
      data-ruler-unit="mm"
      data-ruler-origin={originName}
      data-ruler-bar-px={String(vertical ? INPAGE_VRULER_PX : INPAGE_RULER_BAR_PX)}
      data-ruler-page-width-mm={pageWidthMm}
      data-ruler-page-height-mm={pageHeightMm}
      data-ruler-page-size={pageSize}
      data-ruler-orientation={orientation}
      data-ruler-ready={ready ? "true" : "false"}
      data-ruler-measured-px={String(Math.round(lengthPx))}
      data-ruler-major-ticks={String(ticks.filter((tick) => tick.kind === "major").length)}
      data-ruler-minor-ticks={String(ticks.filter((tick) => tick.kind === "minor").length)}
      data-ruler-interactive={onPhysicalMarginChange ? "true" : undefined}
    >
      <div data-ruler-margin="start" className="pointer-events-none absolute" style={{ left: 0, top: 0, width: 0, height: 0 }} />
      {ticks.map((tick, index) => (
          <div
            key={`${tick.mm}-${index}`}
            data-ruler-tick={tick.kind}
            data-ruler-label={tick.label}
            className="pointer-events-none absolute bg-black"
            style={
              vertical
                ? { top: Math.round(tick.offsetPx), right: 0, width: TICK_PX[tick.kind], height: 1 }
                : { left: Math.round(tick.offsetPx), bottom: 0, width: 1, height: TICK_PX[tick.kind] }
            }
          />
      ))}
      {ticks.map((tick, index) => {
        if (!tick.label) return null;
        return (
          <span
            key={`label-${tick.mm}-${index}`}
            className="pointer-events-none absolute whitespace-nowrap text-black"
            style={vertical
              ? { top: Math.round(tick.offsetPx) + (tick.label === "0" ? 5 : 4) + digitWidth(tick.label, true), left: 1, width: digitWidth(tick.label, true), height: 7, transform: "rotate(-90deg)", transformOrigin: "left top" }
              : { left: Math.round(tick.offsetPx) - 2 - (tick.label.length * 6 - 1), top: 1, width: tick.label.length * 6 - 1, height: 7 }}
          >
            <BitmapDigits text={tick.label} vertical={vertical} />
          </span>
        );
      })}
      {onPhysicalMarginChange
        ? handles.map((handle) => (
            <div
              key={handle.edge}
              role="slider"
              tabIndex={0}
              data-ruler-handle={handle.edge}
              aria-label={`${handle.edge} margin`}
              className="absolute z-20"
              style={
                vertical
                  ? { top: handle.offsetPx - 6, left: 0, right: 0, height: 12, cursor: "ns-resize" }
                  : { left: handle.offsetPx - 6, top: 0, bottom: 0, width: 12, cursor: "ew-resize" }
              }
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                dragRef.current = handle.edge;
                document.body.style.userSelect = "none";
              }}
            />
          ))
        : null}
    </div>
  );
}
