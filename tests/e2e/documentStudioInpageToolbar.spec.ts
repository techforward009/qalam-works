import { expect, test, type Page } from "@playwright/test";

const URL = "/tools/document-studio";

async function openStudio(page: Page) {
  await page.addInitScript(() => localStorage.setItem("qalam-site-language", "en"));
  await page.goto(URL, { waitUntil: "domcontentloaded" });
  await expect(page.locator(".ProseMirror")).toBeEditable();
  await page.locator('[data-studio-tool-button="text"]').click();
}

async function replaceText(page: Page, text: string) {
  const editor = page.locator(".ProseMirror");
  await editor.click();
  await page.keyboard.press("Control+A");
  await page.keyboard.type(text);
  await expect(editor).toContainText(text.slice(0, 8));
  return editor;
}

test("full justify stretches the last line to the frame", async ({ page }) => {
  await openStudio(page);
  await replaceText(page, "یہ ایک لمبی عبارت ہے جو فریم کے اندر پھیلتی ہے");
  await page.getByRole("button", { name: "Full justify" }).click();
  await expect.poll(async () => page.locator(".ProseMirror p").first().evaluate((node) => getComputedStyle(node).textAlignLast)).toBe("justify");
  const delta = await page.locator(".ProseMirror p").first().evaluate((node) => {
    const paragraph = node as HTMLElement;
    const root = paragraph.closest(".ProseMirror") as HTMLElement;
    const scale = root.getBoundingClientRect().width / root.offsetWidth;
    const style = getComputedStyle(paragraph);
    const frame = (paragraph.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)) * scale;
    const range = document.createRange();
    range.selectNodeContents(paragraph);
    const rects = [...range.getClientRects()].filter((rect) => rect.width > 1 && rect.height > 1);
    const lines = new Map<number, { left: number; right: number }>();
    for (const rect of rects) {
      const key = Math.round(rect.top);
      const line = lines.get(key) ?? { left: rect.left, right: rect.right };
      line.left = Math.min(line.left, rect.left);
      line.right = Math.max(line.right, rect.right);
      lines.set(key, line);
    }
    const last = [...lines.values()].at(-1);
    return Math.abs(frame - ((last?.right ?? 0) - (last?.left ?? 0)));
  });
  expect(delta).toBeLessThanOrEqual(2);
});

test("size, colour, text style, gap, direction and language controls", async ({ page }) => {
  await openStudio(page);
  await replaceText(page, "اردو Hello عبارت");
  const size = page.locator("[data-studio-font-size]");
  await size.fill("13.5");
  await size.press("Enter");
  await expect(size).toHaveValue("13.5pt");
  await size.fill("abc");
  await size.press("Enter");
  await expect(page.locator("[data-studio-size-error]")).toHaveText("Value not typed properly.");
  await page.locator(".ProseMirror").click();
  await page.keyboard.press("Control+A");
  await page.getByRole("button", { name: "Colour" }).click();
  const colours = page.locator("[data-studio-colour-option]");
  await expect(colours).toHaveText(["White", "Black", "Gray", "Red", "Yellow", "Green", "Cyan", "Blue", "Magenta"]);
  await page.locator("[data-studio-colour-option='Red']").click();
  await expect.poll(async () => page.locator(".ProseMirror").evaluate((root) =>
    [...root.querySelectorAll("span")].some((element) => getComputedStyle(element).color === "rgb(255, 0, 0)"),
  )).toBe(true);
  await page.locator("[data-studio-text-style]").click();
  await page.locator("[data-studio-text-style-option='double']").click();
  await expect(page.locator(".ProseMirror [data-text-effect='double']").first()).toBeVisible();
  const gap = page.locator("[data-studio-line-gap]");
  await expect(gap).toHaveValue("0pt");
  const before = await page.locator(".ProseMirror p").first().evaluate((node) => parseFloat(getComputedStyle(node).lineHeight));
  await gap.fill("6pt");
  await gap.press("Enter");
  await expect.poll(async () => page.locator(".ProseMirror p").first().evaluate((node) => parseFloat(getComputedStyle(node).lineHeight))).toBeGreaterThan(before + 6);
  const pitch = await page.locator(".ProseMirror p").first().evaluate((node) => parseFloat(getComputedStyle(node).lineHeight));
  await page.getByRole("button", { name: "Left to right" }).click();
  await expect.poll(async () => page.locator(".ProseMirror p").first().evaluate((node) => parseFloat(getComputedStyle(node).lineHeight))).toBeCloseTo(pitch, 0);
  await expect(page.locator(".ProseMirror p").first()).toHaveAttribute("dir", "ltr");
  const urduFont = await page.locator(".ProseMirror").evaluate((root) => {
    const node = [...root.querySelectorAll("p")][0];
    const arabic = [...node.querySelectorAll("*")].find((element) => /\p{Script=Arabic}/u.test(element.textContent ?? "")) ?? node;
    return getComputedStyle(arabic).fontFamily;
  });
  expect(urduFont.toLowerCase()).not.toMatch(/^"?inter"?/);
  await expect(page.locator("[data-studio-document-language] option")).toHaveText(["Urdu", "English"]);
  await expect(page.locator("[data-studio-toolbar-row='format'] [data-studio-document-language]")).toHaveValue("ur");
  await expect(page.locator("[aria-label='K-None']")).toHaveValue("k");
  await expect(page.locator("[data-studio-toolbar-row='document'] [aria-label='K-None']")).toBeVisible();
  await expect(page.locator("[aria-label='Text direction']")).toHaveCount(0);
  await expect(page.locator("[data-studio-toolbar-row='document'] [aria-label='Outline']")).toBeVisible();
  await expect(page.locator("[data-studio-toolbar-row='format'] [aria-label='Outline']")).toHaveCount(0);
});

