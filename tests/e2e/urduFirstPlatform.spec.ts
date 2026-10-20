import { test, expect } from "@playwright/test";

const languageKey = "qalam-site-language";

test("Urdu is the first-visit default and the language choice survives navigation and reload", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "ur");
  const language = page.getByRole("group", { name: "سائٹ کی زبان" });
  await expect(language.getByRole("button", { name: "اردو" })).toHaveAttribute("aria-pressed", "true");
  await language.getByRole("button", { name: "English" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.goto("/tools");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("All Qalam Works Tools");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.getByRole("group", { name: "Site language" }).getByRole("button", { name: "اردو" }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "ur");
});

for (const language of ["ur", "en"] as const) {
  test(`navigation is visible without overflow and private discovery is excluded (${language})`, async ({ page }) => {
    await page.addInitScript(({ key, language }) => localStorage.setItem(key, language), { key: languageKey, language });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", language);
    const menu = page.getByRole("button", { name: language === "ur" ? "مینو کھولیں" : "Open menu" });
    if (await menu.isVisible()) await menu.click();
    const nav = (await page.locator("#mobile-nav").isVisible()) ? page.locator("#mobile-nav") : page.getByRole("navigation", { name: "Primary navigation" });
    const groups = language === "ur"
      ? ["تحریر و اشاعت", "ٹائپنگ و تبدیلی", "اصلاح و نظرثانی", "فونٹس و ڈیزائن", "تاریخیں و تقاویم", "قرآن و اسلامی مطالعہ"]
      : ["Write & Publish", "Type & Convert", "Fix & Proofread", "Fonts & Design", "Dates & Calendars", "Quran & Islamic Studies"];
    for (const name of groups) {
      await nav.getByRole("button", { name, exact: true }).click();
      await expect(nav.locator("a").first()).toBeVisible();
      expect(await nav.locator('a[href="/tools/research-studio"]').count()).toBe(0);
      expect(await nav.locator('a[href="/tools/khateeb-studio"]').count()).toBe(0);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    expect(await page.locator('a[href="/tools/research-studio"]').count()).toBe(0);
    await expect(page.locator('footer a[href="/tools/khateeb-studio"]')).toHaveCount(1);
    await expect(page.locator('a[href="/tools/khateeb-studio"]')).toHaveCount(1);
    await page.goto("/tools");
    await expect(page.locator('main a[href="/tools/research-studio"]')).toHaveCount(0);
    for (const route of ["calendar-maker", "urdu-text-to-pdf", "hijri-to-gregorian"]) {
      await expect(page.locator(`a[href="/tools/${route}"]`).first()).toBeVisible();
    }
  });

  test(`Quran tab row clears the sticky header (${language})`, async ({ page }) => {
    await page.addInitScript(({ key, language }) => localStorage.setItem(key, language), { key: languageKey, language });
    await page.goto("/quran/1/1");
    await expect(page.locator("html")).toHaveAttribute("lang", language);
    await expect(page.getByRole("tablist")).toBeVisible();
    // The reader scrolls to the selected ayah after loading; check that state too.
    await page.waitForTimeout(1000);
    const clearance = await page.evaluate(() => {
      const header = document.querySelector("[data-site-header]")!.getBoundingClientRect();
      const tabs = document.querySelector(".quran-view-tabs")!.getBoundingClientRect();
      return tabs.top - header.bottom;
    });
    expect(clearance).toBeGreaterThanOrEqual(-1);
  });
}

test("Research Studio keeps its owner gate and fails closed without credentials", async ({ page }) => {
  await page.goto("/tools/research-studio");
  const auth = await page.request.get("/api/research/auth");
  expect([401, 503]).toContain(auth.status());
  if (auth.status() === 401) await expect(page.locator('input[type="password"]')).toBeVisible();
  else await expect(page.getByText("ریسرچ رسائی ترتیب نہیں دی گئی۔", { exact: true })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  const response = await page.request.post("/api/research/documents", { multipart: { file: { name: "private-access-check.txt", mimeType: "text/plain", buffer: Buffer.from("Access check") } } });
  expect(response.status()).toBe(auth.status());
});
