import { test, expect } from "@playwright/test";

/** Verify a real selected web-font paints in Chromium, not just a dropdown label. */
const cases = ["Alvi Nastaleeq", "Jameel Noori Nastaleeq", "Gulzar", "Noto Nastaliq Urdu"] as const;
const sample = "یہ قلم ورکس میں اردو فونٹس کی جانچ ہے۔";

for (const family of cases) {
  test(`Urdu font ${family} applies and loads`, async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("qalam-site-language", "ur"));
    await page.goto("/tools/document-studio");
    const editor = page.locator(".ProseMirror");
    await expect(editor).toBeEditable();
    await editor.fill(sample);
    await expect(editor).toContainText(sample);
    await editor.press("ControlOrMeta+A");

    const select = page.locator('[data-studio-font-family="true"]');
    await expect(select).toBeVisible();
    await select.selectOption(family);
    console.log("[font-audit]", family, JSON.stringify({
      selected: await select.inputValue(),
      selection: await page.evaluate(() => window.getSelection()?.toString() ?? ""),
      formatted: await editor.locator('span[style*="font-family"]').count(),
    }));

    const styled = editor.locator('span[style*="font-family"]').first();
    await expect(styled, family).toBeVisible();
    const audit = await styled.evaluate(async (node, chosen) => {
      const cssFamily = getComputedStyle(node).fontFamily;
      const firstFamily = cssFamily.split(",")[0]?.trim() ?? "";
      // next/font/local exposes the Noto face as "nastaliq" in Chromium.
      const expectedFirst = chosen === "Noto Nastaliq Urdu"
        ? /nastaliq/i.test(firstFamily)
        : firstFamily.replaceAll('"', "") === chosen;
      const faces = await document.fonts.load("18px " + firstFamily, "اردو");
      return {
        inline: (node as HTMLElement).getAttribute("style") ?? "",
        cssFamily,
        expectedFirst,
        loaded: faces.some(face => face.status === "loaded"),
      };
    }, family);

    expect(audit.inline, family).toContain(family);
    expect(audit.expectedFirst, family + ": " + audit.cssFamily).toBe(true);
    expect(audit.loaded, family + " web-font unavailable").toBe(true);
  });
}
