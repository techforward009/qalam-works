/**
 * Editor-only overflow for text frames. Multiline boxes stay top-anchored and
 * clip below the box. RTL single-line boxes stay start-anchored (the right
 * edge) and clip on the left. The mark is screen UI:
 * data-studio-frame-overflow="bottom" | "start". It is not document text,
 * not QPG, and not print.
 */

export type FrameOverflowEdge = "bottom" | "start";

export const FRAME_OVERFLOW_STRIPE_PX = 5;
export const FRAME_OVERFLOW_COLOR = "#ff0000";
/** Horizontal dash inside the left border. Not a vertical bar and not full width. */
export const FRAME_OVERFLOW_START_WIDTH_PX = 40;
const FRAME_OVERFLOW_SLOP_PX = 2;

export interface FrameOverflowMetrics {
  singleLine: boolean;
  scrollHeight: number;
  clientHeight: number;
  scrollWidth: number;
  clientWidth: number;
}

export interface AxisBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface FrameOverflowMarkStyle {
  position: "absolute";
  background: string;
  pointerEvents: "none";
  zIndex: number;
  height: number;
  left: number;
  right?: number;
  bottom: number;
  width?: number;
}

/** Content vs the visible box. Line counts are not a substitute for layout. */
export function frameOverflowEdge(metrics: FrameOverflowMetrics): FrameOverflowEdge | null {
  if (!(metrics.clientWidth > 0) || !(metrics.clientHeight > 0)) return null;
  if (metrics.singleLine) {
    return metrics.scrollWidth > metrics.clientWidth + FRAME_OVERFLOW_SLOP_PX ? "start" : null;
  }
  return metrics.scrollHeight > metrics.clientHeight + FRAME_OVERFLOW_SLOP_PX ? "bottom" : null;
}

/**
 * Chromium pins an RTL field's inline start (right edge) at scrollLeft 0.
 * Negative scrollLeft moves toward the clipped left. Multiline boxes pin both
 * axes at 0 so the first line stays at the top.
 */
export function rtlStartScrollLeft(): number {
  return 0;
}

export function pinFrameScroll(el: { scrollTop: number; scrollLeft: number }, singleLine: boolean): void {
  if (el.scrollTop !== 0) el.scrollTop = 0;
  const left = singleLine ? rtlStartScrollLeft() : 0;
  if (el.scrollLeft !== left) el.scrollLeft = left;
}

export function frameContentBox(clientWidth: number, clientHeight: number, borderTop: number, borderLeft: number): AxisBox {
  return {
    left: borderLeft,
    top: borderTop,
    right: borderLeft + clientWidth,
    bottom: borderTop + clientHeight,
  };
}

/** True when the caret sits in clipped overflow and must not be painted. */
export function caretInClippedOverflow(
  caret: { left: number; top: number; width: number; height: number },
  visible: AxisBox,
): boolean {
  const slop = 1;
  if (caret.top >= visible.bottom - slop) return true;
  if (caret.top + caret.height <= visible.top + slop) return true;
  if (caret.left + caret.width <= visible.left + slop) return true;
  return false;
}

export function frameOverflowMarkStyle(edge: FrameOverflowEdge): FrameOverflowMarkStyle {
  const shared: FrameOverflowMarkStyle = {
    position: "absolute",
    background: FRAME_OVERFLOW_COLOR,
    pointerEvents: "none",
    zIndex: 5,
    height: FRAME_OVERFLOW_STRIPE_PX,
    left: 1,
    bottom: 1,
  };
  if (edge === "bottom") return { ...shared, right: 1 };
  return { ...shared, width: FRAME_OVERFLOW_START_WIDTH_PX };
}

/** Defeat native caret reveal. Reset on scroll, keys, input, selection, and focus.
 * Caret reveal also scrolls the document scroller when the field itself cannot
 * move. Hold that scroller at the position from the start of the edit. */
export function bindFrameScrollLock(el: HTMLElement, singleLine: boolean): () => void {
  const scroller = el.closest<HTMLElement>("[data-studio-scroller]");
  let raf = 0;
  let pinning = false;
  let holdPage = false;
  let pageLeft = 0;
  let pageTop = 0;
  let release = 0;
  const pin = () => {
    if (pinning) return;
    pinning = true;
    try {
      pinFrameScroll(el, singleLine);
    } finally {
      pinning = false;
    }
  };
  const snapshotPage = () => {
    if (!scroller || holdPage) return;
    pageLeft = scroller.scrollLeft;
    pageTop = scroller.scrollTop;
    holdPage = true;
    window.clearTimeout(release);
    release = window.setTimeout(() => { holdPage = false; }, 120);
  };
  const restorePage = () => {
    if (!scroller || !holdPage) return;
    if (scroller.scrollLeft !== pageLeft) scroller.scrollLeft = pageLeft;
    if (scroller.scrollTop !== pageTop) scroller.scrollTop = pageTop;
  };
  const pinSoon = () => {
    pin();
    restorePage();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      pin();
      restorePage();
    });
  };
  const onEdit = () => {
    snapshotPage();
    pinSoon();
  };
  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    snapshotPage();
    pinSoon();
  };
  const onSelection = () => {
    const active = document.activeElement;
    if (active === el || (active instanceof Node && el.contains(active))) pinSoon();
  };
  const onPageScroll = () => { restorePage(); };
  const capture: AddEventListenerOptions = { capture: true };
  el.addEventListener("scroll", pinSoon, capture);
  el.addEventListener("wheel", onWheel, { passive: false, capture: true });
  el.addEventListener("keydown", onEdit, capture);
  el.addEventListener("keyup", pinSoon, capture);
  el.addEventListener("beforeinput", onEdit, capture);
  el.addEventListener("input", pinSoon, capture);
  el.addEventListener("select", pinSoon, capture);
  el.addEventListener("focus", onEdit, capture);
  document.addEventListener("selectionchange", onSelection);
  scroller?.addEventListener("scroll", onPageScroll, true);
  pin();
  return () => {
    cancelAnimationFrame(raf);
    window.clearTimeout(release);
    el.removeEventListener("scroll", pinSoon, capture);
    el.removeEventListener("wheel", onWheel, { capture: true });
    el.removeEventListener("keydown", onEdit, capture);
    el.removeEventListener("keyup", pinSoon, capture);
    el.removeEventListener("beforeinput", onEdit, capture);
    el.removeEventListener("input", pinSoon, capture);
    el.removeEventListener("select", pinSoon, capture);
    el.removeEventListener("focus", onEdit, capture);
    document.removeEventListener("selectionchange", onSelection);
    scroller?.removeEventListener("scroll", onPageScroll, true);
  };
}
