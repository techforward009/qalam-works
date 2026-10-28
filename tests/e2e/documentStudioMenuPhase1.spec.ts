import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
import { writeFileSync } from "node:fs";
import frozen from "../fixtures/qalam-menu-main-bar.json";

async function ready(page: Page, url = "/tools/document-studio") {
  await page.goto(url);
  await expect(page.locator(".ProseMirror")).toHaveAttribute("data-studio-font-layout", "ready");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("qalam-document-studio-active-document-v1"))).not.toBeNull();
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}
test.beforeEach(async ({ page }) => { await ready(page); });

test("top-level main bar is frozen, including Format and Insert, desktop and mobile", async ({ page, context }, info) => {
  const width = info.project.name === "mobile-android" ? 375 : 1280;
  await page.setViewportSize({ width, height: 800 });
  const snapshot = () => page.locator("[data-studio-menubar]").evaluate(bar => ({
    box: { x: bar.getBoundingClientRect().x, y: bar.getBoundingClientRect().y, width: bar.getBoundingClientRect().width, height: bar.getBoundingClientRect().height },
    buttons: [...bar.querySelectorAll<HTMLElement>("[data-menu-root]")].map(el => { const r = el.getBoundingClientRect(), c = getComputedStyle(el); return { id: el.dataset.menuRoot, text: el.textContent, x: r.x, y: r.y, width: r.width, height: r.height, font: c.font, padding: c.padding }; }),
    style: { background: getComputedStyle(bar).background, borderBottom: getComputedStyle(bar).borderBottom },
  }));
  await expect.poll(snapshot).toEqual(frozen[String(width) as keyof typeof frozen]);
  // Optional live-main comparison adds a pixel check to the always-on geometry fixture.
  // Local Phase 1 verification supplies this URL; normal CI needs no second server.
  if (process.env.MENU_BASELINE_URL) {
    const main = await context.newPage(); await main.setViewportSize({ width, height: 800 });
    await ready(main, `${process.env.MENU_BASELINE_URL}/tools/document-studio`);
    for (const state of ["closed", "file", "edit"]) {
      for (const current of [main, page]) {
        if (state === "closed") await current.mouse.move(3, 230);
        else if (state === "file") await current.locator('[data-menu-root="file"]').click();
        else if (!info.project.use.isMobile) await current.locator('[data-menu-root="edit"]').hover();
        else { await current.keyboard.press("Escape"); await current.locator('[data-menu-root="edit"]').click(); }
      }
      // Compare the bar itself. Main's old popup can cover its wrapped second
      // row; popup geometry/content is intentionally changing in this phase.
      for (const current of [main, page]) await current.locator("[data-menu-portaled]").evaluateAll(nodes => nodes.forEach(node => { (node as HTMLElement).style.visibility = "hidden"; }));
      const before = await main.locator("[data-studio-menubar]").screenshot({ scale: "css" });
      const after = await page.locator("[data-studio-menubar]").screenshot({ scale: "css" });
      for (const current of [main, page]) await current.locator("[data-menu-portaled]").evaluateAll(nodes => nodes.forEach(node => { (node as HTMLElement).style.visibility = ""; }));
      writeFileSync(info.outputPath(`main-bar-${state}.png`), before); writeFileSync(info.outputPath(`phase1-bar-${state}.png`), after);
      const a = await sharp(before).ensureAlpha().raw().toBuffer(), b = await sharp(after).ensureAlpha().raw().toBuffer();
      expect(a.equals(b), `main bar pixels: ${state}`).toBe(true);
    }
    await main.close();
  }
});

test("Place is inert and Insert has no Link or Load Example", async ({ page }) => {
  let chooser = false; page.on("filechooser", () => { chooser = true; });
  await page.locator('[data-menu-root="file"]').click();
  const place = page.locator('[data-menu-unavailable="file.place"]');
  await expect(place).toBeDisabled(); await expect(place).toHaveAttribute("aria-disabled", "true"); await expect(place).toHaveAttribute("title", "Coming soon");
  const box = (await place.boundingBox())!; await page.mouse.click(box.x + 50, box.y + box.height / 2);
  expect(chooser).toBe(false); await expect(place).toBeVisible(); await page.keyboard.press("Escape");
  await page.locator('[data-menu-root="insert"]').click();
  await expect(page.locator('[data-menu-dropdown="insert"] [data-menu-action="insert.link"], [data-menu-dropdown="insert"] [data-menu-action="insert.example"]')).toHaveCount(0);
});

