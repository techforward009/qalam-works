import { expect, test, type Page } from "@playwright/test";
import type { Editor } from "@tiptap/core";

const dialog = (page: Page) => page.getByRole("dialog", { name: "Character", exact: true });
const list = (page: Page, name: string) => page.locator(`[data-character-menu="${name}"]`);
const opener = (page: Page, name: string) => page.locator(`[data-character-opener="${name}"]`);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("qalam-site-language", "en"));
  await page.goto("/tools/document-studio");
  await expect(page.locator(".ProseMirror")).toBeEditable();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("qalam-document-studio-active-document-v1"))).not.toBeNull();
  await page.locator(".ProseMirror").evaluate(el => {
    const editor = (el as HTMLElement & { editor: Editor }).editor;
    editor.commands.setContent("<p>سلام دنیا</p>");
    editor.commands.selectAll();
    const rect = el.getBoundingClientRect();
    el.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: rect.left + 24, clientY: rect.top + 14 }));
  });
  await page.getByRole("menuitem", { name: "Character…", exact: true }).click();
  await expect(dialog(page)).toBeVisible();
});

for (const name of ["size", "color", "hatch"]) {
  test(`${name} closes on outside click, repeated arrow, Escape, Tab and choice`, async ({ page }) => {
    await opener(page, name).click();
    await expect(list(page, name)).toBeVisible();
    await page.mouse.click(2, 2);
    await expect(list(page, name)).toBeHidden();
    await expect(dialog(page)).toBeVisible();
    await opener(page, name).click();
    await dialog(page).getByLabel(name[0].toUpperCase() + name.slice(1), { exact: true }).click();
    await expect(list(page, name)).toBeHidden();
    await opener(page, name).click();
    await opener(page, name).click();
    await expect(list(page, name)).toBeHidden();
    await opener(page, name).click();
    await page.keyboard.press("Escape");
    await expect(list(page, name)).toBeHidden();
    await expect(dialog(page)).toBeVisible();
    await opener(page, name).click();
    await page.keyboard.press("Tab");
    await expect(list(page, name)).toBeHidden();
    await expect(dialog(page)).toBeVisible();
    await opener(page, name).click();
    await list(page, name).getByRole("option").last().click();
    await expect(list(page, name)).toBeHidden();
    await expect(dialog(page)).toBeVisible();
  });
}

test("one list only, with no native picker or extra value strip", async ({ page }) => {
  await expect(dialog(page).locator("datalist, input[list]")).toHaveCount(0);
  // Use other exposed fields; a native-style open list may cover the field below.
  for (const name of ["size", "hatch", "color", "size"]) {
    await opener(page, name).click();
    await expect(page.locator("[data-character-menu]")).toHaveCount(1);
    await expect(list(page, name)).toHaveAttribute("role", "listbox");
    await expect(list(page, name).getByRole("option")).not.toHaveCount(0);
    await expect(list(page, name).locator(":scope > :not([role=option])")).toHaveCount(0);
  }
});

test("Size keyboard navigation, numeric nearest preset, current highlight and scroll", async ({ page }) => {
  const size = dialog(page).getByLabel("Size", { exact: true });
  await size.fill("72pt");
  await size.press("Alt+ArrowDown");
  const popup = list(page, "size"), active = popup.locator('[aria-selected="true"]');
  await expect(active).toHaveText("72pt");
  await expect.poll(() => active.evaluate(el => {
    const a = el.getBoundingClientRect(), b = el.parentElement!.getBoundingClientRect();
    return a.top >= b.top && a.bottom <= b.bottom;
  })).toBe(true);
  await size.press("Home"); await expect(active).toHaveText("10pt");
  await size.press("ArrowDown"); await expect(active).toHaveText("12pt");
  await size.press("ArrowUp"); await expect(active).toHaveText("10pt");
  await size.press("End"); await expect(active).toHaveText("72pt");
  await size.press("2"); await size.press("5");
  await expect(active).toHaveText("24pt");
  await expect(size).toHaveValue("72pt");
  await size.press("Enter");
  await expect(popup).toBeHidden();
  await expect(size).toHaveValue("24pt");
  await expect(dialog(page)).toBeVisible();
});

