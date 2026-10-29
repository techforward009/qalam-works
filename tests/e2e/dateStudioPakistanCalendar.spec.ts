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

  test("unverified Pakistan date uses the science forecast, never a fabricated official citation", async ({page}) => {
    await page.goto("/tools/date-converter?calendar=gregorian&day=4&month=11&year=2027");
    await expect(page.getByTestId("pakistan-primary-result")).toBeVisible();
    await expect(page.getByTestId("pakistan-hijri-status")).toContainText("Prediction using Pakistan crescent-visibility criteria; not an official declaration");
    await page.locator('[data-testid="pakistan-primary-result"] details summary').click();
    await expect(page.getByTestId("pakistan-source-link")).toHaveCount(0);
  });

  test("upcoming lunar-month shortcut opens the corresponding national moon-sighting evening", async ({page}) => {
    await page.goto("/tools/crescent-visibility?date=2026-11-10");
    await expect(page.getByTestId("upcoming-crescent-months")).toBeVisible();
    const next = page.getByTestId("upcoming-crescent-month-0");
    await expect(next).toContainText("Jumada al-Thani 1448");
    await expect(next).toContainText("10 November 2026");
    await next.click();
    await expect(page.locator("#dashboard-date")).toHaveValue("2026-11-10");
    await expect(page).toHaveURL(/date=2026-11-10/);
    await expect(next).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("crescent-simple-headline")).toBeVisible();
    const rajab = page.getByRole("button", {name: /Rajab 1448, expected evening/});
    await expect(rajab).toBeVisible();
    await rajab.click();
    const selected = await page.locator("#dashboard-date").inputValue();
    expect(selected).toMatch(/^2026-12-\d{2}$/);
    await expect(page).toHaveURL(new RegExp("date=" + selected));
    await expect(rajab).toHaveAttribute("aria-pressed", "true");
    await page.reload();
    await expect(page.locator("#dashboard-date")).toHaveValue(selected);
    await expect(page.getByTestId("upcoming-crescent-months")).toBeVisible();
  });

  test("simple Pakistan crescent card uses live scientific facts and preserves the full research", async ({ page }, testInfo) => {
    await page.goto("/tools/crescent-visibility?date=2026-11-10");
    const simple = page.getByTestId("crescent-simple-result");
    await expect(simple).toBeVisible();
    await expect(page.getByTestId("crescent-simple-headline")).toContainText("The crescent is not expected to be visible");
    await expect(page.getByTestId("crescent-predicted-first-day")).toContainText("12 November 2026");
    await expect(page.getByTestId("crescent-predicted-first-day")).not.toContainText("11 November 2026");
    await expect(page.getByTestId("crescent-simple-national-count")).toContainText("0 of 8");
    await expect(simple.getByText(/This is a scientific forecast/)).toBeVisible();
    await expect(page.getByTestId("crescent-simple-details")).not.toHaveAttribute("open");
    await expect(page.getByTestId("crescent-deep-details")).not.toHaveAttribute("open");
    await page.getByTestId("crescent-simple-details").locator("summary").first().click();
    await expect(page.getByTestId("crescent-simple-metrics").getByText("13.2")).toHaveCount(0);
    await page.getByTestId("crescent-quick-location").selectOption("lahore");
    await expect(page.getByTestId("crescent-quick-location")).toHaveValue("lahore");
    await expect(page.getByTestId("crescent-simple-national-count")).toContainText("0 of 8");
    await simple.getByRole("link", { name: "More details" }).click();
    await expect(page.getByTestId("crescent-simple-details")).toHaveAttribute("open");
    await simple.getByRole("link", { name: "Original research and sources" }).click();
    await expect(page.getByText("Detailed scientific and official research")).toBeVisible();
    await expect(page.getByText("Pakistan national scientific criterion")).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("crescent-quick-result.png"), fullPage: true });
  });

  test("ordinary visitor sees the upcoming moon and plain answer before the technical report", async ({ page }) => {
    await page.goto("/tools/crescent-visibility");
    await expect(page.getByTestId("upcoming-crescent-month-0")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("crescent-simple-headline")).toBeVisible();
    await expect(page.getByTestId("crescent-simple-details")).not.toHaveAttribute("open");
    await expect(page.getByTestId("crescent-deep-details")).not.toHaveAttribute("open");
    await expect(page.getByTestId("crescent-three-outcomes")).not.toBeVisible();
    await expect(page.getByText("Detailed scientific and official research")).not.toBeVisible();
    await page.getByRole("link", { name: "More details" }).click();
    await expect(page.getByTestId("crescent-simple-details")).toHaveAttribute("open");
    await expect(page.getByTestId("crescent-deep-details")).not.toHaveAttribute("open");
    await page.getByRole("link", { name: "Original research and sources" }).click();
    await expect(page.getByTestId("crescent-deep-details")).toHaveAttribute("open");
    await expect(page.getByText("Detailed scientific and official research")).toBeVisible();
  });

});

