/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { StudioObjectRibbon } from "../app/tools/document-studio/components/StudioObjectRibbon";
import type { StudioFrame } from "../app/tools/document-studio/components/StudioObjectLayer";

const text: StudioFrame = {
  id: "tb",
  kind: "text",
  page: 1,
  xMm: 10,
  yMm: 20,
  wMm: 60,
  hMm: 30,
  flip: false,
  text: "متن",
};

afterEach(() => cleanup());

function renderRibbon(frame: StudioFrame, onChange: (frameId: string, patch: Record<string, unknown>) => void = () => {}) {
  render(<StudioObjectRibbon frame={frame} onChange={onChange} />);
}

function openDialog(frame: StudioFrame) {
  const target = document.createElement("div");
  target.dataset.studioFrame = frame.kind;
  target.dataset.studioFrameId = frame.id;
  document.body.append(target);
  fireEvent.contextMenu(target, { clientX: 24, clientY: 36 });
  fireEvent.click(screen.getByRole("menuitem", { name: "Format Object..." }));
  return screen.getByRole("dialog", { name: "Modify Object" });
}

function gray(field: HTMLInputElement) {
  expect(field.disabled).toBe(true);
  expect(field.readOnly).toBe(true);
  expect(`${field.style.background}${field.style.backgroundColor}`).toMatch(/#d4d4d4|212,\s*212,\s*212/i);
}

describe("text object ribbon and Modify Object", () => {
  it("shows the text ribbon and wires columns, inset, direction and border without writing defaults", () => {
    const changes: Array<Record<string, unknown>> = [];
    renderRibbon(text, (_id, patch) => changes.push(patch));
    const ribbon = document.querySelector("[data-studio-object-ribbon]")!;
    expect(ribbon.querySelector("[aria-label='Column count']")).toBeTruthy();
    expect(ribbon.querySelector("[aria-label='Rounded Rectangular Picture Box']")).toBeNull();
    expect((ribbon.querySelector("[aria-label='Rectangular Text Box']") as HTMLButtonElement).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(ribbon.querySelector("[aria-label='Elliptical Text Box']")!);
    expect(changes.at(-1)).toMatchObject({ textShape: "ellipse" });
    fireEvent.change(ribbon.querySelector("[aria-label='Column count']")!, { target: { value: "3" } });
    fireEvent.blur(ribbon.querySelector("[aria-label='Column count']")!);
    expect(changes.at(-1)).toMatchObject({ columnCount: 3 });
    fireEvent.change(ribbon.querySelector("[aria-label='Border Pattern']")!, { target: { value: "dashed" } });
    expect(changes.at(-1)).toMatchObject({ borderPattern: "dashed" });
    cleanup();

    const styled = { ...text, textShape: "ellipse" as const, columnCount: 3, borderPattern: "dashed" as const };
    const kept: Array<Record<string, unknown>> = [];
    renderRibbon(styled, (_id, patch) => kept.push(patch));
    const dialog = openDialog(styled);
    expect(dialog.querySelector("[aria-label='Origin Across']")).toBeNull();
    expect(dialog.querySelector("[aria-label='Roundness']")).toBeNull();
    expect(dialog.querySelector("[aria-label='Column count']")).toBeTruthy();
    expect(dialog.querySelector("[aria-label='Inset']")).toBeTruthy();
    expect((dialog.querySelector("[aria-label='Right to Left']") as HTMLInputElement).checked).toBe(true);
    expect((dialog.querySelector("[aria-label='Elliptical Text Box']") as HTMLInputElement).checked).toBe(true);
    expect(dialog.querySelector("[aria-label='Rounded Rectangular Picture Box']")).toBeNull();
    expect((dialog.querySelector("[aria-label='Border Pattern']") as HTMLSelectElement).value).toBe("dashed");
    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    const unchanged = kept[0];
    for (const key of ["columnCount", "columnGutterMm", "columnDirection", "insetMm", "borderColor", "borderWidthMm", "columnRulePattern", "textShape"]) {
      expect(unchanged[key]).toBeUndefined();
    }
    cleanup();
    const edited: Array<Record<string, unknown>> = [];
    render(<StudioObjectRibbon frame={text} onChange={(_id, patch) => edited.push(patch)} />);
    const next = openDialog(text);
    fireEvent.change(next.querySelector("[aria-label='Column count']")!, { target: { value: "2" } });
    fireEvent.change(next.querySelector("[aria-label='Column gutter']")!, { target: { value: "4mm" } });
    fireEvent.change(next.querySelector("[aria-label='Inset']")!, { target: { value: "3mm" } });
    fireEvent.click(next.querySelector("[aria-label='Left to Right']")!);
    fireEvent.change(next.querySelector("[aria-label='Border Pattern']")!, { target: { value: "solid" } });
    fireEvent.change(next.querySelector("[aria-label='Column rule pattern']")!, { target: { value: "dotted" } });
    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    expect(edited[0]).toMatchObject({ columnCount: 2, columnGutterMm: 4, insetMm: 3, columnDirection: "ltr", borderPattern: "solid", columnRulePattern: "dotted" });
    expect(next.style.width).toBe("352px");
    expect(next.style.height).toBe("322px");
  });

  it("disables Height, Columns and Gutter for a single-line box and keeps the other fields", () => {
    const changes: Array<Record<string, unknown>> = [];
    const frame = { ...text, singleLine: true, hMm: 8.5725 };
    render(<StudioObjectRibbon frame={frame} onChange={(_id, patch) => changes.push(patch)} />);
    const ribbon = document.querySelector("[data-studio-object-ribbon]")!;
    gray(ribbon.querySelector("[data-object-field='h']")!);
    gray(ribbon.querySelector("[data-object-field='columns']")!);
    gray(ribbon.querySelector("[data-object-field='gutter']")!);
    expect((ribbon.querySelector("[data-object-field='w']") as HTMLInputElement).disabled).toBe(false);
    expect((ribbon.querySelector("[aria-label='Border Pattern']") as HTMLSelectElement).disabled).toBe(false);
    expect((ribbon.querySelector("[aria-label='Inset']") as HTMLInputElement | null)).toBeNull();
    const dialog = openDialog(frame);
    gray(dialog.querySelector("[data-object-field='h']")!);
    gray(dialog.querySelector("[data-object-field='columns']")!);
    gray(dialog.querySelector("[data-object-field='gutter']")!);
    expect((dialog.querySelector("[data-object-field='w']") as HTMLInputElement).disabled).toBe(false);
    expect((dialog.querySelector("[aria-label='Inset']") as HTMLInputElement).disabled).toBe(false);
    expect((dialog.querySelector("[aria-label='Left to Right']") as HTMLInputElement).disabled).toBe(false);
    expect((dialog.querySelector("[aria-label='Column rule pattern']") as HTMLSelectElement).disabled).toBe(false);
    expect((dialog.querySelector("[aria-label='Run Around']") as HTMLInputElement).disabled).toBe(false);
    fireEvent.change(dialog.querySelector("[data-object-field='h']")!, { target: { value: "40" } });
    fireEvent.change(dialog.querySelector("[data-object-field='columns']")!, { target: { value: "4" } });
    fireEvent.change(dialog.querySelector("[aria-label='Inset']")!, { target: { value: "1.5mm" } });
    fireEvent.change(dialog.querySelector("[data-object-field='w']")!, { target: { value: "70" } });
    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    expect(changes[0].hMm).toBeUndefined();
    expect(changes[0].columnCount).toBeUndefined();
    expect(changes[0].columnGutterMm).toBeUndefined();
    expect(changes[0].wMm).toBe(70);
    expect(changes[0].insetMm).toBe(1.5);
  });

  it("reads and writes Run Around without writing defaults on a legacy box", () => {
    const unchanged: Array<Record<string, unknown>> = [];
    renderRibbon(text, (_id, patch) => unchanged.push(patch));
    const dialog = openDialog(text);
    expect((dialog.querySelector("[aria-label='Run Around']") as HTMLInputElement).checked).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    expect(unchanged[0].runAround).toBeUndefined();
    expect(unchanged[0].runAroundLeftMm).toBeUndefined();
    cleanup();

    const on: Array<Record<string, unknown>> = [];
    render(<StudioObjectRibbon frame={text} onChange={(_id, patch) => on.push(patch)} />);
    const next = openDialog(text);
    fireEvent.click(next.querySelector("[aria-label='Run Around']")!);
    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    expect(on[0]).toMatchObject({ runAround: true });
    cleanup();

    const wrapped = { ...text, runAround: true, runAroundLeftMm: 0.71, runAroundRightMm: 0.71, runAroundTopMm: 0.35, runAroundBottomMm: 0.35 };
    const shown: Array<Record<string, unknown>> = [];
    render(<StudioObjectRibbon frame={wrapped} onChange={(_id, patch) => shown.push(patch)} />);
    const again = openDialog(wrapped);
    expect((again.querySelector("[aria-label='Run Around']") as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    expect(shown[0].runAround).toBeUndefined();
  });
});
