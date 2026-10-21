"use client";

import { useEffect, useRef, useState } from "react";

const raised = "inset 1px 1px 0 #fff, inset -1px -1px 0 #696969, inset -2px -2px 0 #a0a0a0";

export function ClassicScrollbar({ vertical = false, viewport, extent, offset, onScroll }: {
  vertical?: boolean; viewport: number; extent: number; offset: number; onScroll: (value: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pointer: number; start: number; offset: number } | null>(null);
  const [length, setLength] = useState(0);
  useEffect(() => {
    const node = trackRef.current;
    if (!node) return;
    const read = () => setLength(vertical ? node.clientHeight : node.clientWidth);
    read();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(read);
    observer.observe(node);
    return () => observer.disconnect();
  }, [vertical]);
  const range = Math.max(0, extent - viewport);
  const horizontalFits = !vertical && range === 0;
  const thumb = Math.min(length, Math.max(17, length * viewport / Math.max(1, extent)));
  const travel = Math.max(0, length - thumb);
  const position = range ? Math.min(travel, offset / range * travel) : 0;
  const coordinate = (event: { clientX: number; clientY: number }) => vertical ? event.clientY : event.clientX;
  const arrow = (end: boolean) => <button type="button" disabled={horizontalFits} aria-label={vertical ? (end ? "Scroll down" : "Scroll up") : (end ? "Scroll right" : "Scroll left")}
    onClick={() => onScroll(Math.max(0, Math.min(range, offset + (end ? 40 : -40))))}
    style={{ width: 17, height: 17, flexShrink: 0, padding: 0, border: "none", background: "#f0f0f0", boxShadow: raised, display: "grid", placeItems: "center" }}>
    <svg width="7" height="7" viewBox="0 0 7 7" aria-hidden="true"><path d={vertical ? (end ? "M0 1H7L3.5 6Z" : "M0 6H7L3.5 1Z") : (end ? "M1 0V7L6 3.5Z" : "M6 0V7L1 3.5Z")} fill={horizontalFits ? "#a0a0a0" : "#000"} /></svg>
  </button>;
  return <div data-studio-classic-scrollbar={vertical ? "vertical" : "horizontal"} style={{ display: "flex", flexDirection: vertical ? "column" : "row", width: vertical ? 17 : undefined, height: vertical ? "100%" : 17, minWidth: 0, flex: vertical ? undefined : 1 }}>
    {arrow(false)}
    <div ref={trackRef} data-studio-scroll-track="true" style={{ position: "relative", flex: 1, minWidth: 0, minHeight: 0, backgroundImage: "conic-gradient(#f0f0f0 25%, #fff 0 50%, #f0f0f0 0 75%, #fff 0)", backgroundSize: "2px 2px" }}
      onPointerDown={(event) => { const box = event.currentTarget.getBoundingClientRect(); onScroll(Math.max(0, Math.min(range, (coordinate(event) - (vertical ? box.top : box.left) - thumb / 2) / Math.max(1, travel) * range))); }}>
      <div role="scrollbar" aria-label={vertical ? "Vertical document scroll" : "Horizontal document scroll"} aria-orientation={vertical ? "vertical" : "horizontal"} aria-valuemin={0} aria-valuemax={Math.round(range)} aria-valuenow={Math.round(offset)}
        data-studio-scroll-thumb="true" style={{ display: horizontalFits ? "none" : undefined, position: "absolute", top: vertical ? position : 0, left: vertical ? 0 : position, width: vertical ? 17 : thumb, height: vertical ? thumb : 17, background: "#f0f0f0", boxShadow: raised, touchAction: "none" }}
        onPointerDown={(event) => { event.stopPropagation(); drag.current = { pointer: event.pointerId, start: coordinate(event), offset }; event.currentTarget.setPointerCapture(event.pointerId); }}
        onPointerMove={(event) => { if (drag.current?.pointer === event.pointerId) onScroll(Math.max(0, Math.min(range, drag.current.offset + (coordinate(event) - drag.current.start) / Math.max(1, travel) * range))); }}
        onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} />
    </div>
    {arrow(true)}
  </div>;
}