test("reference Format structure keeps real commands in a separate Qalam section", async ({ page }) => {
  await page.locator('[data-menu-root="format"]').click();
  await expect(page.locator('[data-menu-dropdown="format"] > [data-menu-section]')).toHaveText("Qalam Page");
  const labels = await page.locator('[data-menu-dropdown="format"] [data-menu-label]').allTextContents();
  expect(labels.slice(0, 17)).toEqual(["Character…", "Paragraph…", "Hyphenation…", "Borders…", "Tabs", "Text Wrap", "Sort Text…", "Table Format…", "Table Layout…", "Object…", "Runaround…", "Inset…", "Master Page Objects…", "Document…", "Guides…", "Style Sheets…", "Define Colors…"]);
  await expect(page.locator('[data-menu-unavailable="text.tableFormat"]')).toBeDisabled();
  await expect(page.locator('[data-menu-submenu="insert.tableActions"]')).toHaveText(/Table Commands/);
  await expect(page.locator('[data-menu-submenu="format.image"]')).toHaveText(/Image Commands/);
  await expect(page.locator('[data-menu-action="insert.link"]')).toBeEnabled();
});

test("reference widths, shortcut columns and popup bounds do not clip", async ({ page }, info) => {
  await page.setViewportSize(info.project.name === "mobile-android" ? { width: 375, height: 667 } : { width: 1280, height: 800 });
  for (const [id, width] of [["file", 250], ["edit", 244], ["view", 202], ["format", 263], ["insert", 225], ["tools", 243], ["window", 197], ["help", 168]] as const) {
    await page.locator(`[data-menu-root="${id}"]`).click();
    const popup = page.locator(`[data-menu-dropdown="${id}"]`), box = (await popup.boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual((await page.locator("[data-studio-menubar]").boundingBox())!.y + (await page.locator("[data-studio-menubar]").boundingBox())!.height);
    expect(box.width).toBe(width); expect(box.x).toBeGreaterThanOrEqual(0); expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width); expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize()!.height);
    const issues = await popup.locator('[data-menu-row]').evaluateAll(rows => rows.flatMap(row => {
      const label = row.querySelector<HTMLElement>('[data-menu-label]'), shortcut = row.querySelector<HTMLElement>('[data-menu-shortcut]');
      if (!label) return [];
      const problems: string[] = [];
      if (label.scrollWidth > label.clientWidth + 1) problems.push(label.textContent + ': clipped');
      if (shortcut && label.getBoundingClientRect().right > shortcut.getBoundingClientRect().left - 6) problems.push(label.textContent + ': overlaps shortcut');
      return problems;
    }));
    expect(issues).toEqual([]);
    await popup.screenshot({ path: info.outputPath(`${id}-menu.png`), scale: "css" });
    const submenus = await popup.locator("[data-menu-submenu]").evaluateAll(nodes => nodes.map(node => (node as HTMLElement).dataset.menuSubmenu!));
    for (const submenu of submenus) {
      await popup.locator(`[data-menu-submenu="${submenu}"]`).click();
      const child = page.locator(`[data-menu-flyout="${submenu}"]`); await expect(child).toBeVisible();
      await expect.poll(async () => {
        const r = (await child.boundingBox())!;
        return r.x >= 0 && r.y >= 0 && r.x + r.width <= page.viewportSize()!.width && r.y + r.height <= page.viewportSize()!.height;
      }, { message: `${id}/${submenu} must fit the viewport` }).toBe(true);
      await page.keyboard.press("Escape");
    }
    await page.keyboard.press("Escape");
  }
  await page.locator('[data-menu-root="edit"]').click(); await page.locator('[data-menu-submenu="edit.preferences"]').click();
  const flyout = page.locator('[data-menu-flyout="edit.preferences"]'); await expect(flyout).toBeVisible();
  const b = (await flyout.boundingBox())!; expect(b.x).toBeGreaterThanOrEqual(0); expect(b.x + b.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(b.y + b.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  await page.screenshot({ path: info.outputPath("phase1-preferences.png"), scale: "css" });
});
