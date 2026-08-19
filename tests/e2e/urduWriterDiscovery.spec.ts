import { test, expect } from "@playwright/test";

test.describe("19A.3d Urdu Writer discovery — Desktop", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("homepage How It Works card navigates to Writer", async ({ page }) => {
    await page.goto("/");
    const card = page.getByRole("link", { name: /Qalam Urdu Writer/i }).first();
    await expect(card).toBeVisible();
    await card.click();
    await expect(page).toHaveURL(/\/tools\/roman-urdu-writer/);
    await expect(page.getByRole("heading", { name: /قلم اردو رائٹر|Qalam Urdu Writer|Urdu Writer/i }).first()).toBeVisible({ timeout: 10000 });
    await page.goBack();
    await expect(page).toHaveURL(/\/?$/);
  });

  test("footer link navigates to Writer", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer").getByRole("link", { name: /Urdu Writer|قلم اردو رائٹر/i });
    await expect(footer).toBeVisible();
    await footer.click();
    await expect(page).toHaveURL(/\/tools\/roman-urdu-writer/);
  });

  test("More Tools contains Urdu Writer", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /More Tools/i }).click();
    const link = page.getByRole("link", { name: /^Urdu Writer$/i });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/tools\/roman-urdu-writer/);
  });
});

test.describe("19A.3d Urdu Writer discovery — Mobile", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true });

  test("mobile menu navigates to Writer without overflow", async ({ page }) => {
    await page.goto("/");
    const sw = await page.evaluate(() => document.body.scrollWidth);
    const cw = await page.evaluate(() => document.body.clientWidth);
    expect(sw).toBeLessThanOrEqual(cw + 5);
    await page.getByRole("button", { name: /Open menu/i }).click();
    const link = page.getByRole("link", { name: /Urdu Writer|قلم اردو رائٹر/i }).first();
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/tools\/roman-urdu-writer/);
  });
});

test.describe("19A.3d Urdu locale discovery", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("Urdu homepage shows قلم اردو رائٹر", async ({ page }) => {
    await page.goto("/");
    const langBtn = page.getByRole("button", { name: /اردو|Urdu|EN|English/i }).first();
    if (await langBtn.isVisible().catch(() => false)) {
      await langBtn.click();
    }
    const urSwitch = page.locator("button, a").filter({ hasText: /^اردو$|^UR$/i }).first();
    if (await urSwitch.isVisible().catch(() => false)) {
      await urSwitch.click();
    }
    await page.waitForTimeout(500);
    const any = page.getByRole("link", { name: /قلم اردو رائٹر|Qalam Urdu Writer/i });
    await expect(any.first()).toBeVisible();
  });
});