test("Color and Hatch support Alt+Down, arrows, Home/End and Enter", async ({ page }) => {
  for (const [name, label, first, second, last] of [
    ["color", "Color", "White", "Black", "Magenta"],
    ["hatch", "Hatch", "None", "Horizontal", "Cross"],
  ]) {
    const field = dialog(page).getByLabel(label, { exact: true });
    await field.focus(); await field.press("Alt+ArrowDown");
    const active = list(page, name).locator('[aria-selected="true"]');
    await field.press("Home"); await expect(active).toHaveText(first);
    await field.press("ArrowDown"); await expect(active).toHaveText(second);
    await field.press("ArrowUp"); await expect(active).toHaveText(first);
    await field.press("End"); await expect(active).toHaveText(last);
    await field.press("Enter");
    await expect(list(page, name)).toBeHidden();
    await expect(dialog(page)).toBeVisible();
    await opener(page, name).click();
    await expect(active).toHaveText(last);
    await field.press("Escape");
  }
});

test("Enter applies chosen Size/Color/Hatch; Escape without a list cancels", async ({ page }) => {
  await opener(page, "size").click(); await list(page, "size").getByRole("option", { name: "24pt", exact: true }).click();
  await opener(page, "color").click(); await list(page, "color").getByRole("option", { name: "Red", exact: true }).click();
  await opener(page, "hatch").click(); await list(page, "hatch").getByRole("option", { name: "Cross", exact: true }).click();
  // Enter on a non-submit control still invokes OK.
  await dialog(page).getByLabel("Bold", { exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(dialog(page)).toBeHidden();
  const attrs = await page.locator(".ProseMirror").evaluate(el => {
    const editor = (el as HTMLElement & { editor: Editor }).editor;
    return editor.getJSON().content![0].content![0].marks!.find(mark => mark.type === "textStyle")!.attrs;
  });
  expect(attrs).toMatchObject({ fontSize: "24pt", color: "#FF0000", hatch: "cross" });
  await page.locator(".ProseMirror").evaluate(el => {
    const editor = (el as HTMLElement & { editor: Editor }).editor;
    editor.commands.selectAll();
    el.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 100, clientY: 160 }));
  });
  await page.getByRole("menuitem", { name: "Character…", exact: true }).click();
  await dialog(page).getByLabel("Size", { exact: true }).fill("36pt");
  await page.keyboard.press("Escape");
  await expect(dialog(page)).toBeHidden();
  await expect(page.locator('.ProseMirror [style*="font-size"]').first()).toHaveAttribute("style", /24pt/);
});

test("labels focus their fields, access keys and Tab cycle still work", async ({ page }) => {
  for (const label of ["Size", "Style", "Color", "Hatch", "Latin Font Name", "Urdu Font Name", "Language", "Kashida", "Spacing", "Scaling", "Baseline Shift"]) {
    await dialog(page).getByText(label + ":", { exact: true }).click();
    await expect(dialog(page).getByLabel(label, { exact: true })).toBeFocused();
  }
  await page.keyboard.press("Alt+z");
  await expect(dialog(page).getByLabel("Size", { exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog(page).getByLabel("Style", { exact: true })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog(page).getByLabel("Size", { exact: true })).toBeFocused();
  await page.keyboard.press("Alt+b");
  await expect(dialog(page).getByLabel("Bold", { exact: true })).toBeChecked();
});

test("list fits viewport and touch targets, including after resize", async ({ page }, info) => {
  for (const size of [{ width: 375, height: 667 }, { width: 320, height: 300 }]) {
    await page.setViewportSize(size);
    for (const name of ["size", "color", "hatch"]) {
      await opener(page, name).click();
      const box = await list(page, name).boundingBox();
      expect(box).toBeTruthy();
      expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(size.width);
      expect(box!.y + box!.height).toBeLessThanOrEqual(size.height);
      if (info.project.name === "mobile-android") expect((await list(page, name).getByRole("option").first().boundingBox())!.height).toBeGreaterThanOrEqual(32);
      await page.keyboard.press("Escape");
    }
  }
  await page.setViewportSize(info.project.name === "mobile-android" ? { width: 390, height: 844 } : { width: 1280, height: 800 });
  await opener(page, "color").click();
  await page.screenshot({ path: info.outputPath("character-dropdown.png") });
});
