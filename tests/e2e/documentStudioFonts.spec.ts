import { test, expect } from "@playwright/test";

/** Real browser check: a selected Urdu face must be visibly applied and loaded. */
const cases = [
  "Alvi Nastaleeq",
  "Jameel Noori Nastaleeq",
  "Gulzar",
  "Noto Nastaliq Urdu",
] as const;
const sample = "یہ قلم ورکس میں اردو فونٹس کی جانچ ہے۔";

test("selected Urdu faces paint using their loaded web fonts", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("qalam-site-language", "ur"));
  await page.goto("/tools/document-studio");
  const editor = page.locator(".ProseMirror");
  await expect(editor).toBeEditable();
  const select = page.locator('[data-studio-font-family="true"]');
  await expect(select).toBeVisible();

  for (const family of cases) {
    await editor.fill(sample);
    await editor.press("ControlOrMeta+A");
    await select.selectOption(family);
    const styled = editor.locator('span[style*="font-family"]').first();
    await expect(styled, family).toBeVisible();
    const audit = await styled.evaluate(async (node, chosen) => {
      const style = getComputedStyle(node);
      const cssFamily = style.fontFamily;
      // Noto's next/font/local face is renamed during bundling.
      const firstFamily = cssFamily.split(",")[0]?.trim() ?? "";
      const expectedFirst = chosen === "Noto Nastaliq Urdu"
        ? firstFamily.startsWith("__") || firstFamily.startsWith('"__')
        : firstFamily.replaceAll('"', "") === chosen;
      const faces = await document.fonts.load("18px " + firstFamily, "اردو");
      return {
        inline: (node as HTMLElement).getAttribute("style") ?? "",
        cssFamily,
        expectedFirst,
        loaded: faces.some((face) => face.status === "loaded"),
      };
    }, family);
    expect(audit.inline, family).toContain(family);
    expect(audit.expectedFirst, family + ": " + audit.cssFamily).toBe(true);
    expect(audit.loaded, family + " not loaded").toBe(true);
  }
});
