/** @vitest-environment happy-dom */

import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { WordRuler } from "../app/tools/document-studio/components/WordRuler";
import DocumentCanvas from "../app/tools/document-studio/components/DocumentCanvas";
import DocumentSettingsPanel from "../app/tools/document-studio/components/DocumentSettingsPanel";
import { applyPhysicalPageMargin, clampMarginMm, commitPhysicalMarginDrag, MARGIN_MAX_MM, MARGIN_MIN_MM, resolvePageLayout } from "../app/tools/document-studio/utils/pageLayout";
import { defaultDocumentSettings, type DocumentStudioSettings } from "../app/tools/document-studio/utils/documentSettings";
import { documentPrintCss, DEFAULT_RULER_UNIT, parseStoredRulerUnit, mountDocumentPrintPortal, unmountDocumentPrintPortal, RULER_PAGE_GUTTER_PX } from "../app/tools/document-studio/utils/documentView";
import { displayUnitToMm, formatMarginDisplay, marginMmFromPointer, pointerOffsetToMm } from "../app/tools/document-studio/utils/rulerLayout";

afterEach(() => cleanup());

const settings = defaultDocumentSettings();
const base = { topMm: 25.4, bottomMm: 25.4, startMm: 25.4, endMm: 25.4 };

function layoutFrom(margins: typeof base) {
  return resolvePageLayout({ size: "a4", orientation: "portrait", marginPreset: "custom", customMargins: margins });
}

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

function Harness({ axis }: { axis: "horizontal" | "vertical" }) {
  const [margins, setMargins] = useState({ ...base, preset: "normal" as "normal" | "custom" });
  const layout = layoutFrom(margins);
  return (
    <div>
      <span
        data-margin-start={margins.startMm}
        data-margin-end={margins.endMm}
        data-margin-top={margins.topMm}
        data-margin-bottom={margins.bottomMm}
        data-margin-preset={margins.preset}
      />
      <WordRuler
        dir="ltr"
        layout={layout}
        axis={axis}
        unit="cm"
        onPhysicalMarginChange={(edge, mm) => {
          setMargins((current) => commitPhysicalMarginDrag(current, "ltr", edge, mm));
        }}
      />
    </div>
  );
}

describe("physical margin mapping and units", () => {
  it("drag from Normal preset materializes Custom and changes the margin", () => {
    const normal = defaultDocumentSettings().page.margins;
    expect(normal.preset).toBe("normal");
    const next = commitPhysicalMarginDrag(normal, "ltr", "left", 40);
    expect(next.preset).toBe("custom");
    expect(next.startMm).toBe(40);
    expect(next.topMm).toBe(normal.topMm);
    const layout = resolvePageLayout({
      size: "a4",
      orientation: "portrait",
      marginPreset: next.preset,
      customMargins: next,
    });
    expect(layout.margins.startMm).toBe(40);
    expect(layout.contentWidthMm).toBeCloseTo(210 - 40 - next.endMm);
  });

  it("clamps and converts zoom-independent pointer offsets to mm", () => {
    expect(applyPhysicalPageMargin(base, "ltr", "left", 0).startMm).toBe(MARGIN_MIN_MM);
    expect(applyPhysicalPageMargin(base, "ltr", "right", 999).endMm).toBe(MARGIN_MAX_MM);
    expect(clampMarginMm(2)).toBe(MARGIN_MIN_MM);
    expect(pointerOffsetToMm(40, 210, 210)).toBeCloseTo(40);
    expect(pointerOffsetToMm(80, 420, 210)).toBeCloseTo(40);
    expect(marginMmFromPointer({ client: 40, origin: 0, lengthPx: 210, pageMm: 210 })).toBeCloseTo(40);
    expect(DEFAULT_RULER_UNIT).toBe("cm");
    expect(parseStoredRulerUnit(null)).toBe("cm");
    expect(parseStoredRulerUnit("in")).toBe("in");
  });

  it("switching cm/in does not alter physical millimetres", () => {
    const mm = 25.4;
    expect(displayUnitToMm(Number(formatMarginDisplay(mm, "cm")), "cm")).toBeCloseTo(mm, 0);
    expect(displayUnitToMm(Number(formatMarginDisplay(mm, "in")), "in")).toBeCloseTo(mm, 5);
  });
});

