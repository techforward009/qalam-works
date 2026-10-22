import { test, expect } from "@playwright/test";

test("mobile surah retains an inline working theme toggle", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem("qalam-theme", "light"));
  await page.goto("/quran/1/1");
  const control = page.locator('[data-quran-mobile-theme="inline"]');
  const button = control.getByRole("button", { name: "Change theme / ظاہری رنگ بدلیں" });
  await expect(button).toBeVisible();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await button.click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  const layout = await control.evaluate(el => {
    const box = el.getBoundingClientRect();
    return { left: box.left, right: box.right, width: window.innerWidth, position: getComputedStyle(el).position };
  });
  expect(layout.left).toBeGreaterThanOrEqual(0);
  expect(layout.right).toBeLessThanOrEqual(layout.width);
  expect(layout.position).toBe("static");
});
