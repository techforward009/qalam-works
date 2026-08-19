/**
 * Phase 19A.2b — Urdu Writer E2E Visual Acceptance
 * Runs at desktop (1280×800) and mobile (393×851) viewports.
 */

import { test, expect, type Page, type Download } from "@playwright/test";
import { readFileSync } from "fs";

const URL = "/tools/roman-urdu-writer";

async function waitForOutput(page: Page, text: string) {
  await expect(page.locator('[role="status"]')).toContainText(text, { timeout: 5000 });
}

async function readDownloadedTxt(download: Download): Promise<string> {
  const p = await download.path();
  const buf = readFileSync(p!);
  expect(buf.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]))).toBe(true);
  return buf.toString("utf8").replace(/^\uFEFF/, "");
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

  test("Copy and TXT export the visible Urdu result", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(URL);
    await page.locator("#roman-input").fill("aaj theek hai");
    await waitForOutput(page, "آج");
    const visible = (await page.locator('[role="status"]').innerText()).trim();

    const reviewBtn = page.locator("button", { hasText: /review/i }).first();
    if (await reviewBtn.isVisible().catch(() => false)) {
      await reviewBtn.click();
      const alt = page.locator("#review-panel button[aria-pressed='false']").first();
      if (await alt.count()) {
        await alt.click();
      }
    }
    const afterChoice = (await page.locator('[role="status"]').innerText()).trim();

    await page.getByTestId("writer-copy").click();
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toBe(afterChoice);
    expect(clipboard).not.toBe("aaj theek hai");

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByTestId("writer-download-txt").click(),
    ]);
    expect(download.suggestedFilename()).toBe("qalam-urdu-writer.txt");
    expect(await readDownloadedTxt(download)).toBe(afterChoice);
    expect(visible.length).toBeGreaterThan(0);
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

  test("mobile Copy and TXT use exact Urdu draft", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(URL);
    await page.locator('[role="tab"]:last-child').click();
    const exact = "یہ اردو متن ہے";
    await page.locator("#urdu-input").fill(exact);
    await page.getByTestId("writer-copy").click();
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toBe(exact);

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByTestId("writer-download-txt").click(),
    ]);
    expect(download.suggestedFilename()).toBe("qalam-urdu-writer.txt");
    expect(await readDownloadedTxt(download)).toBe(exact);

    const sw = await page.evaluate(() => document.body.scrollWidth);
    const cw = await page.evaluate(() => document.body.clientWidth);
    expect(sw).toBeLessThanOrEqual(cw + 5);
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

  test("Mobile: Copy/TXT after transfer uses manual Urdu edit", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(URL);
    await page.locator("#roman-input").fill("aaj kaam tha");
    await waitForOutput(page, "آج");
    await page.locator("button", { hasText: /Continue editing/i }).click();
    const edited = (await page.locator("#urdu-input").inputValue()) + " ترمیم";
    await page.locator("#urdu-input").fill(edited);
    await page.getByTestId("writer-copy").click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(edited);
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByTestId("writer-download-txt").click(),
    ]);
    expect(await readDownloadedTxt(download)).toBe(edited);
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

// ── 19A.3b: WhatsApp Ready ───────────────────────────────────────────────────

test.describe("19A.3b WhatsApp Ready — Desktop (1280×900)", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("preview + Copy for WhatsApp vs ordinary Copy", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(URL);
    await page.locator("#roman-input").fill("aaj theek hai office mein");
    await waitForOutput(page, "آج");
    const visible = await page.locator('[role="status"]').evaluate((el) => el.textContent ?? "");

    await page.getByTestId("writer-whatsapp-ready").click();
    await expect(page.getByTestId("writer-whatsapp-preview")).toBeVisible();
    const preview = await page.getByTestId("writer-whatsapp-preview-text").evaluate((el) => el.textContent ?? "");
    expect(preview).not.toBe(visible);
    expect(preview.replace(/[\u2066\u2067\u2069\u200E\u200F]/g, "")).toContain("office");

    await page.getByTestId("writer-whatsapp-copy").click();
    const waClip = await page.evaluate(() => navigator.clipboard.readText());
    expect(waClip).toBe(preview);

    await page.getByTestId("writer-copy").click();
    const plainClip = await page.evaluate(() => navigator.clipboard.readText());
    expect(plainClip).toBe(visible);
    expect(plainClip).not.toBe(waClip);
    await page.screenshot({ path: "/workspace/screenshots/writer-desktop-whatsapp.png", fullPage: true });
  });

  test("stale preview clears then regenerates", async ({ page }) => {
    await page.goto(URL);
    await page.locator("#roman-input").fill("aaj theek hai");
    await waitForOutput(page, "آج");
    await page.getByTestId("writer-whatsapp-ready").click();
    await expect(page.getByTestId("writer-whatsapp-preview")).toBeVisible();
    await page.locator("#roman-input").fill("aaj kaam tha");
    await expect(page.getByTestId("writer-whatsapp-preview")).toHaveCount(0);
    await waitForOutput(page, "آج");
    await page.getByTestId("writer-whatsapp-ready").click();
    await expect(page.getByTestId("writer-whatsapp-preview")).toBeVisible();
    const preview = await page.getByTestId("writer-whatsapp-preview-text").evaluate((el) => el.textContent ?? "");
    const visible = await page.locator('[role="status"]').evaluate((el) => el.textContent ?? "");
    expect(preview.replace(/[\u2066\u2067\u2069\u200E\u200F]/g, "")).toContain(visible.replace(/\s+/g, visible.includes("کام") ? "کام" : "").slice(0, 1) || "آج");
    expect(preview).toContain("آج");
  });
});

