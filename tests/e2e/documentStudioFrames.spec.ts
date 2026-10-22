import { test, expect, type Page } from "@playwright/test";

test.use({ viewport: { width: 1920, height: 1080 } });

async function openCanvas(page: Page) {
  await page.addInitScript(() => localStorage.setItem("qalam-site-language", "en"));
  await page.goto("/tools/document-studio");
  await expect(page.locator(".ProseMirror")).toBeEditable();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("qalam-document-studio-active-document-v1"))).not.toBeNull();
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

// The Textbox drawing tool is not available yet; preserve coverage of saved text frames.
async function loadTextFrame(page: Page, text: string, y = 100) {
  await page.evaluate(({ text, y }) => {
    const id = localStorage.getItem("qalam-document-studio-active-document-v1")!;
    const frames = JSON.parse(localStorage.getItem("qalam-studio-frames-v1") || "{}");
    frames[id] = [...(frames[id] || []), { id: "saved-text-box", kind: "text", page: 1,
      xMm: 80 * 25.4 / 96, yMm: y * 25.4 / 96, wMm: 180 * 25.4 / 96,
      hMm: 90 * 25.4 / 96, text, flip: false }];
    localStorage.setItem("qalam-studio-frames-v1", JSON.stringify(frames));
  }, { text, y });
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Text box", exact: true })).toHaveValue(text);
}

test("existing text frames are edited only with IBEAM", async ({ page }) => {
  await openCanvas(page);
  const main = page.locator(".ProseMirror");
  const original = await main.innerText();
  await loadTextFrame(page, "Frame one");
  await page.locator('[data-studio-tool-button="text"]').click();
  const input = page.getByRole("textbox", { name: "Text box", exact: true });
  await input.click();
  await expect(input).toBeFocused();
  await expect(input).toHaveValue("Frame one");
  await page.locator('[data-studio-tool-button="select"]').click();
  const box = (await input.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(input).not.toBeFocused();
  await expect(input).toHaveAttribute("readonly", "");
  await page.keyboard.type("x");
  await expect(input).toHaveValue("Frame one");
  await page.locator('[data-studio-tool-button="text"]').click();
  await input.click();
  await expect(input).toBeFocused();
  await page.keyboard.press("End");
  await page.keyboard.type(" edited");
  await expect(input).toHaveValue("Frame one edited");
  await expect(page.locator('[data-studio-frame="text"]')).toHaveCount(1);
  expect(await main.innerText()).toBe(original);
});

test("plain clicks never create Rectangle, Ellipse, Rounded rectangle or Line", async ({ page }) => {
  await openCanvas(page);
  const layer = page.locator("[data-studio-objects]");
  const bounds = (await layer.boundingBox())!;
  for (const tool of ["rect", "ellipse", "round-rect", "line"]) {
    const button = page.locator(`[data-studio-tool-button="${tool}"]`);
    await button.click();
    const before = await page.locator("[data-studio-frame]").count();
    await page.mouse.click(bounds.x + 410, bounds.y + 170);
    await expect(page.locator("[data-studio-frame]")).toHaveCount(before);
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await expect(layer).toHaveCSS("cursor", "crosshair");
  }
});

test("draw cursor stays crosshair over previously selected frames and handles", async ({ page }) => {
  await openCanvas(page);
  await draw(page, "round-rect", 110, 120, 180, 90);
  const frame = page.locator('[data-studio-frame="round-rect"]');
  await expect(frame).toHaveCSS("cursor", "crosshair");
  const rect = frame.locator("svg > rect").first();
  expect(Number(await rect.getAttribute("rx"))).toBeCloseTo(6.35 * 96 / 25.4, 8);
  const handles = frame.locator("[data-studio-frame-handle]");
  await expect(handles).toHaveCount(8);
  await expect(handles.first()).toHaveCSS("pointer-events", "none");
  const box = (await frame.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await expect.poll(() => page.evaluate(({ x, y }) => getComputedStyle(document.elementFromPoint(x, y)!).cursor, { x: box.x + box.width / 2, y: box.y + box.height / 2 })).toBe("crosshair");
  await expect(frame).toHaveCSS("cursor", "crosshair");
});

test("shapes use black non-scaling 1px strokes on a snapped pixel grid", async ({ page }) => {
  await openCanvas(page);
  for (const [index, tool] of ["rect", "ellipse", "round-rect", "line"].entries()) {
    await draw(page, tool, 100.3, 90.2 + index * 125, 200.4, 75.3);
    await expect(page.locator(`[data-studio-frame="${tool}"]`)).toHaveCSS("cursor", "crosshair");
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
  await page.keyboard.press("Escape");
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: test.info().outputPath("qalam-frames-1920x1080.png") });
});

test("Select deselects frames with Escape and empty page or pasteboard clicks", async ({ page }) => {
  await openCanvas(page);
  await draw(page, "rect", 100, 120);
  await page.locator('[data-studio-tool-button="select"]').click();
  const handles = page.locator("[data-studio-frame-handle]");
  const frame = page.locator('[data-studio-frame="rect"]');
  const layer = (await page.locator("[data-studio-objects]").boundingBox())!;
  for (const action of ["escape", "page", "pasteboard"]) {
    await frame.click({ position: { x: 30, y: 30 } });
    await expect(handles).toHaveCount(8);
    if (action === "escape") await page.keyboard.press("Escape");
    else await page.mouse.click(layer.x + (action === "page" ? 450 : -100), layer.y + 300);
    await expect(handles).toHaveCount(0);
    await expect(frame).toHaveCount(1);
  }
  await loadTextFrame(page, "Frame text", 350);
  await page.locator('[data-studio-tool-button="select"]').click();
  const textBox = (await page.locator('[data-studio-frame="text"]').boundingBox())!;
  await page.mouse.click(textBox.x + textBox.width / 2, textBox.y + textBox.height / 2);
  await expect(handles).toHaveCount(8);
  await page.keyboard.press("Escape");
  await expect(handles).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "Text box", exact: true })).toHaveValue("Frame text");
});

