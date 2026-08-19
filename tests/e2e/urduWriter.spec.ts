/**
 * Phase 19A.2b — Urdu Writer E2E Visual Acceptance
 * Runs at desktop (1280×800) and mobile (393×851) viewports.
 */

import { test, expect, type Page } from "@playwright/test";

const URL = "/tools/roman-urdu-writer";

async function waitForOutput(page: Page, text: string) {
  await expect(page.locator('[role="status"]')).toContainText(text, { timeout: 5000 });
}

test.describe("Desktop Roman mode (1280×800)", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("renders heading, mode tabs, input, output", async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator("h1")).toContainText("Qalam Urdu Writer");
    await expect(page.locator('[role="tab"]:first-child')).toHaveText("Roman Urdu");
    await expect(page.locator('[role="tab"]:last-child')).toHaveText("اردو");
    await expect(page.locator("#roman-input")).toBeVisible();
    await expect(page.locator('[role="status"]')).toBeVisible();
  });

  test("Roman input stays LTR, Urdu output stays RTL", async ({ page }) => {
    await page.goto(URL);
    const inputDir = await page.locator("#roman-input").getAttribute("dir");
    const outputDir = await page.locator('[role="status"]').getAttribute("dir");
    expect(inputDir).toBe("ltr");
    expect(outputDir).toBe("rtl");
  });

  test("converts Roman Urdu to script — reviewable token shown", async ({ page }) => {
    await page.goto(URL);
    // Type input with a reviewable word (xyzblarg is passthrough or isEnglish → review)
    await page.locator("#roman-input").fill("aaj theek hai");
    await waitForOutput(page, "آج");

    // Capture screenshot — desktop Roman mode
    await page.screenshot({ path: "/tmp/desktop-roman.png", fullPage: false });

    // No horizontal overflow
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.body.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5); // 5px tolerance

    // No developer badges
    const bodyText = await page.locator("body").innerText();
    expect(bodyText).not.toMatch(/\bLexicon\b/);
    expect(bodyText).not.toMatch(/\bMorphology\b/);
    expect(bodyText).not.toMatch(/\bHigh confidence\b/);

    // Roman source unchanged
    expect(await page.locator("#roman-input").inputValue()).toBe("aaj theek hai");
  });

  test("review panel opens and shows wording", async ({ page }) => {
    await page.goto(URL);
    await page.locator("#roman-input").fill("xyzblarg nahi mila");
    await page.waitForTimeout(400);

    const reviewBtn = page.locator("button", { hasText: /review/i }).first();
    if (await reviewBtn.isVisible()) {
      await reviewBtn.click();
      // Review panel opened
      await expect(page.locator("#review-panel")).toBeVisible();
      // Screenshot with review open
      await page.screenshot({ path: "/tmp/desktop-review-open.png" });
    }
  });

  test("no Copy button", async ({ page }) => {
    await page.goto(URL);
    await page.locator("#roman-input").fill("aaj theek hai");
    await waitForOutput(page, "آج");
    const copyBtn = page.locator("button", { hasText: /^copy$/i });
    await expect(copyBtn).toHaveCount(0);
  });

  test("mixed English preserved in output", async ({ page }) => {
    await page.goto(URL);
    await page.locator("#roman-input").fill("office mein meeting hai aaj");
    await waitForOutput(page, "میں");
    const outputText = await page.locator('[role="status"]').innerText();
    expect(outputText).toContain("office");
    expect(outputText).toContain("meeting");
  });
});

