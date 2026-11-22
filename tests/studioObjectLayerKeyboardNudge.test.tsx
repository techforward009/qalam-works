// @vitest-environment happy-dom

import { fireEvent, render } from "@testing-library/react";
import { act, useState } from "react";
import { describe, expect, it } from "vitest";
import { StudioObjectLayer, type StudioFrame } from "../app/tools/document-studio/components/StudioObjectLayer";

const frame = (patch: Partial<StudioFrame> = {}): StudioFrame => ({
  id: "frame-1", kind: "picture-rect", page: 1, xMm: 20, yMm: 30, wMm: 40, hMm: 25, flip: false, text: "", ...patch,
});

function Harness({ tool = "select", selectedIds = ["frame-1"], initial = [frame()] }: {
  tool?: "select" | "text";
  selectedIds?: string[];
  initial?: StudioFrame[];
}) {
  const [frames, setFrames] = useState(initial);
  return (
    <>
      <div className="ProseMirror" contentEditable suppressContentEditableWarning />
      <textarea aria-label="outside input" />
      <StudioObjectLayer
        editor={null}
        tool={tool}
        frames={frames}
        selectedIds={selectedIds}
        onFramesChange={setFrames}
        onToolAction={() => {}}
        pageCount={2}
        pageWidthPx={794}
        pageHeightPx={1123}
        gapPx={12}
        marginTopPx={0}
        marginRightPx={0}
      />
      <output data-testid="position">{frames.map((item) => `${item.id}:${item.xMm}:${item.yMm}`).join(",")}</output>
    </>
  );
}

function SequentialHarness() {
  const [frames, setFrames] = useState([frame()]);
  const [selectedIds, setSelectedIds] = useState(["frame-1"]);
  return (
    <>
      <div className="ProseMirror" contentEditable suppressContentEditableWarning data-text-align="justify">یہ اردو پیراگراف اپنی justified ترتیب برقرار رکھتا ہے۔</div>
      <button type="button" onClick={() => {
        setFrames((current) => [...current, frame({ id: "frame-2", xMm: 80 })]);
        setSelectedIds(["frame-2"]);
      }}>Create second frame</button>
      <StudioObjectLayer
        editor={null}
        tool="select"
        frames={frames}
        selectedIds={selectedIds}
        onFramesChange={setFrames}
        onSelectedChange={setSelectedIds}
        onToolAction={() => {}}
        pageCount={2}
        pageWidthPx={794}
        pageHeightPx={1123}
        gapPx={12}
        marginTopPx={0}
        marginRightPx={0}
      />
      <output data-testid="position">{frames.map((item) => `${item.id}:${item.xMm}:${item.yMm}`).join(",")}</output>
    </>
  );
}

describe("StudioObjectLayer keyboard nudge", () => {
  it("moves selected frames from the retained main-editor focus and prevents the handled arrow default", () => {
    const { container, getByTestId } = render(<Harness />);
    const editor = container.querySelector(".ProseMirror")!;
    const event = new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true });
    act(() => { editor.dispatchEvent(event); });
    expect(event.defaultPrevented).toBe(true);
    expect(getByTestId("position").textContent).toContain(`frame-1:${20 + 25.4 / 72}:30`);
  });

  it("does not nudge from editable controls, outside Select mode, no selection, or an open dialog", () => {
    const { container, getByLabelText, getByTestId, rerender } = render(<Harness />);
    const original = getByTestId("position").textContent;
    fireEvent.keyDown(getByLabelText("outside input"), { key: "ArrowRight" });
    expect(getByTestId("position").textContent).toBe(original);

    rerender(<Harness tool="text" />);
    fireEvent.keyDown(document.body, { key: "ArrowRight" });
    expect(getByTestId("position").textContent).toBe(original);

    rerender(<Harness selectedIds={[]} />);
    fireEvent.keyDown(document.body, { key: "ArrowRight" });
    expect(getByTestId("position").textContent).toBe(original);

    rerender(<><div role="dialog" /><Harness /></>);
    fireEvent.keyDown(container.querySelector(".ProseMirror")!, { key: "ArrowRight" });
    expect(getByTestId("position").textContent).toBe(original);
  });

  it("keeps locked selected frames stationary", () => {
    const locked = frame({ locked: true });
    const { getByTestId } = render(<Harness initial={[locked]} />);
    fireEvent.keyDown(document.body, { key: "ArrowDown" });
    expect(getByTestId("position").textContent).toBe("frame-1:20:30");
  });

  it("moves each newly selected frame after prior nudges without changing justified Urdu content", () => {
    const { container, getByRole, getByTestId } = render(<SequentialHarness />);
    const editor = container.querySelector(".ProseMirror")!;
    const textBefore = editor.textContent;
    fireEvent.keyDown(editor, { key: "ArrowRight" });
    expect(getByTestId("position").textContent).toContain(`frame-1:${20 + 25.4 / 72}:30`);

    fireEvent.click(getByRole("button", { name: "Create second frame" }));
    fireEvent.keyDown(editor, { key: "ArrowDown" });
    expect(getByTestId("position").textContent).toContain(`frame-2:80:${30 + 25.4 / 72}`);
    expect(editor.getAttribute("data-text-align")).toBe("justify");
    expect(editor.textContent).toBe(textBefore);
  });
});
