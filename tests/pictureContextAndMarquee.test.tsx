/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import DocumentCanvas from "../app/tools/document-studio/components/DocumentCanvas";
import { defaultDocumentSettings } from "../app/tools/document-studio/utils/documentSettings";
import { resolvePageLayout } from "../app/tools/document-studio/utils/pageLayout";
import { StudioPictureContextMenu } from "../app/tools/document-studio/components/StudioPictureContextMenu";
import { marqueeSelectedFrameIds, StudioObjectLayer, type StudioFrame } from "../app/tools/document-studio/components/StudioObjectLayer";
import DocumentMenuBar from "../app/tools/document-studio/components/DocumentMenuBar";
import { facingSlot, pageProjection } from "../app/tools/document-studio/utils/facingPages";
import { pictureContextItems } from "../app/tools/document-studio/utils/pictureContextMenu";
import { cloneCopiedFramesForPaste, copyFramesToClipboard, clearPictureFromFrame, pasteImageFromCopiedFrames } from "../app/tools/document-studio/utils/pictureClipboard";
import { useStudioZoomVisibility } from "../app/tools/document-studio/components/useStudioZoomVisibility";
import { useRef } from "react";

const LAYER_BOX = {
  pageCount: 1,
  pageWidthPx: 794,
  pageHeightPx: 1123,
  gapPx: 24,
  marginTopPx: 72,
  marginRightPx: 72,
};

const PX_PER_MM = 96 / 25.4;

function makeFrame(id: string, xMm: number, yMm: number, wMm = 20, hMm = 20): StudioFrame {
  return {
    id,
    kind: "picture-rect",
    page: 1,
    xMm,
    yMm,
    wMm,
    hMm,
    flip: false,
    text: "",
  };
}

describe("Picture context menus (Hand and Arrow)", () => {
  afterEach(() => {
    cleanup();
    delete (window as Window & { __studioPictureContextRequest?: unknown }).__studioPictureContextRequest;
  });

  it("opens Hand tool picture context menu with exact items in order and runs actions", () => {
    const onZoom = vi.fn();
    const onAction = vi.fn();
    const frames = [makeFrame("pic-1", 10, 10)];

    const { container } = render(
      <div>
        <StudioObjectLayer
          editor={null}
          tool="text"
          frames={frames}
          onFramesChange={() => {}}
          onToolAction={() => {}}
          {...LAYER_BOX}
        />
        <StudioPictureContextMenu toolMode="hand" onZoom={onZoom} onAction={onAction} />
      </div>,
    );

    const frameEl = container.querySelector('[data-studio-frame-id="pic-1"]') as HTMLElement;
    const evt = new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 120, clientY: 140 });
    fireEvent(frameEl, evt);
    expect(evt.defaultPrevented).toBe(true);

    const menu = document.querySelector('[data-studio-picture-menu="hand"]') as HTMLElement;
    expect(menu).toBeTruthy();
    const labels = [...menu.querySelectorAll('[role="menuitem"]')].map((el) => el.textContent?.replace("▸", "").trim());
    expect(labels).toEqual(pictureContextItems("hand").map((item) => item.label));
    expect(labels).toEqual(["Zoom", "Import Picture…", "Select All", "Cut", "Copy", "Clear", "Paste"]);

    // Zoom submenu
    fireEvent.click(screen.getByRole("menuitem", { name: /Zoom/ }));
    const zoomMenu = document.querySelector("[data-studio-picture-context-zoom]") as HTMLElement;
    expect(zoomMenu).toBeTruthy();
    fireEvent.click(screen.getByRole("menuitem", { name: "200%" }));
    expect(onZoom).toHaveBeenCalledWith(200);

    // Reopen and test Import Picture…
    fireEvent.contextMenu(frameEl, { clientX: 120, clientY: 140 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Import Picture…" }));
    expect(onAction).toHaveBeenCalledWith("importPicture", "pic-1", "hand");

    // Reopen and test Escape dismissal
    fireEvent.contextMenu(frameEl, { clientX: 120, clientY: 140 });
    const reopened = document.querySelector('[data-studio-picture-menu="hand"]') as HTMLElement;
    fireEvent.keyDown(reopened, { key: "Escape" });
    expect(document.querySelector('[data-studio-picture-menu="hand"]')).toBeNull();
  });

  it("opens Arrow tool picture context menu with exact items in order and preserves multi-selection", () => {
    const onZoom = vi.fn();
    const onAction = vi.fn();
    const onSelectedChange = vi.fn();
    const frames = [makeFrame("pic-1", 10, 10), makeFrame("pic-2", 40, 10), makeFrame("pic-3", 70, 10)];

    const { container } = render(
      <div>
        <StudioObjectLayer
          editor={null}
          tool="select"
          frames={frames}
          selectedIds={["pic-1", "pic-2"]}
          onSelectedChange={onSelectedChange}
          onFramesChange={() => {}}
          onToolAction={() => {}}
          {...LAYER_BOX}
        />
        <StudioPictureContextMenu toolMode="arrow" onZoom={onZoom} onAction={onAction} />
      </div>,
    );

    // Right-clicking pic-2 (already in multi-selection) preserves ["pic-1", "pic-2"]
    onSelectedChange.mockClear();
    const pic2 = container.querySelector('[data-studio-frame-id="pic-2"]') as HTMLElement;
    fireEvent.contextMenu(pic2, { clientX: 160, clientY: 120 });
    expect(onSelectedChange).not.toHaveBeenCalledWith(["pic-2"]);

    const menu = document.querySelector('[data-studio-picture-menu="arrow"]') as HTMLElement;
    expect(menu).toBeTruthy();
    const labels = [...menu.querySelectorAll('[role="menuitem"]')].map((el) => el.textContent?.replace("▸", "").trim());
    expect(labels).toEqual(pictureContextItems("arrow").map((item) => item.label));
    expect(labels).toEqual(["Zoom", "Select All", "Cut", "Copy", "Clear", "Object…"]);

    fireEvent.click(screen.getByRole("menuitem", { name: "Object…" }));
    expect(onAction).toHaveBeenCalledWith("object", "pic-2", "arrow");

    // Right-clicking pic-3 (not in selection) selects ["pic-3"]
    const pic3 = container.querySelector('[data-studio-frame-id="pic-3"]') as HTMLElement;
    fireEvent.contextMenu(pic3, { clientX: 260, clientY: 120 });
    expect(onSelectedChange).toHaveBeenCalledWith(["pic-3"]);
  });
});

