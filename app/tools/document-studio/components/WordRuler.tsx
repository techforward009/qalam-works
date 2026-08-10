import React, { useEffect, useRef, useState } from "react";
import { calculateRulerMetrics, resolveVisualMarginOffsets, calculateInchTickPositions } from "../utils/rulerLayout";

interface WordRulerProps {
  dir: "ltr" | "rtl";
}

/**
 * Word-like Professional Editing Layer — Phase 1 (2026-08-09). A purely
 * VISUAL, read-only ruler above the editor, showing the A4 page width
 * and margins proportionally — matching the same page geometry the DOCX
 * export actually produces (see rulerLayout.ts's own comment on why the
 * constants are duplicated rather than imported).
 *
 * NOT interactive: no dragging, no click-to-set-indent, no state beyond
 * the container's own measured width (via ResizeObserver, a standard
 * browser API — no new dependency). Never touches editor content or
 * any formatting attribute.
 */
export const WordRuler: React.FC<WordRulerProps> = ({ dir }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      setContainerWidth(width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const metrics = calculateRulerMetrics(containerWidth);
  const { startOffsetPx, endOffsetPx } = resolveVisualMarginOffsets(metrics, dir);
  const ticks = calculateInchTickPositions(metrics);
  const marginLeftPx = Math.min(startOffsetPx, endOffsetPx);
  const marginRightPx = Math.max(startOffsetPx, endOffsetPx);

  return (
    <div
      ref={containerRef}
      className="relative h-6 border-b border-slate-200 select-none"
      aria-hidden="true"
      title="Page ruler — visual guide only"
    >
      {/* Full page width background */}
      <div className="absolute inset-0 bg-slate-50" />

      {/* Margin zones (shaded, matching Word's convention) */}
      {containerWidth > 0 && (
        <>
          <div className="absolute top-0 bottom-0 left-0 bg-slate-200/70" style={{ width: `${marginLeftPx}px` }} />
          <div
            className="absolute top-0 bottom-0 right-0 bg-slate-200/70"
            style={{ width: `${containerWidth - marginRightPx}px` }}
          />
        </>
      )}

      {/* Inch tick marks */}
      {ticks.map((tickPx, i) => (
        <div
          key={i}
          className="absolute top-0 bottom-0 border-r border-slate-300"
          style={{ left: `${tickPx}px` }}
        >
          {i > 0 && <span className="absolute -top-0.5 left-1 text-[9px] text-slate-400">{i}</span>}
        </div>
      ))}
    </div>
  );
};
