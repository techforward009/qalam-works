import { test, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { mockVisualReader } from "../fixtures/khateebReaderVisual";

// Run with a review-specific Playwright config (not part of the normal spec
// glob). Captures the real app UI; fixtures intercept only the reader API.
test("capture mocked Nahj al-Balagha reader review", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const mobile = testInfo.project.name.includes("mobile");
  const viewport = { width: mobile ? 390 : 1280, height: mobile ? 844 : 1000 };
  await page.setViewportSize(viewport);
  const folder = path.resolve("docs/review/khateeb-reader", mobile ? "mobile-390" : "desktop-1280");
  await mkdir(folder, { recursive: true });
  await page.addInitScript(() => {
    localStorage.setItem("qalam-site-language", "ur");
    localStorage.setItem("qalam-theme", "light");
  });
  await mockVisualReader(page);
  await page.goto("/tools/khateeb-studio/library");
  const reader = page.getByTestId("khateeb-book-reader");
  const article = page.getByTestId("book-reading-page");
  const book = reader.getByRole("combobox", { name: "کتاب منتخب کریں", exact: true });
  const next = article.getByRole("button", { name: "اگلا صفحہ", exact: true });
  const previous = article.getByRole("button", { name: "پچھلا صفحہ", exact: true });
  const counter = article.getByRole("navigation", { name: "مطالعے کا صفحہ بدلیں" }).locator("strong");
  await expect(article.locator(".khateeb-book-ar").first()).toBeVisible();
  await page.evaluate(async () => {
    await document.fonts.load('23px "Noorehuda"');
    await document.fonts.load('22px "Nafees Nastaleeq"');
    await document.fonts.ready;
  });
  const metrics: Record<string, unknown> = { viewport, screenshots: [], observations: {} };
  async function capture(name: string, viewportOnly = false) {
    await page.evaluate(() => window.scrollTo(0, 0));
    const overflow = await page.evaluate(() => ({ viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
    const menuBounds = await reader.locator("details[open] > div").evaluateAll(elements => elements.map(el => {
      const rect = el.getBoundingClientRect();
      return { left: rect.left, right: rect.right, width: rect.width, top: rect.top, bottom: rect.bottom };
    }));
    for (const bounds of menuBounds) {
      expect(bounds.left).toBeGreaterThanOrEqual(0);
      expect(bounds.right).toBeLessThanOrEqual(viewport.width);
      if (mobile) {
        expect(bounds.top).toBeGreaterThanOrEqual(0);
        expect(bounds.bottom).toBeLessThanOrEqual(viewport.height);
      }
    }
    const themeButton = await page.getByRole("button", { name: /^Switch to .*theme/ }).boundingBox();
    const textArea = await article.getByTestId("reader-page-text-area").boundingBox();
    expect(themeButton).not.toBeNull();
    expect(textArea).not.toBeNull();
    const overlapsText = themeButton!.x < textArea!.x + textArea!.width && themeButton!.x + themeButton!.width > textArea!.x
      && themeButton!.y < textArea!.y + textArea!.height && themeButton!.y + themeButton!.height > textArea!.y;
    expect(overlapsText).toBe(false);
    const darkContrast = await reader.locator("select").first().evaluate(select => {
      if (!document.documentElement.classList.contains("dark")) return null;
      function rgb(color: string) { return color.match(/[\d.]+/g)!.slice(0, 3).map(Number); }
      function luminance(color: string) {
        const c = rgb(color).map(n => { const v = n / 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
        return c[0] * .2126 + c[1] * .7152 + c[2] * .0722;
      }
      function background(element: Element): string {
        const bg = getComputedStyle(element).backgroundColor;
        return bg === "rgba(0, 0, 0, 0)" && element.parentElement ? background(element.parentElement) : bg;
      }
      function contrast(element: Element) {
        const foreground = getComputedStyle(element).color, bg = background(element);
        const a = luminance(foreground), b = luminance(bg);
        return { foreground, background: bg, ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05) };
      }
      return { selector: contrast(select), caption: contrast(select.parentElement!.querySelector("span")!) };
    });
    if (darkContrast) {
      expect(darkContrast.selector.ratio).toBeGreaterThanOrEqual(4.5);
      expect(darkContrast.caption.ratio).toBeGreaterThanOrEqual(4.5);
    }
    (metrics.observations as Record<string, unknown>)[name] = {
      overflow, menuBounds, themeButton, textArea, overlapsText, darkContrast,
      pageNumber: await article.locator("nav strong").innerText(),
      textDirection: await article.getByTestId("reader-page-text-area").locator("[lang]").first().getAttribute("dir"),
    };
    const imagePath = path.join(folder, `${name}.png`);
    if (viewportOnly) {
      await page.screenshot({ path: imagePath, animations: "disabled", scale: "css" });
    } else {
      // Capture beyond the viewport without resizing it: a fullPage viewport
      // resize can trigger the reader's ResizeObserver and repaginate the book.
      const height = await page.locator("main").last().evaluate(el => Math.ceil(el.getBoundingClientRect().bottom + scrollY));
      const session = await page.context().newCDPSession(page);
      const { data } = await session.send("Page.captureScreenshot", {
        format: "png", fromSurface: true, captureBeyondViewport: true,
        clip: { x: 0, y: 0, width: viewport.width, height, scale: 1 },
      });
      await session.detach();
      await writeFile(imagePath, Buffer.from(data, "base64"));
    }
    (metrics.screenshots as string[]).push(`${name}.png`);
  }

  // Native select, not a replacement list or a styled mock of the interface.
  await book.focus();
  await book.press("Space");
  await capture("01-library-book-list", true);
  await book.press("Escape");
  await reader.getByRole("button", { name: "فہرست", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "فہرست", exact: true })).toBeVisible();
  await capture("02-nahj-contents", true);
  await page.getByRole("dialog").getByRole("button", { name: "بند کریں", exact: true }).click();

  await expect(next).toBeEnabled();
  await expect(counter).toHaveText("1");
  await expect(article.locator(".qalam-book-arabic").first()).toHaveCSS("font-family", /^"?Noorehuda"?/);
  await capture("03-arabic-page-1");
  const before = await article.getByTestId("reader-page-text-area").innerText();
  const nextBox = await next.boundingBox(), previousBox = await previous.boundingBox();
  expect(nextBox!.x).toBeLessThan(previousBox!.x);
  await expect(next).toBeEnabled();
  await next.click();
  await expect(counter).toHaveText("2");
  await expect(article.getByTestId("reader-page-text-area")).not.toHaveText(before);
  await expect(article.getByRole("navigation", { name: "مطالعے کا صفحہ بدلیں" })).toContainText("2");
  await capture("04-arabic-page-2");
  await previous.click();
  await expect(counter).toHaveText("1");

  await reader.getByRole("button", { name: "تلاش", exact: true }).click();
  await reader.getByRole("textbox", { name: "اسی کتاب میں تلاش", exact: true }).fill("معرفته");
  await reader.getByRole("button", { name: "تلاش کریں", exact: true }).click();
  await expect(reader.locator("#book-search-panel")).toContainText("1 نتائج");
  await capture("05-in-book-search");
  await reader.getByRole("button", { name: "تلاش", exact: true }).click();

  await page.getByRole("button", { name: "Switch to dark theme", exact: true }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await capture("06-arabic-dark");
  await page.getByRole("button", { name: "Switch to system theme", exact: true }).click();
  await page.getByRole("button", { name: "Switch to light theme", exact: true }).click();

  const urduFontMenu = reader.locator("details").filter({ has: page.locator('option[value="balagh-layout"]') });
  await urduFontMenu.locator("summary").click();
  await expect(urduFontMenu.locator('option[value="digital"]')).toHaveText("Noorehuda (نور الہدیٰ)");
  await capture("12-urdu-more-menu");
  await urduFontMenu.locator("summary").click();

  await book.selectOption("nahj-ur");
  const urdu = article.locator(".khateeb-book-ur").first();
  await expect(urdu).toBeVisible();
  await expect(urdu).toHaveCSS("font-family", /^"?Nafees Nastaleeq"?/);
  await expect(next).toBeEnabled();
  await expect(counter).toHaveText("1");
  await capture("07-urdu-page-1");
  await expect(next).toBeEnabled();
  await next.click();
  await expect(counter).toHaveText("2");
  await capture("08-urdu-page-2");
  await previous.click();
  await expect(counter).toHaveText("1");
  await page.getByRole("button", { name: "Switch to dark theme", exact: true }).click();
  await capture("09-urdu-dark");

  await page.getByRole("button", { name: "Switch to system theme", exact: true }).click();
  await page.getByRole("button", { name: "Switch to light theme", exact: true }).click();
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(reader.getByRole("combobox", { name: "Choose book", exact: true })).toBeVisible();
  await reader.getByRole("combobox", { name: "Choose book", exact: true }).selectOption("nahj-ar");
  await expect(article.locator(".khateeb-book-ar").first()).toBeVisible();
  await capture("10-english-ui-arabic");
  const fontMenu = reader.locator("details").filter({ has: page.locator('option[value="balagh-layout"]') });
  await fontMenu.locator("summary").click();
  await expect(fontMenu.locator('option[value="digital"]')).toHaveText("Noorehuda (نور الہدیٰ)");
  await capture("11-more-menu-font-label");
  await fontMenu.locator("summary").click();
  await page.getByRole("button", { name: "Switch to dark theme", exact: true }).click();
  await capture("13-english-dark-selector");
  metrics.fonts = await page.evaluate(() => [...document.fonts]
    .filter(face => ["Noorehuda", "Nafees Nastaleeq"].includes(face.family.replaceAll('"', "")))
    .map(face => ({ family: face.family, status: face.status })));
  await writeFile(path.join(folder, "metrics.json"), JSON.stringify(metrics, null, 2) + "\n");
});
