import React, { useEffect, useRef, useState } from "react";
import {
  calculateRulerMetrics,
  calculateRulerTicks,
  calculateVerticalRulerMetrics,
  marginMmFromPointer,
  rulerUnitForPage,
} from "../utils/rulerLayout";
import type { PhysicalMarginEdge, ResolvedPageLayout } from "../utils/pageLayout";

interface WordRulerProps {
  dir: "ltr" | "rtl";
  layout: ResolvedPageLayout;
  axis?: "horizontal" | "vertical";
  onPhysicalMarginChange?: (edge: PhysicalMarginEdge, mm: number) => void;
}

const MAJOR = 10;
const MINOR = 6;

export const WordRuler: React.FC<WordRulerProps> = ({ dir, layout, axis = "horizontal", onPhysicalMarginChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(0);
  const vertical = axis === "vertical";
  const dragRef = useRef<PhysicalMarginEdge | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      setSize(vertical ? box?.height ?? 0 : box?.width ?? 0);
    });
    observer.observe(el);
    setSize(vertical ? el.clientHeight : el.clientWidth);
    return () => observer.disconnect();
  }, [vertical]);

  const unit = rulerUnitForPage(layout.size);
  const lengthMm = vertical ? layout.heightMm : layout.widthMm;
  const measured = size || lengthMm;
  const ticks = calculateRulerTicks(measured, lengthMm, unit);
  const hMetrics = vertical ? null : calculateRulerMetrics(measured, layout, dir);
  const vMetrics = vertical ? calculateVerticalRulerMetrics(measured, layout) : null;
  const startZone = vertical ? vMetrics?.topMarginPx ?? 0 : hMetrics?.leftMarginPx ?? 0;
  const endZone = vertical ? vMetrics?.bottomMarginPx ?? 0 : hMetrics?.rightMarginPx ?? 0;

  const emitFromPointer = (edge: PhysicalMarginEdge, client: number) => {
    const el = containerRef.current;
    if (!el || !onPhysicalMarginChange) return;
    const rect = el.getBoundingClientRect();
    const origin = vertical ? rect.top : rect.left;
    const lengthPx = vertical ? rect.height : rect.width;
    const pageMm = vertical ? layout.heightMm : layout.widthMm;
    const fromEnd = edge === "right" || edge === "bottom";
    onPhysicalMarginChange(edge, marginMmFromPointer({ client, origin, lengthPx, pageMm, fromEnd }));
  };

  const onHandlePointerDown = (edge: PhysicalMarginEdge) => (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!onPhysicalMarginChange) return;
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = edge;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* jsdom / older browsers */
    }
    emitFromPointer(edge, vertical ? event.clientY : event.clientX);
  };

  const onHandlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const edge = dragRef.current;
    if (!edge) return;
    event.preventDefault();
    emitFromPointer(edge, vertical ? event.clientY : event.clientX);
  };

  const onHandlePointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (dragRef.current) {
      event.preventDefault();
      dragRef.current = null;
    }
  };

  const handleStyle = (edge: PhysicalMarginEdge): React.CSSProperties => {
    if (edge === "left") return { left: `${startZone}px`, top: 0, bottom: 0, width: 8, marginLeft: -4, cursor: "ew-resize" };
    if (edge === "right") return { right: `${endZone}px`, top: 0, bottom: 0, width: 8, marginRight: -4, cursor: "ew-resize" };
    if (edge === "top") return { top: `${startZone}px`, left: 0, right: 0, height: 8, marginTop: -4, cursor: "ns-resize" };
    return { bottom: `${endZone}px`, left: 0, right: 0, height: 8, marginBottom: -4, cursor: "ns-resize" };
  };

  const handles: PhysicalMarginEdge[] = vertical ? ["top", "bottom"] : ["left", "right"];

  return (
    <div
      ref={containerRef}
      className={`relative select-none overflow-hidden bg-[#e8ece6] ${vertical ? "w-6 h-full border-r border-slate-300" : "h-6 w-full border-b border-slate-300"}`}
      aria-hidden={!onPhysicalMarginChange}
      data-studio-ruler={vertical ? undefined : "true"}
      data-studio-vertical-ruler={vertical ? "true" : undefined}
      data-ruler-axis={axis}
      data-ruler-page-width-mm={layout.widthMm}
      data-ruler-page-height-mm={layout.heightMm}
      data-ruler-orientation={layout.orientation}
      data-ruler-page-size={layout.size}
      data-ruler-interactive={onPhysicalMarginChange ? "true" : undefined}
      data-ruler-major-ticks={String(ticks.filter((tick) => tick.kind === "major").length)}
      data-ruler-minor-ticks={String(ticks.filter((tick) => tick.kind === "minor").length)}
      title="Page ruler — drag margin boundaries"
    >
      <div className="absolute inset-0 bg-[#dfe4dc]" />
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
          className="absolute bg-slate-500 pointer-events-none"
          style={
            vertical
              ? { top: `${tick.offsetPx}px`, right: 0, width: tick.kind === "major" ? MAJOR : MINOR, height: 1 }
              : { left: `${tick.offsetPx}px`, bottom: 0, height: tick.kind === "major" ? MAJOR : MINOR, width: 1 }
          }
        >
          {tick.label ? (
            <span
              className="absolute text-[8px] leading-none text-slate-600"
              style={vertical ? { right: 11, top: 1 } : { left: 2, top: 1 }}
            >
              {tick.label}
            </span>
          ) : null}
        </div>
      ))}
      {onPhysicalMarginChange
        ? handles.map((edge) => (
            <button
              key={edge}
              type="button"
              data-ruler-handle={edge}
              aria-label={`${edge} margin`}
              className="absolute z-10 border-0 bg-[#1A3A2A] p-0"
              style={handleStyle(edge)}
              onPointerDown={onHandlePointerDown(edge)}
              onPointerMove={onHandlePointerMove}
              onPointerUp={onHandlePointerUp}
              onPointerCancel={onHandlePointerUp}
            />
          ))
        : null}
    </div>
  );
};