test.describe("Crescent result — Urdu typography and concise forecast", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("qalam-site-language", "ur"));
  });

  test("keeps Mehr at 22px and month cards readable at screenshot and mobile widths", async ({ page }, testInfo) => {
    if (testInfo.project.name === "desktop-chrome") {
      await page.setViewportSize({ width: 1006, height: 820 });
    }
    await page.goto("/tools/crescent-visibility?date=2026-11-10");
    const main = page.locator('main[data-crescent-ui="ur"]');
    const section = page.getByTestId("upcoming-crescent-months");
    const grid = section.locator("[data-crescent-month-grid]");
    await expect(section).toBeVisible();
    await expect(grid.locator("button")).toHaveCount(6);
    const measurements = await section.evaluate((sectionElement) => {
      const gridElement = sectionElement.querySelector("[data-crescent-month-grid]") as HTMLElement;
      const button = gridElement.querySelector("button") as HTMLButtonElement;
      const monthTitle = button.querySelector("[data-crescent-month-title]") as HTMLElement;
      const date = button.children[1] as HTMLElement;
      const cardBounds = Array.from(gridElement.querySelectorAll("button")).map(item => {
        const card = item.getBoundingClientRect();
        const content = item.querySelector("[data-crescent-month-title]")!.getBoundingClientRect();
        return { cardRight: card.right, cardLeft: card.left, contentRight: content.right, contentLeft: content.left, height: card.height, width: card.width };
      });
      return {
        viewport: window.innerWidth,
        computedGrid: getComputedStyle(gridElement).gridTemplateColumns,
        monthFont: getComputedStyle(monthTitle).fontFamily,
        monthSize: getComputedStyle(monthTitle).fontSize,
        cardFont: getComputedStyle(button).fontFamily,
        cardSize: getComputedStyle(button).fontSize,
        dateSize: getComputedStyle(date).fontSize,
        bodySize: getComputedStyle(sectionElement.querySelector("p")!).fontSize,
        cardBounds,
      };
    });
    expect(measurements.cardFont).toContain("Mehr Nastaliq Web");
    expect(measurements.cardSize).toBe("22px");
    expect(measurements.bodySize).toBe("22px");
    expect(measurements.dateSize).toBe("22px");
    expect(measurements.monthFont).toContain("Gulzar");
    expect(parseFloat(measurements.monthSize)).toBeGreaterThan(22);
    const columns = measurements.computedGrid.split(" ").length;
    expect(columns).toBe(measurements.viewport >= 640 ? 2 : 1);
    for (const box of measurements.cardBounds) {
      expect(box.height).toBeGreaterThanOrEqual(156);
      expect(box.contentLeft).toBeGreaterThanOrEqual(box.cardLeft - 1);
      expect(box.contentRight).toBeLessThanOrEqual(box.cardRight + 1);
    }
    expect(await main.evaluate(el => el.scrollWidth <= el.clientWidth + 2)).toBe(true);
    await section.screenshot({ path: testInfo.outputPath("urdu-22px-mehr-readable-month-cards.png") });
  });

  test("centres Mehr introduction and evidence cards and independently explains 11 November", async ({ page }, testInfo) => {
    await page.goto("/tools/crescent-visibility?date=2026-11-10");
    const main = page.locator('main[data-crescent-ui="ur"]');
    const introduction = main.locator("[data-crescent-intro]");
    await expect(introduction).toContainText("مہینہ چنیں اور دیکھیں");
    const introStyle = await introduction.evaluate(el => ({
      font: getComputedStyle(el).fontFamily,
      size: getComputedStyle(el).fontSize,
      align: getComputedStyle(el).textAlign,
    }));
    expect(introStyle.font).toContain("Mehr Nastaliq Web");
    expect(introStyle.size).toBe("22px");
    expect(introStyle.align).toBe("center");
    await page.getByTestId("crescent-deep-details").locator(":scope > summary").click();
    const cards = page.getByTestId("crescent-three-reference-cards");
    await expect(cards.locator("article")).toHaveCount(3);
    expect(await cards.locator("article").first().evaluate(el => getComputedStyle(el).textAlign)).toBe("center");
    await expect(main.getByText("آغازِ ماہ کا امکان")).toHaveCount(0);
    await expect(main.getByText("سرکاری تاریخی فیصلہ")).toHaveCount(0);
    const pageText = await main.textContent();
    expect(pageText).not.toContain("چاند نظر آنے کی ضمانت نہیں");
    expect(pageText).not.toContain("یہ ہمارا سائنسی اندازہ ہے؛");
    expect(pageText).not.toContain("۰ مقامات");
    const tomorrow = page.getByTestId("crescent-next-evening");
    await expect(tomorrow).toContainText("۱۱ نومبر ۲۰۲۶");
    await expect(page.getByTestId("crescent-next-evening-count")).toContainText("پاکستان کے آٹھ مقامات");
    await expect(page.getByTestId("crescent-next-evening-metrics").locator("div")).toHaveCount(4);
    await expect(page.getByTestId("crescent-next-evening-metrics")).not.toContainText("—");
    await tomorrow.screenshot({ path: testInfo.outputPath("nov-11-real-astronomy-from-nov-10.png") });
    await page.getByTestId("crescent-next-evening-link").click();
    await expect(page.locator("#dashboard-date")).toHaveValue("2026-11-11");
    await expect(page).toHaveURL(/date=2026-11-11/);
  });

  test("uses the exact Thursday first-day sentence, Gulzar titles and Mehr text without a duplicate feedback banner", async ({ page }, testInfo) => {
    await page.goto("/tools/crescent-visibility?date=2026-11-10");
    const main = page.locator('main[data-crescent-ui="ur"]');
    await expect(main).toBeVisible();
    const sentence = "ہمارے سائنسی حساب سے جمادی الثانی ۱۴۴۸ کی پہلی تاریخ ۱۲ نومبر ۲۰۲۶ء بروز جمعرات ہوگی۔";
    const card = page.getByTestId("crescent-predicted-first-day");
    await expect(card).toContainText(sentence);
    await expect(card).not.toContainText("۱۱ نومبر");
    await expect(card).not.toContainText("۳۰ دن پورے");
    await expect(main.getByRole("link", { name: "اپنی رائے دیں" })).toHaveCount(0);
    await expect(main.getByText("کیا یہ معلومات آپ کے لیے مفید رہیں؟")).toHaveCount(0);
    const fonts = await main.evaluate(element => ({
      heading: getComputedStyle(element.querySelector("h1")!).fontFamily,
      paragraph: getComputedStyle(element.querySelector("p")!).fontFamily,
      result: getComputedStyle(element.querySelector('[data-testid="crescent-predicted-first-day"] p')!).fontFamily,
      monthButton: getComputedStyle(element.querySelector('[data-testid="upcoming-crescent-month-0"]')!).fontFamily,
    }));
    expect(fonts.heading).toContain("Gulzar");
    expect(fonts.paragraph).toContain("Mehr Nastaliq Web");
    expect(fonts.result).toContain("Mehr Nastaliq Web");
    expect(fonts.monthButton).toContain("Mehr Nastaliq Web");
    await page.screenshot({ path: testInfo.outputPath("urdu-crescent-gulzar-mehr-forecast.png"), fullPage: true });
  });
});
