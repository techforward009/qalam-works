import { snapStudioGuide } from "../utils/documentView";
import { mmToPx, type PhysicalMarginsMm } from "../utils/pageLayout";

/** Content box is black. The run from that box out to the page edge is the InPage grey connector. */
const BLACK = "1px solid #000000";
const GREY = "1px solid #c0c0c0";

export function MarginGuides({
  pageCount,
  pageWidthPx,
  pageHeightPx,
  gapPx,
  margins,
  zoom = 1,
}: {
  pageCount: number;
  pageWidthPx: number;
  pageHeightPx: number;
  gapPx: number;
  margins: PhysicalMarginsMm;
  zoom?:number;
}) {
  const top = snapStudioGuide(mmToPx(margins.topMm),zoom);
  const bottom = mmToPx(margins.bottomMm);
  const left = snapStudioGuide(mmToPx(margins.leftMm),zoom);
  const right = mmToPx(margins.rightMm);
  const yBottom = snapStudioGuide(pageHeightPx - bottom,zoom);
  const xRight = snapStudioGuide(pageWidthPx - right,zoom);
  const pages = Math.max(1, pageCount);

  return (
    <div className="studio-no-print pointer-events-none absolute inset-0 z-[4]" data-studio-margin-guides="true" aria-hidden>
      {Array.from({ length: pages }, (_, index) => {
        const origin = snapStudioGuide(index * (pageHeightPx + gapPx),zoom);
        return (
          <div
            key={index}
            className="absolute"
            data-studio-margin-guide={index + 1}
            data-margin-top-px={String(Math.round(top))}
            data-margin-bottom-px={String(Math.round(bottom))}
            data-margin-left-px={String(Math.round(left))}
            data-margin-right-px={String(Math.round(right))}
            data-margin-cross="page"
            style={{ top: origin, left: 0, width: pageWidthPx, height: pageHeightPx }}
          >
            <div data-studio-margin-line="top" className="absolute" style={{ left, width: Math.max(0, xRight - left), top, height: 0, borderTop: BLACK }} />
            <div data-studio-margin-edge="top-left" className="absolute" style={{ left: 0, width: left, top, height: 0, borderTop: GREY }} />
            <div data-studio-margin-edge="top-right" className="absolute" style={{ left: xRight, width: Math.max(0, pageWidthPx - xRight), top, height: 0, borderTop: GREY }} />
            <div data-studio-margin-line="bottom" className="absolute" style={{ left, width: Math.max(0, xRight - left), top: yBottom, height: 0, borderTop: BLACK }} />
            <div data-studio-margin-edge="bottom-left" className="absolute" style={{ left: 0, width: left, top: yBottom, height: 0, borderTop: GREY }} />
            <div data-studio-margin-edge="bottom-right" className="absolute" style={{ left: xRight, width: Math.max(0, pageWidthPx - xRight), top: yBottom, height: 0, borderTop: GREY }} />
            <div data-studio-margin-line="left" className="absolute" style={{ top, height: Math.max(0, yBottom - top), left, width: 0, borderLeft: BLACK }} />
            <div data-studio-margin-edge="left-top" className="absolute" style={{ top: 0, height: top, left, width: 0, borderLeft: GREY }} />
            <div data-studio-margin-edge="left-bottom" className="absolute" style={{ top: yBottom, height: Math.max(0, pageHeightPx - yBottom), left, width: 0, borderLeft: GREY }} />
            <div data-studio-margin-line="right" className="absolute" style={{ top, height: Math.max(0, yBottom - top), left: xRight, width: 0, borderLeft: BLACK }} />
            <div data-studio-margin-edge="right-top" className="absolute" style={{ top: 0, height: top, left: xRight, width: 0, borderLeft: GREY }} />
            <div data-studio-margin-edge="right-bottom" className="absolute" style={{ top: yBottom, height: Math.max(0, pageHeightPx - yBottom), left: xRight, width: 0, borderLeft: GREY }} />
          </div>
        );
      })}
    </div>
  );
}
