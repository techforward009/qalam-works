import { test, expect } from "@playwright/test";

/**
 * Acceptance checks for the Pakistan-first public calendar.
 * Runs in production-built Next.js on both desktop and mobile Chromium.
 */
test.describe("Pakistan Hijri public-facing date acceptance", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("qalam-site-language", "en"));
  });

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

  test("Pakistan 2022 Ramadan: 12 April is 10 Ramadan 1443 in both day and month", async ({ page }, testInfo) => {
    await page.goto("/date/2022-04-12");
    await expect(page.getByText("Pakistan official Hijri date")).toBeVisible();
    await expect(page.getByText("10 Ramadan 1443 AH",{exact:true})).toBeVisible();
    await page.goto("/calendar/2022/4");
    await expect(page.locator('[data-calendar-month="4"] a[href="/date/2022-04-12"] [data-role="hijri-day"]'))
      .toContainText(/^10/);
    await page.screenshot({path:testInfo.outputPath("pk-2022-ramadan.png"),fullPage:true});
  });

  test("Pakistan 2022 Rabi al-Thani: committee-announced 28 October is first day", async ({ page }, testInfo) => {
    await page.goto("/date/2022-10-28");
    await expect(page.getByText("Pakistan official Hijri date")).toBeVisible();
    await expect(page.getByText("1 Rabi al-Thani 1444 AH",{exact:true})).toBeVisible();
    await page.goto("/calendar/2022/10");
    await expect(page.locator('[data-calendar-month="10"] a[href="/date/2022-10-28"] [data-role="hijri-day"]'))
      .toContainText(/^1/);
    await page.screenshot({path:testInfo.outputPath("pk-2022-rabi-thani.png"),fullPage:true});
  });

  test("Pakistan Ramadan 2021: 23 April is 10 Ramadan 1442 in day/month", async ({page},testInfo) => {
    await page.goto("/date/2021-04-23");
    await expect(page.getByText("Pakistan official Hijri date")).toBeVisible();
    await expect(page.getByText("10 Ramadan 1442 AH",{exact:true})).toBeVisible();
    await page.goto("/calendar/2021/4");
    await expect(page.locator('[data-calendar-month="4"] a[href="/date/2021-04-23"] [data-role="hijri-day"]'))
      .toContainText(/^10/);
    await page.screenshot({path:testInfo.outputPath("pk-2021-ramadan-calendar.png"),fullPage:true});
  });

  test("Pakistan Shawwal 2021: official Eid on 13 May overrides old forecast", async ({page},testInfo) => {
    await page.goto("/date/2021-05-13");
    await expect(page.getByText("Pakistan official Hijri date")).toBeVisible();
    await expect(page.getByText("1 Shawwal 1442 AH",{exact:true})).toBeVisible();
    await page.goto("/calendar/2021/5");
    await expect(page.locator('[data-calendar-month="5"] a[href="/date/2021-05-13"] [data-role="hijri-day"]'))
      .toContainText(/^1/);
    await page.screenshot({path:testInfo.outputPath("pk-2021-shawwal-calendar.png"),fullPage:true});
  });

  test("Pakistan 2020 Ramadan: 4 May is 10 Ramadan 1441 in daily and monthly views", async ({page},testInfo) => {
    await page.goto("/date/2020-05-04");
    await expect(page.getByText("Pakistan official Hijri date")).toBeVisible();
    await expect(page.getByText("10 Ramadan 1441 AH",{exact:true})).toBeVisible();
    await page.goto("/calendar/2020/5");
    await expect(page.locator('[data-calendar-month="5"] a[href="/date/2020-05-04"] [data-role="hijri-day"]'))
      .toContainText(/^10/);
    await page.screenshot({path:testInfo.outputPath("pk-2020-ramadan.png"),fullPage:true});
  });

  test("2020 Pakistan corrected December boundary follows official crescent decision", async ({page},testInfo) => {
    await page.goto("/date/2020-12-17");
    await expect(page.getByText("Pakistan official Hijri date")).toBeVisible();
    await expect(page.getByText("1 Jumada al-Awwal 1442 AH",{exact:true})).toBeVisible();
    await page.goto("/calendar/2020/12");
    await expect(page.locator('[data-calendar-month="12"] a[href="/date/2020-12-17"] [data-role="hijri-day"]'))
      .toContainText(/^1/);
    await page.screenshot({path:testInfo.outputPath("pk-2020-jumada-corrected.png"),fullPage:true});
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
  test("date converter shows one primary Pakistan result and a complete sourced copy", async ({page}, testInfo) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText: async (value: string) => {
          (window as typeof window & { __dateCopied?: string }).__dateCopied = value;
        } },
      });
    });
    await page.goto("/tools/date-converter?calendar=gregorian&day=4&month=11&year=2026");
    await expect(page.getByTestId("pakistan-primary-result")).toBeVisible();
    await expect(page.getByTestId("pakistan-hijri-date")).toContainText("23");
    await expect(page.getByTestId("pakistan-hijri-date")).toContainText("Jumada");
    await expect(page.getByTestId("pakistan-hijri-status")).toContainText("Pakistan");
    await expect(page.getByText("Additional calendar equivalents (optional)")).toBeVisible();
    await expect(page.getByText("Astronomical and calculation methods (research)")).toBeVisible();
    const sourceDetails = page.locator('[data-testid="pakistan-primary-result"] details');
    await sourceDetails.locator("summary").click();
    await expect(page.getByTestId("pakistan-source-link")).toHaveAttribute("href", /app\.com\.pk|radio\.gov\.pk/);
    await page.getByTestId("copy-pakistan-date").click();
    const copied = await page.evaluate(() => (window as typeof window & { __dateCopied?: string }).__dateCopied);
    expect(copied).toContain("4 November 2026");
    expect(copied).toContain("23 Jumada");
    expect(copied).toContain("More details:");
    expect(copied).not.toContain("app.com.pk");
    expect(copied).not.toContain("radio.gov.pk");
    expect(copied).toContain("https://www.qalamworks.com/date/2026-11-04");
    await page.screenshot({path:testInfo.outputPath("pk-2026-shareable-primary-result.png"),fullPage:true});
  });

  test("unknown Pakistan lunar month is explicitly calculated and has no fabricated citation", async ({page}) => {
    await page.goto("/tools/date-converter?calendar=gregorian&day=4&month=11&year=2027");
    await expect(page.getByTestId("pakistan-primary-result")).toBeVisible();
    await expect(page.getByTestId("pakistan-hijri-status")).toContainText("Calculated");
    await page.locator('[data-testid="pakistan-primary-result"] details summary').click();
    await expect(page.getByTestId("pakistan-source-link")).toHaveCount(0);
  });

});
