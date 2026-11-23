/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { useState } from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { getSchema } from "@tiptap/core";
import { Slice, Fragment } from "@tiptap/pm/model";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle, FontFamily, FontSize } from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
import { ParagraphWithDir, HeadingWithDir, DocumentImage } from "../app/tools/document-studio/utils/documentSchema";
import { transformPastedSlice } from "../app/tools/document-studio/utils/documentCommands";
import { serializeQpg, deserializeQpg, type QpgDocument } from "../app/tools/document-studio/utils/qpgFile";
import { validatePrintFrames, renderPrintFrame, printFramePageMarkup } from "../app/tools/document-studio/utils/printableFrames";
import { HAND_CURSOR_PNG_PATH, isPictureBox, PICTURE_HAND_CURSOR, StudioObjectLayer, pictureMenuDisabledIds, selectedPictureBoxId, type StudioFrame } from "../app/tools/document-studio/components/StudioObjectLayer";
import { dispatchDocumentMenuAction } from "../app/tools/document-studio/utils/documentMenuActions";
import { defaultDocumentSettings } from "../app/tools/document-studio/utils/documentSettings";
import { HAND_CURSOR_ASSET_PATH, InPageToolPalette, PIXEL_ICONS, type StudioToolId } from "../app/tools/document-studio/components/InPageToolPalette";
import DocumentMenuBar from "../app/tools/document-studio/components/DocumentMenuBar";
import type { MenuActionId } from "../app/tools/document-studio/utils/documentMenus";
import { StudioObjectRibbon } from "../app/tools/document-studio/components/StudioObjectRibbon";
import type { ObjectGeometryPatch } from "../app/tools/document-studio/utils/objectAttributes";
import { applyObjectGeometry, DEFAULT_INPAGE_BORDER_WIDTH_MM, formatBorderWidth, formatScalePercent } from "../app/tools/document-studio/utils/objectAttributes";
import { BORDER_PATTERN_IDS } from "../app/tools/document-studio/utils/borderPatterns";

const extensions = [
  StarterKit.configure({ paragraph: false, heading: false }),
  ParagraphWithDir,
  HeadingWithDir,
  TextStyle,
  FontFamily,
  FontSize.configure({ types: ["textStyle"] }),
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  DocumentImage,
];
const schema = getSchema(extensions);

const baseFrame: StudioFrame = {
  id: "test-pic-1",
  kind: "picture-rect",
  page: 1,
  xMm: 20,
  yMm: 30,
  wMm: 60,
  hMm: 40,
  flip: false,
  text: "",
  imageSrc: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  imageNaturalW: 300,
  imageNaturalH: 200,
  imageXMm: 5,
  imageYMm: 0,
  imageWMm: 50,
  imageHMm: 40,
};

describe("Picture frames in Qalam Page", () => {
  it("uses the updated PNG hand cursor for picture boxes and SVG asset for the toolbox icon", () => {
    expect(HAND_CURSOR_ASSET_PATH).toBe("/cursors/hand-cursor.svg");
    expect(HAND_CURSOR_PNG_PATH).toBe("/cursors/hand-cursor.png");
    expect(PICTURE_HAND_CURSOR).toBe(`url("${HAND_CURSOR_PNG_PATH}") 16 2, grab`);

    const assetPath = join(process.cwd(), "public", HAND_CURSOR_ASSET_PATH);
    const svg = readFileSync(assetPath, "utf8");
    expect(svg).toContain('viewBox="-2 0 36 36"');
    expect(svg).toContain('fill="#ffffff"');
    expect(svg).toContain('stroke="#000000"');
    expect(svg).not.toContain("<rect");

    const pngBytes = readFileSync(join(process.cwd(), "public", HAND_CURSOR_PNG_PATH));
    expect(pngBytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");

    const { container } = render(<InPageToolPalette tool="select" onTool={() => {}} isUr={false} />);
    const textBtn = container.querySelector('[data-studio-tool-button="text"]');
    expect(textBtn).toBeTruthy();
    const expectedBeamRects = PIXEL_ICONS.text.reduce(
      (count, row) => count + [...row].filter((pixel) => pixel !== ".").length,
      0,
    );
    expect(textBtn?.querySelectorAll("rect")).toHaveLength(expectedBeamRects);
    const handImage = textBtn?.querySelector("image");
    expect(handImage).toBeTruthy();
    expect(handImage?.getAttribute("href")).toBe(HAND_CURSOR_ASSET_PATH);
    cleanup();
  });

  describe("InPage picture tool palette", () => {
    it("enables cross-square, cross-circle, and cross-round with proper labels in English and Urdu", () => {
      const { unmount } = render(<InPageToolPalette tool="select" onTool={() => {}} isUr={false} />);
      const squareBtn = screen.getByRole("button", { name: "Rectangular Picture Box" });
      const circleBtn = screen.getByRole("button", { name: "Elliptical Picture Box" });
      const roundBtn = screen.getByRole("button", { name: "Round Rectangular Picture Box" });

      expect((squareBtn as HTMLButtonElement).disabled).toBe(false);
      expect((circleBtn as HTMLButtonElement).disabled).toBe(false);
      expect((roundBtn as HTMLButtonElement).disabled).toBe(false);
      expect(squareBtn.getAttribute("data-studio-tool-enabled")).toBe("true");
      expect(circleBtn.getAttribute("data-studio-tool-enabled")).toBe("true");
      expect(roundBtn.getAttribute("data-studio-tool-enabled")).toBe("true");
      unmount();

      render(<InPageToolPalette tool="select" onTool={() => {}} isUr={true} />);
      const urSquareBtn = screen.getByRole("button", { name: "مستطیل تصویری خانہ" }) as HTMLButtonElement;
      const urCircleBtn = screen.getByRole("button", { name: "بیضوی تصویری خانہ" }) as HTMLButtonElement;
      const urRoundBtn = screen.getByRole("button", { name: "گول کونوں والا تصویری خانہ" }) as HTMLButtonElement;
      expect(urSquareBtn.disabled).toBe(false);
      expect(urCircleBtn.disabled).toBe(false);
      expect(urRoundBtn.disabled).toBe(false);
      cleanup();
    });
  });

  describe("QPG serialization and round-trip", () => {
    it("round-trips picture frames with base64 image data and placement fields", () => {
      const doc: QpgDocument = {
        title: "Picture Document",
        content: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              attrs: { dir: "rtl" },
              content: [{ type: "text", text: "قلم پیج تصویری خانہ" }],
            },
          ],
        },
        documentSettings: defaultDocumentSettings(),
        frames: [
          baseFrame,
          {
            ...baseFrame,
            id: "test-pic-2",
            kind: "picture-ellipse",
            imageXMm: 0,
            imageYMm: 2,
          },
          {
            ...baseFrame,
            id: "test-pic-3",
            kind: "picture-round-rect",
          },
          {
            ...baseFrame,
            id: "test-pic-empty",
            kind: "picture-rect",
            imageSrc: undefined,
            imageNaturalW: undefined,
            imageNaturalH: undefined,
          },
        ],
        minimumPages: 1,
        columns: { count: 1, gutterMm: 4 },
        viewMode: "pages",
      };

      const serialized = serializeQpg(doc);
      const deserialized = deserializeQpg(serialized);

      expect(deserialized.frames).toHaveLength(4);
      expect(deserialized.frames[0]).toEqual(baseFrame);
      expect(deserialized.frames[1].kind).toBe("picture-ellipse");
      expect(deserialized.frames[2].kind).toBe("picture-round-rect");
      expect(deserialized.frames[3].imageSrc).toBeUndefined();
    });
  });

  describe("printableFrames PDF export", () => {
    it.each(["picture-rect", "picture-ellipse", "picture-round-rect"] as const)(
      "validates and renders %s with clipPath",
      (kind) => {
        const frame: StudioFrame = { ...baseFrame, id: `frame-${kind}`, kind };
        const [validated] = validatePrintFrames([frame]);
        expect(validated.kind).toBe(kind);
        expect(validated.imageSrc).toBe(frame.imageSrc);

        const html = renderPrintFrame(validated);
        expect(html).toContain("<clipPath");
        expect(html).toContain("clip-path=");
        expect(html).toMatch(/<g clip-path="url\(#print-clip-/);
        expect(html).toContain("<image");
        expect(html).toContain(frame.imageSrc);
        expect(html).toContain(`data-print-frame="${kind}"`);
        const imageAt = html.indexOf("<image");
        const clipAt = html.indexOf("<g clip-path=\"url(#print-clip-");
        expect(clipAt).toBeGreaterThanOrEqual(0);
        expect(clipAt).toBeLessThan(imageAt);
      }
    );

    it("renders empty picture box with diagonals and 1pt outline", () => {
      const emptyRect: StudioFrame = {
        ...baseFrame,
        id: "empty-rect",
        kind: "picture-rect",
        imageSrc: undefined,
      };
      const htmlRect = renderPrintFrame(emptyRect);
      expect(htmlRect).toContain("<line");
      expect(htmlRect).not.toContain("<image");

      const emptyEllipse: StudioFrame = {
        ...baseFrame,
        id: "empty-ellipse",
        kind: "picture-ellipse",
        imageSrc: undefined,
      };
      const htmlEllipse = renderPrintFrame(emptyEllipse);
      expect(htmlEllipse).toContain("<clipPath");
      expect(htmlEllipse).toContain("<line");
      expect(htmlEllipse).not.toContain("<image");

      const emptyRoundRect: StudioFrame = {
        ...baseFrame,
        id: "empty-round-rect",
        kind: "picture-round-rect",
        imageSrc: undefined,
      };
      const htmlRoundRect = renderPrintFrame(emptyRoundRect);
      expect(htmlRoundRect).toContain('rx="6.35"');
      expect(htmlRoundRect).toContain("<line");
      expect(htmlRoundRect).not.toContain("<image");
    });

    it("accepts picture frame with base64 data URL without failing JSON byte limit", () => {
      // 100KB base64 string
      const largeBase64 = "data:image/png;base64," + "A".repeat(100 * 1024);
      const frame: StudioFrame = {
        ...baseFrame,
        imageSrc: largeBase64,
      };
      expect(() => validatePrintFrames([frame])).not.toThrow();
    });
  });

  describe("Paste filter strips image nodes but keeps Urdu text", () => {
    it("strips image node and preserves Urdu text 'قلم پیج میں خوش آمدید'", () => {
      const pType = schema.nodes.paragraph;
      const imgType = schema.nodes.image;
      const textNode = schema.text("قلم پیج میں خوش آمدید");

      // Construct a slice with a paragraph containing text and an image node
      const imgNode = imgType.create({
        src: "data:image/png;base64,iVBORw0KGgo=",
        alt: "test",
      });
      const para = pType.create({ dir: "rtl" }, [textNode, imgNode]);
      const slice = new Slice(Fragment.from([para, imgNode]), 0, 0);

      const result = transformPastedSlice(slice, "rtl");
      const contents = result.content.content;

      // Top-level image node should be stripped
      expect(contents.every((node) => node.type.name !== "image")).toBe(true);

      // Child image node inside paragraph should be stripped
      const firstPara = contents[0];
      expect(firstPara.type.name).toBe("paragraph");
      expect(firstPara.textContent).toBe("قلم پیج میں خوش آمدید");
      expect(firstPara.attrs.dir).toBe("rtl");
      let hasImageChild = false;
      firstPara.forEach((child) => {
        if (child.type.name === "image") hasImageChild = true;
      });
      expect(hasImageChild).toBe(false);
    });
  });
});