test("Latin runs in Urdu paragraphs follow the English font without changing Urdu", async ({ page }) => {
  await openCanvas(page);
  const editor = page.locator(".ProseMirror");
  await page.locator('[data-studio-tool-button="text"]').click();
  await editor.click();
  await page.keyboard.insertText("یہ اردو عبارت ہے Hello Qalam 2026 اور پھر اردو۔");
  const paragraph = editor.locator('p[dir="rtl"]').first();
  const latin = paragraph.locator('[data-studio-latin-run]').first();
  await expect(latin).toContainText("Hello Qalam 2026");
  await expect(latin).toHaveCSS("font-family", /Arial/);
  await expect(paragraph).toHaveCSS("font-family", /^"Jameel Noori Nastaleeq"/);
  await page.locator('[data-studio-latin-font]').selectOption("Inter");
  await expect(latin).toHaveCSS("font-family", /Inter/);
  await expect(paragraph).toHaveCSS("font-family", /^"Jameel Noori Nastaleeq"/);
  await page.locator('[data-studio-latin-font]').selectOption("Arial Unicode MS");
  await expect(latin).toHaveCSS("font-family", /Arial/);
  await expect(latin).not.toHaveCSS("font-family", /Jameel/);
  await expect(paragraph).toHaveText("یہ اردو عبارت ہے Hello Qalam 2026 اور پھر اردو۔");
});

test("Urdu keeps the English window geometry and every enabled tool accepts centre clicks", async ({ page }) => {
  await openCanvas(page);
  const geometry = () => page.evaluate(() => {
    const box = (selector: string) => {
      const rect = document.querySelector(selector)!.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    };
    return ["[data-studio-tool-palette]", "[data-studio-vscroll]", "[data-studio-ruler]",
      "[data-studio-vertical-ruler]", "[data-studio-page-paper]", "[data-studio-page-nav]"]
      .map(box);
  });
  const englishGeometry = await geometry();
  await page.locator('[data-studio-language-switch] button[lang="ur"]').click();
  await expect(page.getByRole("textbox", { name: "Document editor", exact: true })).toBeEditable();
  await expect.poll(geometry).toEqual(englishGeometry);
  expect(englishGeometry[0].x).toBe(0);
  expect(englishGeometry[1].x).toBe(1903);
  const labels = { select: "Select", text: "Text", textbox: "Textbox Tool", rect: "Rectangle",
    ellipse: "Ellipse", "round-rect": "Rounded rectangle", line: "Line" };
  for (const [id, label] of Object.entries(labels)) {
    const button = page.locator(`[data-studio-tool-button="${id}"]`);
    await expect(button).toHaveAttribute("title", label);
    await expect(button).toHaveAccessibleName(label);
    const rect = (await button.boundingBox())!;
    expect(rect.x).toBe(2);
    // A real centre click catches scrollbar overlays that dispatchEvent would miss.
    await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2);
    await expect(button).toHaveAttribute("aria-pressed", "true");
  }
  const master = page.getByRole("button", { name: "Master pages", exact: true });
  await expect(master).toBeDisabled();
  await expect(master).toHaveAttribute("title", "Coming soon");
  await expect(master).toHaveCSS("color", "rgb(128, 128, 128)");
});
