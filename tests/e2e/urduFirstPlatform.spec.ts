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
      ? ["تحریر و اشاعت", "ٹائپنگ و تبدیلی", "اصلاح و نظرثانی", "صفحہ بندی و پی ڈی ایف", "تاریخیں و تقاویم", "قرآن و اسلامی مطالعہ"]
      : ["Write & Publish", "Type & Convert", "Fix & Proofread", "Page Design & PDF", "Dates & Calendars", "Quran & Islamic Studies"];
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
  else await expect(page.getByText("ریسرچ اسٹوڈیو مقفل ہے۔ رسائی ترتیب نہیں دی گئی۔", { exact: true })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  if (auth.status() === 503) await expect(page.locator("main form")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Ask|سوال/ })).toHaveCount(0);
  const response = await page.request.post("/api/research/documents", { multipart: { file: { name: "private-access-check.txt", mimeType: "text/plain", buffer: Buffer.from("Access check") } } });
  expect(response.status()).toBe(auth.status());
});


test("unconfigured research preview refuses every data endpoint without exposing sources", async ({ page }) => {
  for (const [method, path] of [
    ["POST", "/api/research/ask"], ["POST", "/api/research/documents"],
    ["GET", "/api/research/documents/missing/pages/1"],
    ["GET", "/api/research/book-library"], ["POST", "/api/research/book-library"],
  ]) {
    const response = await page.request.fetch(path, { method });
    expect(response.status()).toBe(503);
    expect(await response.json()).toEqual({ error: "Research access is not configured.", code: "auth_not_configured" });
  }
});

for (const language of ["ur", "en"] as const) {
  test(`feedback catalog, translated credits and the original single header row (${language})`, async ({ page }) => {
    await page.addInitScript(l => localStorage.setItem("qalam-site-language", l), language);
    await page.goto("/feedback");
    await expect(page.locator("html")).toHaveAttribute("lang", language);
    const options = page.locator("#feedback-tool option");
    expect(await options.evaluateAll(es => es.map(e => (e as HTMLOptionElement).value))).not.toContain("research-studio");
    expect(await options.last().getAttribute("value")).toBe("khateeb-studio");
    for (const id of ["calendar-maker", "urdu-text-to-pdf", "roman-urdu-to-urdu", "hijri-to-gregorian"]) await expect(page.locator(`#feedback-tool option[value="${id}"]`)).toHaveCount(1);
    const height = await page.locator("[data-site-header]").evaluate(e => e.getBoundingClientRect().height);
    expect(height).toBeLessThanOrEqual(page.viewportSize()!.width >= 640 ? 130 : 114);
    if (language === "en") await expect(page.locator("footer")).not.toContainText("فونٹ:");
    else {
      await expect(page.locator("[data-site-header]")).toContainText("لکھیں — سنواریں — شائع کریں");
      const fontSize = await page.locator('[data-site-header] a[href="/about"]').evaluate(e => parseFloat(getComputedStyle(e).fontSize));
      expect(fontSize).toBeGreaterThanOrEqual(15);
    }
  });
}
