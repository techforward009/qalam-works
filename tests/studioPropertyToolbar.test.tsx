/** @vitest-environment happy-dom */
import { useRef, useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import {
  FormatDialog,
  StudioObjectRibbon,
  resolvePropertyToolbarMode,
} from "../app/tools/document-studio/components/StudioObjectRibbon";
import { StudioObjectLayer, type StudioFrame } from "../app/tools/document-studio/components/StudioObjectLayer";
import { InPageToolPalette, type StudioToolId } from "../app/tools/document-studio/components/InPageToolPalette";
import {
  applyObjectGeometry,
  DEFAULT_INPAGE_BORDER_WIDTH_MM,
  DEFAULT_PICTURE_TOOL_DEFAULTS,
  formatScalePercent,
  pictureScalePercent,
  type ObjectGeometryPatch,
  type PictureToolDefaults,
} from "../app/tools/document-studio/utils/objectAttributes";
import type { ObjectHistoryGroupOptions } from "../app/tools/document-studio/utils/objectFrameHistory";
import { BORDER_PATTERN_OPTIONS } from "../app/tools/document-studio/utils/borderPatterns";
import { createStudioHistoryCoordinator, resolveStudioHistoryShortcut } from "../app/tools/document-studio/utils/studioHistory";
import { deserializeQpg, serializeQpg, type QpgDocument } from "../app/tools/document-studio/utils/qpgFile";
import { defaultDocumentSettings } from "../app/tools/document-studio/utils/documentSettings";
import { renderPrintFrame, validatePrintFrames } from "../app/tools/document-studio/utils/printableFrames";

afterEach(() => {
  cleanup();
});

const SAMPLE_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function makePictureFrame(overrides: Partial<StudioFrame> = {}): StudioFrame {
  return {
    id: "pic-1",
    kind: "picture-rect",
    page: 1,
    xMm: 108.15,
    yMm: 59.14,
    wMm: 81.76,
    hMm: 60.85,
    flip: false,
    text: "",
    imageSrc: SAMPLE_PNG,
    imageName: "1 percent.JPG",
    imageNaturalW: 400,
    imageNaturalH: 200,
    imageXMm: -21.69,
    imageYMm: 5.83,
    imageWMm: (0.88 * 400) / (96 / 25.4),
    imageHMm: (0.88 * 200) / (96 / 25.4),
    angle1Deg: 0,
    angle2Deg: 0,
    roundnessMm: 6.35,
    borderColor: "#000000",
    borderWidthMm: DEFAULT_INPAGE_BORDER_WIDTH_MM,
    borderPattern: "none",
    borderPosition: "inside",
    backgroundColor: "#FFFFFF",
    backgroundHatch: "none",
    ...overrides,
  };
}

function makeShapeFrame(overrides: Partial<StudioFrame> = {}): StudioFrame {
  return {
    id: "shape-1",
    kind: "rect",
    page: 1,
    xMm: 20,
    yMm: 30,
    wMm: 50,
    hMm: 40,
    flip: false,
    text: "",
    borderColor: "#000000",
    borderWidthMm: DEFAULT_INPAGE_BORDER_WIDTH_MM,
    borderPattern: "solid",
    borderPosition: "inside",
    roundnessMm: 6.35,
    angle1Deg: 0,
    ...overrides,
  };
}

function Harness({
  initialFrames,
  initialSelected,
  mode,
}: {
  initialFrames: StudioFrame[];
  initialSelected?: string[];
  mode: "picture" | "object";
}) {
  const [frames, setFrames] = useState<StudioFrame[]>(initialFrames);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelected ?? [initialFrames[0].id]);
  const [dialogId, setDialogId] = useState<string | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const coordinatorRef = useRef(createStudioHistoryCoordinator());
  const [, setVersion] = useState(0);

  const selectedFrames = frames.filter((f) => selectedIds.includes(f.id));
  const dialogFrame = dialogId ? frames.find((f) => f.id === dialogId) ?? null : null;

  const commitFrames = (next: StudioFrame[], options?: ObjectHistoryGroupOptions) => {
    coordinatorRef.current.recordObjectChange(frames, next, () => {}, options);
    setFrames(next);
    setVersion((v) => v + 1);
  };

  const applyOne = (frameId: string, patch: ObjectGeometryPatch, options?: ObjectHistoryGroupOptions) => {
    const next = frames.map((f) => {
      if (f.id !== frameId || f.locked) return f;
      return applyObjectGeometry(f, patch) ?? f;
    });
    commitFrames(next, options);
  };

  const applyBatch = (
    ids: string[],
    buildPatch: (f: StudioFrame) => ObjectGeometryPatch | null,
    options?: ObjectHistoryGroupOptions,
  ) => {
    const idSet = new Set(ids);
    const next = frames.map((f) => {
      if (!idSet.has(f.id) || f.locked) return f;
      const patch = buildPatch(f);
      return (patch && applyObjectGeometry(f, patch)) || f;
    });
    commitFrames(next, options);
  };

  const runUndoRedo = (action: "undo" | "redo") => {
    coordinatorRef.current[action]({
      getStoryUndoDepth: () => 0,
      getStoryRedoDepth: () => 0,
      undoStory: () => false,
      redoStory: () => false,
      closeStoryHistoryGroup: () => {},
      getFrames: () => frames,
      getSelectedIds: () => selectedIds,
      restoreFrames: (nextFrames, nextSel) => {
        setFrames(nextFrames);
        if (nextSel) setSelectedIds(nextSel);
        setVersion((v) => v + 1);
      },
      getFrameSnapshot: () => null,
      applyFrameSnapshot: () => {},
    });
  };

  return (
    <div
      data-testid="harness"
      onKeyDown={(e) => {
        const action = resolveStudioHistoryShortcut(e.nativeEvent);
        if (action) {
          e.preventDefault();
          runUndoRedo(action);
        }
      }}
    >
      {selectedFrames.length > 0 ? (
        <StudioObjectRibbon
          disableContextMenu
          mode={mode}
          frame={selectedFrames[0]}
          frames={selectedFrames}
          onChange={applyOne}
          onApplyBatch={applyBatch}
        />
      ) : null}
      <button type="button" onClick={() => setDialogId(selectedFrames[0]?.id ?? null)}>
        Open Modify Dialog
      </button>
      <button type="button" onClick={() => setSelectedIds(frames.map((f) => f.id))}>
        Select All
      </button>
      <button type="button" onClick={() => setSelectedIds([])}>
        Clear Selection
      </button>
      {frames.map((f) => (
        <button key={f.id} type="button" onClick={() => setSelectedIds([f.id])}>
          Select {f.id}
        </button>
      ))}
      <div
        data-testid="frame-state"
        data-frames={JSON.stringify(frames)}
        data-selected={JSON.stringify(selectedIds)}
      />
      {dialogFrame ? (
        <FormatDialog
          frame={dialogFrame}
          returnFocus={returnFocus}
          onCancel={() => setDialogId(null)}
          onApply={(patch) => {
            applyOne(dialogFrame.id, patch);
            setDialogId(null);
          }}
        />
      ) : null}
    </div>
  );
}

