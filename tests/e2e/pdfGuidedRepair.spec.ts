import { test, expect } from "@playwright/test";

test("Urdu PDF failure details navigate to original run without silently editing", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("qalam-site-language", "ur"));
  await page.goto("/tools/document-studio");
  const editor = page.locator(".ProseMirror");
  await expect(editor).toBeVisible();
  await editor.click();
  await page.keyboard.press("Control+A");
  await page.keyboard.type("یہ ایک آزمائشی عبارت ہے۔");
  const initial = await editor.innerText();
  await page.keyboard.press("Control+A");
  await page.locator('[data-studio-font-family="true"]').selectOption("Digital Khatt Indo-Pak");
  let calls = 0;
  await page.route("**/api/export-pdf", async route => {
    calls += 1;
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({
        error: "پی ڈی ایف میں فونٹ کی خرابی ہے۔",
        retryable: false,
        diagnostics: [
          { code: "PDF_FONT_UNSAFE", kind: "font", messageUrdu: "حرف محفوظ طریقے سے نہیں بن رہا۔",
            codepoint: "U+06D7", character: "ۗ", selectedFont: "Digital Khatt Indo-Pak", location: { runIndex: 0 } },
          { code: "PDF_FONT_UNSAFE", kind: "font", messageUrdu: "ایک اور عبارت کی جانچ ضروری ہے۔", location: { runIndex: 1 } }
        ],
      }),
    });
  });
  await page.locator('[data-menu-root="file"]').click();
  await page.locator('[data-menu-submenu="file.download"]').hover();
  await page.locator('[data-menu-action="file.downloadPdf"]').click();
  await expect(page.getByRole("region", { name: /پی ڈی ایف تیار نہیں ہوسکی/ })).toBeVisible();
  await expect(page.getByText("U+06D7")).toBeVisible();
  await expect(page.getByRole("list", { name: "پی ڈی ایف کی خرابیوں کی فہرست" }).locator("li")).toHaveCount(2);
  await page.getByRole("button", { name: "متاثرہ عبارت دکھائیں اور منتخب کریں" }).first().click();
  const selection = await page.evaluate(() => window.getSelection()?.toString() ?? "");
  expect(selection).toContain("آزمائشی");
  await page.screenshot({ path: "artifacts/pdf-diagnostics/urdu-guided-repair.png", fullPage: true });
  await page.getByRole("region", { name: /پی ڈی ایف تیار نہیں ہوسکی/ }).screenshot({ path: "artifacts/pdf-diagnostics/urdu-guided-repair-panel.png" });
  expect(await editor.innerText()).toBe(initial);
  await page.getByRole("button", { name: "درستگی کے بعد دوبارہ پی ڈی ایف بنائیں" }).click();
  await expect.poll(() => calls).toBe(2);
});

test("source navigation is guarded after the document changes", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("qalam-site-language", "ur"));
  await page.goto("/tools/document-studio");
  const editor = page.locator(".ProseMirror");
  await expect(editor).toBeVisible();
  await page.route("**/api/export-pdf", async route => {
    await route.fulfill({
      status: 500, contentType: "application/json",
      body: JSON.stringify({ error: "فونٹ کی خرابی", retryable: false, diagnostics: [
        { code: "PDF_FONT_UNSAFE", kind: "font", messageUrdu: "متعلقہ عبارت دیکھیں۔", location: { runIndex: 0 } },
      ] }),
    });
  });
  await page.locator('[data-menu-root="file"]').click();
  await page.locator('[data-menu-submenu="file.download"]').hover();
  await page.locator('[data-menu-action="file.downloadPdf"]').click();
  await expect(page.getByRole("button", { name: "متاثرہ عبارت دکھائیں اور منتخب کریں" })).toBeVisible();
  await editor.click();
  await page.keyboard.type("متن بدل گیا");
  await page.getByRole("button", { name: "متاثرہ عبارت دکھائیں اور منتخب کریں" }).click();
  await expect(page.getByText("دستاویز تبدیل ہوچکی ہے۔", { exact: false })).toBeVisible();
});
