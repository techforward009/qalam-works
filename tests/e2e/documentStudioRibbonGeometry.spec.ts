import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });

const CONTROLS: Array<[string, number, number, number, number]> = [
  ["style", 2, 3, 100, 20],
  ["leading-icon", 103, 3, 19, 19],
  ["leading", 122, 3, 60, 19],
  ["english-font", 184, 3, 202, 20],
  ["bold", 388, 3, 20, 18],
  ["italic", 408, 3, 20, 18],
  ["size", 430, 3, 80, 20],
  ["tracking-icon", 512, 3, 19, 19],
  ["tracking", 531, 3, 60, 19],
  ["tabs", 594, 3, 20, 18],
  ["language", 618, 3, 68, 20],
  ["align-left", 2, 24, 20, 18],
  ["align-right", 22, 24, 20, 18],
  ["align-center", 42, 24, 20, 18],
  ["align-justify", 62, 24, 20, 18],
  ["align-full", 82, 24, 20, 18],
  ["interline-icon", 103, 24, 19, 19],
  ["gap", 122, 24, 60, 19],
  ["urdu-font", 184, 24, 202, 20],
  ["ltr", 388, 24, 20, 18],
  ["rtl", 408, 24, 20, 18],
  ["colour", 430, 24, 80, 20],
  ["scale-icon", 512, 24, 19, 19],
  ["scale", 531, 24, 60, 19],
  ["outline", 594, 24, 20, 18],
  ["text-style", 618, 24, 100, 20],
  ["kashida", 721, 24, 80, 20],
];

test("InPage ribbon geometry at 1600x900", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop-chrome", "specified at desktop 1600x900, deviceScaleFactor 1");
  await page.addInitScript(() => localStorage.setItem("qalam-site-language", "en"));
  await page.goto("/tools/document-studio", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".ProseMirror")).toBeEditable();
  const bar = page.locator("[data-studio-toolbar]");
  await expect(bar).toBeVisible();
  const boxes = await page.evaluate(() => {
    const toolbar = document.querySelector("[data-studio-toolbar]")!.getBoundingClientRect();
    const read = (name: string) => {
      const node = document.querySelector(`[data-studio-geom='${name}']`)!;
      const rect = node.getBoundingClientRect();
      return { x: rect.left - toolbar.left, y: rect.top - toolbar.top, w: rect.width, h: rect.height };
    };
    return {
      height: toolbar.height,
      controls: Object.fromEntries(["style", "leading-icon", "leading", "english-font", "bold", "italic", "size", "tracking-icon", "tracking", "tabs", "language", "align-left", "align-right", "align-center", "align-justify", "align-full", "interline-icon", "gap", "urdu-font", "ltr", "rtl", "colour", "scale-icon", "scale", "outline", "text-style", "kashida"].map((name) => [name, read(name)])),
      swatch: (() => {
        const rect = document.querySelector("[data-studio-colour-swatch]")!.getBoundingClientRect();
        return { x: rect.left - toolbar.left, y: rect.top - toolbar.top, w: rect.width, h: rect.height };
      })(),
    };
  });
  expect(Math.abs(boxes.height - 47)).toBeLessThanOrEqual(1);
  for (const [name, x, y, w, h] of CONTROLS) {
    const box = boxes.controls[name];
    expect(Math.abs(box.x - x), name).toBeLessThanOrEqual(1);
    expect(Math.abs(box.y - y), name).toBeLessThanOrEqual(1);
    expect(Math.abs(box.w - w), name).toBeLessThanOrEqual(1);
    expect(Math.abs(box.h - h), name).toBeLessThanOrEqual(1);
  }
  expect(Math.abs(boxes.swatch.x - 434)).toBeLessThanOrEqual(1);
  expect(Math.abs(boxes.swatch.y - 28)).toBeLessThanOrEqual(1);
  expect(Math.abs(boxes.swatch.w - 12)).toBeLessThanOrEqual(1);
  expect(Math.abs(boxes.swatch.h - 12)).toBeLessThanOrEqual(1);
  await expect(page.locator("[data-studio-tracking]")).toBeEnabled();
  await expect(page.locator("[data-studio-scale]")).toBeEnabled();
  await expect(page.locator("[aria-label='K-None']")).toBeEnabled();
  await expect(page.locator("[data-studio-toolbar] [data-studio-highlight-button]")).toHaveCount(0);
  expect(await page.locator("[data-studio-align]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-studio-align")))).toEqual(["left", "right", "center", "justify", "justify-all"]);
  const ink = await page.locator("[data-studio-tracking]").evaluate((node) => getComputedStyle(node).color);
  expect(ink).toBe("rgb(0, 0, 0)");
  await bar.screenshot({ path: "/workspace/qalam-toolbar-1600.png" });
});
