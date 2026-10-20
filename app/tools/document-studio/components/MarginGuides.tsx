import { mmToPx, type PhysicalMarginsMm } from "../utils/pageLayout";

const LINE = "1px solid #c8ccd0";
const OVERSHOOT_PX = 5;
const CORNER_PX = 6;

/** Screen-only margin rectangle. Lines cross at the corners into small squares. */
export function MarginGuides({
  pageCount,
  pageWidthPx,
  pageHeightPx,
  gapPx,
  margins,
}: {
  pageCount: number;
  pageWidthPx: number;
  pageHeightPx: number;
  gapPx: number;
  margins: PhysicalMarginsMm;
}) {
  const top = mmToPx(margins.topMm);
  const bottom = mmToPx(margins.bottomMm);
  const left = mmToPx(margins.leftMm);
  const right = mmToPx(margins.rightMm);
  const yBottom = pageHeightPx - bottom;
  const xRight = pageWidthPx - right;
  const pages = Math.max(1, pageCount);

  return (
    <div className="studio-no-print pointer-events-none absolute inset-0 z-[4]" data-studio-margin-guides="true" aria-hidden>
      {Array.from({ length: pages }, (_, index) => {
        const origin = index * (pageHeightPx + gapPx);
        const corners = [
          ["top-left", left, top],
          ["top-right", xRight, top],
          ["bottom-left", left, yBottom],
          ["bottom-right", xRight, yBottom],
        ] as const;
        return (
          <div
            key={index}
            className="absolute"
            data-studio-margin-guide={index + 1}
            data-margin-top-px={String(Math.round(top))}
            data-margin-bottom-px={String(Math.round(bottom))}
            data-margin-left-px={String(Math.round(left))}
            data-margin-right-px={String(Math.round(right))}
            style={{ top: origin, left: 0, width: pageWidthPx, height: pageHeightPx }}
          >
            <div
              data-studio-margin-line="top"
              className="absolute"
              style={{ left: left - OVERSHOOT_PX, width: xRight - left + OVERSHOOT_PX * 2, top, height: 0, borderTop: LINE }}
            />
            <div
              data-studio-margin-line="bottom"
              className="absolute"
              style={{ left: left - OVERSHOOT_PX, width: xRight - left + OVERSHOOT_PX * 2, top: yBottom, height: 0, borderTop: LINE }}
            />
            <div
              data-studio-margin-line="left"
              className="absolute"
              style={{ top: top - OVERSHOOT_PX, height: yBottom - top + OVERSHOOT_PX * 2, left, width: 0, borderLeft: LINE }}
            />
            <div
              data-studio-margin-line="right"
              className="absolute"
              style={{ top: top - OVERSHOOT_PX, height: yBottom - top + OVERSHOOT_PX * 2, left: xRight, width: 0, borderLeft: LINE }}
            />
            {corners.map(([name, x, y]) => (
              <div
                key={name}
                data-studio-margin-corner={name}
                className="absolute box-border"
                style={{
                  left: x - CORNER_PX / 2,
                  top: y - CORNER_PX / 2,
                  width: CORNER_PX,
                  height: CORNER_PX,
                  border: LINE,
                }}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