describe("Marquee selection in Arrow/Select mode", () => {
  afterEach(() => cleanup());

  function MarqueeHarness({ frames, zoom = 1, initialSelected = [] }: { frames: StudioFrame[]; zoom?: number; initialSelected?: string[] }) {
    const [selected, setSelected] = useState<string[]>(initialSelected);
    return (
      <div data-selected={selected.join(",")}>
        <StudioObjectLayer
          editor={null}
          tool="select"
          frames={frames}
          selectedIds={selected}
          onSelectedChange={setSelected}
          onFramesChange={() => {}}
          onToolAction={() => {}}
          zoom={zoom}
          {...LAYER_BOX}
        />
      </div>
    );
  }

  it("selects only enclosed frames when dragging left-to-right, and intersected frames when dragging right-to-left", () => {
    // a: [10..30]mm, b: [40..60]mm
    const frames = [makeFrame("a", 10, 10, 20, 20), makeFrame("b", 40, 10, 20, 20)];
    const { container } = render(<MarqueeHarness frames={frames} />);
    const layer = container.querySelector("[data-studio-objects]") as HTMLElement;
    const host = container.firstElementChild as HTMLElement;

    // Left-to-right from 5mm to 50mm: encloses "a" [10..30], only intersects "b" [40..60]
    fireEvent.pointerDown(layer, { clientX: 5 * PX_PER_MM, clientY: 5 * PX_PER_MM, pointerId: 1, button: 0 });
    fireEvent.pointerMove(layer, { clientX: 50 * PX_PER_MM, clientY: 35 * PX_PER_MM, pointerId: 1 });
    expect(container.querySelector('[data-studio-marquee="true"]')).toBeTruthy();
    fireEvent.pointerUp(layer, { clientX: 50 * PX_PER_MM, clientY: 35 * PX_PER_MM, pointerId: 1 });
    expect(host.dataset.selected).toBe("a");
    expect(container.querySelectorAll('[data-studio-frame-id="a"] [data-studio-frame-handle]')).toHaveLength(8);
    expect(container.querySelectorAll('[data-studio-frame-id="b"] [data-studio-frame-handle]')).toHaveLength(0);

    // Right-to-left from 50mm to 20mm: intersects both "a" and "b"
    fireEvent.pointerDown(layer, { clientX: 50 * PX_PER_MM, clientY: 5 * PX_PER_MM, pointerId: 2, button: 0 });
    fireEvent.pointerMove(layer, { clientX: 20 * PX_PER_MM, clientY: 35 * PX_PER_MM, pointerId: 2 });
    fireEvent.pointerUp(layer, { clientX: 20 * PX_PER_MM, clientY: 35 * PX_PER_MM, pointerId: 2 });
    expect(host.dataset.selected).toBe("a,b");
  });

  it("supports Shift-based additive/toggle marquee selection and zoom scaling, and does not start marquee on frame drag", () => {
    const frames = [makeFrame("a", 10, 10, 20, 20), makeFrame("b", 40, 10, 20, 20)];
    const { container } = render(<MarqueeHarness frames={frames} zoom={2} initialSelected={["a"]} />);
    const layer = container.querySelector("[data-studio-objects]") as HTMLElement;
    const host = container.firstElementChild as HTMLElement;

    // Shift-marquee enclosing "b" at zoom=2 adds "b" to ["a"]
    fireEvent.pointerDown(layer, { clientX: 35 * PX_PER_MM * 2, clientY: 5 * PX_PER_MM * 2, pointerId: 3, button: 0, shiftKey: true });
    fireEvent.pointerMove(layer, { clientX: 65 * PX_PER_MM * 2, clientY: 35 * PX_PER_MM * 2, pointerId: 3, shiftKey: true });
    fireEvent.pointerUp(layer, { clientX: 65 * PX_PER_MM * 2, clientY: 35 * PX_PER_MM * 2, pointerId: 3, shiftKey: true });
    expect(host.dataset.selected).toBe("a,b");

    // PointerDown on frame "a" must not start a marquee
    const frameA = container.querySelector('[data-studio-frame-id="a"]') as HTMLElement;
    fireEvent.pointerDown(frameA, { clientX: 15 * PX_PER_MM * 2, clientY: 15 * PX_PER_MM * 2, pointerId: 4, button: 0 });
    fireEvent.pointerMove(layer, { clientX: 25 * PX_PER_MM * 2, clientY: 25 * PX_PER_MM * 2, pointerId: 4 });
    expect(container.querySelector('[data-studio-marquee="true"]')).toBeNull();
    fireEvent.pointerUp(layer, { clientX: 25 * PX_PER_MM * 2, clientY: 25 * PX_PER_MM * 2, pointerId: 4 });
  });
});

