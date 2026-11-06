/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it, vi } from "vitest";
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
import { validatePrintFrames, renderPrintFrame } from "../app/tools/document-studio/utils/printableFrames";
import { isPictureBox, StudioObjectLayer, pictureMenuDisabledIds, selectedPictureBoxId, type StudioFrame } from "../app/tools/document-studio/components/StudioObjectLayer";
import { dispatchDocumentMenuAction } from "../app/tools/document-studio/utils/documentMenuActions";
import { defaultDocumentSettings } from "../app/tools/document-studio/utils/documentSettings";
import { InPageToolPalette, type StudioToolId } from "../app/tools/document-studio/components/InPageToolPalette";
import DocumentMenuBar from "../app/tools/document-studio/components/DocumentMenuBar";
import type { MenuActionId } from "../app/tools/document-studio/utils/documentMenus";

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
  tool = "select",
}: {
  kind: StudioFrame["kind"];
  imageSrc?: string;
  onOpen: (frame: StudioFrame) => void;
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
        onSelectedChange={() => undefined}
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
    expect(frame?.querySelectorAll("[data-studio-frame-handle]")).toHaveLength(8);
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

  it("does not open the chooser for a picture box that already has an image", () => {
    const onOpen = vi.fn();
    const { container } = render(
      <EmptyPictureHarness kind="picture-round-rect" imageSrc="data:image/png;base64,aaaa" onOpen={onOpen} />,
    );
    expect(container.querySelector('[data-studio-picture-hit="picture-round-rect"]')).toBeNull();
    fireEvent.doubleClick(container.querySelector('[data-studio-frame="picture-round-rect"]') as HTMLElement);
    expect(onOpen).not.toHaveBeenCalled();
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
    fireEvent.pointerDown(node, { clientX: 120, clientY: 140, pointerId: 1, button: 0 });
    const layer = container.querySelector("[data-studio-objects]") as HTMLElement;
    fireEvent.pointerMove(layer, { clientX: 200, clientY: 210, pointerId: 1, buttons: 1 });
    expect(onFramesChange).toHaveBeenCalled();
    const moved = onFramesChange.mock.calls.at(-1)![0][0] as StudioFrame;
    expect(moved.xMm).not.toBeCloseTo(frame.xMm);
    expect(moved.yMm).not.toBeCloseTo(frame.yMm);
    expect(moved.imageXMm).toBeCloseTo(5);
    expect(moved.imageYMm).toBeCloseTo(3);
    expect(moved.imageWMm).toBeCloseTo(frame.imageWMm!);
    expect(moved.imageHMm).toBeCloseTo(frame.imageHMm!);
    const img = container.querySelector("img") as HTMLElement;
    expect(parseFloat(img.style.left)).toBeCloseTo(5 * PX_PER_MM);
    expect(parseFloat(img.style.top)).toBeCloseTo(3 * PX_PER_MM);
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

describe("empty picture box single click", () => {
  afterEach(() => cleanup());

  it.each(PICTURE_TOOLS)("hand tool: one click on an empty %s opens the chooser and shows a hand", (_tool, kind) => {
    const file = document.createElement("input");
    file.type = "file";
    file.setAttribute("data-studio-picture-input", "true");
    const click = vi.spyOn(file, "click");
    const onOpen = vi.fn(() => {
      file.click();
    });
    const { container } = render(<EmptyPictureHarness kind={kind} tool="text" onOpen={onOpen} />);
    const frame = container.querySelector(`[data-studio-frame="${kind}"]`) as HTMLElement;
    expect(frame.style.pointerEvents).toBe("auto");
    expect(frame.style.cursor).toBe("pointer");
    const hit = container.querySelector(`[data-studio-picture-hit="${kind}"]`) as SVGElement;
    fireEvent.pointerDown(hit, { clientX: 100, clientY: 100, pointerId: 1, button: 0 });
    fireEvent.pointerUp(hit, { clientX: 100, clientY: 100, pointerId: 1, button: 0 });
    fireEvent.click(hit);
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
    fireEvent.click(frame);
    expect(onOpen).not.toHaveBeenCalled();
  });
});

describe("Insert > Picture targets the picture box", () => {
  afterEach(() => cleanup());
  const empty: StudioFrame = { ...baseFrame, id: "box", imageSrc: undefined };
  const text: StudioFrame = { ...baseFrame, id: "tb", kind: "text" };

  it("is disabled until a picture box is selected", () => {
    expect([...pictureMenuDisabledIds([empty, text], [])]).toEqual(expect.arrayContaining(["insert.image", "file.importPicture"]));
    expect([...pictureMenuDisabledIds([empty, text], ["tb"])]).toEqual(expect.arrayContaining(["insert.image", "file.importPicture"]));
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
    expect(item.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(item);
    expect(onAction).not.toHaveBeenCalled();
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

  it("dispatches editor Redo when no picture box is selected", () => {
    const { onAction, handled } = pressY(["file.importPicture"]);
    expect(handled).toBe(false);
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction).toHaveBeenCalledWith("edit.redo");
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
