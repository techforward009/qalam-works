import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  calculateRulerMetrics,
  calculateRulerTicks,
  calculateVerticalRulerMetrics,
  marginMmFromPointer,
  type RulerUnit,
} from "../utils/rulerLayout";
import type { PhysicalMarginEdge, ResolvedPageLayout } from "../utils/pageLayout";

interface WordRulerProps {
  dir: "ltr" | "rtl";
  layout: ResolvedPageLayout;
  axis?: "horizontal" | "vertical";
  unit?: RulerUnit;
  onPhysicalMarginChange?: (edge: PhysicalMarginEdge, mm: number) => void;
}

const TICK_SIZE = { major: 12, minor: 8, micro: 4 };

export const WordRuler: React.FC<WordRulerProps> = ({
  dir,
  layout,
  axis = "horizontal",
  unit = "cm",
  onPhysicalMarginChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(0);
  const vertical = axis === "vertical";
  const dragRef = useRef<PhysicalMarginEdge | null>(null);
  const layoutRef = useRef(layout);
  const callbackRef = useRef(onPhysicalMarginChange);
  layoutRef.current = layout;
  callbackRef.current = onPhysicalMarginChange;

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setSize(vertical ? el.clientHeight : el.clientWidth);
  }, [vertical, layout.widthMm, layout.heightMm]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      const next = vertical ? box?.height ?? el.clientHeight : box?.width ?? el.clientWidth;
      setSize(next);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [vertical]);

  const emitFromPointer = (edge: PhysicalMarginEdge, client: number) => {
    const el = containerRef.current;
    const callback = callbackRef.current;
    if (!el || !callback) return;
    const rect = el.getBoundingClientRect();
    const current = layoutRef.current;
    const origin = vertical ? rect.top : rect.left;
    const lengthPx = vertical ? rect.height : rect.width;
    if (!(lengthPx > 0)) return;
    const pageMm = vertical ? current.heightMm : current.widthMm;
    const fromEnd = edge === "right" || edge === "bottom";
    callback(edge, marginMmFromPointer({ client, origin, lengthPx, pageMm, fromEnd }));
  };

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const edge = dragRef.current;
      if (!edge) return;
      event.preventDefault();
      emitFromPointer(edge, vertical ? event.clientY : event.clientX);
    };
    const onUp = () => {
      if (!dragRef.current) return;
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
  }, [vertical]);

  const lengthMm = vertical ? layout.heightMm : layout.widthMm;
  const measured = size > 0 ? size : 0;
  const ready = measured > 0;
  const ticks = ready ? calculateRulerTicks(measured, lengthMm, unit) : [];
  const hMetrics = ready && !vertical ? calculateRulerMetrics(measured, layout, dir) : null;
  const vMetrics = ready && vertical ? calculateVerticalRulerMetrics(measured, layout) : null;
  const startZone = vertical ? vMetrics?.topMarginPx ?? 0 : hMetrics?.leftMarginPx ?? 0;
  const endZone = vertical ? vMetrics?.bottomMarginPx ?? 0 : hMetrics?.rightMarginPx ?? 0;

  const onHandlePointerDown = (edge: PhysicalMarginEdge) => (event: React.PointerEvent<HTMLDivElement>) => {
    if (!callbackRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = edge;
    document.body.style.userSelect = "none";
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }
    emitFromPointer(edge, vertical ? event.clientY : event.clientX);
  };

  const handleStyle = (edge: PhysicalMarginEdge): React.CSSProperties => {
    if (edge === "left") {
      return { left: `${startZone}px`, top: 0, bottom: 0, width: 18, marginLeft: -9, cursor: "ew-resize" };
    }
    if (edge === "right") {
      return { right: `${endZone}px`, top: 0, bottom: 0, width: 18, marginRight: -9, cursor: "ew-resize" };
    }
    if (edge === "top") {
      return { top: `${startZone}px`, left: 0, right: 0, height: 18, marginTop: -9, cursor: "ns-resize" };
    }
    return { bottom: `${endZone}px`, left: 0, right: 0, height: 18, marginBottom: -9, cursor: "ns-resize" };
  };

  const handles: PhysicalMarginEdge[] = vertical ? ["top", "bottom"] : ["left", "right"];

  return (
    <div
      ref={containerRef}
      className={`relative select-none bg-[#e8ece6] ${vertical ? "w-6 h-full border-r border-slate-300" : "h-6 w-full border-b border-slate-300"}`}
      data-studio-ruler={vertical ? undefined : "true"}
      data-studio-vertical-ruler={vertical ? "true" : undefined}
      data-ruler-axis={axis}
      data-ruler-unit={unit}
      data-ruler-page-width-mm={layout.widthMm}
      data-ruler-page-height-mm={layout.heightMm}
      data-ruler-orientation={layout.orientation}
      data-ruler-page-size={layout.size}
      data-ruler-ready={ready ? "true" : "false"}
      data-ruler-measured-px={String(measured)}
      data-ruler-interactive={onPhysicalMarginChange ? "true" : undefined}
      data-ruler-major-ticks={String(ticks.filter((tick) => tick.kind === "major").length)}
      data-ruler-minor-ticks={String(ticks.filter((tick) => tick.kind === "minor").length)}
      title="Page ruler — drag margin boundaries"
    >
      <div className="absolute inset-0 bg-[#dfe4dc]" />
      {ready ? (
        <>
      <div
        className="absolute bg-[#c5cdc2]"
        data-ruler-margin="start"
        style={
          vertical
            ? { top: 0, left: 0, right: 0, height: `${startZone}px` }
            : { top: 0, bottom: 0, left: 0, width: `${startZone}px` }
        }
      />
      <div
        className="absolute bg-white/80"
        data-ruler-writing-area="true"
        style={
          vertical
            ? { top: `${startZone}px`, bottom: `${endZone}px`, left: 2, right: 2 }
            : { left: `${startZone}px`, right: `${endZone}px`, top: 2, bottom: 2 }
        }
      />
      <div
        className="absolute bg-[#c5cdc2]"
        data-ruler-margin="end"
        style={
          vertical
            ? { bottom: 0, left: 0, right: 0, height: `${endZone}px` }
            : { top: 0, bottom: 0, right: 0, width: `${endZone}px` }
        }
      />
      {ticks.map((tick, i) => (
        <div
          key={`${tick.kind}-${i}`}
          data-ruler-tick={tick.kind}
          className="absolute bg-slate-600 pointer-events-none"
          style={
            vertical
              ? { top: `${tick.offsetPx}px`, right: 0, width: TICK_SIZE[tick.kind], height: 1 }
              : { left: `${tick.offsetPx}px`, bottom: 0, height: TICK_SIZE[tick.kind], width: 1 }
          }
        >
          {tick.label ? (
            <span
              className="absolute text-[8px] leading-none text-slate-600"
              style={vertical ? { right: 13, top: 1 } : { left: 2, top: 1 }}
            >
              {tick.label}
            </span>
          ) : null}
        </div>
      ))}
      {onPhysicalMarginChange
        ? handles.map((edge) => (
            <div
              key={edge}
              role="slider"
              tabIndex={0}
              data-ruler-handle={edge}
              aria-label={`${edge} margin`}
              className="absolute z-20 bg-transparent hover:bg-[#1A3A2A]/15"
              style={handleStyle(edge)}
              onPointerDown={onHandlePointerDown(edge)}
            >
              <span
                className="pointer-events-none absolute bg-[#1A3A2A]"
                style={
                  vertical
                    ? { left: 2, right: 2, top: 8, height: 2 }
                    : { top: 2, bottom: 2, left: 8, width: 2 }
                }
              />
            </div>
          ))
        : null}
        </>
      ) : null}
    </div>
  );
};
