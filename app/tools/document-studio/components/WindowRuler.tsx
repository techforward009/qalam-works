"use client";

import { useEffect, useRef } from "react";
import type { PhysicalMarginEdge } from "../utils/pageLayout";
import { calculateWindowRulerTicks, INPAGE_RULER_BAR_PX, type WindowTickKind } from "../utils/windowRuler";

const TICK_PX: Record<WindowTickKind, number> = { major: 9, minor: 4, micro: 2 };

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
        width: vertical ? INPAGE_RULER_BAR_PX : Math.max(1, lengthPx),
        height: vertical ? Math.max(1, lengthPx) : INPAGE_RULER_BAR_PX,
        borderBottom: vertical ? undefined : "2px solid #000",
        borderRight: vertical ? "2px solid #000" : undefined,
        background: vertical
          ? "#fff"
          : "linear-gradient(#a0a0a0 0 1px, #696969 1px 2px, #fff 2px)",
        fontFamily: "Tahoma, 'Segoe UI', sans-serif",
      }}
      data-studio-ruler={vertical ? undefined : "true"}
      data-studio-vertical-ruler={vertical ? "true" : undefined}
      data-ruler-axis={axis}
      data-ruler-unit="mm"
      data-ruler-origin={originName}
      data-ruler-bar-px={String(INPAGE_RULER_BAR_PX)}
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
                ? { top: tick.offsetPx, right: 0, width: TICK_PX[tick.kind], height: 1 }
                : { left: tick.offsetPx, bottom: 0, width: 1, height: TICK_PX[tick.kind] }
            }
          />
      ))}
      {ticks.map((tick, index) => {
        if (!tick.label) return null;
        return (
          <span
            key={`label-${tick.mm}-${index}`}
            className="pointer-events-none absolute whitespace-nowrap text-black"
            style={
              vertical
                ? {
                    top: tick.offsetPx,
                    right: 3,
                    fontSize: 7,
                    lineHeight: "8px",
                    transform: "rotate(-90deg)",
                    transformOrigin: "right top",
                  }
                : {
                    left: tick.offsetPx - 2,
                    top: 1,
                    fontSize: 7,
                    lineHeight: "8px",
                    transform: "translateX(-100%)",
                  }
            }
          >
            {tick.label}
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