test("menus, the context menu and the size list open in fullscreen", async ({ page }) => {
  await openStudio(page);
  await page.evaluate(() => {
    const shell = document.querySelector("[data-studio-shell]") as HTMLElement;
    Object.defineProperty(document, "fullscreenElement", { configurable: true, get: () => shell });
    document.dispatchEvent(new Event("fullscreenchange"));
  });
  await page.locator("[data-menu-root='file']").click();
  const menu = page.locator("[data-menu-dropdown='file']");
  await expect(menu).toBeVisible();
  expect(await menu.evaluate((node) => !!node.closest("[data-studio-shell]"))).toBe(true);
  await page.locator("[data-menu-submenu='file.download']").click();
  const flyout = page.locator("[data-menu-flyout='file.download']");
  await expect(flyout).toBeVisible();
  expect(await flyout.evaluate((node) => !!node.closest("[data-studio-shell]"))).toBe(true);
  await page.keyboard.press("Escape");
  await page.locator(".ProseMirror").evaluate((element) => {
    const rect = element.getBoundingClientRect();
    element.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: rect.left + 40, clientY: rect.top + 30 }));
  });
  const context = page.locator("[data-studio-text-menu]");
  await expect(context).toBeVisible();
  expect(await context.evaluate((node) => !!node.closest("[data-studio-shell]"))).toBe(true);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Size presets" }).click();
  const sizes = page.locator("[data-studio-size-list]");
  await expect(sizes).toBeVisible();
  expect(await sizes.evaluate((node) => !!node.closest("[data-studio-shell]"))).toBe(true);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Colour" }).click();
  const colours = page.locator("[data-studio-colour-list]");
  await expect(colours).toBeVisible();
  expect(await colours.evaluate((node) => !!node.closest("[data-studio-shell]"))).toBe(true);
  await page.keyboard.press("Escape");
  await page.locator("[data-studio-text-style]").click();
  const styles = page.locator("[data-studio-text-style-list]");
  await expect(styles).toBeVisible();
  expect(await styles.evaluate((node) => !!node.closest("[data-studio-shell]"))).toBe(true);
});

test("everyday writing, undo, menus, zoom and pages", async ({ page }) => {
  test.setTimeout(90_000);
  await openStudio(page);
  const editor = page.locator(".ProseMirror");
  await editor.click();
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Backspace");
  await page.keyboard.insertText("پہلا پیراگراف");
  await page.keyboard.press("Enter");
  await page.keyboard.insertText("دوسرا پیراگراف");
  await page.keyboard.press("Enter");
  await page.keyboard.insertText("تیسرا پیراگراف");
  await expect(editor).toContainText("تیسرا پیراگراف");
  await expect(editor.locator("p")).toHaveCount(3);
  await page.waitForTimeout(600);
  await editor.evaluate((element) => {
    const editorApi = (element as HTMLElement & { editor: { commands: { setTextSelection: (range: { from: number; to: number }) => void }; state: { doc: { content: { size: number } } } } }).editor;
    const end = editorApi.state.doc.content.size;
    editorApi.commands.setTextSelection({ from: Math.max(1, end - 5), to: end - 1 });
  });
  await page.keyboard.press("Backspace");
  await expect(editor).toContainText("پہلا پیراگراف");
  await expect(editor).not.toContainText("تیسرا پیراگراف");
  await page.keyboard.press("Control+Z");
  await expect(editor).toContainText("تیسرا پیراگراف");
  await page.keyboard.press("Control+Shift+Z");
  await expect(editor).not.toContainText("تیسرا پیراگراف");
  await page.keyboard.press("Control+Z");
  await page.locator("[data-menu-root='file']").click();
  await expect(page.locator("[data-menu-dropdown='file']")).toBeVisible();
  await page.keyboard.press("Escape");
  for (const id of ["edit", "view", "insert", "format", "tools", "window", "help"]) {
    await page.locator(`[data-menu-root='${id}']`).click();
    await expect(page.locator(`[data-menu-dropdown='${id}']`)).toBeVisible();
    await page.keyboard.press("Escape");
  }
  await page.locator("[data-studio-font-size]").fill("18");
  await page.locator("[data-studio-font-size]").press("Enter");
  await page.getByRole("button", { name: "Colour" }).click();
  await page.locator("[data-studio-colour-option='Blue']").click();
  await page.getByRole("button", { name: "Left to right" }).click();
  await page.getByRole("button", { name: "Right to left" }).click();
  await page.locator("[data-studio-zoom-control]").selectOption("50");
  await page.locator("[data-studio-zoom-control]").selectOption("100");
  await page.locator("[data-studio-zoom-control]").selectOption("200");
  await page.locator("[data-menu-root='view']").click();
  await page.locator("[data-menu-action='view.pageless']").click();
  await page.locator("[data-menu-root='view']").click();
  await page.locator("[data-menu-action='view.pages']").click();
  await page.locator("[data-studio-zoom-control]").selectOption("100");
  await page.locator("[data-studio-font-size]").fill("36");
  await page.locator("[data-studio-font-size]").press("Enter");
  await editor.click();
  for (let line = 0; line < 28; line += 1) {
    await page.keyboard.insertText("سطر");
    await page.keyboard.press("Enter");
  }
  await expect(page.locator("[data-studio-page-label]")).toHaveText(/\/[2-9]\d*$/, { timeout: 15_000 });
  await page.locator("[data-menu-root='file']").click();
  await page.locator("[data-menu-action='file.new']").click();
  await expect(page.getByLabel("Facing Pages")).toBeDisabled();
});