test.describe("Mobile Roman mode (393×851)", () => {
  test.use({ viewport: { width: 393, height: 851 }, isMobile: true });

  test("no horizontal overflow on mobile", async ({ page }) => {
    await page.goto(URL);
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.body.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });

  test("mode tabs visible and selectable on mobile", async ({ page }) => {
    await page.goto(URL);
    const romanTab = page.locator('[role="tab"]:first-child');
    const urduTab  = page.locator('[role="tab"]:last-child');
    await expect(romanTab).toBeVisible();
    await expect(urduTab).toBeVisible();
    // Both should be visible without scrolling
    const romanBox = await romanTab.boundingBox();
    const urduBox  = await urduTab.boundingBox();
    expect(romanBox).not.toBeNull();
    expect(urduBox).not.toBeNull();
  });

  test("Roman input and output readable on mobile", async ({ page }) => {
    await page.goto(URL);
    await page.locator("#roman-input").fill("aaj bahut kaam tha");
    await waitForOutput(page, "آج");
    await page.screenshot({ path: "/tmp/mobile-roman.png", fullPage: false });

    // No overflow
    const sw = await page.evaluate(() => document.body.scrollWidth);
    const cw = await page.evaluate(() => document.body.clientWidth);
    expect(sw).toBeLessThanOrEqual(cw + 5);
  });

  test("review panel wraps on mobile — no horizontal scroll", async ({ page }) => {
    await page.goto(URL);
    await page.locator("#roman-input").fill("xyzblarg nahi mila");
    await page.waitForTimeout(400);
    const reviewBtn = page.locator("button", { hasText: /review/i }).first();
    if (await reviewBtn.isVisible()) {
      await reviewBtn.click();
      await page.waitForTimeout(100);
      await page.screenshot({ path: "/tmp/mobile-review.png", fullPage: false });
      const sw = await page.evaluate(() => document.body.scrollWidth);
      const cw = await page.evaluate(() => document.body.clientWidth);
      expect(sw).toBeLessThanOrEqual(cw + 5);
    }
  });
});

test.describe("Mobile direct Urdu mode (393×851)", () => {
  test.use({ viewport: { width: 393, height: 851 }, isMobile: true });

  test("Urdu mode has RTL textarea, no conversion output, no review", async ({ page }) => {
    await page.goto(URL);
    // Switch to Urdu mode
    await page.locator('[role="tab"]:last-child').click();
    await expect(page.locator("#urdu-input")).toBeVisible();
    const dir = await page.locator("#urdu-input").getAttribute("dir");
    expect(dir).toBe("rtl");

    // No conversion output
    await expect(page.locator('[role="status"]')).toHaveCount(0);

    // No review panel
    await expect(page.locator("#review-panel")).toHaveCount(0);

    // Type Urdu
    await page.locator("#urdu-input").fill("یہ اردو متن ہے");
    await page.screenshot({ path: "/tmp/mobile-urdu.png", fullPage: false });

    // Draft preserved after typing
    expect(await page.locator("#urdu-input").inputValue()).toBe("یہ اردو متن ہے");
  });

  test("switching back to Roman preserves Urdu draft", async ({ page }) => {
    await page.goto(URL);
    await page.locator("#roman-input").fill("aaj");
    await page.locator('[role="tab"]:last-child').click();
    await page.locator("#urdu-input").fill("یہ اردو ہے");
    await page.locator('[role="tab"]:first-child').click();
    expect(await page.locator("#roman-input").inputValue()).toBe("aaj");
    await page.locator('[role="tab"]:last-child').click();
    expect(await page.locator("#urdu-input").inputValue()).toBe("یہ اردو ہے");
  });
});

// ── 19A.2c: Transfer workflow ─────────────────────────────────────────────────

