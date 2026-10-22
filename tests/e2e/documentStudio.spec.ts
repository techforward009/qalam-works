import { test, expect, type Page } from "@playwright/test";
import { TINY_PNG_BASE64 } from "./fixtures/tinyPng";

const URL = "/tools/document-studio";
const ENGLISH = "Document Studio browser acceptance text.";
const URDU = "یہ دستاویز اسٹوڈیو کی براؤزر جانچ ہے۔";

async function openStudio(page: Page, language: "en" | "ur" = "en") {
  await page.addInitScript((value) => {
    localStorage.setItem("qalam-site-language", value);
  }, language);
  await page.goto(URL);
  await expect(page.getByRole("textbox", { name: "Document editor" })).toBeVisible();
  await expect(page.locator(".ProseMirror")).toBeEditable();
  // Wait for the initial saved-document load before any test inserts text.
  await expect.poll(() => page.evaluate(() => localStorage.getItem("qalam-document-studio-active-document-v1"))).not.toBeNull();
}

async function imageAction(page: Page, label: string) {
  await page.locator('[data-studio-tool-button="text"]').click();
  await page.locator(".ProseMirror img.qalam-document-image").click({ button: "right" });
  await page.locator('[data-studio-image-menu="true"]').getByRole("menuitem", { name: label, exact: true }).click();
}

async function replaceEditorContent(page: Page, text: string) {
  const editor = page.locator(".ProseMirror");
  await page.locator('[data-studio-tool-button="text"]').click();
  await editor.click();
  await page.keyboard.press("Control+A");
  await page.keyboard.type(text);
  await expect(editor).toContainText(text);
  return editor;
}

async function downloadAction(page: Page, action: "file.downloadDocx" | "file.downloadPdf") {
  await page.locator('[data-menu-root="file"]').click();
  await page.locator('[data-menu-submenu="file.download"]').hover();
  await expect(page.locator(`[data-menu-action="${action}"]`)).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.locator(`[data-menu-action="${action}"]`).click(),
  ]);
  const stream = await download.createReadStream();
  let size = 0;
  for await (const chunk of stream ?? []) size += (chunk as Buffer).length;
  expect(size).toBeGreaterThan(0);
  return download;
}

type LayoutBox = { x: number; y: number; right: number; bottom: number; width: number; height: number };

async function imageAndFirstLine(page: Page): Promise<{ image: LayoutBox; line: LayoutBox }> {
  const layout = await page.evaluate(() => {
    const imageEl = document.querySelector(".ProseMirror img.qalam-document-image");
    if (!imageEl) return null;
    const container = (imageEl.closest("[data-resize-container]") ?? imageEl) as HTMLElement;
    const prose = document.querySelector(".ProseMirror");
    if (!prose) return null;
    const imageBox = container.getBoundingClientRect();
    const paragraphs = [...prose.querySelectorAll("p")];
    const paragraph = prose.querySelector("p.qalam-image-wrap-beside")
      ?? paragraphs.find((node) => (node.textContent ?? "").trim().length > 40)
      ?? paragraphs.find((node) => (node.textContent ?? "").trim().length > 0);
    if (!paragraph) return null;
    const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
    let line: DOMRect | null = null;
    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (!(node.textContent ?? "").trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      const rects = [...range.getClientRects()];
      line = rects.find((rect) => rect.bottom > imageBox.y + 4 && rect.y < imageBox.bottom - 4) ?? rects[0] ?? null;
      if (line) break;
    }
    if (!line) return null;
    const box = (rect: DOMRectReadOnly) => ({
      x: rect.x,
      y: rect.y,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
    });
    return { image: box(imageBox), line: box(line) };
  });
  if (!layout) throw new Error("Could not measure image and wrapping paragraph line box.");
  return layout;
}

const WRAP_PARAGRAPH = "The Qalam Works document wraps this paragraph beside the picture so the first line sits next to the image rather than below it. Additional sentences keep the column of text tall enough to occupy the side of the raster on both desktop and mobile viewports.";

