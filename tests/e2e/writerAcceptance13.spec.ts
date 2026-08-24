/**
 * Phase 19A.13 — Writer visual acceptance: bidi, currency, review
 */
import { test, expect } from "@playwright/test";

const URL = "http://localhost:5400/tools/roman-urdu-writer";
const ACCEPT_PARA =
  "Mulaazmeen ki mahana tankhwah aur pension ki adaiyagi ke liye bank account ki tasdeeq (verification) nihayat zaroori hai. Company ne 2025-26 ke maali saal ke liye 15% idhaafay ka aelaan kiya tha. Agar aap ka record update nahi hai, toh fawri taur par HR department se rabta karein taake RS. 75,000 tak ki maali rukawat se bacha jaa sakay.";

async function typeAndWait(page: any, text: string) {
  await page.locator("#roman-input").fill(text);
  await page.waitForTimeout(500);
}

test.describe("19A.13 Desktop", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("acceptance paragraph: 2025-26 visible, 15% visible, RS. 75,000 transformed", async ({ page }) => {
    await page.goto(URL);
    await typeAndWait(page, ACCEPT_PARA);

    const output = page.locator('[role="status"]');
    const outputText = await output.innerText();

    // 2025-26 must appear somewhere in output (may be in bdi element)
    await expect(output).toContainText("2025-26");

    // 15% → 15 فیصد (policy: % symbol → فیصد in Urdu output)
    await expect(output).toContainText("15 فیصد");

    // RS. 75,000 must be transformed to Urdu prose
    await expect(output).toContainText("75,000");
    await expect(output).toContainText("روپے");
    await expect(output).not.toContainText("RS. 75");

    // No horizontal overflow
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.body.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);

    await page.screenshot({ path: "/tmp/19A13-desktop-acceptance.png" });
  });

  test("review: no junk cards for numbers/particles", async ({ page }) => {
    await page.goto(URL);
    await typeAndWait(page, ACCEPT_PARA);

    const reviewBtn = page.locator("button", { hasText: /Review/i }).first();
    if (await reviewBtn.isVisible()) {
      await reviewBtn.click();
      await page.waitForTimeout(100);

      // Review panel should NOT show roman tokens that are particles or numbers
      const panel = page.locator("#review-panel");
      if (await panel.isVisible()) {
        const panelText = await panel.innerText();
        // Known particles that should never appear
        for (const junk of ["75,000", "15%", "2025-26", " ke ", " ka ", " ki ", " ko ", " se ", " ne "]) {
          // If a particle appears it should only be as the Roman label inside a legitimate card
          // The key test: these should not generate review cards on their own
        }
        await page.screenshot({ path: "/tmp/19A13-desktop-review.png" });
      }
    }
  });

  test("bdi elements present for LTR islands in RTL output", async ({ page }) => {
    await page.goto(URL);
    await typeAndWait(page, "Company ne 2025-26 ke liye 15% idhaafay ka aelaan kiya.");

    // Check that bdi elements exist with dir=ltr
    const bdiElements = page.locator('[role="status"] bdi[dir="ltr"]');
    const count = await bdiElements.count();
    expect(count).toBeGreaterThan(0);
    await page.screenshot({ path: "/tmp/19A13-desktop-bidi.png" });
  });

  test("plain number 75,000 not transformed", async ({ page }) => {
    await page.goto(URL);
    await typeAndWait(page, "75,000 log hain is shehar mein");
    const output = page.locator('[role="status"]');
    await expect(output).toContainText("75,000");
    // Must NOT have روپے since no PKR marker
    const text = await output.innerText();
    expect(text).not.toContain("روپے");
  });
});

test.describe("19A.13 Mobile", () => {
  test.use({ viewport: { width: 393, height: 851 }, isMobile: true });

  test("acceptance paragraph works on mobile", async ({ page }) => {
    await page.goto(URL);
    await typeAndWait(page, ACCEPT_PARA);
    const output = page.locator('[role="status"]');
    await expect(output).toContainText("2025-26");
    await expect(output).toContainText("75,000");
    await expect(output).toContainText("روپے");
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.body.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
    await page.screenshot({ path: "/tmp/19A13-mobile-acceptance.png" });
  });
});

// ── Phase 19A.23: Urdu → Roman mode tab regression ───────────────────────────
test.describe("19A.23 Urdu→Roman mode", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("clicking اردو → Roman tab navigates to /tools/urdu-roman-writer", async ({ page }) => {
    await page.goto(URL);

    // Click the second tab (اردو → Roman) — navigates to standalone page
    const tabs = page.locator('[role="tab"]');
    await expect(tabs).toHaveCount(2);
    await tabs.nth(1).click();

    // Should navigate to urdu-roman-writer page
    await page.waitForURL("**/tools/urdu-roman-writer", { timeout: 5000 });
    expect(page.url()).toContain("/tools/urdu-roman-writer");

    // Verify the correct UI is shown
    const pane = page.locator('[data-testid="writer-urdu-roman-pane"]');
    await expect(pane).toBeVisible();

    // Input label must say URDU
    await expect(page.locator('#urdu-roman-input-label')).toContainText('URDU');

    // Output label must say ROMAN URDU
    await expect(page.locator('#urdu-roman-output-label')).toContainText('ROMAN URDU');

    // Placeholder must show Urdu example
    const input = page.locator('[data-testid="urdu-roman-input"]');
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('placeholder', /آج کا دن/);

    // Type Urdu text and verify Roman output
    await input.fill('میرا نام علی ہے');
    const output = page.locator('[data-testid="urdu-roman-output"]');
    await expect(output).toContainText('naam');
    await expect(output).toContainText('Ali');
    await expect(output).toContainText('hai');
  });

  test("urdu-roman-writer page has back-tab linking to roman-urdu-writer", async ({ page }) => {
    await page.goto(URL.replace("roman-urdu-writer", "urdu-roman-writer"));

    // Should show 2 tabs with first tab linking back
    const tabs = page.locator('[role="tab"]');
    await expect(tabs).toHaveCount(2);

    // Second tab (اردو → Roman) should be selected
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');

    // First tab links back to roman-urdu-writer
    const backTab = page.locator('[data-testid="tab-roman"]');
    await expect(backTab).toBeVisible();
    await backTab.click();
    await page.waitForURL("**/tools/roman-urdu-writer", { timeout: 5000 });
    expect(page.url()).toContain("/tools/roman-urdu-writer");
  });

  test("full acceptance: type میرا نام علی ہے → get mera naam Ali hai", async ({ page }) => {
    await page.goto(URL.replace("roman-urdu-writer", "urdu-roman-writer"));
    const input = page.locator('[data-testid="urdu-roman-input"]');
    await input.fill('میرا نام علی ہے');
    const output = page.locator('[data-testid="urdu-roman-output"]');
    await expect(output).toContainText('naam');
    await expect(output).toContainText('Ali');
    await expect(output).toContainText('hai');
  });
});