function readFramesFromHarness(): StudioFrame[] {
  return JSON.parse(screen.getByTestId("frame-state").getAttribute("data-frames") || "[]") as StudioFrame[];
}

describe("resolvePropertyToolbarMode (context sensitivity & no-selection state)", () => {
  it("prioritizes active Picture Tool and switches cleanly between picture-tool, picture, object, and none states", () => {
    const pic = makePictureFrame();
    const shape = makeShapeFrame();
    const text = makeShapeFrame({ id: "txt-1", kind: "text" });

    expect(resolvePropertyToolbarMode("cross-square", [])).toBe("picture-tool");
    expect(resolvePropertyToolbarMode("cross-circle", [])).toBe("picture-tool");
    expect(resolvePropertyToolbarMode("cross-round", [])).toBe("picture-tool");
    // Active Picture Tool takes precedence even if an object was previously selected
    expect(resolvePropertyToolbarMode("cross-square", [shape])).toBe("picture-tool");

    expect(resolvePropertyToolbarMode("text", [])).toBe("none");
    expect(resolvePropertyToolbarMode("select", [])).toBe("none");
    expect(resolvePropertyToolbarMode("text", [pic])).toBe("picture");
    expect(resolvePropertyToolbarMode("select", [pic])).toBe("object");
    expect(resolvePropertyToolbarMode("text", [pic, shape])).toBe("none");
    expect(resolvePropertyToolbarMode("select", [pic, shape])).toBe("object");
    expect(resolvePropertyToolbarMode("text", [text])).toBe("none");
    expect(resolvePropertyToolbarMode("select", [text])).toBe("object");
  });
});