test.describe("Document Studio v1 browser smoke", () => {
  for (const pt of [12, 36]) {
    test(`Mehr ${pt}pt Auto leading keeps ink below the top margin and lines apart`, async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await openStudio(page, "ur");
      const story = await replaceEditorContent(page, "السلام علیکم اللہ وبرکاتہ");
      await page.keyboard.press("Shift+Enter");
      await page.keyboard.type("السلام علیکم اللہ وبرکاتہ");
      await page.keyboard.press("Control+A");
      await page.locator('[data-studio-font-family]').selectOption({ label: "Mehr Nastaliq Web" });
      await page.locator('[data-studio-font-size]').selectOption(String(pt));
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      await expect.poll(() => story.locator("p").first().evaluate((p) => {
        const prose = p.closest(".ProseMirror") as HTMLElement;
        const scale = prose.getBoundingClientRect().width / prose.offsetWidth;
        const margin = prose.getBoundingClientRect().top + parseFloat(getComputedStyle(prose).paddingTop) * scale;
        const lines = [...p.childNodes].flatMap((node) => {
          const range = document.createRange();
          range.selectNodeContents(node);
          return [...range.getClientRects()].filter((r) => r.width > 1 && r.height > 1);
        });
        const unique = lines.filter((r, i) => !lines.slice(0, i).some((prior) => Math.abs(prior.top - r.top) < 1)).sort((a, b) => a.top - b.top);
        if (unique.length < 2) return false;
        return unique[0].top >= margin - 1 && unique[1].top >= unique[0].bottom - 1;
      })).toBe(true);
      await expect(story.locator("p").first()).toHaveAttribute("style", /line-height:\s*2.2/);
      await page.locator('[data-studio-leading]').selectOption("1.5");
      await expect(story.locator("p").first()).toHaveAttribute("style", /line-height:\s*1.5/);
    });
  }

  test("RTL caret follows the DOM selection at styled line ends and grows at 36pt", async ({ page }) => {
    await openStudio(page, "ur");
    const story = await replaceEditorContent(page, "السلام علیکم اللہ وبرکاتہ");
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    const size = page.locator('[data-studio-font-size]');
    await page.keyboard.press("Control+A");
    await size.selectOption("18");
    await page.keyboard.press("End");
    const caret = page.locator('[data-studio-caret]');
    await expect(caret).toBeVisible();
    const expectPosition = async () => {
      await expect.poll(() => page.evaluate(() => {
        const selection = window.getSelection();
        if (!selection?.rangeCount || !selection.isCollapsed) return 999;
        const rects = selection.getRangeAt(0).getClientRects();
        const real = rects.length ? rects[rects.length - 1] : null;
        const drawn = document.querySelector('[data-studio-caret]')?.getBoundingClientRect();
        return real && drawn ? Math.abs(drawn.left - real.left) : 999;
      })).toBeLessThanOrEqual(3);
    };
    await expectPosition();
    const smallHeight = (await caret.boundingBox())!.height;
    await page.keyboard.press("Control+A");
    await size.selectOption("36");
    await page.keyboard.press("End");
    await expectPosition();
    await expect.poll(async () => (await caret.boundingBox())?.height ?? 0).toBeGreaterThan(smallHeight * 1.5);
    await page.keyboard.press("Control+End");
    await expectPosition();
    await expect(story).toContainText("السلام علیکم اللہ وبرکاتہ");
  });

  test("Arrow is inactive for typing on load and story ligatures stay enabled", async ({ page }) => {
    await openStudio(page);
    const story = page.locator(".ProseMirror");
    const before = await story.textContent();
    await expect(page.locator('[data-studio-tool-button="select"]')).toHaveAttribute("aria-pressed", "true");
    await expect(story).not.toBeFocused();
    await expect(page.locator('[data-studio-caret]')).toHaveCount(0);
    await page.keyboard.type("abc");
    await expect(story).toHaveText(before ?? "");
    await expect(story).not.toBeFocused();
    await expect(story).toHaveCSS("font-variant-ligatures", "normal");
    await expect(story).toHaveCSS("font-feature-settings", "normal");
  });

  test("Textbox drag creates a frame and switches to IBEAM for immediate typing", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await openStudio(page);
    await page.locator('[data-studio-tool-button="textbox"]').click();
    const layer = page.locator('[data-studio-objects]');
    await expect(layer).toHaveCSS("cursor", "crosshair");
    const box = (await layer.boundingBox())!;
    await page.mouse.move(box.x + 100, box.y + 150);
    await page.mouse.down();
    await page.mouse.move(box.x + 300, box.y + 250, { steps: 8 });
    await page.mouse.up();
    const frame = page.locator('[data-studio-frame="text"]');
    await expect(frame).toHaveCount(1);
    await expect(page.locator('[data-studio-tool-button="text"]')).toHaveAttribute("aria-pressed", "true");
    await expect(frame.locator("textarea")).toBeFocused();
    await page.keyboard.type("abc");
    await expect(frame.locator("textarea")).toHaveValue("abc");
    await expect(frame.locator("textarea")).toHaveCSS("font-variant-ligatures", "normal");
    await expect(frame.locator("textarea")).toHaveCSS("font-feature-settings", "normal");
    await expect(frame.locator("textarea")).toHaveCSS("border", "1px solid rgb(0, 0, 0)");
    await page.locator('[data-studio-tool-button="select"]').click();
    await page.keyboard.press("Escape");
    await expect(frame.locator('[data-studio-frame-handle]')).toHaveCount(0);
    await expect(frame.locator("textarea")).toHaveCSS("border", "1px solid rgb(0, 0, 0)");
    await expect(page.locator(".ProseMirror")).not.toContainText("abc");
  });

  test("Textbox click without dragging creates nothing", async ({ page }) => {
    await openStudio(page);
    await page.locator('[data-studio-tool-button="textbox"]').click();
    await page.locator('[data-studio-objects]').click({ position: { x: 100, y: 150 } });
    await expect(page.locator('[data-studio-frame]')).toHaveCount(0);
    await expect(page.locator('[data-studio-tool-button="textbox"]')).toHaveAttribute("aria-pressed", "true");
  });

  test("IBEAM edits the story without drawing a text frame", async ({ page }) => {
    await openStudio(page, "ur");
    const tool = page.locator('[data-studio-tool-button="text"]');
    await tool.click();
    const editor = page.locator(".ProseMirror");
    const pageArea = page.locator('[data-studio-page-paper]').first();
    const box = (await pageArea.boundingBox())!;
    const x = Math.min(300, box.x + 100);
    const y = box.y + 100;
    await expect(page.locator('[data-studio-objects]')).toHaveCSS("pointer-events", "none");
    await expect.poll(() => page.evaluate(({ x, y }) => getComputedStyle(document.elementFromPoint(x, y)!).cursor, { x, y })).toBe("text");
    await page.mouse.click(x, y);
    await expect(editor).toBeFocused();
    await expect(page.locator('[data-studio-frame]')).toHaveCount(0);
    await page.keyboard.type("abc");
    await expect(editor).toContainText("abc");
    await expect(tool).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator('[data-studio-frame]')).toHaveCount(0);
  });

  test("IBEAM edits an existing text box without creating another", async ({ page }) => {
    await openStudio(page);
    await page.evaluate(() => {
      const id = localStorage.getItem("qalam-document-studio-active-document-v1")!;
      localStorage.setItem("qalam-studio-frames-v1", JSON.stringify({ [id]: [{
        id: "existing-text-box", kind: "text", page: 1, xMm: 20, yMm: 35,
        wMm: 60, hMm: 30, flip: false, text: "Existing box",
      }] }));
    });
    await page.reload();
    const input = page.getByRole("textbox", { name: "Text box", exact: true });
    await expect(input).toHaveValue("Existing box");
    const story = await page.locator(".ProseMirror").innerText();
    const tool = page.locator('[data-studio-tool-button="text"]');
    await tool.click();
    await expect(input).toHaveCSS("cursor", "text");
    await input.click();
    await expect(input).toBeFocused();
    await page.keyboard.press("End");
    await page.keyboard.type(" edited");
    await expect(input).toHaveValue("Existing box edited");
    await expect(page.locator('[data-studio-frame]')).toHaveCount(1);
    await expect(page.locator(".ProseMirror")).toHaveText(story);
    await expect(tool).toHaveAttribute("aria-pressed", "true");
  });

  test("Arrow selects and moves a text box without entering text-edit mode", async ({ page }) => {
    await openStudio(page, "ur");
    // Textbox drawing is deferred; load the same saved frame that tool will create.
    await page.evaluate(() => {
      const id = localStorage.getItem("qalam-document-studio-active-document-v1")!;
      localStorage.setItem("qalam-studio-frames-v1", JSON.stringify({ [id]: [{
        id: "movable-text-box", kind: "text", page: 1, xMm: 20, yMm: 35,
        wMm: 60, hMm: 30, flip: false, text: "Keep this text",
      }] }));
    });
    await page.reload();
    const frame = page.locator('[data-studio-frame="text"]');
    const textarea = frame.locator("textarea");
    await expect(textarea).toHaveValue("Keep this text");
    // Enter text mode first so choosing Arrow must also blur the focused textarea.
    await page.locator('[data-studio-tool-button="text"]').click();
    await textarea.click();
    await expect(textarea).toBeFocused();
    await page.locator('[data-studio-tool-button="select"]').click();
    await expect(frame).toHaveCSS("cursor", "move");
    await expect(textarea).toHaveAttribute("readonly", "");
    await expect(textarea).toHaveCSS("pointer-events", "none");
    const box = (await frame.boundingBox())!;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(textarea).not.toBeFocused();
    await expect(page.locator('[data-studio-caret]')).toHaveCount(0);
    const handles = frame.locator('[data-studio-frame-handle]');
    await expect(handles).toHaveCount(8);
    for (const handle of await handles.all()) await expect(handle).toHaveCSS("background-color", "rgb(0, 0, 0)");
    await expect(textarea).toHaveCSS("border-top-color", "rgb(0, 0, 0)");
    await page.keyboard.type("x");
    await expect(textarea).toHaveValue("Keep this text");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2, { steps: 5 });
    await page.mouse.up();
    await expect.poll(async () => Math.round((await frame.boundingBox())!.x - box.x)).toBe(40);
    await expect(textarea).not.toBeFocused();
    await page.keyboard.press("Escape");
    await expect(handles).toHaveCount(0);
  });

  test("Select intercepts page clicks without focusing or typing into the story", async ({ page }) => {
    await openStudio(page, "ur");
    const editor = page.locator(".ProseMirror");
    // Set up existing story text without relying on a Select-tool page click.
    await editor.focus();
    await page.keyboard.insertText("The story must stay unchanged.");
    const before = await editor.innerText();
    await page.locator('[data-studio-tool-button="select"]').click();
    const expectNoStoryCaret = async () => {
      await expect.poll(() => page.evaluate(() => document.activeElement?.matches(".ProseMirror"))).toBe(false);
      await expect(page.locator("[data-studio-caret]")).toHaveCount(0);
    };
    await expectNoStoryCaret();
    const layer = page.locator("[data-studio-objects]");
    await expect(layer).toHaveCSS("pointer-events", "auto");
    await expect(layer).toHaveCSS("cursor", "default");
    const box = (await layer.boundingBox())!;
    const x = Math.max(60, box.x + 50);
    const y = box.y + 100;
    await page.mouse.click(x, y);
    await expectNoStoryCaret();
    await page.keyboard.type("x");
    await expect(editor).toHaveText(before);
    // A page drag must not select story text either.
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 80, y + 25, { steps: 4 });
    await page.mouse.up();
    await expectNoStoryCaret();
    await expect(editor).toHaveText(before);
  });

  test("loads an editable English workspace, formats it, and persists after reload", async ({ page }) => {
    const errors: Error[] = [];
    page.on("pageerror", (error) => errors.push(error));
    await openStudio(page);
    const editor = await replaceEditorContent(page, ENGLISH);

    await page.keyboard.press("Control+A");
    await page.getByRole("button", { name: "Bold" }).click();
    await expect(editor.locator("strong")).toContainText(ENGLISH);
    await expect(editor.locator("p").first()).toHaveAttribute("dir", "ltr");

    await expect(page.locator('[data-studio-save-status="saved"]')).toBeVisible({ timeout: 6_000 });
    await page.reload();
    await expect(page.locator(".ProseMirror")).toContainText(ENGLISH);
    expect(errors).toEqual([]);
  });

  test("keeps Urdu and English paragraphs intact with their paragraph directions", async ({ page }) => {
    await openStudio(page, "ur");
    await page.locator('[data-studio-tool-button="text"]').click();
    const editor = page.locator(".ProseMirror");
    await editor.click();
    await page.keyboard.type(URDU);
    await page.keyboard.press("Enter");
    await page.keyboard.type(ENGLISH);
    await expect(editor).toContainText(URDU);
    await expect(editor).toContainText(ENGLISH);
    await expect(editor.locator("p").nth(0)).toHaveAttribute("dir", "rtl");
    await expect(editor.locator("p").nth(1)).toHaveAttribute("dir", "ltr");

    await editor.locator("p").nth(1).click();
    await page.getByRole("button", { name: "Left to right", exact: true }).click();
    await expect(editor.locator("p").nth(1)).toContainText(ENGLISH);
    await expect(editor.locator("p").nth(1)).toHaveAttribute("dir", "ltr");
    await expect(editor.locator("p").nth(0)).toHaveAttribute("dir", "rtl");
  });

  test("find and replace updates visible document content", async ({ page }) => {
    await openStudio(page);
    const editor = await replaceEditorContent(page, "target target");
    await page.keyboard.press("Control+F");
    await page.getByPlaceholder("Find...").fill("target");
    await page.getByPlaceholder("Replace with...").fill("replaced");
    await page.getByRole("button", { name: "Replace All" }).click();
    await expect(editor).toContainText("replaced replaced");
    await expect(editor).not.toContainText("target");
  });

  test("creates, edits, persists, and exports a multilingual table", async ({ page }) => {
    await openStudio(page);
    await page.locator('[data-studio-tool-button="text"]').click();
    await page.locator('[data-menu-root="insert"]').click();
    await page.locator('[data-menu-action="insert.table"]').click();
    await page.getByRole("dialog", { name: "Insert table" }).getByLabel("Rows").fill("2");
    await page.getByRole("dialog", { name: "Insert table" }).getByLabel("Columns").fill("2");
    await page.getByRole("dialog", { name: "Insert table" }).getByRole("button", { name: "Insert" }).click();

    const table = page.locator(".ProseMirror table");
    await expect(table).toHaveCount(1);
    const cells = table.locator("td, th");
    await cells.nth(0).click();
    await page.keyboard.type("English cell");
    await cells.nth(1).click();
    await page.keyboard.type("اردو خانہ");
    await expect(table).toContainText("English cell");
    await expect(table).toContainText("اردو خانہ");

    await page.locator('[data-menu-root="insert"]').click();
    await page.locator('[data-menu-submenu="insert.tableActions"]').hover();
    await page.locator('[data-menu-action="table.addRowAfter"]').click();
    await page.locator('[data-menu-root="insert"]').click();
    await page.locator('[data-menu-submenu="insert.tableActions"]').hover();
    await page.locator('[data-menu-action="table.addColumnAfter"]').click();
    await expect(table.locator("tr")).toHaveCount(3);
    await expect(table.locator("tr").first().locator("td, th")).toHaveCount(3);

    await expect(page.locator('[data-studio-save-status="saved"]')).toBeVisible({ timeout: 6_000 });
    await page.reload();
    await expect(page.locator(".ProseMirror table")).toContainText("English cell");
    await expect(page.locator(".ProseMirror table")).toContainText("اردو خانہ");

    const docx = await downloadAction(page, "file.downloadDocx");
    expect(docx.suggestedFilename()).toMatch(/\.docx$/i);
    const responsePromise = page.waitForResponse((response) => response.url().includes("/api/export-pdf") && response.request().method() === "POST");
    await page.locator('[data-menu-root="file"]').click();
    await page.locator('[data-menu-submenu="file.download"]').hover();
    await page.locator('[data-menu-action="file.downloadPdf"]').click();
    expect((await responsePromise).status()).toBe(200);
    const pdf = await page.waitForEvent("download");
    const stream = await pdf.createReadStream();
    let size = 0;
    for await (const chunk of stream ?? []) size += (chunk as Buffer).length;
    expect(size).toBeGreaterThan(0);
  });

  test("inserts, edits, persists, and exports a local raster image", async ({ page }, testInfo) => {
    await openStudio(page);
    const editor = await replaceEditorContent(page, "Text before the image.");
    await page.locator('[data-menu-root="insert"]').click();
    await page.locator('[data-menu-action="insert.image"]').click();
    await page.locator('[data-studio-image-input="true"]').setInputFiles({
      name: "tiny.png", mimeType: "image/png", buffer: Buffer.from(TINY_PNG_BASE64, "base64"),
    });
    const image = page.locator(".ProseMirror img.qalam-document-image");
    await expect(image).toBeVisible();
    await editor.press("End");
    await page.keyboard.type(" Text after the image.");
    await image.click();
    await expect(page.locator('[data-resize-handle]')).toHaveCount(4);
    await expect(page.locator('[data-studio-image-controls="true"]')).toHaveCount(0);
    const initialWidth = Number(await image.getAttribute("data-width"));
    if (testInfo.project.name !== "mobile-android") {
      const resizeHandle = page.locator('[data-resize-handle="bottom-right"]');
      const handleBox = await resizeHandle.boundingBox();
      if (!handleBox) throw new Error("Image resize handle was not rendered.");
      await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(handleBox.x + 60, handleBox.y + 60);
      await page.mouse.up();
      await expect.poll(async () => Number(await image.getAttribute("data-width"))).toBeGreaterThan(initialWidth);
    }

    const resizedWidth = await image.getAttribute("data-width");
    await imageAction(page, "Left");
    const leftPosition = await image.boundingBox();
    await imageAction(page, "Center");
    const centerPosition = await image.boundingBox();
    await imageAction(page, "Right");
    const rightPosition = await image.boundingBox();
    expect(leftPosition?.x).toBeLessThan(centerPosition?.x ?? 0);
    expect(centerPosition?.x).toBeLessThan(rightPosition?.x ?? 0);
    page.once("dialog", (dialog) => dialog.accept("Qalam mark"));
    await imageAction(page, "Alt text");
    await expect(image).toHaveAttribute("alt", "Qalam mark");
    await expect(page.locator('[data-studio-save-status="saved"]')).toBeVisible({ timeout: 6_000 });
    await page.reload();
    const restoredImage = page.locator(".ProseMirror img.qalam-document-image");
    await expect(restoredImage).toHaveAttribute("alt", "Qalam mark");
    await expect(restoredImage).toHaveAttribute("data-alignment", "right");
    await expect(restoredImage).toHaveAttribute("data-width", resizedWidth!);
    await expect(page.locator(".ProseMirror")).toContainText("Text before the image.");
    await expect(page.locator(".ProseMirror")).toContainText("Text after the image.");
    const docx = await downloadAction(page, "file.downloadDocx");
    expect(docx.suggestedFilename()).toMatch(/\.docx$/i);
    const responsePromise = page.waitForResponse((response) => response.url().includes("/api/export-pdf") && response.request().method() === "POST");
    await page.locator('[data-menu-root="file"]').click();
    await page.locator('[data-menu-submenu="file.download"]').hover();
    await page.locator('[data-menu-action="file.downloadPdf"]').click();
    expect((await responsePromise).status()).toBe(200);
    expect(await page.waitForEvent("download")).toBeTruthy();
  });

  test("wraps paragraph text beside left and right images and persists wrap mode", async ({ page }) => {
    await openStudio(page);
    await page.locator('[data-studio-tool-button="text"]').click();
    await page.locator('[data-menu-root="insert"]').click();
    await page.locator('[data-menu-action="insert.image"]').click();
    await page.locator('[data-studio-image-input="true"]').setInputFiles({
      name: "tiny.png", mimeType: "image/png", buffer: Buffer.from(TINY_PNG_BASE64, "base64"),
    });
    const image = page.locator(".ProseMirror img.qalam-document-image");
    await expect(image).toBeVisible();
    await image.click();
    await expect(image).toHaveAttribute("data-wrap-mode", "break");

    await imageAction(page, "Wrap text");
    await imageAction(page, "Left");
    await expect(image).toHaveAttribute("data-wrap-mode", "wrap");
    await expect(image).toHaveAttribute("data-alignment", "left");
    await expect(page.locator("[data-resize-container]")).toHaveAttribute("data-image-float", "left");
    await page.locator(".ProseMirror p").last().click();
    await page.keyboard.type(WRAP_PARAGRAPH);
    await expect(page.locator(".ProseMirror")).toContainText("wraps this paragraph beside the picture");
    const wrapLeft = await imageAndFirstLine(page);
    expect(wrapLeft.line.x).toBeGreaterThan(wrapLeft.image.right - 4);
    expect(wrapLeft.line.y).toBeLessThan(wrapLeft.image.bottom);
    expect(wrapLeft.line.bottom).toBeGreaterThan(wrapLeft.image.y);

    await image.click();
    await imageAction(page, "Right");
    await expect(image).toHaveAttribute("data-alignment", "right");
    await expect(page.locator("[data-resize-container]")).toHaveAttribute("data-image-float", "right");
    const wrapRight = await imageAndFirstLine(page);
    expect(wrapRight.line.right).toBeLessThan(wrapRight.image.x + 4);
    expect(wrapRight.line.y).toBeLessThan(wrapRight.image.bottom);
    expect(wrapRight.line.bottom).toBeGreaterThan(wrapRight.image.y);
    expect(wrapRight.image.x).toBeGreaterThan(wrapLeft.image.x);

    await imageAction(page, "Break text");
    await expect(image).toHaveAttribute("data-wrap-mode", "break");
    await expect(page.locator("[data-resize-container]")).not.toHaveAttribute("data-image-float");
    const broken = await imageAndFirstLine(page);
    expect(broken.line.y).toBeGreaterThan(broken.image.bottom - 8);

    await imageAction(page, "Wrap text");
    await imageAction(page, "Left");
    await expect(page.locator('[data-studio-save-status="saved"]')).toBeVisible({ timeout: 6_000 });
    await page.reload();
    const restoredImage = page.locator(".ProseMirror img.qalam-document-image");
    await expect(restoredImage).toHaveAttribute("data-wrap-mode", "wrap");
    await expect(restoredImage).toHaveAttribute("data-alignment", "left");
    const restored = await imageAndFirstLine(page);
    expect(restored.line.x).toBeGreaterThan(restored.image.right - 4);
    expect(restored.line.y).toBeLessThan(restored.image.bottom);
  });

  test("inserts, persists, and exports manual page and section breaks", async ({ page }) => {
    await openStudio(page);
    const editor = await replaceEditorContent(page, "Page one text.");

    await page.locator('[data-menu-root="insert"]').click();
    await page.locator('[data-menu-action="insert.pageBreak"]').click();
    await expect(editor.locator('[data-document-page-break="true"]')).toHaveCount(1);
    await page.keyboard.type("Page two text.");
    await expect(editor).toContainText("Page two text.");

    await page.locator('[data-menu-root="insert"]').click();
    await page.locator('[data-menu-submenu="insert.sectionBreak"]').hover();
    await page.locator('[data-menu-action="insert.sectionBreakNextPage"]').click();
    await expect(editor.locator('[data-document-section-break="true"]')).toHaveAttribute("data-section-break-type", "nextPage");
    await page.keyboard.type("Section two text.");
    // Wait for the save caused by the inserted section/text rather than a
    // possibly already-visible "Saved" state from the initial document load.
    await expect(page.locator('[data-studio-save-status="saving"]')).toBeVisible();
    await expect(page.locator('[data-studio-save-status="saved"]')).toBeVisible({ timeout: 6_000 });

    await page.reload();
    const restored = page.locator(".ProseMirror");
    await expect(restored.locator('[data-document-page-break="true"]')).toHaveCount(1);
    await expect(restored.locator('[data-document-section-break="true"]')).toHaveAttribute("data-section-break-type", "nextPage");
    await expect(restored).toContainText("Page one text.");
    await expect(restored).toContainText("Page two text.");
    await expect(restored).toContainText("Section two text.");

    const printProbe = await page.evaluate(() => {
      const root = document.querySelector("[data-studio-print-root]");
      const surface = document.querySelector("[data-studio-print-surface]");
      if (!root || !surface) return { text: "", hasPage: false, hasSection: false };
      const source = surface.querySelector(".qalam-editor-content") ?? surface;
      const clone = source.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('[data-document-page-break="true"], [data-document-section-break="true"]').forEach((marker) => {
        marker.textContent = "";
      });
      return {
        text: clone.textContent ?? "",
        hasPage: Boolean(clone.querySelector('[data-document-page-break="true"]')),
        hasSection: Boolean(clone.querySelector('[data-document-section-break="true"]')),
      };
    });
    expect(printProbe.hasPage).toBe(true);
    expect(printProbe.hasSection).toBe(true);
    expect(printProbe.text).toContain("Page one text.");
    expect(printProbe.text).toContain("Section two text.");
    expect(printProbe.text).not.toMatch(/page break/i);
    expect(printProbe.text).not.toMatch(/section break/i);

    const docx = await downloadAction(page, "file.downloadDocx");
    expect(docx.suggestedFilename()).toMatch(/\.docx$/i);
    const responsePromise = page.waitForResponse((response) => response.url().includes("/api/export-pdf") && response.request().method() === "POST");
    await page.locator('[data-menu-root="file"]').click();
    await page.locator('[data-menu-submenu="file.download"]').hover();
    await page.locator('[data-menu-action="file.downloadPdf"]').click();
    expect((await responsePromise).status()).toBe(200);
    expect(await page.waitForEvent("download")).toBeTruthy();
  });
  test("downloads non-empty DOCX and PDF exports", async ({ page }) => {
    await openStudio(page);
    await replaceEditorContent(page, "Small deterministic export document.");
    const docx = await downloadAction(page, "file.downloadDocx");
    expect(docx.suggestedFilename()).toMatch(/\.docx$/i);

    const responsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/export-pdf") && response.request().method() === "POST",
    );
    await page.locator('[data-menu-root="file"]').click();
    await page.locator('[data-menu-submenu="file.download"]').hover();
    await expect(page.locator('[data-menu-action="file.downloadPdf"]')).toBeVisible();
    await page.locator('[data-menu-action="file.downloadPdf"]').click();
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    const pdf = await page.waitForEvent("download");
    const stream = await pdf.createReadStream();
    let pdfSize = 0;
    for await (const chunk of stream ?? []) pdfSize += (chunk as Buffer).length;
    expect(pdfSize).toBeGreaterThan(0);
    expect(pdf.suggestedFilename()).toMatch(/\.pdf$/i);
  });

  test.describe("mobile", () => {
    test.use({ viewport: { width: 393, height: 851 } });

    test("has no horizontal overflow and keeps the editor usable", async ({ page }) => {
      await openStudio(page);
      const editor = await replaceEditorContent(page, "Mobile editor smoke test.");
      await expect(editor).toBeVisible();
      const dimensions = await page.evaluate(() => ({ scroll: document.body.scrollWidth, client: document.body.clientWidth }));
      expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client + 2);
    });
  });
});