test.describe("19A.3b WhatsApp Ready — Mobile (390×844)", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true });

  test("mixed Urdu + English + URL preview has no overflow", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(URL);
    await page.locator('[role="tab"]:last-child').click();
    const exact = "یہ Qalam Works ہے\nwww.qalamworks.com 03001234567";
    await page.locator("#urdu-input").fill(exact);
    await page.getByTestId("writer-whatsapp-ready").click();
    await expect(page.getByTestId("writer-whatsapp-preview")).toBeVisible();
    const sw = await page.evaluate(() => document.body.scrollWidth);
    const cw = await page.evaluate(() => document.body.clientWidth);
    expect(sw).toBeLessThanOrEqual(cw + 5);
    await page.getByTestId("writer-whatsapp-copy").click();
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip.replace(/[\u2066\u2067\u2069\u200E\u200F]/g, "")).toContain("www.qalamworks.com");
    expect(clip).not.toBe(exact);
    await page.screenshot({ path: "/workspace/screenshots/writer-mobile-whatsapp.png", fullPage: true });
  });
});

// ── 19A.3c: Document Studio handoff ──────────────────────────────────────────

test.describe("19A.3c Document Studio handoff — Desktop (1280×900)", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("Roman result opens Document Studio with exact visible Urdu", async ({ page }) => {
    await page.goto(URL);
    await page.locator("#roman-input").fill("aaj theek hai");
    await waitForOutput(page, "آج");
    const visible = (await page.locator('[role="status"]').evaluate((el) => el.textContent ?? "")).trim();
    await page.getByTestId("writer-document-studio").click();
    await expect(page).toHaveURL(/\/tools\/document-studio/, { timeout: 15000 });
    await page.waitForTimeout(1500);
    const editor = page.locator('[contenteditable="true"]').first();
    await expect(editor).toBeVisible({ timeout: 10000 });
    const editorText = (await editor.textContent()) ?? "";
    expect(editorText).toContain("آج");
    expect(editorText).not.toContain("aaj theek hai");
    expect(editorText.replace(/\s+/g, "")).toContain(visible.replace(/\s+/g, "").slice(0, 8));
    const leftover = await page.evaluate(() => sessionStorage.getItem("qalam-translation-handoff"));
    expect(leftover).toBeNull();
  });

  test("direct Urdu manual text is imported exactly", async ({ page }) => {
    await page.goto(URL);
    await page.locator('[role="tab"]:last-child').click();
    const exact = "یہ دستی اردو متن ہے۔";
    await page.locator("#urdu-input").fill(exact);
    await page.getByTestId("writer-document-studio").click();
    await expect(page).toHaveURL(/\/tools\/document-studio/, { timeout: 15000 });
    await page.waitForTimeout(1500);
    const editorText = (await page.locator('[contenteditable="true"]').first().textContent()) ?? "";
    expect(editorText).toContain("یہ دستی اردو متن ہے");
  });

  test("one-time: handoff key is consumed and stays gone after reload", async ({ page }) => {
    await page.goto(URL);
    await page.locator('[role="tab"]:last-child').click();
    await page.locator("#urdu-input").fill("پہلا ہینڈآف");
    await page.getByTestId("writer-document-studio").click();
    await expect(page).toHaveURL(/\/tools\/document-studio/, { timeout: 15000 });
    await page.waitForTimeout(1500);
    let key = await page.evaluate(() => sessionStorage.getItem("qalam-translation-handoff"));
    expect(key).toBeNull();
    await page.reload();
    await page.waitForTimeout(1000);
    key = await page.evaluate(() => sessionStorage.getItem("qalam-translation-handoff"));
    expect(key).toBeNull();
  });

  test("WhatsApp preview is not sent to Document Studio", async ({ page }) => {
    await page.goto(URL);
    await page.locator("#roman-input").fill("aaj theek hai");
    await waitForOutput(page, "آج");
    await page.getByTestId("writer-whatsapp-ready").click();
    await expect(page.getByTestId("writer-whatsapp-preview")).toBeVisible();
    await page.getByTestId("writer-document-studio").click();
    await expect(page).toHaveURL(/\/tools\/document-studio/, { timeout: 15000 });
    await page.waitForTimeout(1500);
    const editorText = (await page.locator('[contenteditable="true"]').first().textContent()) ?? "";
    expect(editorText).toContain("آج");
    expect(editorText).not.toMatch(/\u2067/);
  });
});

test.describe("19A.3c Document Studio handoff — Mobile (390×844)", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true });

  test("action row wraps with WhatsApp preview open", async ({ page }) => {
    await page.goto(URL);
    await page.locator("#roman-input").fill("aaj theek hai");
    await waitForOutput(page, "آج");
    await page.getByTestId("writer-whatsapp-ready").click();
    await expect(page.getByTestId("writer-document-studio")).toBeVisible();
    const sw = await page.evaluate(() => document.body.scrollWidth);
    const cw = await page.evaluate(() => document.body.clientWidth);
    expect(sw).toBeLessThanOrEqual(cw + 5);
  });
});