describe("Immediate Picture Tool activation before frame creation", () => {
  function PictureToolFlowHarness({
    initialFrames = [],
    initialSelected = [],
    initialTool = "select",
  }: {
    initialFrames?: StudioFrame[];
    initialSelected?: string[];
    initialTool?: StudioToolId;
  }) {
    const [tool, setTool] = useState<StudioToolId>(initialTool);
    const [frames, setFrames] = useState<StudioFrame[]>(initialFrames);
    const [selectedIds, setSelectedIds] = useState<string[]>(initialSelected);
    const [defaults, setDefaults] = useState<PictureToolDefaults>(DEFAULT_PICTURE_TOOL_DEFAULTS);
    const selectedFrames = frames.filter((f) => selectedIds.includes(f.id));
    const mode = resolvePropertyToolbarMode(tool, selectedFrames);

    return (
      <div data-testid="pic-flow" data-tool={tool} data-mode={mode} data-frames={JSON.stringify(frames)} data-selected={JSON.stringify(selectedIds)}>
        {mode !== "none" ? (
          <StudioObjectRibbon
            disableContextMenu
            mode={mode}
            frame={selectedFrames[0]}
            frames={selectedFrames}
            creationTool={tool}
            pictureDefaults={defaults}
            onPictureDefaultsChange={setDefaults}
            onSelectCreationTool={setTool}
            onChange={(id, patch) => {
              setFrames((prev) => prev.map((f) => (f.id === id ? applyObjectGeometry(f, patch) ?? f : f)));
            }}
          />
        ) : (
          <div data-testid="general-toolbar-placeholder">General Toolbar</div>
        )}
        <InPageToolPalette tool={tool} onTool={setTool} />
        <div data-studio-scroller="true">
          <StudioObjectLayer
            editor={null}
            tool={tool}
            frames={frames}
            onFramesChange={setFrames}
            onToolAction={setTool}
            selectedIds={selectedIds}
            onSelectedChange={setSelectedIds}
            pictureBoxDefaults={defaults}
            pageCount={1}
            pageWidthPx={794}
            pageHeightPx={1123}
            gapPx={24}
            marginTopPx={40}
            marginRightPx={40}
          />
        </div>
      </div>
    );
  }

  it("activates Picture Tool property controls immediately on tool click before any frame exists", () => {
    render(<PictureToolFlowHarness />);
    expect(screen.getByTestId("general-toolbar-placeholder")).toBeTruthy();

    // Activate Rectangular Picture Box tool from left vertical palette with zero frames created
    fireEvent.click(document.querySelector('[data-studio-tool-button="cross-square"]')!);
    expect(screen.getByTestId("pic-flow").getAttribute("data-mode")).toBe("picture-tool");
    const ribbon = document.querySelector<HTMLElement>('[data-studio-object-ribbon="true"]')!;
    expect(ribbon.dataset.ribbonMode).toBe("picture-tool");
    expect(ribbon.dataset.ribbonTool).toBe("cross-square");

    // X/Y/W/H blank & disabled; default insertion values shown (InPage 2009 parity)
    for (const field of ["x", "y", "w", "h"] as const) {
      const input = ribbon.querySelector<HTMLInputElement>(`[data-ribbon-field="${field}"]`)!;
      expect(input.value).toBe("");
      expect(input.disabled).toBe(true);
    }
    expect(ribbon.querySelector('[data-ribbon-field="border-inside"]')?.getAttribute("aria-pressed")).toBe("true");
    expect(ribbon.querySelector('[data-ribbon-field="border-color"]')?.getAttribute("data-value")).toBe("#000000");
    expect(ribbon.querySelector('[data-ribbon-field="background-color"]')?.getAttribute("data-value")).toBe("#FFFFFF");
    expect(ribbon.querySelector('[data-ribbon-field="border-pattern"]')?.getAttribute("data-value")).toBe("none");
    expect((ribbon.querySelector('[data-ribbon-field="border-width"]') as HTMLInputElement).value).toBe("1pt");
    expect((ribbon.querySelector('[data-ribbon-field="roundness"]') as HTMLInputElement).value).toBe("6.35mm");
    expect((ribbon.querySelector('[data-ribbon-field="roundness"]') as HTMLInputElement).disabled).toBe(true);
    expect((ribbon.querySelector('[data-ribbon-field="angle1"]') as HTMLInputElement).value).toBe("0°");
    expect(ribbon.querySelector('[data-ribbon-field="shape-rect"]')?.getAttribute("aria-pressed")).toBe("true");

    // Clicking Rounded shape in creation mode switches tool to cross-round and enables Roundness
    fireEvent.click(ribbon.querySelector('[data-ribbon-field="shape-round-rect"]')!);
    expect(screen.getByTestId("pic-flow").getAttribute("data-tool")).toBe("cross-round");
    expect(ribbon.dataset.ribbonTool).toBe("cross-round");
    expect((ribbon.querySelector('[data-ribbon-field="roundness"]') as HTMLInputElement).disabled).toBe(false);

    // Switching back to Arrow Tool with no selection restores general toolbar
    fireEvent.click(document.querySelector('[data-studio-tool-button="select"]')!);
    expect(screen.getByTestId("pic-flow").getAttribute("data-mode")).toBe("none");
    expect(screen.getByTestId("general-toolbar-placeholder")).toBeTruthy();
  });

  it("applies pre-draw defaults onto newly drawn picture frames and updates toolbar to actual object properties", () => {
    render(<PictureToolFlowHarness />);
    fireEvent.click(document.querySelector('[data-studio-tool-button="cross-round"]')!);

    const ribbon = document.querySelector<HTMLElement>('[data-studio-object-ribbon="true"]')!;
    // Customize defaults before drawing: Border Color Red, Pattern Dashed, Roundness 9mm
    fireEvent.click(ribbon.querySelector('[data-ribbon-field="border-color"]')!);
    fireEvent.click(within(screen.getByRole("listbox", { name: "Object Border Color options" })).getByRole("option", { name: "Red" }));
    fireEvent.click(ribbon.querySelector('[data-ribbon-field="border-pattern"]')!);
    fireEvent.click(within(screen.getByRole("listbox", { name: "Object Border Pattern options" })).getByRole("option", { name: "Dashed" }));
    const roundInput = ribbon.querySelector<HTMLInputElement>('[data-ribbon-field="roundness"]')!;
    fireEvent.change(roundInput, { target: { value: "9mm" } });
    fireEvent.keyDown(roundInput, { key: "Enter" });

    // No frame created yet
    expect(JSON.parse(screen.getByTestId("pic-flow").getAttribute("data-frames")!)).toHaveLength(0);

    // Draw picture frame on layer
    const layer = document.querySelector<HTMLElement>("[data-studio-objects]")!;
    layer.getBoundingClientRect = () => ({ left: 0, top: 0, width: 794, height: 1123, right: 794, bottom: 1123, x: 0, y: 0, toJSON: () => ({}) });
    fireEvent.pointerDown(layer, { clientX: 50, clientY: 60, pointerId: 1, button: 0 });
    fireEvent.pointerMove(layer, { clientX: 210, clientY: 160, pointerId: 1, buttons: 1 });
    fireEvent.pointerUp(layer, { clientX: 210, clientY: 160, pointerId: 1, button: 0 });

    const frames = JSON.parse(screen.getByTestId("pic-flow").getAttribute("data-frames")!) as StudioFrame[];
    expect(frames).toHaveLength(1);
    expect(frames[0]).toMatchObject({
      kind: "picture-round-rect",
      borderColor: "#B91C1C",
      borderPattern: "dashed",
      roundnessMm: 9,
    });
    // Post-draw switches to Hand tool & Picture Ribbon with actual properties
    expect(screen.getByTestId("pic-flow").getAttribute("data-mode")).toBe("picture");

    // Switching to Arrow Tool shows Object Ribbon with real X/Y/W/H & inherited defaults
    fireEvent.click(document.querySelector('[data-studio-tool-button="select"]')!);
    expect(screen.getByTestId("pic-flow").getAttribute("data-mode")).toBe("object");
    const objRibbon = document.querySelector<HTMLElement>('[data-studio-object-ribbon="true"]')!;
    const xAfter = objRibbon.querySelector<HTMLInputElement>('[data-ribbon-field="x"]')!;
    expect(xAfter.disabled).toBe(false);
    expect(parseFloat(xAfter.value)).toBeGreaterThan(10);
    expect(objRibbon.querySelector('[data-ribbon-field="border-color"]')?.getAttribute("data-value")).toBe("#B91C1C");
    expect(objRibbon.querySelector('[data-ribbon-field="border-pattern"]')?.getAttribute("data-value")).toBe("dashed");
  });

  it("preserves existing selected picture across tool switches without modifying or deleting it", () => {
    const existing = makePictureFrame({ id: "keep-pic", xMm: 44, yMm: 55, wMm: 70, hMm: 50, borderColor: "#1D4ED8" });
    render(<PictureToolFlowHarness initialFrames={[existing]} initialSelected={[existing.id]} initialTool="select" />);

    const ribbon = () => document.querySelector<HTMLElement>('[data-studio-object-ribbon="true"]')!;
    expect((ribbon().querySelector('[data-ribbon-field="x"]') as HTMLInputElement).value).toBe("44.00mm");

    // Click Picture Tool -> immediately shows blank X/Y/W/H creation mode, while existing object stays untouched
    fireEvent.click(document.querySelector('[data-studio-tool-button="cross-circle"]')!);
    expect(ribbon().dataset.ribbonMode).toBe("picture-tool");
    expect((ribbon().querySelector('[data-ribbon-field="x"]') as HTMLInputElement).value).toBe("");

    // Change a default while Picture Tool is active -> must NOT mutate existing object
    fireEvent.click(ribbon().querySelector('[data-ribbon-field="border-color"]')!);
    fireEvent.click(within(screen.getByRole("listbox", { name: "Object Border Color options" })).getByRole("option", { name: "Green" }));

    // Return to Arrow Tool -> restores previously selected picture & its untouched actual properties
    fireEvent.click(document.querySelector('[data-studio-tool-button="select"]')!);
    expect(ribbon().dataset.ribbonMode).toBe("object");
    expect((ribbon().querySelector('[data-ribbon-field="x"]') as HTMLInputElement).value).toBe("44.00mm");
    expect(ribbon().querySelector('[data-ribbon-field="border-color"]')?.getAttribute("data-value")).toBe("#1D4ED8");
    const frames = JSON.parse(screen.getByTestId("pic-flow").getAttribute("data-frames")!) as StudioFrame[];
    expect(frames).toHaveLength(1);
    expect(frames[0].borderColor).toBe("#1D4ED8");
    expect(JSON.parse(screen.getByTestId("pic-flow").getAttribute("data-selected")!)).toEqual([existing.id]);
  });
});

