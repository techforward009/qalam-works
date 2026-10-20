import { test, expect, type Page } from "@playwright/test";

test.use({ viewport: { width: 1920, height: 1080 } });

async function openCanvas(page: Page) {
  await page.addInitScript(() => localStorage.setItem("qalam-site-language", "en"));
  await page.goto("/tools/document-studio");
  await expect(page.locator(".ProseMirror")).toBeEditable();
  await expect(page.locator('[data-studio-zoom="100"]')).toBeVisible();
}

async function draw(page: Page, tool: string, x: number, y: number, w = 180, h = 90) {
  await page.locator(`[data-studio-tool-button="${tool}"]`).click();
  const layer = await page.locator("[data-studio-objects]").boundingBox();
  if (!layer) throw new Error("Frame layer is missing");
  await page.mouse.move(layer.x + x, layer.y + y);
  await page.mouse.down();
  await page.mouse.move(layer.x + x + w, layer.y + y + h, { steps: 5 });
  await page.mouse.up();
}

test("new and existing text frames receive typing with Text and Select", async ({ page }) => {
  await openCanvas(page);
  const main = page.locator(".ProseMirror");
  const original = await main.innerText();
  await draw(page, "text", 80, 100);
  const input = page.getByRole("textbox", { name: "Text box", exact: true });
  await page.keyboard.type("Frame one");
  await expect(input).toBeFocused();
  await expect(input).toHaveValue("Frame one");
  for (const tool of ["select", "text"]) {
    await page.locator(`[data-studio-tool-button="${tool}"]`).click();
    await input.click();
    await expect(input).toBeFocused();
    await page.keyboard.press("End");
    await page.keyboard.type(` ${tool}`);
    await expect(input).toHaveValue(new RegExp(tool + "$"));
    await expect(page.locator('[data-studio-frame="text"]')).toHaveCount(1);
  }
  expect(await main.innerText()).toBe(original);
});

test("shapes use black non-scaling 1px strokes on a snapped pixel grid", async ({ page }) => {
  await openCanvas(page);
  for (const [index, tool] of ["rect", "ellipse", "round-rect", "line"].entries()) {
    await draw(page, tool, 100.3, 90.2 + index * 125, 200.4, 75.3);
    const frame = page.locator(`[data-studio-frame="${tool}"]`);
    const shape = frame.locator("svg > :first-child");
    await expect(shape).toHaveAttribute("stroke", "#000");
    await expect(shape).toHaveAttribute("stroke-width", "1");
    await expect(shape).toHaveAttribute("vector-effect", "non-scaling-stroke");
    const box = await frame.boundingBox();
    for (const value of [box!.x, box!.y, box!.width, box!.height]) {
      expect(Math.abs(value - Math.round(value))).toBeLessThan(0.02);
    }
  }
  // Hide selection handles so the screenshot shows the actual black outlines.
  await page.locator('[data-studio-tool-button="text"]').click();
  await draw(page, "text", 360, 120, 260, 110);
  await page.keyboard.type("یہ ایک متن کا خانہ ہے۔");
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: test.info().outputPath("qalam-frames-1920x1080.png") });
});
