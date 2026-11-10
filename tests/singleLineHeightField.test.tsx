/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { StudioObjectRibbon } from "../app/tools/document-studio/components/StudioObjectRibbon";
import { applyObjectGeometry } from "../app/tools/document-studio/utils/objectAttributes";
import type { StudioFrame } from "../app/tools/document-studio/components/StudioObjectLayer";

const picture: StudioFrame = {
  id: "pic",
  kind: "picture-rect",
  page: 1,
  xMm: 10,
  yMm: 20,
  wMm: 40,
  hMm: 12,
  flip: false,
  text: "",
};

afterEach(() => cleanup());

function open(frame: StudioFrame, onChange: (frameId: string, patch: Record<string, unknown>) => void = () => {}) {
  render(<StudioObjectRibbon frame={frame} onChange={onChange} />);
  const target = document.createElement("div");
  target.dataset.studioFrame = "picture-rect";
  target.dataset.studioFrameId = frame.id;
  document.body.append(target);
  fireEvent.contextMenu(target, { clientX: 20, clientY: 30 });
  fireEvent.click(screen.getByRole("menuitem", { name: "Format Object..." }));
  return screen.getByRole("dialog", { name: "Modify Object" });
}

describe("single-line height field", () => {
  it("disables Height for a single-line frame and keeps the other bounds enabled", () => {
    const changes: Array<Record<string, unknown>> = [];
    const frame = { ...picture, singleLine: true, hMm: 8.5725 };
    const dialog = open(frame, (_id, patch) => changes.push(patch));
    const heights = screen.getAllByLabelText("Height") as HTMLInputElement[];
    expect(heights.length).toBeGreaterThan(0);
    for (const height of heights) {
      expect(height.disabled).toBe(true);
      expect(height.readOnly).toBe(true);
      expect(`${height.style.background}${height.style.backgroundColor}`).toMatch(/#d4d4d4|212,\s*212,\s*212/i);
    }
    for (const name of ["X", "Y", "Width"]) {
      for (const field of screen.getAllByLabelText(name) as HTMLInputElement[]) expect(field.disabled).toBe(false);
    }
    fireEvent.change(dialog.querySelector("[data-object-field='h']")!, { target: { value: "40" } });
    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    expect(changes[0].hMm).toBeUndefined();
    expect(changes[0].wMm).toBe(40);
    const applied = applyObjectGeometry({ ...frame, kind: "text" }, { hMm: 40, wMm: 70 });
    expect(applied?.hMm).toBe(8.5725);
    expect(applied?.wMm).toBe(70);
    expect(dialog.querySelector("[aria-label='Column count']")).toBeNull();
    expect(dialog.querySelector("[aria-label='Column gutter']")).toBeNull();
  });

  it("keeps Height enabled for a multiline frame", () => {
    const dialog = open(picture);
    for (const height of screen.getAllByLabelText("Height") as HTMLInputElement[]) expect(height.disabled).toBe(false);
    const multi = applyObjectGeometry({ ...picture, kind: "text", singleLine: false, hMm: 25 }, { hMm: 40 });
    expect(multi?.hMm).toBe(40);
    expect(dialog.querySelector<HTMLInputElement>("[data-object-field='h']")?.disabled).toBe(false);
  });
});
