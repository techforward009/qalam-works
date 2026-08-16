import React, { useEffect, useRef, useState } from "react";
import { calculateRulerMetrics, resolveVisualMarginOffsets, calculateInchTickPositions } from "../utils/rulerLayout";
import type { ResolvedPageLayout } from "../utils/pageLayout";

interface WordRulerProps {
  dir: "ltr" | "rtl";
  layout: ResolvedPageLayout;
}

/**
 * Purely VISUAL, read-only ruler above the editor, showing page width
 * and margins proportionally from the resolved page layout (A4/A5/
 * Letter, portrait/landscape, symmetric or asymmetric margins) — the
 * same geometry PDF/DOCX actually produce.
 *
 * NOT interactive: no dragging, no click-to-set-indent.
 */
export const WordRuler: React.FC<WordRulerProps> = ({ dir, layout }) => {
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

  const metrics = calculateRulerMetrics(containerWidth, layout, dir);
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