const PICTURE_TOOLS = [
  ["cross-square", "picture-rect"],
  ["cross-circle", "picture-ellipse"],
  ["cross-round", "picture-round-rect"],
] as const;

const LAYER_BOX = {
  pageCount: 1,
  pageWidthPx: 800,
  pageHeightPx: 1100,
  gapPx: 24,
  marginTopPx: 40,
  marginRightPx: 40,
};

function DrawHarness({ initialTool }: { initialTool: StudioToolId }) {
  const [tool, setTool] = useState<StudioToolId>(initialTool);
  const [frames, setFrames] = useState<StudioFrame[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const importEnabled = frames.some((frame) => selected.includes(frame.id) && isPictureBox(frame.kind));
  return (
    <div data-studio-scroller>
      <div data-tool={tool} data-selected={selected.join(",")} data-import-enabled={importEnabled ? "true" : "false"} />
      <InPageToolPalette tool={tool} onTool={setTool} />
      <StudioObjectLayer
        editor={null}
        tool={tool}
        frames={frames}
        onFramesChange={setFrames}
        onToolAction={setTool}
        onSelectedChange={setSelected}
        selectedIds={selected}
        {...LAYER_BOX}
      />
    </div>
  );
}

function TemplateDragHarness() {
  const [frames, setFrames] = useState<StudioFrame[]>([{ ...baseFrame, template: true }]);
  const [selected, setSelected] = useState<string[]>([]);
  return <div data-studio-scroller><div data-selected={selected.join(",")} data-frames-json={JSON.stringify(frames)} /><StudioObjectLayer editor={null} tool="select" frames={frames} onFramesChange={setFrames} onToolAction={() => {}} onSelectedChange={setSelected} selectedIds={selected} {...LAYER_BOX} /></div>;
}

function dragPicture(container: HTMLElement, toX: number, toY: number, shift = false) {
  const layer = container.querySelector("[data-studio-objects]") as HTMLElement;
  fireEvent.pointerDown(layer, { clientX: 30, clientY: 40, pointerId: 1, button: 0 });
  fireEvent.pointerMove(layer, { clientX: toX, clientY: toY, pointerId: 1, buttons: 1, shiftKey: shift });
  return layer;
}

function EmptyPictureHarness({
  kind,
  imageSrc,
  onOpen,
  onSelectedChange = () => undefined,
  tool = "select",
}: {
  kind: StudioFrame["kind"];
  imageSrc?: string;
  onOpen: (frame: StudioFrame) => void;
  onSelectedChange?: (ids: string[]) => void;
  tool?: StudioToolId;
}) {
  const frame: StudioFrame = {
    id: `empty-${kind}`,
    kind,
    page: 1,
    xMm: 10,
    yMm: 12,
    wMm: 50,
    hMm: 36,
    flip: false,
    text: "",
    imageSrc,
  };
  return (
    <div data-studio-scroller>
      <StudioObjectLayer
        editor={null}
        tool={tool}
        frames={[frame]}
        onFramesChange={() => undefined}
        onToolAction={() => undefined}
        selectedIds={[frame.id]}
        onSelectedChange={onSelectedChange}
        onDoubleClickFrame={onOpen}
        {...LAYER_BOX}
      />
    </div>
  );
}

describe("picture box drawing", () => {
  afterEach(() => cleanup());

  it.each(PICTURE_TOOLS)("switches to the hand tool and keeps the new %s frame targeted", (tool, kind) => {
    const { container } = render(<DrawHarness initialTool={tool} />);
    const layer = dragPicture(container, 190, 130);
    fireEvent.pointerUp(layer, { clientX: 190, clientY: 130, pointerId: 1, button: 0 });

    const frame = container.querySelector(`[data-studio-frame="${kind}"]`);
    const id = frame?.getAttribute("data-studio-frame-id");
    expect(frame).toBeTruthy();
    expect(container.querySelector("[data-tool]")?.getAttribute("data-tool")).toBe("text");
    expect(container.querySelector('[data-studio-tool-button="text"]')?.getAttribute("aria-pressed")).toBe("true");
    expect(container.querySelector('[data-studio-tool-button="select"]')?.getAttribute("aria-pressed")).toBe("false");
    expect(container.querySelector("[data-selected]")?.getAttribute("data-selected")).toBe(id);
    expect(container.querySelector("[data-import-enabled]")?.getAttribute("data-import-enabled")).toBe("true");
    expect(frame?.querySelectorAll("[data-studio-frame-handle]")).toHaveLength(0);
    expect(frame?.querySelector('rect[stroke="#808080"]')).toBeNull();
    expect((frame as HTMLElement).style.cursor).toBe(PICTURE_HAND_CURSOR);

    fireEvent.click(container.querySelector('[data-studio-tool-button="select"]') as HTMLElement);
    expect(container.querySelector("[data-tool]")?.getAttribute("data-tool")).toBe("select");
    expect(frame?.querySelectorAll("[data-studio-frame-handle]")).toHaveLength(8);
    expect(frame?.querySelector('rect[stroke="#808080"]')).toBeTruthy();
  });

  it.each(PICTURE_TOOLS)("previews the final %s shape while dragging", (tool, kind) => {
    const { container } = render(<DrawHarness initialTool={tool} />);
    dragPicture(container, 190, 120);

    const preview = container.querySelector(`[data-studio-draw-preview="${kind}"]`) as HTMLElement | null;
    expect(preview).toBeTruthy();
    expect(preview?.style.borderTopWidth || preview?.style.borderWidth || "").not.toBe("1px");
    const width = parseFloat(preview!.style.width);
    const height = parseFloat(preview!.style.height);
    expect(width).toBeGreaterThan(height);
    if (kind === "picture-ellipse") {
      const ellipse = preview!.querySelector("ellipse");
      expect(ellipse).toBeTruthy();
      expect(Number(ellipse!.getAttribute("rx"))).toBeCloseTo(width / 2);
      expect(Number(ellipse!.getAttribute("ry"))).toBeCloseTo(height / 2);
    } else {
      const rect = preview!.querySelector("rect");
      expect(rect?.getAttribute("data-studio-draw-shape")).toBe(kind === "picture-round-rect" ? "round-rect" : "rect");
      const rx = Number(rect?.getAttribute("rx") || 0);
      if (kind === "picture-round-rect") expect(rx).toBeCloseTo((6.35 * 96) / 25.4);
      else expect(rx).toBe(0);
    }
  });

  it.each(PICTURE_TOOLS)("Shift constrains %s to a square while dragging and on release", (tool, kind) => {
    const { container } = render(<DrawHarness initialTool={tool} />);
    const layer = dragPicture(container, 230, 90, true);
    const preview = container.querySelector(`[data-studio-draw-preview="${kind}"]`) as HTMLElement;
    expect(parseFloat(preview.style.width)).toBeCloseTo(parseFloat(preview.style.height));

    fireEvent.pointerUp(layer, { clientX: 230, clientY: 90, pointerId: 1, button: 0, shiftKey: true });
    const frame = container.querySelector(`[data-studio-frame="${kind}"]`) as HTMLElement;
    expect(parseFloat(frame.style.width)).toBeCloseTo(parseFloat(frame.style.height));
  });
});

describe("template picture peel drag", () => {
  it("does not peel on pointerdown without a real move", () => {
    const { container } = render(<TemplateDragHarness />);
    const frame = container.querySelector(`[data-studio-frame-id="${baseFrame.id}"]`) as HTMLElement;
    fireEvent.pointerDown(frame, { clientX: 80, clientY: 50, pointerId: 1, button: 0 });
    expect(container.querySelectorAll("[data-studio-frame-id]")).toHaveLength(1);
    fireEvent.pointerUp(container.querySelector("[data-studio-objects]") as HTMLElement, { clientX: 80, clientY: 50, pointerId: 1, button: 0 });
    expect(container.querySelectorAll("[data-studio-frame-id]")).toHaveLength(1);
  });

  it("peels exactly one ordinary clone after the move threshold and keeps the pad in place", () => {
    const { container } = render(<TemplateDragHarness />);
    const original = container.querySelector(`[data-studio-frame-id="${baseFrame.id}"]`) as HTMLElement;
    const startX = original.style.left;
    const startY = original.style.top;
    const layer = container.querySelector("[data-studio-objects]") as HTMLElement;
    fireEvent.pointerDown(original, { clientX: 80, clientY: 50, pointerId: 1, button: 0 });
    fireEvent.pointerMove(layer, { clientX: 90, clientY: 58, pointerId: 1, buttons: 1 });
    const frames = container.querySelectorAll<HTMLElement>("[data-studio-frame-id]");
    expect(frames).toHaveLength(2);
    const clone = [...frames].find(frame => frame.dataset.studioFrameId !== baseFrame.id)!;
    expect(original.style.left).toBe(startX);
    expect(original.style.top).toBe(startY);
    expect(clone.dataset.studioFrameId).not.toBe(baseFrame.id);
    expect(clone.getAttribute("data-studio-frame-id")).not.toBe(original.getAttribute("data-studio-frame-id"));
    expect(container.querySelector("[data-selected]")?.getAttribute("data-selected")).toBe(clone.dataset.studioFrameId);
    // The detached clone is a local preview until the user releases the pointer.
    let persistedFrames = JSON.parse(container.querySelector("[data-frames-json]")!.getAttribute("data-frames-json")!) as StudioFrame[];
    expect(persistedFrames).toHaveLength(1);
    expect(persistedFrames[0].id).toBe(baseFrame.id);
    expect(persistedFrames[0].template).toBe(true);

    fireEvent.pointerUp(layer, { clientX: 90, clientY: 58, pointerId: 1, button: 0 });
    persistedFrames = JSON.parse(container.querySelector("[data-frames-json]")!.getAttribute("data-frames-json")!) as StudioFrame[];
    expect(persistedFrames).toHaveLength(2);
    expect(persistedFrames.find(frame => frame.id === clone.dataset.studioFrameId)?.template).toBeUndefined();
    expect(persistedFrames.find(frame => frame.id === baseFrame.id)?.template).toBe(true);
    expect(persistedFrames.find(frame => frame.id === clone.dataset.studioFrameId)?.locked).toBe(false);
  });
});

describe("empty picture box double-click", () => {
  afterEach(() => cleanup());

  it.each(PICTURE_TOOLS)("double-click on the %s hit target opens the hidden picture input", (_tool, kind) => {
    const file = document.createElement("input");
    file.type = "file";
    file.setAttribute("data-studio-picture-input", "true");
    const click = vi.spyOn(file, "click");
    const onOpen = vi.fn((frame: StudioFrame) => {
      file.click();
    });
    const { container } = render(<EmptyPictureHarness kind={kind} onOpen={onOpen} />);
    const hit = container.querySelector(`[data-studio-picture-hit="${kind}"]`) as SVGElement;
    expect(hit).toBeTruthy();
    const frame = hit.closest("[data-studio-frame]") as HTMLElement;
    expect(Number(hit.getAttribute("width"))).toBeCloseTo(parseFloat(frame.style.width), 1);
    expect(Number(hit.getAttribute("height"))).toBeCloseTo(parseFloat(frame.style.height), 1);
    if (kind === "picture-ellipse") {
      const ellipse = hit.querySelector("ellipse");
      expect(Number(ellipse?.getAttribute("rx"))).toBeCloseTo(parseFloat(frame.style.width) / 2, 1);
      expect(Number(ellipse?.getAttribute("ry"))).toBeCloseTo(parseFloat(frame.style.height) / 2, 1);
      expect(ellipse?.getAttribute("fill")).toBe("transparent");
    } else {
      const rect = hit.querySelector("rect");
      expect(Number(rect?.getAttribute("width"))).toBeCloseTo(parseFloat(frame.style.width), 1);
      expect(Number(rect?.getAttribute("height"))).toBeCloseTo(parseFloat(frame.style.height), 1);
      expect(rect?.getAttribute("fill")).toBe("transparent");
      const rx = Number(rect?.getAttribute("rx") || 0);
      if (kind === "picture-round-rect") expect(rx).toBeCloseTo((6.35 * 96) / 25.4, 2);
      else expect(rx).toBe(0);
    }

    fireEvent.doubleClick(hit);
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen.mock.calls[0][0].kind).toBe(kind);
    expect(click).toHaveBeenCalledTimes(1);
  });

  it.each(PICTURE_TOOLS)("Arrow double-click on an empty %s opens the chooser even when the layer captured the pointer", (_tool, kind) => {
    const onOpen = vi.fn();
    const { container } = render(<EmptyPictureHarness kind={kind} onOpen={onOpen} />);
    const hit = container.querySelector(`[data-studio-picture-hit="${kind}"]`) as SVGElement;
    const layer = container.querySelector("[data-studio-objects]") as HTMLElement;
    // Under pointer capture the browser targets pointerup, click and dblclick at the layer.
    for (let i = 0; i < 2; i += 1) {
      fireEvent.pointerDown(hit, { clientX: 100, clientY: 100, pointerId: 1, button: 0 });
      fireEvent.pointerUp(layer, { clientX: 100, clientY: 100, pointerId: 1, button: 0 });
      fireEvent.click(layer);
    }
    expect(onOpen).not.toHaveBeenCalled();
    fireEvent.doubleClick(layer);
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen.mock.calls[0][0].kind).toBe(kind);
  });

  it("does not open the chooser after the Arrow tool dragged the box", () => {
    const onOpen = vi.fn();
    const { container } = render(<EmptyPictureHarness kind="picture-rect" onOpen={onOpen} />);
    const hit = container.querySelector('[data-studio-picture-hit="picture-rect"]') as SVGElement;
    const layer = container.querySelector("[data-studio-objects]") as HTMLElement;
    fireEvent.pointerDown(hit, { clientX: 100, clientY: 100, pointerId: 1, button: 0 });
    fireEvent.pointerMove(layer, { clientX: 140, clientY: 130, pointerId: 1, buttons: 1 });
    fireEvent.pointerUp(layer, { clientX: 140, clientY: 130, pointerId: 1, button: 0 });
    fireEvent.doubleClick(layer);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("opens the chooser on double-click for a picture box that already has an image", () => {
    const onOpen = vi.fn();
    const { container } = render(
      <EmptyPictureHarness kind="picture-round-rect" imageSrc="data:image/png;base64,aaaa" onOpen={onOpen} />,
    );
    expect(container.querySelector('[data-studio-picture-hit="picture-round-rect"]')).toBeNull();
    const frame = container.querySelector('[data-studio-frame="picture-round-rect"]') as HTMLElement;
    fireEvent.click(frame);
    expect(onOpen).not.toHaveBeenCalled();
    fireEvent.doubleClick(frame);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});

const PX_PER_MM = 96 / 25.4;

function PictureFrameHarness({
  frame,
  onFramesChange = () => undefined,
  onOpen = () => undefined,
}: {
  frame: StudioFrame;
  onFramesChange?: (frames: StudioFrame[]) => void;
  onOpen?: (frame: StudioFrame) => void;
}) {
  return (
    <div data-studio-scroller>
      <StudioObjectLayer
        editor={null}
        tool="select"
        frames={[frame]}
        onFramesChange={onFramesChange}
        onToolAction={() => undefined}
        selectedIds={[frame.id]}
        onSelectedChange={() => undefined}
        onDoubleClickFrame={onOpen}
        {...LAYER_BOX}
      />
    </div>
  );
}

describe("picture box move keeps the picture inside the box", () => {
  afterEach(() => cleanup());

  it("keeps imageXMm and imageYMm when the box is moved", () => {
    const frame: StudioFrame = { ...baseFrame, imageXMm: 5, imageYMm: 3 };
    const onFramesChange = vi.fn();
    const { container } = render(<PictureFrameHarness frame={frame} onFramesChange={onFramesChange} />);
    const node = container.querySelector('[data-studio-frame="picture-rect"]') as HTMLElement;
    const initialLeft = node.style.left;
    const initialTop = node.style.top;
    fireEvent.pointerDown(node, { clientX: 120, clientY: 140, pointerId: 1, button: 0 });
    const layer = container.querySelector("[data-studio-objects]") as HTMLElement;
    fireEvent.pointerMove(layer, { clientX: 200, clientY: 210, pointerId: 1, buttons: 1 });
    // Pointer movement updates only the visual preview; the committed story/object state stays untouched.
    expect(onFramesChange).not.toHaveBeenCalled();
    const preview = container.querySelector('[data-studio-frame="picture-rect"]') as HTMLElement;
    expect(preview.style.left).not.toBe(initialLeft);
    expect(preview.style.top).not.toBe(initialTop);
    const img = container.querySelector("img") as HTMLElement;
    expect(parseFloat(img.style.left)).toBeCloseTo(5 * PX_PER_MM);
    expect(parseFloat(img.style.top)).toBeCloseTo(3 * PX_PER_MM);

    fireEvent.pointerUp(layer, { clientX: 200, clientY: 210, pointerId: 1, button: 0 });
    expect(onFramesChange).toHaveBeenCalledTimes(1);
    const moved = onFramesChange.mock.calls.at(-1)![0][0] as StudioFrame;
    expect(moved.xMm).not.toBeCloseTo(frame.xMm);
    expect(moved.yMm).not.toBeCloseTo(frame.yMm);
    expect(moved.imageXMm).toBeCloseTo(5);
    expect(moved.imageYMm).toBeCloseTo(3);
    expect(moved.imageWMm).toBeCloseTo(frame.imageWMm!);
    expect(moved.imageHMm).toBeCloseTo(frame.imageHMm!);
  });

  it("hides resize handles for a rotated frame while retaining visual frame rotation", () => {
    const { container } = render(<PictureFrameHarness frame={{ ...baseFrame, angle1Deg: 15 }} />);
    const frame = container.querySelector('[data-studio-frame="picture-rect"]') as HTMLElement;
    expect(frame.style.transform).toBe("rotate(-15deg)");
    expect(container.querySelector('[data-studio-frame-handle]')).toBeNull();
  });

  it("keeps the picture's page position when resizing from the top or left, and keeps offsets from the bottom or right", () => {
    const frame: StudioFrame = { ...baseFrame, imageXMm: 5, imageYMm: 4 };
    const onFramesChange = vi.fn();
    const { container } = render(<PictureFrameHarness frame={frame} onFramesChange={onFramesChange} />);
    const left = frame.xMm * PX_PER_MM;
    const top = frame.yMm * PX_PER_MM;
    const layer = container.querySelector("[data-studio-objects]") as HTMLElement;

    fireEvent.pointerDown(container.querySelector('[data-studio-frame-handle="nw"]') as HTMLElement, { pointerId: 1, button: 0 });
    fireEvent.pointerMove(layer, { clientX: left - 30, clientY: top - 18, pointerId: 1, buttons: 1 });
    const resized = onFramesChange.mock.calls.at(-1)![0][0] as StudioFrame;
    expect(resized.imageXMm).toBeCloseTo(5 + 30 / PX_PER_MM);
    expect(resized.imageYMm).toBeCloseTo(4 + 18 / PX_PER_MM);

    onFramesChange.mockClear();
    cleanup();
    const again = render(<PictureFrameHarness frame={frame} onFramesChange={onFramesChange} />);
    const east = frame.xMm * PX_PER_MM + frame.wMm * PX_PER_MM;
    const south = frame.yMm * PX_PER_MM + frame.hMm * PX_PER_MM;
    const layer2 = again.container.querySelector("[data-studio-objects]") as HTMLElement;
    fireEvent.pointerDown(again.container.querySelector('[data-studio-frame-handle="se"]') as HTMLElement, { pointerId: 2, button: 0 });
    fireEvent.pointerMove(layer2, { clientX: east + 40, clientY: south + 22, pointerId: 2, buttons: 1 });
    const grown = onFramesChange.mock.calls.at(-1)![0][0] as StudioFrame;
    expect(grown.imageXMm).toBeCloseTo(5);
    expect(grown.imageYMm).toBeCloseTo(4);
    expect(grown.wMm).toBeGreaterThan(frame.wMm);
    expect(grown.hMm).toBeGreaterThan(frame.hMm);
  });
});

describe("picture clip follows the box shape", () => {
  afterEach(() => cleanup());

  it.each(["picture-rect", "picture-ellipse", "picture-round-rect"] as const)(
    "clips a %s picture to the box on screen",
    (kind) => {
      const frame: StudioFrame = {
        ...baseFrame,
        id: `clip-${kind}`,
        kind,
        imageXMm: -12,
        imageYMm: -8,
        imageWMm: 100,
        imageHMm: 80,
      };
      const { container } = render(<PictureFrameHarness frame={frame} />);
      const clip = container.querySelector(`[data-studio-picture-clip="${kind}"]`) as HTMLElement;
      expect(clip).toBeTruthy();
      expect(clip.style.overflow).toBe("hidden");
      expect(clip.querySelector("img")).toBeTruthy();
      if (kind === "picture-ellipse") {
        expect(clip.style.clipPath).toContain("ellipse");
        expect(clip.style.borderRadius).toBe("50%");
      } else if (kind === "picture-round-rect") {
        expect(clip.style.clipPath).toContain("round");
        expect(parseFloat(clip.style.borderRadius)).toBeCloseTo((6.35 * 96) / 25.4);
      } else {
        expect(clip.style.clipPath).toContain("inset");
        expect(clip.style.borderRadius === "" || parseFloat(clip.style.borderRadius) === 0).toBe(true);
      }
    },
  );
});

describe("empty picture box hand targeting", () => {
  afterEach(() => cleanup());

  it.each(PICTURE_TOOLS)("hand tool: one click on an empty %s selects it without opening chooser", (_tool, kind) => {
    const file = document.createElement("input");
    file.type = "file";
    file.setAttribute("data-studio-picture-input", "true");
    const click = vi.spyOn(file, "click");
    const onOpen = vi.fn(() => {
      file.click();
    });
    const onSelectedChange = vi.fn();
    const { container } = render(<EmptyPictureHarness kind={kind} tool="text" onOpen={onOpen} onSelectedChange={onSelectedChange} />);
    const frame = container.querySelector(`[data-studio-frame="${kind}"]`) as HTMLElement;
    expect(frame.style.pointerEvents).toBe("auto");
    expect(frame.style.cursor).toBe(PICTURE_HAND_CURSOR);
    expect(frame.style.cursor).not.toBe("pointer");
    const hit = container.querySelector(`[data-studio-picture-hit="${kind}"]`) as SVGElement;
    expect(hit.style.cursor).toBe(PICTURE_HAND_CURSOR);
    fireEvent.pointerDown(hit, { clientX: 100, clientY: 100, pointerId: 1, button: 0 });
    fireEvent.pointerUp(hit, { clientX: 100, clientY: 100, pointerId: 1, button: 0 });
    fireEvent.click(hit);
    expect(onSelectedChange).toHaveBeenCalledWith([`empty-${kind}`]);
    expect(onOpen).not.toHaveBeenCalled();
    fireEvent.doubleClick(hit);
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
  });

  it.each(PICTURE_TOOLS)("Arrow tool: one click on an empty %s only selects it, without a hand cursor", (_tool, kind) => {
    const onOpen = vi.fn();
    const { container } = render(<EmptyPictureHarness kind={kind} onOpen={onOpen} />);
    const frame = container.querySelector(`[data-studio-frame="${kind}"]`) as HTMLElement;
    expect(frame.style.cursor).not.toBe("pointer");
    const hit = container.querySelector(`[data-studio-picture-hit="${kind}"]`) as SVGElement;
    expect(hit.style.cursor === "" || hit.style.cursor === "inherit").toBe(true);
    fireEvent.pointerDown(hit, { clientX: 100, clientY: 100, pointerId: 1, button: 0 });
    fireEvent.pointerUp(container.querySelector("[data-studio-objects]") as HTMLElement, { clientX: 100, clientY: 100, pointerId: 1, button: 0 });
    fireEvent.click(hit);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("does not open the chooser on a single click when the box already has a picture", () => {
    const onOpen = vi.fn();
    const { container } = render(
      <EmptyPictureHarness kind="picture-ellipse" tool="text" imageSrc="data:image/png;base64,aaaa" onOpen={onOpen} />,
    );
    const frame = container.querySelector('[data-studio-frame="picture-ellipse"]') as HTMLElement;
    expect(frame.style.cursor).toBe(PICTURE_HAND_CURSOR);
    expect((frame.querySelector('[data-studio-picture-clip="picture-ellipse"]') as HTMLElement).style.cursor).toBe("inherit");
    fireEvent.click(frame);
    expect(onOpen).not.toHaveBeenCalled();
    fireEvent.doubleClick(frame);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});

describe("Insert > Picture targets the picture box", () => {
  afterEach(() => cleanup());
  const empty: StudioFrame = { ...baseFrame, id: "box", imageSrc: undefined };
  const text: StudioFrame = { ...baseFrame, id: "tb", kind: "text" };

  it("keeps Insert > Picture enabled at a text caret and gates Import Picture to a picture box", () => {
    expect([...pictureMenuDisabledIds([empty, text], [])]).not.toContain("insert.image");
    expect([...pictureMenuDisabledIds([empty, text], [])]).toContain("file.importPicture");
    expect([...pictureMenuDisabledIds([empty, text], ["tb"])]).not.toContain("insert.image");
    expect([...pictureMenuDisabledIds([empty, text], ["tb"])]).toContain("file.importPicture");
    expect(pictureMenuDisabledIds([empty, text], ["box"]).size).toBe(0);
    expect(selectedPictureBoxId([empty, text], ["tb", "box"])).toBe("box");
    expect(selectedPictureBoxId([empty, text], ["tb"])).toBeNull();

    const onAction = vi.fn();
    const { container } = render(
      <div data-studio-shell>
        <DocumentMenuBar isUr={false} onAction={onAction} disabledIds={pictureMenuDisabledIds([empty], [])} />
      </div>,
    );
    fireEvent.click(container.querySelector("[data-menu-root='insert']")!);
    const item = document.querySelector('[data-menu-action="insert.image"]') as HTMLElement;
    expect(item).toBeTruthy();
    expect(item.getAttribute("aria-disabled")).not.toBe("true");
    fireEvent.click(item);
    expect(onAction).toHaveBeenCalledWith("insert.image");
  });

  it("routes Insert > Picture to the picture box chooser", () => {
    const openImageInsert = vi.fn();
    dispatchDocumentMenuAction("insert.image", null, { openImageInsert } as unknown as Parameters<typeof dispatchDocumentMenuAction>[2]);
    expect(openImageInsert).toHaveBeenCalledTimes(1);
  });
});

describe("Ctrl+Y picture import and redo", () => {
  afterEach(() => cleanup());

  function pressY(disabled: MenuActionId[]) {
    const onAction = vi.fn();
    render(
      <div data-studio-shell>
        <DocumentMenuBar isUr={false} onAction={onAction} disabledIds={new Set(disabled)} />
        <input aria-label="Inside studio" />
      </div>,
    );
    const inside = screen.getByLabelText("Inside studio");
    const handled = fireEvent.keyDown(inside, { key: "y", ctrlKey: true });
    return { onAction, handled };
  }

  it("imports a picture when a picture box is selected", () => {
    const { onAction, handled } = pressY([]);
    expect(handled).toBe(false);
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction).toHaveBeenCalledWith("file.importPicture");
  });

  it("does NOT dispatch editor Redo on Ctrl+Y when no picture box is selected", () => {
    const { onAction, handled } = pressY(["file.importPicture"]);
    expect(handled).toBe(true);
    expect(onAction).not.toHaveBeenCalled();
  });

  it("keeps Ctrl+Alt+Y as Export All Text", () => {
    const onAction = vi.fn();
    render(
      <div data-studio-shell>
        <DocumentMenuBar isUr={false} onAction={onAction} disabledIds={new Set<MenuActionId>(["file.importPicture"])} />
        <input aria-label="Inside studio" />
      </div>,
    );
    fireEvent.keyDown(screen.getByLabelText("Inside studio"), { key: "y", ctrlKey: true, altKey: true });
    expect(onAction).toHaveBeenCalledWith("file.downloadTxt");
  });
});

describe("Modify Object dialog", () => {
  function openModifyDialog(onChange: (frameId: string, patch: ObjectGeometryPatch) => void = () => {}) {
    render(<StudioObjectRibbon frame={baseFrame} onChange={onChange} />);
    const target = document.createElement("div");
    target.dataset.studioFrame = "picture-rect";
    target.dataset.studioFrameId = baseFrame.id;
    document.body.append(target);
    fireEvent.contextMenu(target, { clientX: 20, clientY: 30 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Format Object..." }));
    return screen.getByRole("dialog", { name: "Modify Object" });
  }

  it("matches the measured window dimensions and keeps supported controls enabled", () => {
    const dialog = openModifyDialog() as HTMLElement;
    expect(dialog.style.width).toBe("352px");
    expect(dialog.style.height).toBe("322px");
    expect(dialog.getAttribute("data-studio-format-object-dialog")).toBe("true");
    for (const field of ["x", "y", "w", "h"]) expect(dialog.querySelector<HTMLInputElement>(`[data-object-field="${field}"]`)?.disabled).toBe(false);
    for (const label of ["Rectangular Picture Box", "Elliptical Picture Box", "Rounded Rectangular Picture Box"]) {
      expect((screen.getByRole("radio", { name: label }) as HTMLInputElement).disabled).toBe(false);
    }
    const disabled = dialog.querySelector<HTMLInputElement>("[aria-label='Not supported']")!;
    expect(disabled.disabled).toBe(true);
    expect(disabled.title).toBe("Not supported yet in Qalam Page");
    expect(disabled.getAttribute("aria-description")).toBe("Not supported yet in Qalam Page");
  });

  it("reads current typed geometry when OK is pressed", () => {
    const changes: Array<[string, Record<string, unknown>]> = [];
    const dialog = openModifyDialog((id, patch) => { changes.push([id, patch]); });
    fireEvent.change(dialog.querySelector("[data-object-field='x']")!, { target: { value: "18.5" } });
    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    expect(changes[0][0]).toBe(baseFrame.id);
    expect(changes[0][1]).toMatchObject({ xMm: 18.5, yMm: 30, wMm: 60, hMm: 40 });
    for (const key of ["borderColor", "borderWidthMm", "borderPattern", "backgroundColor", "backgroundHatch"]) expect(changes[0][1][key]).toBeUndefined();
  });

  it("does not write template on unchanged OK for a legacy frame", () => {
    const changes: Array<Record<string, unknown>> = [];
    openModifyDialog((_id, patch) => changes.push(patch));
    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    expect(changes[0].template).toBeUndefined();
    expect(applyObjectGeometry(baseFrame, changes[0] as ObjectGeometryPatch)?.template).toBeUndefined();
  });

  it("persists Template when checked", () => {
    const changes: Array<Record<string, unknown>> = [];
    openModifyDialog((_id, patch) => changes.push(patch));
    fireEvent.click(screen.getByLabelText("Template"));
    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    expect(changes[0].template).toBe(true);
    expect(applyObjectGeometry(baseFrame, changes[0] as ObjectGeometryPatch)?.template).toBe(true);
  });

  it("opens sourced Format Object help without closing Modify Object", () => {
    const dialog = openModifyDialog();
    fireEvent.click(screen.getByRole("button", { name: "Help" }));
    const help = screen.getByRole("dialog", { name: "Format Object help" });
    expect(help.textContent).toContain("template object");
    expect(help.textContent).toContain("Origin");
    expect(help.textContent).toContain("Don’t Print");
    expect(screen.getByRole("dialog", { name: "Modify Object" })).toBe(dialog);
    fireEvent.click(screen.getByRole("button", { name: "Close help" }));
    expect(screen.getByRole("dialog", { name: "Modify Object" })).toBe(dialog);
  });

  it("accepts an mm suffix when OK is pressed", () => {
    const changes: Array<[string, Record<string, unknown>]> = [];
    const dialog = openModifyDialog((id, patch) => { changes.push([id, patch]); });
    fireEvent.change(dialog.querySelector("[data-object-field='x']")!, { target: { value: "18.5mm" } });
    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    expect(changes[0][0]).toBe(baseFrame.id);
    expect(changes[0][1]).toMatchObject({ xMm: 18.5, yMm: 30, wMm: 60, hMm: 40 });
    for (const key of ["borderColor", "borderWidthMm", "borderPattern", "backgroundColor", "backgroundHatch"]) expect(changes[0][1][key]).toBeUndefined();
  });

  it("keeps legacy optional styles absent on unchanged OK", () => {
    const optional = ["borderColor", "borderWidthMm", "borderPattern", "backgroundColor", "backgroundHatch"];
    const unchanged: Array<Record<string, unknown>> = [];
    const dialog = openModifyDialog((_id, patch) => unchanged.push(patch));
    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    const unchangedResult = applyObjectGeometry(baseFrame, unchanged[0] as ObjectGeometryPatch)!;
    expect(dialog).toBeTruthy();
    for (const key of optional) expect(unchangedResult[key as keyof typeof unchangedResult]).toBeUndefined();
    for (const key of ["angle1Deg", "angle2Deg", "borderPosition", "imageXMm", "imageYMm", "imageWMm", "imageHMm", "roundnessMm", "locked", "dontPrint"]) expect(unchanged[0][key]).toBeUndefined();
  });

  it("persists explicit object and image angles and border position without materializing other options", () => {
    const changes: Array<Record<string, unknown>> = [];
    openModifyDialog((_id, patch) => changes.push(patch));
    fireEvent.change(screen.getByLabelText("Angle1"), { target: { value: "15" } });
    fireEvent.change(screen.getByLabelText("Angle2"), { target: { value: "-15°" } });
    fireEvent.click(screen.getByLabelText("Outside"));
    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    expect(changes[0]).toMatchObject({ angle1Deg: 15, angle2Deg: -15, borderPosition: "outside" });
    for (const key of ["imageXMm", "imageYMm", "imageWMm", "imageHMm", "roundnessMm", "locked", "dontPrint"]) expect(changes[0][key]).toBeUndefined();
    cleanup();
    const inside: Array<Record<string, unknown>> = [];
    openModifyDialog((_id, patch) => inside.push(patch));
    fireEvent.click(screen.getByLabelText("Inside"));
    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    expect(inside[0].borderPosition).toBe("inside");
  });

  it("keeps legacy optional styles absent on geometry-only OK", () => {
    const optional = ["borderColor", "borderWidthMm", "borderPattern", "backgroundColor", "backgroundHatch"];
    const geometry: Array<Record<string, unknown>> = [];
    const geometryDialog = openModifyDialog((_id, patch) => geometry.push(patch));
    fireEvent.change(geometryDialog.querySelector("[data-object-field='y']")!, { target: { value: "31" } });
    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    const geometryResult = applyObjectGeometry(baseFrame, geometry[0] as ObjectGeometryPatch)!;
    expect(geometry[0]).toMatchObject({ xMm: 20, yMm: 31, wMm: 60, hMm: 40 });
    for (const key of optional) expect(geometryResult[key as keyof typeof geometryResult]).toBeUndefined();
  });

  it("persists a color-only edit while keeping the legacy non-scaling / print stroke width", () => {
    const changes: Array<Record<string, unknown>> = [];
    const dialog = openModifyDialog((_id, patch) => changes.push(patch));
    fireEvent.click(screen.getByLabelText("Border Color"));
    const crimsonBtn = document.querySelector('[data-object-combo-popup="true"] [data-color-swatch="#B91C1C"]')?.closest("button") as HTMLElement;
    expect(crimsonBtn).toBeTruthy();
    fireEvent.click(crimsonBtn);
    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    expect(changes[0].borderColor).toBe("#B91C1C");
    expect(changes[0].borderWidthMm).toBeUndefined();
    const result = applyObjectGeometry(baseFrame, changes[0] as ObjectGeometryPatch)!;
    expect(result.borderWidthMm).toBeUndefined();
    // No explicit physical width means the legacy 1 CSS px / non-scaling screen stroke policy.
    expect(renderPrintFrame({ ...result, kind: "picture-rect" })).toContain('stroke="#B91C1C" stroke-width="0.2645833333"');
    expect(dialog).toBeTruthy();
  });

  it("stores an explicitly edited physical border width", () => {
    const changes: Array<Record<string, unknown>> = [];
    openModifyDialog((_id, patch) => changes.push(patch));
    fireEvent.change(screen.getByLabelText("Border Width"), { target: { value: "1pt" } });
    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    expect(changes[0].borderWidthMm).toBeCloseTo(25.4 / 72);
  });

  it("keeps picture options absent until explicitly edited", () => {
    const changes: Array<Record<string, unknown>> = [];
    const dialog = openModifyDialog((_id, patch) => changes.push(patch));
    const lock = screen.getByLabelText("Lock");
    fireEvent.click(lock); fireEvent.click(lock);
    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    for (const key of ["imageXMm", "imageYMm", "imageWMm", "imageHMm", "roundnessMm", "locked", "dontPrint"]) expect(changes[0][key]).toBeUndefined();
    cleanup();
    const edited: Array<Record<string, unknown>> = [];
    const next = openModifyDialog((_id, patch) => edited.push(patch));
    fireEvent.change(screen.getByLabelText("Origin Across"), { target: { value: "12.5mm" } });
    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    expect(edited[0].imageXMm).toBe(12.5);
    for (const key of ["imageYMm", "imageWMm", "imageHMm"]) expect(edited[0][key]).toBeUndefined();
    expect(next).toBeTruthy();
  });

  it("persists edited picture scaling relative to known natural size", () => {
    const changes: Array<Record<string, unknown>> = [];
    render(<StudioObjectRibbon frame={{ ...baseFrame, imageNaturalW: 200, imageNaturalH: 100 }} onChange={(_id, patch) => changes.push(patch)} />);
    const target = document.createElement("div"); target.dataset.studioFrame = "picture-rect"; target.dataset.studioFrameId = baseFrame.id; document.body.append(target);
    fireEvent.contextMenu(target, { clientX: 20, clientY: 30 }); fireEvent.click(screen.getByRole("menuitem", { name: "Format Object..." }));
    fireEvent.change(screen.getByLabelText("Scaling Across"), { target: { value: "53.2%" } });
    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    expect(changes[0].imageWMm).toBeCloseTo(0.532 * (200 / (96 / 25.4)));
    expect(changes[0].imageHMm).toBeUndefined();
  });

  it("keeps the Number field above Shape in the right column", () => {
    const dialog = openModifyDialog() as HTMLElement;
    const number = dialog.querySelector<HTMLElement>("[data-object-number-field]");
    const shape = dialog.querySelector<HTMLElement>("[data-object-shape-group]");
    expect(number).toBeTruthy();
    expect(shape).toBeTruthy();
    const nTop = Number.parseInt(number!.style.top, 10);
    const nHeight = Number.parseInt(number!.style.height, 10);
    const sTop = Number.parseInt(shape!.style.top, 10);
    expect(nTop + nHeight).toBeLessThanOrEqual(sTop);
    expect(number!.style.textAlign).toBe("left");
  });
});

describe("picture hand panning and placeholder clipping", () => {
  afterEach(() => cleanup());

  it("pans image content inside a picture box in Hand mode without moving or resizing the box, including rotated and zoomed boxes", () => {
    function PanHarness({ initialFrame, zoom = 1 }: { initialFrame: StudioFrame; zoom?: number }) {
      const [frames, setFrames] = useState<StudioFrame[]>([initialFrame]);
      return (
        <div data-x={frames[0].xMm} data-y={frames[0].yMm} data-w={frames[0].wMm} data-h={frames[0].hMm} data-ix={frames[0].imageXMm ?? 0} data-iy={frames[0].imageYMm ?? 0}>
          <StudioObjectLayer
            editor={null}
            tool="text"
            frames={frames}
            onFramesChange={setFrames}
            onToolAction={() => {}}
            zoom={zoom}
            {...LAYER_BOX}
          />
        </div>
      );
    }

    const { container, unmount } = render(<PanHarness initialFrame={{ ...baseFrame, angle1Deg: 90 }} zoom={2} />);
    const layer = container.querySelector("[data-studio-objects]") as HTMLElement;
    const frame = container.querySelector('[data-studio-frame="picture-rect"]') as HTMLElement;
    layer.getBoundingClientRect = () => ({ left: 0, top: 0, width: 794 * 2, height: 1123 * 2, right: 794 * 2, bottom: 1123 * 2, x: 0, y: 0, toJSON: () => ({}) });

    fireEvent.pointerDown(frame, { clientX: 100, clientY: 100, pointerId: 1, button: 0 });
    expect(frame.style.cursor).toContain("grabbing");
    fireEvent.pointerMove(layer, { clientX: 196, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(layer, { clientX: 196, clientY: 100, pointerId: 1 });
    expect(frame.style.cursor).toBe(PICTURE_HAND_CURSOR);

    const host = container.firstElementChild as HTMLElement;
    expect(Number(host.dataset.x)).toBe(baseFrame.xMm);
    expect(Number(host.dataset.y)).toBe(baseFrame.yMm);
    expect(Number(host.dataset.w)).toBe(baseFrame.wMm);
    expect(Number(host.dataset.h)).toBe(baseFrame.hMm);
    // 96px screen dx at zoom=2 => 48px local => 12.7mm; at 90deg CSS rotate(-90deg), screen +x maps to local +y.
    expect(Number(host.dataset.ix)).toBeCloseTo(baseFrame.imageXMm ?? 0);
    expect(Number(host.dataset.iy)).toBeCloseTo((baseFrame.imageYMm ?? 0) + 12.7);
    unmount();
  });

  it("clips empty picture-round-rect and picture-rect diagonal lines inside the box border without affecting imported images", () => {
    const emptyRound: StudioFrame = { ...baseFrame, id: "empty-round", kind: "picture-round-rect", imageSrc: undefined };
    const emptyRect: StudioFrame = { ...baseFrame, id: "empty-rect", kind: "picture-rect", imageSrc: undefined };
    const filledRound: StudioFrame = { ...baseFrame, id: "filled-round", kind: "picture-round-rect" };
    const { container } = render(
      <StudioObjectLayer
        editor={null}
        tool="select"
        frames={[emptyRound, emptyRect, filledRound]}
        onFramesChange={() => {}}
        onToolAction={() => {}}
        {...LAYER_BOX}
      />,
    );

    for (const id of ["empty-round", "empty-rect"]) {
      const frameEl = container.querySelector(`[data-studio-frame-id="${id}"]`) as HTMLElement;
      const clipRect = frameEl.querySelector(`clipPath#clip-${id} > rect`);
      expect(clipRect).toBeTruthy();
      if (id === "empty-round") {
        expect(Number(clipRect?.getAttribute("rx"))).toBeGreaterThan(0);
      }
      const clippedGroup = frameEl.querySelector(`g[clip-path="url(#clip-${id})"]`);
      expect(clippedGroup).toBeTruthy();
      expect(clippedGroup?.querySelectorAll("line")).toHaveLength(2);
      // Outer border rect sits outside the clipped diagonal group so the border is not clipped.
      expect(frameEl.querySelectorAll('svg[aria-hidden] > rect')).toHaveLength(1);
    }

    const filledEl = container.querySelector('[data-studio-frame-id="filled-round"]') as HTMLElement;
    expect(filledEl.querySelector("g[clip-path]")).toBeNull();
    expect(filledEl.querySelector("img")).toBeTruthy();
  });
});

describe("InPage Modify Object, Border Patterns, Scaling, and Pattern None parity", () => {
  afterEach(() => cleanup());

  it("initializes new drag-drawn picture boxes with InPage defaults (Black, 1pt, Pattern None, Inside)", () => {
    const committed: StudioFrame[][] = [];
    const { container } = render(
      <StudioObjectLayer
        editor={null}
        tool="cross-square"
        frames={[]}
        onFramesChange={(next) => committed.push(next)}
        onToolAction={() => {}}
        pageCount={1}
        pageWidthPx={794}
        pageHeightPx={1123}
        gapPx={24}
        marginTopPx={72}
        marginRightPx={72}
      />,
    );
    const layer = container.querySelector("[data-studio-objects]") as HTMLElement;
    layer.getBoundingClientRect = () => ({ left: 0, top: 0, width: 794, height: 1123, right: 794, bottom: 1123, x: 0, y: 0, toJSON: () => ({}) });

    fireEvent.pointerDown(layer, { clientX: 40, clientY: 50, pointerId: 1, button: 0 });
    fireEvent.pointerMove(layer, { clientX: 160, clientY: 130, pointerId: 1 });
    fireEvent.pointerUp(layer, { clientX: 160, clientY: 130, pointerId: 1 });

    expect(committed).toHaveLength(1);
    const frame = committed[0][0];
    expect(frame.kind).toBe("picture-rect");
    expect(frame.borderColor).toBe("#000000");
    expect(frame.borderWidthMm).toBeCloseTo(DEFAULT_INPAGE_BORDER_WIDTH_MM);
    expect(formatBorderWidth(frame.borderWidthMm!)).toBe("1pt");
    expect(frame.borderPattern).toBe("none");
    expect(frame.borderPosition).toBe("inside");
  });

  it("renders Pattern=None as an editor-only hairline guide on screen and emits ZERO outline or empty cross lines in PDF/Print", () => {
    const noneEmpty: StudioFrame = {
      ...baseFrame,
      id: "none-empty",
      borderColor: "#000000",
      borderWidthMm: DEFAULT_INPAGE_BORDER_WIDTH_MM,
      borderPattern: "none",
      borderPosition: "inside",
    };
    const noneImage: StudioFrame = {
      ...noneEmpty,
      id: "none-image",
      imageSrc: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    };
    const noneText: StudioFrame = {
      ...baseFrame,
      id: "none-text",
      kind: "text",
      borderPattern: "none",
      text: "Hello",
    };

    const { container } = render(
      <StudioObjectLayer
        editor={null}
        tool="select"
        frames={[noneEmpty, noneImage]}
        onFramesChange={() => {}}
        onToolAction={() => {}}
        pageCount={1}
        pageWidthPx={794}
        pageHeightPx={1123}
        gapPx={24}
        marginTopPx={72}
        marginRightPx={72}
      />,
    );

    // Screen: hairline guide is present on empty & filled frames
    expect(container.querySelectorAll('[data-studio-hairline-guide="true"]').length).toBeGreaterThanOrEqual(2);
    const guide = container.querySelector('[data-studio-frame-id="none-image"] [data-studio-hairline-guide="true"]') as SVGElement;
    expect(guide.getAttribute("stroke")).toBe("#a0a0a0");

    // PDF/Print: zero border outline and zero placeholder cross lines when borderPattern === "none"
    const emptyMarkup = renderPrintFrame(noneEmpty);
    expect(emptyMarkup).not.toContain('stroke="#000000"');
    expect(emptyMarkup).not.toContain("<line");
    const filledMarkup = renderPrintFrame(noneImage);
    expect(filledMarkup).not.toContain('stroke="#000000"');
    expect(printFramePageMarkup([noneText], 210, 297)).toContain("border:none;");
  });

  it("supports quarter-point border width formatting, 2-decimal scaling noise cleanup, independent scaling/origin vs bounds, and Pattern/Color combos with Escape safety", () => {
    expect(formatBorderWidth(25.4 / 96)).toBe("0.75pt");
    expect(formatBorderWidth(25.4 / 72)).toBe("1pt");
    expect(formatBorderWidth((1.25 * 25.4) / 72)).toBe("1.25pt");
    expect(formatBorderWidth((1.5 * 25.4) / 72)).toBe("1.5pt");
    expect(formatScalePercent(8.600144)).toBe("8.6%");

    // Independent Across/Down scaling & Origin leave Bounds unchanged; untouched OK avoids scaling noise rewrite
    const changes: Array<Record<string, unknown>> = [];
    const imgSrc = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const noisyFrame: StudioFrame = {
      ...baseFrame,
      borderColor: "#000000",
      borderWidthMm: DEFAULT_INPAGE_BORDER_WIDTH_MM,
      borderPattern: "none",
      borderPosition: "inside",
      imageSrc: imgSrc,
      imageNaturalW: 2000,
      imageNaturalH: 1000,
      imageWMm: (0.08600144 * 2000) / (96 / 25.4),
      imageHMm: (0.25 * 1000) / (96 / 25.4),
    };

    const onCancel = vi.fn();
    render(
      <StudioObjectRibbon
        frame={noisyFrame}
        onChange={(_id, patch) => changes.push(patch)}
      />,
    );
    const target = document.createElement("div");
    target.dataset.studioFrame = "picture-rect";
    target.dataset.studioFrameId = noisyFrame.id;
    document.body.append(target);
    fireEvent.contextMenu(target, { clientX: 20, clientY: 30 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Format Object..." }));

    const scaleAcross = screen.getByLabelText("Scaling Across") as HTMLInputElement;
    const scaleDown = screen.getByLabelText("Scaling Down") as HTMLInputElement;
    expect(scaleAcross.value).toBe("8.6%");
    expect(scaleDown.value).toBe("25%");
    expect((screen.getByLabelText("Border Width") as HTMLInputElement).value).toBe("1pt");

    // Open Border Pattern combo, press Escape -> closes dropdown ONLY (dialog stays mounted!), then reopen & select Dashed
    const patternCombo = screen.getByLabelText("Border Pattern");
    fireEvent.click(patternCombo);
    const patternListbox = screen.getByRole("listbox", { name: "Border Pattern options" });
    expect(patternListbox.querySelectorAll('[role="option"]')).toHaveLength(BORDER_PATTERN_IDS.length);
    fireEvent.keyDown(patternListbox, { key: "Escape" });
    expect(screen.queryByRole("listbox", { name: "Border Pattern options" })).toBeNull();
    expect(screen.getByRole("dialog", { name: "Modify Object" })).toBeTruthy();

    fireEvent.click(patternCombo);
    fireEvent.click(screen.getByRole("option", { name: "Dashed" }));

    // Open Background Color combo -> select Blue
    fireEvent.click(screen.getByLabelText("Background Color"));
    const blueBtn = document.querySelector('[data-object-combo-popup="true"] [data-color-swatch="#1D4ED8"]')?.closest("button") as HTMLElement;
    expect(blueBtn).toBeTruthy();
    fireEvent.click(blueBtn);

    // Edit Origin + only Scaling Across -> Bounds stay equal to frame geometry
    fireEvent.change(screen.getByLabelText("Origin Across"), { target: { value: "5mm" } });
    fireEvent.change(scaleAcross, { target: { value: "50%" } });
    fireEvent.click(screen.getByRole("button", { name: "OK" }));

    expect(changes).toHaveLength(1);
    const applied = applyObjectGeometry(noisyFrame, changes[0] as ObjectGeometryPatch)!;
    expect(applied.xMm).toBe(noisyFrame.xMm);
    expect(applied.yMm).toBe(noisyFrame.yMm);
    expect(applied.wMm).toBe(noisyFrame.wMm);
    expect(applied.hMm).toBe(noisyFrame.hMm);
    expect(applied.imageXMm).toBe(5);
    expect(applied.imageWMm).toBeCloseTo(0.5 * (2000 / (96 / 25.4)));
    expect(applied.imageHMm).toBe(noisyFrame.imageHMm);
    expect(applied.borderPattern).toBe("dashed");
    expect(applied.backgroundColor).toBe("#1D4ED8");

    // Validate all active border patterns round-trip through .qpg and render in SVG / Print / Screen
    for (const pattern of BORDER_PATTERN_IDS) {
      const candidate: StudioFrame = {
        ...applied,
        id: `pat-${pattern}`,
        borderPattern: pattern,
      };
      expect(() => validatePrintFrames([candidate])).not.toThrow();
      const doc: QpgDocument = {
        title: "Pattern Check",
        content: { type: "doc", content: [{ type: "paragraph", content: [] }] },
        documentSettings: defaultDocumentSettings(),
        frames: [candidate],
        minimumPages: 1,
        columns: { count: 1, gutterMm: 4.23 },
        viewMode: "pages",
      };
      const parsed = deserializeQpg(serializeQpg(doc));
      expect(parsed.frames?.[0]?.borderPattern).toBe(pattern);
      const printSvg = renderPrintFrame(candidate);
      if (pattern === "dashed" || pattern === "dotted" || pattern === "dash-dot" || pattern === "dash-dot-dot") {
        expect(printSvg).toContain("stroke-dasharray=");
      }
      if (pattern === "double" || pattern === "thick-thin" || pattern === "thin-thick") {
        expect((printSvg.match(/<rect /g) ?? []).length).toBeGreaterThanOrEqual(4); // clip + bg + 2 strokes
      }
    }
    expect(onCancel).not.toHaveBeenCalled();
  });
});