describe("Picture-selected property toolbar (InPage Hand mode parity)", () => {
  it("renders 47px two-row ribbon with real image values, filename, Fit Picture, and honest disabled controls", () => {
    const pic = makePictureFrame();
    render(<Harness initialFrames={[pic]} mode="picture" />);

    const ribbon = document.querySelector<HTMLElement>('[data-studio-object-ribbon="true"]')!;
    expect(ribbon.dataset.ribbonMode).toBe("picture");
    expect(ribbon.style.height).toBe("47px");

    const ox = screen.getByLabelText("Picture Origin Across") as HTMLInputElement;
    const oy = screen.getByLabelText("Picture Origin Down") as HTMLInputElement;
    const sx = screen.getByLabelText("Picture Scaling Across") as HTMLInputElement;
    const sy = screen.getByLabelText("Picture Scaling Down") as HTMLInputElement;
    const a2 = screen.getByLabelText("Picture Angle") as HTMLInputElement;

    expect(ox.value).toBe("-21.69mm");
    expect(oy.value).toBe("5.83mm");
    expect(sx.value).toBe("88%");
    expect(sy.value).toBe("88%");
    expect(a2.value).toBe("0°");
    expect(ribbon.querySelector('[data-ribbon-field="picture-filename"]')?.textContent).toBe("1 percent.JPG");

    // Unsupported InPage controls must be honestly disabled
    expect((screen.getByLabelText("Picture Brightness") as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText("Picture Contrast") as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText("Mirror Picture Horizontally") as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByLabelText("Mirror Picture Vertically") as HTMLButtonElement).disabled).toBe(true);

    // Edit Origin Across + Scaling Across + Picture Angle
    fireEvent.change(ox, { target: { value: "4.5mm" } });
    fireEvent.keyDown(ox, { key: "Enter" });
    expect(readFramesFromHarness()[0].imageXMm).toBe(4.5);

    fireEvent.change(sx, { target: { value: "50%" } });
    fireEvent.keyDown(sx, { key: "Enter" });
    expect(formatScalePercent(pictureScalePercent(readFramesFromHarness()[0]).x)).toBe("50%");

    fireEvent.change(a2, { target: { value: "15" } });
    fireEvent.keyDown(a2, { key: "Enter" });
    expect(readFramesFromHarness()[0].angle2Deg).toBe(15);

    // Fit Picture to Box resets image placement & angle2
    fireEvent.click(screen.getByRole("button", { name: "Fit Picture to Box" }));
    const fitted = readFramesFromHarness()[0];
    expect(fitted.angle2Deg).toBe(0);
    expect(fitted.imageXMm).toBeGreaterThanOrEqual(-0.01);
  });

  it("disables editable picture controls when picture box has no image or is locked", () => {
    const emptyPic = makePictureFrame({ id: "empty", imageSrc: undefined, imageName: undefined });
    const lockedPic = makePictureFrame({ id: "locked", locked: true });
    render(<Harness initialFrames={[emptyPic, lockedPic]} mode="picture" />);

    expect((screen.getByLabelText("Picture Origin Across") as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText("Fit Picture to Box") as HTMLButtonElement).disabled).toBe(true);
    expect(document.querySelector('[data-ribbon-field="picture-filename"]')?.textContent).toBe("No picture");

    fireEvent.click(screen.getByRole("button", { name: "Select locked" }));
    expect((screen.getByLabelText("Picture Origin Across") as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText("Picture Angle") as HTMLInputElement).disabled).toBe(true);
  });
});

