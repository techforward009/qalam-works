/** @vitest-environment happy-dom */

import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WordRuler } from "../app/tools/document-studio/components/WordRuler";
import DocumentCanvas from "../app/tools/document-studio/components/DocumentCanvas";
import { applyPhysicalPageMargin, clampMarginMm, MARGIN_MAX_MM, MARGIN_MIN_MM, resolvePageLayout } from "../app/tools/document-studio/utils/pageLayout";
import { defaultDocumentSettings } from "../app/tools/document-studio/utils/documentSettings";
import { documentPrintCss } from "../app/tools/document-studio/utils/documentView";
import { marginMmFromPointer, pointerOffsetToMm } from "../app/tools/document-studio/utils/rulerLayout";

afterEach(() => cleanup());

const layout = resolvePageLayout({ size: "a4", orientation: "portrait", marginPreset: "normal" });
const settings = defaultDocumentSettings();
const base = { topMm: 25.4, bottomMm: 25.4, startMm: 25.4, endMm: 25.4 };

function mockRect(el: Element, box: { left: number; top: number; width: number; height: number }) {
  vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
    ...box,
    right: box.left + box.width,
    bottom: box.top + box.height,
    x: box.left,
    y: box.top,
    toJSON() {
      return box;
    },
  } as DOMRect);
}

describe("physical margin mapping", () => {
  it("maps left/right drags onto existing logical margins without reversing paper geometry", () => {
    expect(applyPhysicalPageMargin(base, "ltr", "left", 40).startMm).toBe(40);
    expect(applyPhysicalPageMargin(base, "ltr", "right", 18).endMm).toBe(18);
    expect(applyPhysicalPageMargin(base, "rtl", "left", 40).endMm).toBe(40);
    expect(applyPhysicalPageMargin(base, "rtl", "right", 18).startMm).toBe(18);
    expect(applyPhysicalPageMargin(base, "ltr", "top", 12).topMm).toBe(12);
    expect(applyPhysicalPageMargin(base, "ltr", "bottom", 30).bottomMm).toBe(30);
  });

  it("clamps to the existing min/max margin range", () => {
    expect(applyPhysicalPageMargin(base, "ltr", "left", 0).startMm).toBe(MARGIN_MIN_MM);
    expect(applyPhysicalPageMargin(base, "ltr", "right", 999).endMm).toBe(MARGIN_MAX_MM);
    expect(clampMarginMm(2)).toBe(MARGIN_MIN_MM);
    expect(clampMarginMm(80)).toBe(MARGIN_MAX_MM);
  });

  it("converts pointer offsets to mm independently of zoom scale", () => {
    expect(pointerOffsetToMm(40, 210, 210)).toBeCloseTo(40);
    expect(pointerOffsetToMm(80, 420, 210)).toBeCloseTo(40);
    expect(marginMmFromPointer({ client: 40, origin: 0, lengthPx: 210, pageMm: 210 })).toBeCloseTo(40);
    expect(marginMmFromPointer({ client: 170, origin: 0, lengthPx: 210, pageMm: 210, fromEnd: true })).toBeCloseTo(40);
  });
});

describe("interactive WordRuler", () => {
  it("dragging horizontal left/right handles updates existing margin settings", () => {
    const onChange = vi.fn();
    const { container } = render(<WordRuler dir="ltr" layout={layout} axis="horizontal" onPhysicalMarginChange={onChange} />);
    const ruler = container.querySelector("[data-studio-ruler]") as HTMLElement;
    mockRect(ruler, { left: 0, top: 0, width: 210, height: 24 });
    const left = container.querySelector('[data-ruler-handle="left"]') as HTMLElement;
    const right = container.querySelector('[data-ruler-handle="right"]') as HTMLElement;
    fireEvent.pointerDown(left, { clientX: 40, pointerId: 1 });
    fireEvent.pointerMove(left, { clientX: 40, pointerId: 1 });
    fireEvent.pointerUp(left, { pointerId: 1 });
    fireEvent.pointerDown(right, { clientX: 170, pointerId: 2 });
    fireEvent.pointerUp(right, { pointerId: 2 });
    expect(onChange).toHaveBeenCalledWith("left", expect.any(Number));
    expect(onChange).toHaveBeenCalledWith("right", expect.any(Number));
    expect(applyPhysicalPageMargin(base, "ltr", "left", onChange.mock.calls[0][1]).startMm).toBeGreaterThan(0);
  });

  it("dragging vertical top/bottom handles updates existing top/bottom settings", () => {
    const onChange = vi.fn();
    const { container } = render(<WordRuler dir="ltr" layout={layout} axis="vertical" onPhysicalMarginChange={onChange} />);
    const ruler = container.querySelector("[data-studio-vertical-ruler]") as HTMLElement;
    mockRect(ruler, { left: 0, top: 0, width: 24, height: 297 });
    const top = container.querySelector('[data-ruler-handle="top"]') as HTMLElement;
    const bottom = container.querySelector('[data-ruler-handle="bottom"]') as HTMLElement;
    fireEvent.pointerDown(top, { clientY: 20, pointerId: 1 });
    fireEvent.pointerDown(bottom, { clientY: 250, pointerId: 2 });
    expect(onChange).toHaveBeenCalledWith("top", expect.any(Number));
    expect(onChange).toHaveBeenCalledWith("bottom", expect.any(Number));
  });

  it("persists as custom margins and updates page/print geometry", () => {
    const next = {
      preset: "custom" as const,
      ...applyPhysicalPageMargin(base, "ltr", "left", 40),
    };
    const updated = resolvePageLayout({
      size: "a4",
      orientation: "portrait",
      marginPreset: next.preset,
      customMargins: next,
    });
    expect(updated.margins.startMm).toBe(40);
    expect(updated.contentWidthMm).toBeCloseTo(210 - 40 - 25.4);
    const css = documentPrintCss(updated.widthMm, updated.heightMm);
    expect(css).toContain("size: 210mm 297mm");
    expect(updated.margins.startMm).not.toBe(layout.margins.startMm);
  });
});

describe("Pageless has no physical margin drag rulers", () => {
  it("does not expose handles in Pageless", () => {
    render(
      <DocumentCanvas
        editor={null}
        dir="ltr"
        isUr={false}
        isEditorEmpty={false}
        documentSettings={settings}
        pageLayout={layout}
        viewMode="pageless"
        onPhysicalMarginChange={vi.fn()}
        onLoadExample={vi.fn()}
        onWrapperClick={vi.fn()}
      />,
    );
    expect(document.querySelector("[data-ruler-handle]")).toBeNull();
    expect(document.querySelector("[data-studio-ruler]")).toBeNull();
    expect(document.querySelector("[data-studio-vertical-ruler]")).toBeNull();
  });
});
