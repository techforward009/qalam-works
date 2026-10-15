import { test, expect } from "@playwright/test";

/**
 * Acceptance checks for the Pakistan-first public calendar.
 * Runs in production-built Next.js on both desktop and mobile Chromium.
 */
test.describe("Pakistan Hijri public-facing date acceptance", () => {
  test("uses the official 10 Ramadan 1447 date on daily and monthly views", async ({ page }, testInfo) => {
    await page.goto("/date/2026-02-28");
    await expect(page.getByText("Pakistan official Hijri date")).toBeVisible();
    await expect(page.getByText("10 Ramadan 1447 AH", { exact: true })).toBeVisible();
    await expect(page.getByText("12 Ramadan 1447 AH", { exact: true })).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath("pk-2026-ramadan-daily.png"), fullPage: true });

    await page.goto("/calendar/2026/2");
    await expect(page.locator('[data-calendar-month="2"] a[href="/date/2026-02-28"] [data-role="hijri-day"]'))
      .toContainText(/^10/);
    await page.screenshot({ path: testInfo.outputPath("pk-2026-february-calendar.png"), fullPage: true });
  });

  test("shows 10 Ramadan 1446 on March 11, 2025 in Pakistan year and daily cards", async ({ page }, testInfo) => {
    await page.goto("/date/2025-03-11");
    await expect(page.getByText("Pakistan official Hijri date")).toBeVisible();
    await expect(page.getByText("10 Ramadan 1446 AH", { exact: true })).toBeVisible();
    await page.goto("/calendar/2025");
    await expect(page.locator('[data-calendar-month="3"] a[href="/date/2025-03-11"] [data-role="hijri-day"]'))
      .toContainText(/^10/);
    await page.screenshot({ path: testInfo.outputPath("pk-2025-annual-calendar.png"), fullPage: true });
  });

  test("presents historical 10 Ramadan 1445 on 21 March 2024", async ({ page }, testInfo) => {
    await page.goto("/date/2024-03-21");
    await expect(page.getByText("Pakistan official Hijri date")).toBeVisible();
    await expect(page.getByText("10 Ramadan 1445 AH", {exact:true})).toBeVisible();
    await page.goto("/calendar/2024/3");
    await expect(page.locator('[data-calendar-month="3"] a[href="/date/2024-03-21"] [data-role="hijri-day"]'))
      .toContainText(/^10/);
    await page.screenshot({path:testInfo.outputPath("pk-2024-march-calendar.png"),fullPage:true});
  });

  test("renders Pakistan Hijri dates for leap day 29 February 2024", async ({page},testInfo) => {
    await page.goto("/date/2024-02-29");
    await expect(page.getByText("18 Sha'ban 1445 AH", {exact:true})).toBeVisible();
    await page.goto("/calendar/2024/2");
    await expect(page.locator('[data-calendar-month="2"] a[href="/date/2024-02-29"] [data-role="hijri-day"]'))
      .toContainText(/^18/);
    await page.screenshot({path:testInfo.outputPath("pk-2024-leap-february.png"),fullPage:true});
  });

  test("shows 10 Ramadan 1444 on 1 April 2023 on day and month views", async ({page}, testInfo) => {
    await page.goto("/date/2023-04-01");
    await expect(page.getByText("Pakistan official Hijri date")).toBeVisible();
    await expect(page.getByText("10 Ramadan 1444 AH", {exact:true})).toBeVisible();
    await page.goto("/calendar/2023/4");
    await expect(page.locator('[data-calendar-month="4"] a[href="/date/2023-04-01"] [data-role="hijri-day"]'))
      .toContainText(/^10/);
    await page.screenshot({path:testInfo.outputPath("pk-2023-ramadan-calendar.png"),fullPage:true});
  });

  test("respects the official Pakistan 1 Safar on 19 August 2023", async ({page}, testInfo) => {
    await page.goto("/date/2023-08-19");
    await expect(page.getByText("Pakistan official Hijri date")).toBeVisible();
    await expect(page.getByText("1 Safar 1445 AH", {exact:true})).toBeVisible();
    await page.goto("/calendar/2023/8");
    await expect(page.locator('[data-calendar-month="8"] a[href="/date/2023-08-19"] [data-role="hijri-day"]'))
      .toContainText(/^1/);
    await page.screenshot({path:testInfo.outputPath("pk-2023-safar-calendar.png"),fullPage:true});
  });

  test("keeps the Pakistan result visible and avoids sideways scrolling", async ({ page }) => {
    await page.goto("/calendar/2025/3");
    const visible = page.getByText("Pakistan Hijri calendar");
    await expect(visible).toBeVisible();
    const dims = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
    }));
    expect(dims.documentWidth).toBeLessThanOrEqual(dims.viewportWidth + 6);
  });
});