describe("interactive WordRuler drag updates actual settings", () => {
  it("left handle pointerDown/move/up changes startMm", () => {
    const { container } = render(<Harness axis="horizontal" />);
    const ruler = container.querySelector("[data-studio-ruler]") as HTMLElement;
    mockRect(ruler, { left: 0, top: 0, width: 210, height: 24 });
    fireEvent.pointerDown(container.querySelector('[data-ruler-handle="left"]') as HTMLElement, { clientX: 40, pointerId: 1 });
    fireEvent.pointerMove(window, { clientX: 40, pointerId: 1 });
    fireEvent.pointerUp(window, { pointerId: 1 });
    expect(Number(container.querySelector("[data-margin-start]")?.getAttribute("data-margin-start"))).toBe(40);
    expect(container.querySelector("[data-margin-preset]")?.getAttribute("data-margin-preset")).toBe("custom");
  });

  it("right handle changes endMm", () => {
    const { container } = render(<Harness axis="horizontal" />);
    mockRect(container.querySelector("[data-studio-ruler]") as HTMLElement, { left: 0, top: 0, width: 210, height: 24 });
    fireEvent.pointerDown(container.querySelector('[data-ruler-handle="right"]') as HTMLElement, { clientX: 170, pointerId: 1 });
    fireEvent.pointerMove(window, { clientX: 170, pointerId: 1 });
    fireEvent.pointerUp(window);
    expect(Number(container.querySelector("[data-margin-end]")?.getAttribute("data-margin-end"))).toBe(40);
  });

  it("top and bottom handles change topMm/bottomMm", () => {
    const { container } = render(<Harness axis="vertical" />);
    mockRect(container.querySelector("[data-studio-vertical-ruler]") as HTMLElement, { left: 0, top: 0, width: 24, height: 297 });
    fireEvent.pointerDown(container.querySelector('[data-ruler-handle="top"]') as HTMLElement, { clientY: 40, pointerId: 1 });
    fireEvent.pointerMove(window, { clientY: 40, pointerId: 1 });
    fireEvent.pointerUp(window);
    expect(Number(container.querySelector("[data-margin-top]")?.getAttribute("data-margin-top"))).toBe(40);
    fireEvent.pointerDown(container.querySelector('[data-ruler-handle="bottom"]') as HTMLElement, { clientY: 257, pointerId: 2 });
    fireEvent.pointerMove(window, { clientY: 257, pointerId: 2 });
    fireEvent.pointerUp(window);
    expect(Number(container.querySelector("[data-margin-bottom]")?.getAttribute("data-margin-bottom"))).toBe(40);
  });

  it("persists after re-render and updates page/print geometry", () => {
    const next = applyPhysicalPageMargin(base, "ltr", "left", 40);
    const updated = layoutFrom(next);
    const { container, rerender } = render(<WordRuler dir="ltr" layout={updated} axis="horizontal" unit="cm" onPhysicalMarginChange={vi.fn()} />);
    rerender(<WordRuler dir="ltr" layout={updated} axis="horizontal" unit="in" onPhysicalMarginChange={vi.fn()} />);
    expect(updated.margins.startMm).toBe(40);
    expect(updated.contentWidthMm).toBeCloseTo(210 - 40 - 25.4);
    expect(container.querySelector("[data-ruler-unit]")?.getAttribute("data-ruler-unit")).toBe("in");
    expect(documentPrintCss(updated.widthMm, updated.heightMm)).toContain("size: 210mm 297mm");
  });

  it("50% and 150% zoom keep 25mm as 25mm", () => {
    expect(pointerOffsetToMm(25, 105, 210)).toBeCloseTo(50);
    expect(pointerOffsetToMm(75, 315, 210)).toBeCloseTo(50);
    expect(marginMmFromPointer({ client: 50, origin: 0, lengthPx: 210, pageMm: 210 })).toBeCloseTo(50);
  });
});

