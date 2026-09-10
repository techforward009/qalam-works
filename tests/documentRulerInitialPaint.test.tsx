/** @vitest-environment happy-dom */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WordRuler } from "../app/tools/document-studio/components/WordRuler";
import { resolvePageLayout } from "../app/tools/document-studio/utils/pageLayout";
import { calculateRulerTicks } from "../app/tools/document-studio/utils/rulerLayout";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const a4 = resolvePageLayout({ size: "a4", orientation: "portrait", marginPreset: "normal" });

function stubClientBox(width: number, height: number) {
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => width });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => height });
}

describe("ruler initial paint does not use millimetres as pixels", () => {
  it("size=0 does not generate visible ruler ticks", () => {
    Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 0 });
    Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => 0 });
    const { container } = render(<WordRuler dir="ltr" layout={a4} axis="horizontal" unit="cm" onPhysicalMarginChange={vi.fn()} />);
    const ruler = container.querySelector("[data-studio-ruler]") as HTMLElement;
    expect(ruler).toBeTruthy();
    expect(ruler.className).toContain("h-6");
    expect(ruler.getAttribute("data-ruler-ready")).toBe("false");
    expect(ruler.getAttribute("data-ruler-measured-px")).toBe("0");
    expect(ruler.querySelectorAll("[data-ruler-tick]").length).toBe(0);
    expect(ruler.querySelector("[data-ruler-handle]")).toBeNull();
    expect(ruler.querySelector("[data-ruler-margin]")).toBeNull();
    expect(ruler.querySelector("[data-ruler-writing-area]")).toBeNull();
    expect(Number(ruler.getAttribute("data-ruler-major-ticks"))).toBe(0);
  });

  it("measured horizontal ruler renders correct ticks", () => {
    const widthPx = 794;
    stubClientBox(widthPx, 24);
    const { container } = render(<WordRuler dir="ltr" layout={a4} axis="horizontal" unit="cm" />);
    const expected = calculateRulerTicks(widthPx, a4.widthMm, "cm");
    const ruler = container.querySelector("[data-studio-ruler]") as HTMLElement;
    expect(ruler.getAttribute("data-ruler-ready")).toBe("true");
    expect(ruler.querySelectorAll("[data-ruler-tick]").length).toBe(expected.length);
    expect(ruler.querySelectorAll("[data-ruler-tick='major']").length).toBe(expected.filter((tick) => tick.kind === "major").length);
    expect(ruler.querySelector("[data-ruler-margin='start']")).toBeTruthy();
  });

  it("measured vertical ruler renders correct ticks", () => {
    const heightPx = 1123;
    stubClientBox(24, heightPx);
    const { container } = render(<WordRuler dir="ltr" layout={a4} axis="vertical" unit="cm" />);
    const expected = calculateRulerTicks(heightPx, a4.heightMm, "cm");
    const ruler = container.querySelector("[data-studio-vertical-ruler]") as HTMLElement;
    expect(ruler.getAttribute("data-ruler-ready")).toBe("true");
    expect(ruler.querySelectorAll("[data-ruler-tick]").length).toBe(expected.length);
    expect(ruler.querySelectorAll("[data-ruler-tick='major']").length).toBe(expected.filter((tick) => tick.kind === "major").length);
  });

  it("A4 mm dimensions are never used as pixel fallback", () => {
    const source = readFileSync(resolve(process.cwd(), "app/tools/document-studio/components/WordRuler.tsx"), "utf8");
    expect(source).not.toMatch(/size\s*\|\|\s*lengthMm/);
    expect(source).not.toMatch(/measured\s*=\s*size\s*\|\|/);
    const canvas = readFileSync(resolve(process.cwd(), "app/tools/document-studio/components/DocumentCanvas.tsx"), "utf8");
    expect(canvas).not.toMatch(/fitWidth\s*\|\|\s*800/);
    Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 0 });
    Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => 0 });
    const { container } = render(<WordRuler dir="ltr" layout={a4} axis="horizontal" unit="cm" />);
    const denseFallback = calculateRulerTicks(a4.widthMm, a4.widthMm, "cm");
    expect(denseFallback.length).toBeGreaterThan(0);
    expect(container.querySelectorAll("[data-ruler-tick]").length).toBe(0);
    expect(container.querySelector("[data-studio-ruler]")?.getAttribute("data-ruler-measured-px")).toBe("0");
  });
});