describe("Picture clipboard integration (Arrow Copy/Cut -> Hand Paste)", () => {
  afterEach(() => cleanup());

  it("pastes image content from an Arrow-copied picture box into a target picture box in Hand mode, and clones empty cut frames", () => {
    const srcImg = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const source: StudioFrame = {
      ...makeFrame("src", 10, 10, 40, 20),
      imageSrc: srcImg,
      imageNaturalW: 300,
      imageNaturalH: 200,
      imageXMm: 5,
      imageYMm: 0,
      imageWMm: 30,
      imageHMm: 20,
    };
    const target = makeFrame("dst", 60, 20, 30, 30);

    const copied = copyFramesToClipboard([source]);
    const pasted = pasteImageFromCopiedFrames(target, copied);
    expect(pasted).toBeTruthy();
    expect(pasted?.id).toBe("dst");
    expect(pasted?.xMm).toBe(60);
    expect(pasted?.yMm).toBe(20);
    expect(pasted?.wMm).toBe(30);
    expect(pasted?.hMm).toBe(30);
    expect(pasted?.imageSrc).toBe(srcImg);
    expect(pasted?.imageNaturalW).toBe(300);
    expect(pasted?.imageNaturalH).toBe(200);
    // 300x200 into 30x30 box -> fits width 30mm, height 20mm, y=5mm
    expect(pasted?.imageWMm).toBeCloseTo(30);
    expect(pasted?.imageHMm).toBeCloseTo(20);
    expect(pasted?.imageXMm).toBeCloseTo(0);
    expect(pasted?.imageYMm).toBeCloseTo(5);

    // Empty frame cut -> paste clones the frame with a new id and offset
    const emptyCopied = copyFramesToClipboard([target]);
    expect(pasteImageFromCopiedFrames(target, emptyCopied)).toBeNull();
    const clones = cloneCopiedFramesForPaste(emptyCopied, () => "clone-1");
    expect(clones).toHaveLength(1);
    expect(clones[0]).toMatchObject({ id: "clone-1", xMm: 65, yMm: 25, wMm: 30, hMm: 30 });
  });

  it("supports switching from Arrow Copy/Cut to Hand Paste and Arrow Select All across tools", () => {
    const srcImg = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const initial: StudioFrame[] = [
      { ...makeFrame("pic-1", 10, 10, 40, 20), imageSrc: srcImg, imageNaturalW: 300, imageNaturalH: 200 },
      makeFrame("pic-2", 60, 10, 30, 30),
    ];

    function ToolSwitchClipboardHarness() {
      const [tool, setTool] = useState<"select" | "text">("select");
      const [frames, setFrames] = useState<StudioFrame[]>(initial);
      const [selected, setSelected] = useState<string[]>([]);
      const [clipboard, setClipboard] = useState<StudioFrame[]>([]);
      return (
        <div data-selected={selected.join(",")} data-pic2-img={frames[1]?.imageSrc ?? ""}>
          <button type="button" data-switch-hand onClick={() => setTool("text")}>Hand</button>
          <StudioObjectLayer
            editor={null}
            tool={tool}
            frames={frames}
            selectedIds={selected}
            onSelectedChange={setSelected}
            onFramesChange={setFrames}
            onToolAction={() => {}}
            {...LAYER_BOX}
          />
          <StudioPictureContextMenu
            toolMode={tool === "select" ? "arrow" : "hand"}
            onZoom={() => {}}
            onAction={(id, frameId, mode) => {
              if (id === "selectAll" && mode === "arrow") {
                setSelected(frames.map((f) => f.id));
                return;
              }
              if (id === "copy" || id === "cut") {
                const targetIds = selected.includes(frameId) ? selected : [frameId];
                setClipboard(copyFramesToClipboard(frames.filter((f) => targetIds.includes(f.id))));
                if (id === "cut") {
                  setFrames((prev) => prev.filter((f) => !targetIds.includes(f.id)));
                  setSelected([]);
                }
                return;
              }
              if (id === "paste" && clipboard.length > 0) {
                const target = frames.find((f) => f.id === frameId);
                if (!target) return;
                const updated = pasteImageFromCopiedFrames(target, clipboard);
                if (updated) setFrames((prev) => prev.map((f) => (f.id === frameId ? updated : f)));
              }
            }}
          />
        </div>
      );
    }

    const { container } = render(<ToolSwitchClipboardHarness />);
    const host = container.firstElementChild as HTMLElement;

    // In Arrow mode: right-click pic-1 -> Copy
    fireEvent.contextMenu(container.querySelector('[data-studio-frame-id="pic-1"]') as HTMLElement, { clientX: 50, clientY: 50 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Copy" }));

    // In Arrow mode: right-click pic-1 -> Select All selects both frames
    fireEvent.contextMenu(container.querySelector('[data-studio-frame-id="pic-1"]') as HTMLElement, { clientX: 50, clientY: 50 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Select All" }));
    expect(host.dataset.selected).toBe("pic-1,pic-2");

    // Switch to Hand mode: right-click pic-2 -> Paste
    fireEvent.click(container.querySelector("[data-switch-hand]") as HTMLElement);
    fireEvent.contextMenu(container.querySelector('[data-studio-frame-id="pic-2"]') as HTMLElement, { clientX: 250, clientY: 50 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Paste" }));
    expect(host.dataset.pic2Img).toBe(srcImg);
  });
});

describe("Pasteboard marquee, facing-page selection, InPage menu visuals, and top-level Edit menu", () => {
  afterEach(() => cleanup());

  it("starts marquee selection from real DocumentCanvas pasteboard across boundaries, handles pointer capture/cancel, Shift toggle, Hand non-interference, and facing pages", () => {
    const p1 = makeFrame("p1", 10, 10, 20, 20);
    const p2 = makeFrame("p2", 80, 10, 30, 20);
    const layout = resolvePageLayout({ size: "a4", orientation: "portrait", marginPreset: "normal" });
    const settings = defaultDocumentSettings();

    function CanvasHost({
      viewMode = "pages",
      minimumPages = 1,
      tool = "select",
      initialFrames,
    }: {
      viewMode?: "pages" | "facing";
      minimumPages?: number;
      tool?: "select" | "hand";
      initialFrames: StudioFrame[];
    }) {
      const [frames, setFrames] = useState(initialFrames);
      const [selected, setSelected] = useState<string[]>([]);
      const [currentTool, setCurrentTool] = useState(tool);
      return (
        <div data-selected={selected.join(",")}>
          <button type="button" data-testid="switch-hand" onClick={() => setCurrentTool("hand")} />
          <DocumentCanvas
            editor={null}
            dir="ltr"
            isUr={false}
            isEditorEmpty={false}
            documentSettings={settings}
            pageLayout={layout}
            viewMode={viewMode}
            minimumPages={minimumPages}
            zoom={100}
            tool={currentTool}
            frames={frames}
            onFramesChange={setFrames}
            selectedFrameIds={selected}
            onSelectedFramesChange={setSelected}
            onLoadExample={() => {}}
            onWrapperClick={() => {}}
          />
        </div>
      );
    }

    const { container } = render(<CanvasHost initialFrames={[p1, p2]} />);
    const scroller = container.querySelector('[data-studio-scroller="true"]') as HTMLElement;
    const zoomSurface = container.querySelector('[data-studio-zoom-surface="true"]') as HTMLElement;
    const objects = container.querySelector("[data-studio-objects]") as HTMLElement;
    const a4W = (210 * 96) / 25.4;
    const a4H = (297 * 96) / 25.4;
    const pageRect = { left: 100, top: 40, width: a4W, height: a4H, right: 100 + a4W, bottom: 40 + a4H, x: 100, y: 40, toJSON: () => ({}) };
    zoomSurface.getBoundingClientRect = () => pageRect;
    objects.getBoundingClientRect = () => pageRect;

    const captures = new Set<number>();
    const setPointerCapture = vi.fn((id: number) => captures.add(id));
    const hasPointerCapture = vi.fn((id: number) => captures.has(id));
    const releasePointerCapture = vi.fn((id: number) => captures.delete(id));
    scroller.setPointerCapture = setPointerCapture;
    scroller.hasPointerCapture = hasPointerCapture;
    scroller.releasePointerCapture = releasePointerCapture;

    // 1. L->R enclosed drag starting in top-left pasteboard (20, 10) across page boundary encloses p1 only
    fireEvent.pointerDown(scroller, { clientX: 20, clientY: 10, pointerId: 1, button: 0 });
    expect(setPointerCapture).toHaveBeenCalledWith(1);
    fireEvent.pointerMove(scroller, { clientX: 100 + 35 * PX_PER_MM, clientY: 40 + 35 * PX_PER_MM, pointerId: 1 });
    expect(container.querySelector('[data-studio-marquee="true"]')).toBeTruthy();
    fireEvent.pointerUp(scroller, { clientX: 100 + 35 * PX_PER_MM, clientY: 40 + 35 * PX_PER_MM, pointerId: 1 });
    expect(releasePointerCapture).toHaveBeenCalledWith(1);
    expect(container.querySelector('[data-studio-marquee="true"]')).toBeNull();
    expect((container.firstElementChild as HTMLElement).dataset.selected).toBe("p1");

    // 2. R->L intersecting Shift-drag from right pasteboard partially intersecting p2 adds p2 without losing p1
    fireEvent.pointerDown(scroller, { clientX: 920, clientY: 40 + 20 * PX_PER_MM, pointerId: 2, button: 0, shiftKey: true });
    fireEvent.pointerMove(scroller, { clientX: 100 + 100 * PX_PER_MM, clientY: 40 + 5 * PX_PER_MM, pointerId: 2, shiftKey: true });
    fireEvent.pointerUp(scroller, { clientX: 100 + 100 * PX_PER_MM, clientY: 40 + 5 * PX_PER_MM, pointerId: 2, shiftKey: true });
    expect((container.firstElementChild as HTMLElement).dataset.selected).toBe("p1,p2");

    // 3. Shift-pointerCancel keeps existing selection while dismissing marquee; non-Shift lostpointercapture aborts across p1 without selecting p1
    fireEvent.pointerDown(scroller, { clientX: 15, clientY: 15, pointerId: 3, button: 0, shiftKey: true });
    fireEvent.pointerMove(scroller, { clientX: 50, clientY: 50, pointerId: 3, shiftKey: true });
    expect(container.querySelector('[data-studio-marquee="true"]')).toBeTruthy();
    fireEvent.pointerCancel(scroller, { pointerId: 3 });
    expect(container.querySelector('[data-studio-marquee="true"]')).toBeNull();
    expect((container.firstElementChild as HTMLElement).dataset.selected).toBe("p1,p2");

    fireEvent.pointerDown(scroller, { clientX: 15, clientY: 15, pointerId: 4, button: 0 });
    fireEvent.pointerMove(scroller, { clientX: 100 + 35 * PX_PER_MM, clientY: 40 + 35 * PX_PER_MM, pointerId: 4 });
    expect(container.querySelector('[data-studio-marquee="true"]')).toBeTruthy();
    fireEvent(scroller, new Event("lostpointercapture", { bubbles: true }));
    expect(container.querySelector('[data-studio-marquee="true"]')).toBeNull();
    expect((container.firstElementChild as HTMLElement).dataset.selected).toBe("");

    // 4. Hand tool drag on scroller pans instead of opening marquee
    fireEvent.click(screen.getByTestId("switch-hand"));
    scroller.scrollLeft = 50;
    scroller.scrollTop = 60;
    fireEvent.pointerDown(scroller, { clientX: 200, clientY: 200, pointerId: 5, button: 0 });
    fireEvent.pointerMove(scroller, { clientX: 170, clientY: 160, pointerId: 5 });
    expect(container.querySelector('[data-studio-marquee="true"]')).toBeNull();
    expect(scroller.scrollLeft).toBe(80);
    expect(scroller.scrollTop).toBe(100);
    fireEvent.pointerUp(scroller, { clientX: 170, clientY: 160, pointerId: 5 });

    cleanup();

    // 5. Real DocumentCanvas facing-page spread pasteboard marquee across page 1 and page 2
    const f1 = makeFrame("fp1", 10, 10, 20, 20);
    const f2 = { ...makeFrame("fp2", 10, 10, 20, 20), page: 2 };
    const facingRender = render(<CanvasHost viewMode="facing" minimumPages={2} initialFrames={[f1, f2]} />);
    const facingScroller = facingRender.container.querySelector('[data-studio-scroller="true"]') as HTMLElement;
    const facingObjects = facingRender.container.querySelector("[data-studio-objects]") as HTMLElement;
    expect(facingObjects.style.left).toBe("0px");
    expect(facingObjects.style.right).toBe("auto");
    expect(facingObjects.style.bottom).toBe("auto");
    facingObjects.getBoundingClientRect = () => ({ left: 80, top: 40, width: 1700, height: 2400, right: 1780, bottom: 2440, x: 80, y: 40, toJSON: () => ({}) });
    fireEvent.pointerDown(facingScroller, { clientX: 10, clientY: 10, pointerId: 6, button: 0 });
    fireEvent.pointerMove(facingScroller, { clientX: 1850, clientY: 2500, pointerId: 6 });
    expect(facingRender.container.querySelector('[data-studio-marquee="true"]')).toBeTruthy();
    fireEvent.pointerUp(facingScroller, { clientX: 1850, clientY: 2500, pointerId: 6 });
    expect((facingRender.container.firstElementChild as HTMLElement).dataset.selected).toBe("fp1,fp2");

    // Direct projection helper check across spread pages
    const projection = { width: 794, height: 1123, gap: 24, count: 2 };
    const facingMatched = marqueeSelectedFrameIds(
      [f1, f2],
      { x: 0, y: 0 },
      { x: 1800, y: 2500 },
      { stride: 1147, projection: projection as unknown as ReturnType<typeof pageProjection>, shiftKey: false },
    );
    expect(facingMatched).toEqual(["fp1", "fp2"]);
  });

  it("renders InPage-style classic bevel border, typography, row height, and separators on picture context menus", () => {
    const frames = [makeFrame("pic-1", 10, 10)];
    const { container } = render(
      <div>
        <StudioObjectLayer editor={null} tool="select" frames={frames} onFramesChange={() => {}} onToolAction={() => {}} {...LAYER_BOX} />
        <StudioPictureContextMenu toolMode="arrow" onZoom={() => {}} onAction={() => {}} />
      </div>,
    );
    fireEvent.contextMenu(container.querySelector('[data-studio-frame-id="pic-1"]') as HTMLElement, { clientX: 80, clientY: 80 });
    const menu = document.querySelector('[data-studio-picture-menu="arrow"]') as HTMLElement;
    expect(menu.style.width).toBe("190px");
    expect(["#f0f0f0", "rgb(240, 240, 240)"]).toContain(menu.style.backgroundColor);
    expect(menu.style.backgroundImage).toContain("linear-gradient(to right");
    expect(menu.querySelectorAll('[role="separator"]')).toHaveLength(3);
    const firstItem = menu.querySelector('[role="menuitem"]') as HTMLElement;
    expect(firstItem.style.height).toBe("22px");
    expect(firstItem.style.fontSize).toBe("12px");
    expect(firstItem.style.fontFamily).toContain("QalamUISegoe");
  });

  it("enables and dispatches top-level Edit menu Undo, Redo, Cut, Copy, Clear", () => {
    const onAction = vi.fn();
    const { container } = render(
      <DocumentMenuBar isUr={false} onAction={onAction} disabledIds={new Set()} />,
    );
    fireEvent.click(container.querySelector('[data-menu-root="edit"]') as HTMLElement);
    for (const actionId of ["edit.undo", "edit.redo", "edit.cut", "edit.copy", "edit.clear"]) {
      const btn = document.querySelector(`[data-menu-action="${actionId}"]`) as HTMLButtonElement;
      expect(btn).toBeTruthy();
      expect(btn.disabled).toBe(false);
    }
    fireEvent.click(document.querySelector('[data-menu-action="edit.undo"]') as HTMLElement);
    expect(onAction).toHaveBeenCalledWith("edit.undo");
  });

  it("opens Arrow-empty context menu on empty canvas and pasteboard with native menu prevented and supports Hand Cut/Clear vs Arrow Cut/Clear", () => {
    const srcImg = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const layout = resolvePageLayout({ size: "a4", orientation: "portrait", marginPreset: "normal" });
    const settings = defaultDocumentSettings();
    const initial: StudioFrame[] = [
      { ...makeFrame("pic-1", 10, 10, 20, 20), imageSrc: srcImg, imageNaturalW: 100, imageNaturalH: 100 },
      makeFrame("pic-2", 50, 10, 20, 20),
    ];

    function EmptyContextHost() {
      const [frames, setFrames] = useState<StudioFrame[]>(initial);
      const [selected, setSelected] = useState<string[]>([]);
      const [clipboard, setClipboard] = useState<StudioFrame[]>([]);
      const [clipSource, setClipSource] = useState<"copy" | "cut">("copy");
      return (
        <div>
          <DocumentCanvas
            editor={null}
            dir="ltr"
            isUr={false}
            isEditorEmpty={false}
            documentSettings={settings}
            pageLayout={layout}
            viewMode="pages"
            minimumPages={1}
            zoom={100}
            tool="select"
            frames={frames}
            onFramesChange={setFrames}
            selectedFrameIds={selected}
            onSelectedFramesChange={setSelected}
            onLoadExample={() => {}}
            onWrapperClick={() => {}}
          />
          <StudioPictureContextMenu
            toolMode="arrow"
            getDisabledIds={(mode) => {
              const set = new Set<ReturnType<typeof pictureContextItems>[number]["id"]>();
              if (mode === "arrow-empty" && clipboard.length === 0) set.add("paste");
              if (mode === "arrow-empty" && frames.length === 0) set.add("selectAll");
              return set;
            }}
            onZoom={() => {}}
            onAction={(id, frameId, mode) => {
              if (id === "selectAll" && (mode === "arrow" || mode === "arrow-empty")) {
                setSelected(frames.map((f) => f.id));
                return;
              }
              if (id === "cut") {
                setClipboard(copyFramesToClipboard(frames.filter((f) => f.id === frameId)));
                setClipSource("cut");
                setFrames((prev) => prev.filter((f) => f.id !== frameId));
                setSelected([]);
                return;
              }
              if (id === "paste" && clipboard.length > 0) {
                const offset = clipSource === "cut" ? 0 : 5;
                const clones = cloneCopiedFramesForPaste(clipboard, () => `pasted-${offset}-${frames.length}`, offset);
                if (clipSource === "cut") setClipSource("copy");
                setFrames((prev) => [...prev, ...clones]);
              }
            }}
          />
        </div>
      );
    }

    const { container } = render(<EmptyContextHost />);
    const scroller = container.querySelector('[data-studio-scroller="true"]') as HTMLElement;
    const objects = container.querySelector("[data-studio-objects]") as HTMLElement;

    // 1. Right-click empty pasteboard scroller -> opens arrow-empty menu with Paste disabled initially
    const pasteboardEvt = new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 25, clientY: 25 });
    fireEvent(scroller, pasteboardEvt);
    expect(pasteboardEvt.defaultPrevented).toBe(true);
    let emptyMenu = document.querySelector('[data-studio-picture-menu="arrow-empty"]') as HTMLElement;
    expect(emptyMenu).toBeTruthy();
    expect([...emptyMenu.querySelectorAll('[role="menuitem"]')].map((el) => el.textContent?.replace("▸", "").trim())).toEqual([
      "Zoom",
      "Select All",
      "Paste",
    ]);
    expect((screen.getByRole("menuitem", { name: "Paste" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.keyDown(emptyMenu, { key: "Escape" });

    // 2. Arrow Cut pic-1, then right-click empty canvas -> arrow-empty Paste enabled and restores at exact (10, 10)
    fireEvent.contextMenu(container.querySelector('[data-studio-frame-id="pic-1"]') as HTMLElement, { clientX: 60, clientY: 60 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Cut" }));
    expect(container.querySelector('[data-studio-frame-id="pic-1"]')).toBeNull();

    const canvasEvt = new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 120, clientY: 120 });
    fireEvent(objects, canvasEvt);
    expect(canvasEvt.defaultPrevented).toBe(true);
    emptyMenu = document.querySelector('[data-studio-picture-menu="arrow-empty"]') as HTMLElement;
    expect(emptyMenu).toBeTruthy();
    fireEvent.click(screen.getByRole("menuitem", { name: "Paste" }));
    const restored = container.querySelector('[data-studio-frame-id="pasted-0-1"]') as HTMLElement;
    expect(restored).toBeTruthy();
    expect(restored.style.left).toBe(`${Math.round(10 * PX_PER_MM)}px`);
    expect(restored.style.top).toBe(`${Math.round(10 * PX_PER_MM)}px`);

    // 3. Subsequent Paste uses +5mm offset
    fireEvent(objects, new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 120, clientY: 120 }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Paste" }));
    const second = container.querySelector('[data-studio-frame-id="pasted-5-2"]') as HTMLElement;
    expect(second).toBeTruthy();
    expect(second.style.left).toBe(`${Math.round(15 * PX_PER_MM)}px`);

    // 4. clearPictureFromFrame strips only picture data while keeping box geometry and Clear leaves prior clipboard intact
    const cleared = clearPictureFromFrame({ ...initial[0], angle2Deg: 15 });
    expect(cleared.id).toBe("pic-1");
    expect(cleared.xMm).toBe(10);
    expect(cleared.wMm).toBe(20);
    expect(cleared.imageSrc).toBeUndefined();
    expect(cleared.angle2Deg).toBeUndefined();
    expect(pasteImageFromCopiedFrames(cleared, [initial[0]])?.imageSrc).toBe(srcImg);
  });

  it("keeps selected frames visible inside scroller when zooming instead of panning away to an unfocused story caret", () => {
    function ZoomAlignHost({ zoom, selectedIds, mockEditor }: { zoom: number; selectedIds: string[]; mockEditor: unknown }) {
      const scrollerRef = useRef<HTMLDivElement>(null);
      useStudioZoomVisibility(mockEditor as never, zoom, scrollerRef, "pages", selectedIds);
      return (
        <div ref={scrollerRef} data-studio-scroller="true">
          <div data-studio-frame-id="pic-left" />
        </div>
      );
    }

    const fakeEditor = {
      isDestroyed: false,
      state: { selection: { empty: true, head: 1, anchor: 1 } },
      view: { coordsAtPos: () => ({ left: 1450, right: 1460, top: 200, bottom: 220 }) },
    };

    const { container, rerender } = render(<ZoomAlignHost zoom={1} selectedIds={["pic-left"]} mockEditor={fakeEditor} />);
    const scroller = container.querySelector('[data-studio-scroller="true"]') as HTMLDivElement;
    const frameNode = container.querySelector('[data-studio-frame-id="pic-left"]') as HTMLDivElement;

    Object.defineProperty(scroller, "clientWidth", { configurable: true, value: 1215 });
    Object.defineProperty(scroller, "clientHeight", { configurable: true, value: 670 });
    Object.defineProperty(scroller, "clientLeft", { configurable: true, value: 0 });
    Object.defineProperty(scroller, "clientTop", { configurable: true, value: 0 });
    scroller.scrollLeft = 287;
    scroller.scrollTop = 0;
    scroller.getBoundingClientRect = () => ({ left: 48, top: 93, right: 1263, bottom: 763, width: 1215, height: 670, x: 48, y: 93, toJSON: () => ({}) });
    frameNode.getBoundingClientRect = () => {
      const x = 168 - scroller.scrollLeft;
      return { left: x, top: 301, right: x + 240, bottom: 481, width: 240, height: 180, x, y: 301, toJSON: () => ({}) };
    };

    // At scrollLeft=287, pic-left is at x=-119 (left of scroller edge 48+12=60). Zooming to 2x brings it back in view immediately.
    rerender(<ZoomAlignHost zoom={2} selectedIds={["pic-left"]} mockEditor={fakeEditor} />);
    expect(scroller.scrollLeft).toBe(108);
    expect(frameNode.getBoundingClientRect().left).toBe(60);
  });

  it("unprojects Facing Pages drawing and clamps Single/Facing resize including singleLine boxes (H3)", () => {
    const prevFonts = Object.getOwnPropertyDescriptor(document, "fonts");
    if (!("fonts" in document) || !document.fonts) {
      Object.defineProperty(document, "fonts", {
        configurable: true,
        value: { addEventListener: () => {}, removeEventListener: () => {} },
      });
    }
    try {
      const projection = { width: LAYER_BOX.pageWidthPx, height: LAYER_BOX.pageHeightPx, gap: LAYER_BOX.gapPx, count: 2 };
      const slot1 = facingSlot(0, projection);
      const slot2 = facingSlot(1, projection);
      const initial: StudioFrame[] = [
        { ...makeFrame("single-line-f", 30, 20, 50, 10), kind: "text", singleLine: true, page: 1 },
        { ...makeFrame("facing-box", 20, 40, 40, 30), page: 2 },
      ];
      let latest: StudioFrame[] = initial;
      let switchTool!: (next: "select" | "cross-square" | "textbox" | "text") => void;
      let selectIds!: (ids: string[]) => void;
      function Harness() {
        const [frames, setFrames] = useState<StudioFrame[]>(initial);
        const [selected, setSelected] = useState<string[]>(["single-line-f"]);
        const [tool, setTool] = useState<"select" | "cross-square" | "textbox" | "text">("cross-square");
        latest = frames;
        switchTool = setTool;
        selectIds = setSelected;
        return (
          <StudioObjectLayer
            editor={null}
            tool={tool}
            frames={frames}
            selectedIds={selected}
            onSelectedChange={setSelected}
            onFramesChange={(next) => { latest = next; setFrames(next); }}
            onToolAction={(t) => setTool(t as typeof tool)}
            projection={projection}
            pageCount={2}
            pageWidthPx={LAYER_BOX.pageWidthPx}
            pageHeightPx={LAYER_BOX.pageHeightPx}
            gapPx={LAYER_BOX.gapPx}
            marginTopPx={LAYER_BOX.marginTopPx}
            marginRightPx={LAYER_BOX.marginRightPx}
          />
        );
      }

      const { container, rerender } = render(<Harness />);
      const layer = container.querySelector("[data-studio-objects]") as HTMLElement;
      layer.getBoundingClientRect = () => ({ left: 0, top: 0, right: 2000, bottom: 2600, width: 2000, height: 2600, x: 0, y: 0, toJSON: () => ({}) });

      // 1. Draw a Picture Box on Page 1 in Facing Pages: saved xMm/yMm must unproject slot1 once, and DOM left must equal slot1.x + xMm*PX_PER_MM.
      const drawStartX = slot1.x + 25 * PX_PER_MM;
      const drawStartY = slot1.y + 35 * PX_PER_MM;
      fireEvent.pointerDown(layer, { clientX: drawStartX, clientY: drawStartY, pointerId: 10, button: 0 });
      fireEvent.pointerMove(layer, { clientX: drawStartX + 40 * PX_PER_MM, clientY: drawStartY + 25 * PX_PER_MM, pointerId: 10 });
      fireEvent.pointerUp(layer, { clientX: drawStartX + 40 * PX_PER_MM, clientY: drawStartY + 25 * PX_PER_MM, pointerId: 10 });
      const drawnPic = latest.find((f) => f.kind === "picture-rect" && f.id !== "facing-box")!;
      expect(drawnPic).toBeTruthy();
      expect(drawnPic.page).toBe(1);
      expect(drawnPic.xMm).toBeCloseTo(25, 2);
      expect(drawnPic.yMm).toBeCloseTo(35, 2);
      const drawnEl = container.querySelector(`[data-studio-frame-id="${drawnPic.id}"]`) as HTMLElement;
      expect(parseFloat(drawnEl.style.left)).toBeCloseTo(drawStartX, 0);

      // 2. Switch to textbox tool and draw a Text Box on Page 2 in Facing Pages -> lands on Page 2 with page-2 local xMm/yMm.
      switchTool("textbox");
      rerender(<Harness />);
      const tbStartX = slot2.x + 15 * PX_PER_MM;
      const tbStartY = slot2.y + 45 * PX_PER_MM;
      fireEvent.pointerDown(layer, { clientX: tbStartX, clientY: tbStartY, pointerId: 11, button: 0 });
      fireEvent.pointerMove(layer, { clientX: tbStartX + 50 * PX_PER_MM, clientY: tbStartY + 20 * PX_PER_MM, pointerId: 11 });
      fireEvent.pointerUp(layer, { clientX: tbStartX + 50 * PX_PER_MM, clientY: tbStartY + 20 * PX_PER_MM, pointerId: 11 });
      const drawnTb = latest.find((f) => f.kind === "text" && f.id !== "single-line-f")!;
      expect(drawnTb).toBeTruthy();
      expect(drawnTb.page).toBe(2);
      expect(drawnTb.xMm).toBeCloseTo(15, 2);
      expect(drawnTb.yMm).toBeCloseTo(45, 2);

      // 3. Switch to select tool, select singleLine Title Text Box in Facing Pages and resize east handle -> no slot1.x jump!
      switchTool("select");
      selectIds(["single-line-f"]);
      rerender(<Harness />);
      const titleEast = container.querySelector('[data-studio-frame-id="single-line-f"] [data-studio-frame-handle="e"]') as HTMLElement;
      expect(titleEast).toBeTruthy();
      expect(fireEvent.pointerDown(titleEast, { pointerId: 12, button: 0 })).toBe(false);
      fireEvent.pointerMove(layer, { clientX: slot1.x + 120 * PX_PER_MM, clientY: slot1.y + 20 * PX_PER_MM, pointerId: 12 });
      fireEvent.pointerUp(layer, { clientX: slot1.x + 120 * PX_PER_MM, clientY: slot1.y + 20 * PX_PER_MM, pointerId: 12 });
      const resizedTitle = latest.find((f) => f.id === "single-line-f")!;
      expect(resizedTitle.page).toBe(1);
      expect(resizedTitle.xMm).toBeCloseTo(30, 4);
      expect(resizedTitle.wMm).toBeCloseTo(90, 4);

      // 4. Resize facing-box west handle past spine and south handle beyond row bottom -> page stays 2 and coordinates clamp!
      selectIds(["facing-box"]);
      rerender(<Harness />);
      const westHandle = container.querySelector('[data-studio-frame-id="facing-box"] [data-studio-frame-handle="w"]') as HTMLElement;
      expect(fireEvent.pointerDown(westHandle, { pointerId: 99, button: 2 })).toBe(true);
      expect(fireEvent.pointerDown(westHandle, { pointerId: 13, button: 0 })).toBe(false);
      fireEvent.pointerMove(layer, { clientX: slot2.x - 180, clientY: slot2.y + 50 * PX_PER_MM, pointerId: 13 });
      fireEvent.pointerUp(layer, { clientX: slot2.x - 180, clientY: slot2.y + 50 * PX_PER_MM, pointerId: 13 });
      const westResized = latest.find((f) => f.id === "facing-box")!;
      expect(westResized.page).toBe(2);
      expect(westResized.xMm).toBeCloseTo(0, 4);
      expect(westResized.wMm).toBeCloseTo(60, 4);

      const southHandle = container.querySelector('[data-studio-frame-id="facing-box"] [data-studio-frame-handle="s"]') as HTMLElement;
      fireEvent.pointerDown(southHandle, { pointerId: 14, button: 0 });
      fireEvent.pointerMove(layer, { clientX: slot2.x + 30 * PX_PER_MM, clientY: slot2.y + LAYER_BOX.pageHeightPx + 300, pointerId: 14 });
      fireEvent.pointerUp(layer, { clientX: slot2.x + 30 * PX_PER_MM, clientY: slot2.y + LAYER_BOX.pageHeightPx + 300, pointerId: 14 });
      const southResized = latest.find((f) => f.id === "facing-box")!;
      expect(southResized.page).toBe(2);
      expect(southResized.yMm).toBeCloseTo(40, 6);
      expect(southResized.hMm).toBeCloseTo(LAYER_BOX.pageHeightPx / PX_PER_MM - 40, 4);
    } finally {
      cleanup();
      if (prevFonts) Object.defineProperty(document, "fonts", prevFonts);
      else delete (document as unknown as Record<string, unknown>).fonts;
    }
  });
});