describe("Page Setup unit display", () => {
  it("shows selected unit and converts inch input back to mm", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <DocumentSettingsPanel
        dir="ltr"
        isUr={false}
        pageLayout={layoutFrom(base)}
        documentSettings={settings}
        setDocumentSettings={onChange}
        selectedPresetId="default"
        onPresetChange={vi.fn()}
        onPageChange={vi.fn()}
        rulerUnit="cm"
        setRulerUnit={vi.fn()}
      />,
    );
    expect((document.querySelector("[data-page-setup-unit]") as HTMLSelectElement).value).toBe("cm");
    expect((document.querySelector('[data-margin-field="topMm"]') as HTMLInputElement).value).toBe(formatMarginDisplay(25.4, "cm"));
    rerender(
      <DocumentSettingsPanel
        dir="ltr"
        isUr={false}
        pageLayout={layoutFrom(base)}
        documentSettings={settings}
        setDocumentSettings={onChange}
        selectedPresetId="default"
        onPresetChange={vi.fn()}
        onPageChange={vi.fn()}
        rulerUnit="in"
        setRulerUnit={vi.fn()}
      />,
    );
    expect((document.querySelector('[data-margin-field="topMm"]') as HTMLInputElement).value).toBe("1");
    fireEvent.change(document.querySelector('[data-margin-field="topMm"]') as HTMLInputElement, { target: { value: "0.75" } });
    const updater = onChange.mock.calls[0][0] as (s: DocumentStudioSettings) => DocumentStudioSettings;
    expect(updater(settings).page.margins.topMm).toBeCloseTo(19.05);
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
        pageLayout={layoutFrom(base)}
        viewMode="pageless"
        onPhysicalMarginChange={vi.fn()}
        onLoadExample={vi.fn()}
        onWrapperClick={vi.fn()}
      />,
    );
    expect(document.querySelector("[data-ruler-handle]")).toBeNull();
    expect(document.querySelector("[data-studio-ruler]")).toBeNull();
  });
});

describe("print portal isolation", () => {
  it("mounts a body-level document-only print surface using physical mm", () => {
    document.body.innerHTML = `
      <header>site header</header>
      <footer>site footer</footer>
      <div data-studio-print-root data-print-page-width-mm="210" data-print-page-height-mm="297" data-print-margin-top-mm="25.4" data-print-margin-bottom-mm="25.4" data-print-margin-left-mm="25.4" data-print-margin-right-mm="25.4" data-print-dir="rtl">
        <div data-studio-print-surface><div class="qalam-editor-content" dir="rtl">یہ متن</div></div>
      </div>
    `;
    const portal = mountDocumentPrintPortal();
    expect(portal?.parentElement).toBe(document.body);
    expect(portal?.getAttribute("data-print-page-width-mm")).toBe("210");
    expect(portal?.getAttribute("data-print-ignores-zoom")).toBe("true");
    expect(portal?.querySelector("[data-studio-print-page]")?.getAttribute("dir")).toBe("rtl");
    expect(portal?.innerHTML).toContain("یہ متن");
    expect(portal?.querySelector("style")?.textContent).toContain("body > *:not([data-studio-print-portal])");
    expect(portal?.querySelector("style")?.textContent).toContain("break-after: auto");
    unmountDocumentPrintPortal();
    expect(document.querySelector("[data-studio-print-portal]")).toBeNull();
  });
});

describe("ruler gutter", () => {
  it("is presentation-only and does not change physical page millimetres", () => {
    expect(RULER_PAGE_GUTTER_PX).toBeGreaterThanOrEqual(6);
    expect(RULER_PAGE_GUTTER_PX).toBeLessThanOrEqual(8);
    const layout = layoutFrom(base);
    expect(layout.widthMm).toBe(210);
    expect(layout.heightMm).toBe(297);
  });
});