describe("Object-selected property toolbar (InPage Arrow mode parity)", () => {
  it("edits geometry, border color/width/pattern/position, shape, roundness, background, hatch, and angle1", () => {
    const pic = makePictureFrame();
    render(<Harness initialFrames={[pic]} mode="object" />);

    const ribbon = document.querySelector<HTMLElement>('[data-studio-object-ribbon="true"]')!;
    expect(ribbon.dataset.ribbonMode).toBe("object");
    expect(ribbon.style.height).toBe("47px");

    const xInput = screen.getByLabelText("Object Across (X)") as HTMLInputElement;
    const wInput = screen.getByLabelText("Object Width") as HTMLInputElement;
    const roundnessInput = screen.getByLabelText("Object Corner Roundness") as HTMLInputElement;
    expect(xInput.value).toBe("108.15mm");
    expect(wInput.value).toBe("81.76mm");
    // Roundness disabled on Rectangular box just like InPage 2009
    expect(roundnessInput.disabled).toBe(true);
    expect((screen.getByLabelText("Object Run Around") as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByLabelText("Object Inset") as HTMLButtonElement).disabled).toBe(true);

    // Geometry edits
    fireEvent.change(xInput, { target: { value: "25mm" } });
    fireEvent.keyDown(xInput, { key: "Enter" });
    expect(readFramesFromHarness()[0].xMm).toBe(25);

    fireEvent.change(wInput, { target: { value: "90" } });
    fireEvent.keyDown(wInput, { key: "Enter" });
    expect(readFramesFromHarness()[0].wMm).toBe(90);

    // Border Position Outside / Inside
    fireEvent.click(screen.getByRole("button", { name: "Object Border Outside" }));
    expect(readFramesFromHarness()[0].borderPosition).toBe("outside");
    fireEvent.click(screen.getByRole("button", { name: "Object Border Inside" }));
    expect(readFramesFromHarness()[0].borderPosition).toBe("inside");

    // Border Color & Background Color combos
    fireEvent.click(screen.getByLabelText("Object Border Color"));
    fireEvent.click(within(screen.getByRole("listbox", { name: "Object Border Color options" })).getByRole("option", { name: "Blue" }));
    expect(readFramesFromHarness()[0].borderColor).toBe("#1D4ED8");

    fireEvent.click(screen.getByLabelText("Object Background Color"));
    fireEvent.click(within(screen.getByRole("listbox", { name: "Object Background Color options" })).getByRole("option", { name: "None" }));
    expect(readFramesFromHarness()[0].backgroundColor).toBeUndefined();

    // All 9 Border Patterns & Border Width (including pt and mm)
    for (const opt of BORDER_PATTERN_OPTIONS) {
      fireEvent.click(screen.getByLabelText("Object Border Pattern"));
      fireEvent.click(within(screen.getByRole("listbox", { name: "Object Border Pattern options" })).getByRole("option", { name: opt.label }));
      expect(readFramesFromHarness()[0].borderPattern).toBe(opt.id);
    }
    fireEvent.click(screen.getByLabelText("Object Border Pattern"));
    fireEvent.click(within(screen.getByRole("listbox", { name: "Object Border Pattern options" })).getByRole("option", { name: "Double" }));
    expect(readFramesFromHarness()[0].borderPattern).toBe("double");

    const bwInput = screen.getByLabelText("Object Border Width") as HTMLInputElement;
    fireEvent.change(bwInput, { target: { value: "2.5pt" } });
    fireEvent.keyDown(bwInput, { key: "Enter" });
    expect(readFramesFromHarness()[0].borderWidthMm).toBeCloseTo((2.5 * 25.4) / 72);

    // Shape switching enables Roundness for Rounded Rectangular Picture Box
    fireEvent.click(screen.getByRole("button", { name: "Rounded Rectangular Picture Box" }));
    expect(readFramesFromHarness()[0].kind).toBe("picture-round-rect");
    expect((screen.getByLabelText("Object Corner Roundness") as HTMLInputElement).disabled).toBe(false);

    fireEvent.change(roundnessInput, { target: { value: "10mm" } });
    fireEvent.keyDown(roundnessInput, { key: "Enter" });
    expect(readFramesFromHarness()[0].roundnessMm).toBe(10);

    // Angle1 edit
    const a1 = screen.getByLabelText("Object Angle") as HTMLInputElement;
    fireEvent.change(a1, { target: { value: "-30°" } });
    fireEvent.keyDown(a1, { key: "Enter" });
    expect(readFramesFromHarness()[0].angle1Deg).toBe(-30);
  });

  it("supports drawing shape switching and disables shape controls for lines and text boxes", () => {
    const shape = makeShapeFrame();
    const line = makeShapeFrame({ id: "line-1", kind: "line" });
    render(<Harness initialFrames={[shape, line]} mode="object" />);

    fireEvent.click(screen.getByRole("button", { name: "Elliptical Shape" }));
    expect(readFramesFromHarness()[0].kind).toBe("ellipse");

    fireEvent.click(screen.getByRole("button", { name: "Select line-1" }));
    expect((screen.getByLabelText("Object Angle") as HTMLInputElement).disabled).toBe(false);
    expect((screen.getByRole("button", { name: "Rectangular Shape" }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("Multiple-selection common-property editing and synchronization", () => {
  it("shows shared values, hides differing values as blank mixed, and applies edits across unlocked frames", () => {
    const f1 = makeShapeFrame({ id: "s1", xMm: 10, yMm: 20, borderColor: "#000000" });
    const f2 = makeShapeFrame({ id: "s2", xMm: 45, yMm: 20, borderColor: "#B91C1C" });
    const f3 = makeShapeFrame({ id: "s3", xMm: 80, yMm: 20, locked: true, borderColor: "#000000" });

    render(<Harness initialFrames={[f1, f2, f3]} initialSelected={["s1", "s2", "s3"]} mode="object" />);

    const xInput = screen.getByLabelText("Object Across (X)") as HTMLInputElement;
    const yInput = screen.getByLabelText("Object Down (Y)") as HTMLInputElement;
    const borderCombo = screen.getByLabelText("Object Border Color");

    expect(xInput.value).toBe("");
    expect(xInput.getAttribute("data-mixed")).toBe("true");
    expect(yInput.value).toBe("20.00mm");
    expect(borderCombo.getAttribute("data-mixed")).toBe("true");

    // Apply common Border Color and Pattern
    fireEvent.click(borderCombo);
    fireEvent.click(within(screen.getByRole("listbox", { name: "Object Border Color options" })).getByRole("option", { name: "Blue" }));

    const afterColor = readFramesFromHarness();
    expect(afterColor[0].borderColor).toBe("#1D4ED8");
    expect(afterColor[1].borderColor).toBe("#1D4ED8");
    expect(afterColor[2].borderColor).toBe("#000000"); // locked stays untouched
    // Mixed remains true while locked s3 still holds #000000 alongside updated s1/s2
    expect(borderCombo.getAttribute("data-mixed")).toBe("true");
  });

  it("clears mixed indicator once all selected unlocked objects share the applied property", () => {
    const f1 = makeShapeFrame({ id: "s1", xMm: 10, yMm: 20, borderColor: "#000000" });
    const f2 = makeShapeFrame({ id: "s2", xMm: 45, yMm: 20, borderColor: "#B91C1C" });

    render(<Harness initialFrames={[f1, f2]} initialSelected={["s1", "s2"]} mode="object" />);
    const borderCombo = screen.getByLabelText("Object Border Color");
    expect(borderCombo.getAttribute("data-mixed")).toBe("true");

    fireEvent.click(borderCombo);
    fireEvent.click(within(screen.getByRole("listbox", { name: "Object Border Color options" })).getByRole("option", { name: "Blue" }));

    expect(borderCombo.getAttribute("data-mixed")).toBeNull();
    expect(borderCombo.getAttribute("data-value")).toBe("#1D4ED8");
  });

  it("stays synchronized with Modify Object dialog in both directions", () => {
    const pic = makePictureFrame({ xMm: 12, borderPattern: "solid" });
    render(<Harness initialFrames={[pic]} mode="object" />);

    // Toolbar -> Dialog
    const xToolbar = screen.getByLabelText("Object Across (X)") as HTMLInputElement;
    fireEvent.change(xToolbar, { target: { value: "33.5mm" } });
    fireEvent.keyDown(xToolbar, { key: "Enter" });

    fireEvent.click(screen.getByRole("button", { name: "Open Modify Dialog" }));
    const dialog = screen.getByRole("dialog", { name: "Modify Object" });
    expect((dialog.querySelector('[data-object-field="x"]') as HTMLInputElement).value).toBe("33.50mm");
    expect((within(dialog).getByLabelText("Border Pattern")).getAttribute("data-value")).toBe("solid");

    // Dialog -> Toolbar
    fireEvent.change(dialog.querySelector('[data-object-field="w"]')!, { target: { value: "77mm" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "OK" }));
    expect((screen.getByLabelText("Object Width") as HTMLInputElement).value).toBe("77.00mm");
  });
});

describe("Keyboard navigation, field validation, Escape selection safety, and grouped Undo/Redo", () => {
  it("reverts invalid inputs on Enter and cancels draft on Escape without clearing canvas selection", () => {
    const pic = makePictureFrame({ wMm: 60 });
    const selectionSpy: string[][] = [];
    render(
      <div>
        <Harness initialFrames={[pic]} mode="object" />
        <StudioObjectLayer
          editor={null}
          tool="select"
          frames={[pic]}
          selectedIds={[pic.id]}
          onSelectedChange={(next) => selectionSpy.push(next)}
          onFramesChange={() => {}}
          onToolAction={() => {}}
          pageCount={1}
          pageWidthPx={400}
          pageHeightPx={600}
          gapPx={16}
          marginTopPx={24}
          marginRightPx={24}
        />
      </div>,
    );

    const wInput = screen.getByLabelText("Object Width") as HTMLInputElement;
    fireEvent.change(wInput, { target: { value: "not-a-number" } });
    fireEvent.keyDown(wInput, { key: "Enter" });
    expect(wInput.value).toBe("60.00mm");
    expect(readFramesFromHarness()[0].wMm).toBe(60);

    fireEvent.change(wInput, { target: { value: "0.2mm" } }); // below min 1mm
    fireEvent.keyDown(wInput, { key: "Enter" });
    expect(wInput.value).toBe("60.00mm");

    // Escape reverts draft AND preserves selection
    selectionSpy.length = 0;
    fireEvent.change(wInput, { target: { value: "95" } });
    fireEvent.keyDown(wInput, { key: "Escape" });
    expect(wInput.value).toBe("60.00mm");
    expect(selectionSpy).toEqual([]);
    expect(JSON.parse(screen.getByTestId("frame-state").getAttribute("data-selected")!)).toEqual([pic.id]);
  });

  it("groups repeated adjustments to the same field into one Undo step and ignores Ctrl+Y", () => {
    const pic = makePictureFrame({ xMm: 10 });
    render(<Harness initialFrames={[pic]} mode="object" />);

    const xInput = screen.getByLabelText("Object Across (X)") as HTMLInputElement;
    fireEvent.focus(xInput);
    fireEvent.keyDown(xInput, { key: "ArrowUp" });
    fireEvent.keyDown(xInput, { key: "ArrowUp" });
    fireEvent.keyDown(xInput, { key: "ArrowUp" });
    expect(readFramesFromHarness()[0].xMm).toBe(13);

    // Different field creates a second Undo entry
    const wInput = screen.getByLabelText("Object Width") as HTMLInputElement;
    fireEvent.change(wInput, { target: { value: "95" } });
    fireEvent.keyDown(wInput, { key: "Enter" });
    expect(readFramesFromHarness()[0].wMm).toBe(95);

    // Ctrl+Z while focused on committed toolbar input undoes width first, then all grouped X steps together
    fireEvent.keyDown(wInput, { key: "z", code: "KeyZ", ctrlKey: true });
    expect(readFramesFromHarness()[0].wMm).toBe(81.76);
    expect(readFramesFromHarness()[0].xMm).toBe(13);

    fireEvent.keyDown(wInput, { key: "z", code: "KeyZ", ctrlKey: true });
    expect(readFramesFromHarness()[0].xMm).toBe(10);

    // Ctrl+Y MUST NOT redo
    fireEvent.keyDown(wInput, { key: "y", code: "KeyY", ctrlKey: true });
    expect(readFramesFromHarness()[0].xMm).toBe(10);

    // Ctrl+Shift+Z redoes cleanly
    fireEvent.keyDown(wInput, { key: "z", code: "KeyZ", ctrlKey: true, shiftKey: true });
    expect(readFramesFromHarness()[0].xMm).toBe(13);

    // Dirty input protects native typing undo instead of stealing Ctrl+Z
    fireEvent.change(xInput, { target: { value: "999" } });
    expect(xInput.getAttribute("data-ribbon-dirty")).toBe("true");
    expect(
      resolveStudioHistoryShortcut({
        defaultPrevented: false,
        ctrlKey: true,
        metaKey: false,
        altKey: false,
        shiftKey: false,
        key: "z",
        code: "KeyZ",
        target: xInput,
      }),
    ).toBeNull();
  });
});

describe(".qpg persistence and PDF/Print geometry after toolbar edits", () => {
  it("preserves imageName, pattern, colors, roundness, and rotation across serializeQpg / deserializeQpg and renderPrintFrame", () => {
    const edited = applyObjectGeometry(makePictureFrame(), {
      xMm: 14.5,
      yMm: 22.25,
      wMm: 75,
      hMm: 55,
      kind: "picture-round-rect",
      roundnessMm: 8,
      angle1Deg: 12,
      angle2Deg: -5,
      borderColor: "#B91C1C",
      borderWidthMm: (2 * 25.4) / 72,
      borderPattern: "dash-dot",
      borderPosition: "outside",
      backgroundColor: "#FEF08A",
    })!;

    const doc: QpgDocument = {
      title: "Toolbar Persistence",
      content: { type: "doc", content: [{ type: "paragraph" }] },
      documentSettings: defaultDocumentSettings(),
      frames: [edited],
      minimumPages: 1,
      columns: { count: 1, gutterMm: 5 },
      viewMode: "pages",
    };

    const reopened = deserializeQpg(serializeQpg(doc));
    expect(reopened.frames[0]).toMatchObject({
      imageName: "1 percent.JPG",
      kind: "picture-round-rect",
      roundnessMm: 8,
      angle1Deg: 12,
      angle2Deg: -5,
      borderColor: "#B91C1C",
      borderPattern: "dash-dot",
      borderPosition: "outside",
      backgroundColor: "#FEF08A",
    });

    // Backward compatibility: legacy .qpg without imageName still deserializes cleanly
    const legacyDoc: QpgDocument = { ...doc, frames: [makeShapeFrame()] };
    const legacyReopened = deserializeQpg(serializeQpg(legacyDoc));
    expect(legacyReopened.frames[0].imageName).toBeUndefined();

    // Print validation and SVG markup output preserve geometry, pattern, background fill, and Pattern=None suppression
    const validated = validatePrintFrames(reopened.frames);
    expect(validated[0].imageName).toBe("1 percent.JPG");
    const svg = renderPrintFrame(validated[0]);
    expect(svg).toContain('fill="#FEF08A"');
    expect(svg).toContain('stroke="#B91C1C"');
    expect(svg).toContain("stroke-dasharray=");
    expect(svg).toContain("rotate(-12deg)");

    const shaped = applyObjectGeometry(makeShapeFrame({ kind: "ellipse" }), {
      backgroundColor: "#1D4ED8",
      borderPattern: "none",
    })!;
    const ellipseSvg = renderPrintFrame(validatePrintFrames([shaped])[0]);
    expect(ellipseSvg).toContain('<ellipse cx="25" cy="20" rx="25" ry="20" fill="#1D4ED8"/>');
    expect(ellipseSvg).not.toContain('stroke="#000"');
  });
});
