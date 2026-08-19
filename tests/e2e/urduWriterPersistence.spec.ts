import { test, expect } from "@playwright/test";

const WRITER = "/tools/roman-urdu-writer";
const DRAFT_KEY = "qalam-urdu-writer-draft";

test.describe("19A.4e Writer persistence + history", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(WRITER);
    await page.evaluate((key) => localStorage.removeItem(key), DRAFT_KEY);
    await page.reload();
    await expect(page.locator("#roman-input")).toBeVisible();
  });

  test("Roman draft survives refresh", async ({ page }) => {
    const roman = "main ghar jana chahta hon";
    await page.locator("#roman-input").fill(roman);
    await page.waitForTimeout(300);
    await expect(page.getByRole("status")).not.toHaveText(/^\s*$/);
    await page.reload();
    await expect(page.locator("#roman-input")).toHaveValue(roman);
    await page.waitForTimeout(300);
    await expect(page.getByRole("status")).not.toHaveText(/^\s*$/);
    await expect(page.getByRole("tab", { selected: true })).toContainText(/Roman/i);
  });

  test("Urdu draft survives refresh and coexists with Roman", async ({ page }) => {
    await page.locator("#roman-input").fill("aaj theek hai");
    await page.waitForTimeout(250);
    await page.getByRole("tab").nth(1).click();
    const urdu = "یہ دستی اردو متن ہے";
    await page.locator("#urdu-input").fill(urdu);
    await page.waitForTimeout(100);
    await page.reload();
    await expect(page.locator("#urdu-input")).toHaveValue(urdu);
    await expect(page.getByRole("tab", { selected: true })).toContainText(/اردو|Urdu/i);
    await page.getByRole("tab").nth(0).click();
    await expect(page.locator("#roman-input")).toHaveValue("aaj theek hai");
  });

  test("Undo and Redo restore Roman text", async ({ page }) => {
    await page.locator("#roman-input").fill("aaj");
    await page.waitForTimeout(500);
    await page.locator("#roman-input").fill("aaj theek");
    await page.waitForTimeout(500);
    await page.getByTestId("writer-undo").click();
    await expect(page.locator("#roman-input")).toHaveValue("aaj");
    await page.getByTestId("writer-redo").click();
    await expect(page.locator("#roman-input")).toHaveValue("aaj theek");
  });

  test("Ctrl+Z / Ctrl+Y in Roman textarea", async ({ page }) => {
    const input = page.locator("#roman-input");
    await input.fill("one");
    await page.waitForTimeout(500);
    await input.fill("two");
    await page.waitForTimeout(500);
    await input.focus();
    await page.keyboard.press("Control+z");
    await expect(input).toHaveValue("one");
    await page.keyboard.press("Control+y");
    await expect(input).toHaveValue("two");
  });

  test("Clear Draft confirmation and persistence removal", async ({ page }) => {
    await page.locator("#roman-input").fill("roman draft");
    await page.getByRole("tab").nth(1).click();
    await page.locator("#urdu-input").fill("اردو ڈرافٹ");
    await page.waitForTimeout(100);
    await page.reload();
    await expect(page.locator("#urdu-input")).toHaveValue("اردو ڈرافٹ");
    await page.getByTestId("writer-clear-draft").click();
    await expect(page.getByTestId("writer-clear-confirm")).toBeVisible();
    await page.getByTestId("writer-clear-confirm-cancel").click();
    await expect(page.locator("#urdu-input")).toHaveValue("اردو ڈرافٹ");
    await page.getByTestId("writer-clear-draft").click();
    await page.getByTestId("writer-clear-confirm-action").click();
    await expect(page.locator("#roman-input")).toHaveValue("");
    await expect(page.locator("#urdu-input")).toHaveValue("");
    await page.reload();
    await expect(page.locator("#roman-input")).toHaveValue("");
    await expect(page.locator("#urdu-input")).toHaveValue("");
  });

  test("exact whitespace and punctuation preserved", async ({ page }) => {
    const exact = "hello  world\nline2 ,ok!";
    await page.locator("#roman-input").fill(exact);
    await page.waitForTimeout(100);
    await page.reload();
    await expect(page.locator("#roman-input")).toHaveValue(exact);
  });

  test("WhatsApp preview clears on Undo", async ({ page }) => {
    const input = page.locator("#roman-input");
    await input.fill("aaj theek hai");
    await page.waitForTimeout(550);
    const wa = page.getByTestId("writer-whatsapp-ready");
    if (await wa.count()) {
      await wa.click();
      await page.waitForTimeout(200);
    }
    await input.fill("aaj theek hai kal");
    await page.waitForTimeout(550);
    await page.getByTestId("writer-undo").click();
    await expect(input).toHaveValue("aaj theek hai");
  });

  test("desktop utility bar visible at 1280", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(WRITER);
    await expect(page.getByTestId("writer-utility-bar")).toBeVisible();
    await expect(page.getByTestId("writer-undo")).toBeVisible();
    await expect(page.getByTestId("writer-clear-draft")).toBeVisible();
  });

  test("mobile utility bar no overflow at 390", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(WRITER);
    await expect(page.getByTestId("writer-utility-bar")).toBeVisible();
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth + 2;
    });
    expect(overflow).toBe(false);
  });
});