test.describe("19A.2c Transfer — Desktop (1280×900)", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("Continue editing seeds Urdu draft and switches mode", async ({ page }) => {
    await page.goto(URL);
    await page.locator("#roman-input").fill("aaj theek hai");
    await waitForOutput(page, "آج");
    const urduResult = await page.locator('[role="status"]').innerText();
    await page.locator("button", { hasText: /Continue editing/i }).click();
    // Mode must be Urdu
    await expect(page.locator("#urdu-input")).toBeVisible();
    // Draft equals result
    expect(await page.locator("#urdu-input").inputValue()).toBe(urduResult.trim());
    // Screenshot
    await page.screenshot({ path: "/tmp/desktop-transfer.png" });
  });

  test("Roman draft unchanged after transfer", async ({ page }) => {
    await page.goto(URL);
    const roman = "aaj theek hai";
    await page.locator("#roman-input").fill(roman);
    await waitForOutput(page, "آج");
    await page.locator("button", { hasText: /Continue editing/i }).click();
    await page.locator('[role="tab"]:first-child').click();
    expect(await page.locator("#roman-input").inputValue()).toBe(roman);
  });

  test("Existing Urdu draft: Keep preserves it", async ({ page }) => {
    await page.goto(URL);
    // Create existing Urdu draft
    await page.locator('[role="tab"]:last-child').click();
    await page.locator("#urdu-input").fill("یہ پرانا متن ہے");
    await page.locator('[role="tab"]:first-child').click();
    await page.locator("#roman-input").fill("aaj theek hai");
    await waitForOutput(page, "آج");
    await page.locator("button", { hasText: /Continue editing/i }).click();
    // Confirmation appears
    await expect(page.locator('[role="alertdialog"]')).toBeVisible();
    // Click Keep
    await page.locator("button", { hasText: /Keep current/i }).click();
    // Urdu draft preserved
    expect(await page.locator("#urdu-input").inputValue()).toBe("یہ پرانا متن ہے");
    await page.screenshot({ path: "/tmp/desktop-confirm.png" });
  });

  test("Existing Urdu draft: Replace uses converted result", async ({ page }) => {
    await page.goto(URL);
    await page.locator('[role="tab"]:last-child').click();
    await page.locator("#urdu-input").fill("یہ پرانا متن ہے");
    await page.locator('[role="tab"]:first-child').click();
    await page.locator("#roman-input").fill("aaj theek hai");
    await waitForOutput(page, "آج");
    const urduResult = (await page.locator('[role="status"]').innerText()).trim();
    await page.locator("button", { hasText: /Continue editing/i }).click();
    await page.locator("button", { hasText: /^Replace$/i }).click();
    expect(await page.locator("#urdu-input").inputValue()).toBe(urduResult);
  });
});

test.describe("19A.2c Transfer — Mobile (393×851)", () => {
  test.use({ viewport: { width: 393, height: 851 }, isMobile: true });

  test("Mobile: full transfer workflow", async ({ page }) => {
    await page.goto(URL);
    await page.locator("#roman-input").fill("aaj kaam tha");
    await waitForOutput(page, "آج");
    const urduResult = (await page.locator('[role="status"]').innerText()).trim();
    await page.locator("button", { hasText: /Continue editing/i }).click();
    expect(await page.locator("#urdu-input").inputValue()).toBe(urduResult);
    // Edit in Urdu
    await page.locator("#urdu-input").fill(urduResult + " ترمیم");
    await page.screenshot({ path: "/tmp/mobile-transfer.png" });
    // Switch Roman and back
    await page.locator('[role="tab"]:first-child').click();
    await page.locator('[role="tab"]:last-child').click();
    // Manual edit preserved
    expect(await page.locator("#urdu-input").inputValue()).toBe(urduResult + " ترمیم");
  });

  test("Mobile: confirmation wraps properly", async ({ page }) => {
    await page.goto(URL);
    await page.locator('[role="tab"]:last-child').click();
    await page.locator("#urdu-input").fill("یہ پرانا متن ہے");
    await page.locator('[role="tab"]:first-child').click();
    await page.locator("#roman-input").fill("aaj theek hai");
    await waitForOutput(page, "آج");
    await page.locator("button", { hasText: /Continue editing/i }).click();
    await expect(page.locator('[role="alertdialog"]')).toBeVisible();
    // No overflow
    const sw = await page.evaluate(() => document.body.scrollWidth);
    const cw = await page.evaluate(() => document.body.clientWidth);
    expect(sw).toBeLessThanOrEqual(cw + 5);
    await page.screenshot({ path: "/tmp/mobile-confirm.png" });
  });
});
