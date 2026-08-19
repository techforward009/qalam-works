import { test, expect } from "@playwright/test";

test.describe("19A.4b Writer dual-pane layout", () => {
  test("desktop side-by-side dual pane", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/tools/roman-urdu-writer");
    const pane = page.getByTestId("writer-dual-pane");
    await expect(pane).toBeVisible();
    const sections = pane.locator("section");
    await expect(sections).toHaveCount(2);
    const s0 = await sections.nth(0).boundingBox();
    const s1 = await sections.nth(1).boundingBox();
    expect(s0 && s1).toBeTruthy();
    expect(Math.abs((s0!.y) - (s1!.y))).toBeLessThan(40);
    expect(Math.abs((s0!.x) - (s1!.x))).toBeGreaterThan(80);
  });

  test("mobile remains stacked without overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/tools/roman-urdu-writer");
    const pane = page.getByTestId("writer-dual-pane");
    await expect(pane).toBeVisible();
    const sections = pane.locator("section");
    const s0 = await sections.nth(0).boundingBox();
    const s1 = await sections.nth(1).boundingBox();
    expect(s0 && s1).toBeTruthy();
    expect(s1!.y).toBeGreaterThan(s0!.y + 40);
    const sw = await page.evaluate(() => document.body.scrollWidth);
    const cw = await page.evaluate(() => document.body.clientWidth);
    expect(sw).toBeLessThanOrEqual(cw + 5);
  });

  test("roman conversion and actions usable", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/tools/roman-urdu-writer");
    await page.locator("#roman-input").fill("aaj theek hai");
    await page.waitForTimeout(300);
    const status = page.getByRole("status");
    await expect(status).toContainText("آج");
    await expect(page.getByRole("button", { name: /copy/i }).first()).toBeVisible();
  });
});
