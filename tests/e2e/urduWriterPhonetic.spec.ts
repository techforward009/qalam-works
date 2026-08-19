
import { test, expect } from "@playwright/test";
const WRITER = "/tools/roman-urdu-writer";
const DRAFT_KEY = "qalam-urdu-writer-draft";
async function fillRoman(page: import("@playwright/test").Page, text: string) {
  await page.locator("#roman-input").fill(text);
  await page.waitForTimeout(350);
}
function outputLocator(page: import("@playwright/test").Page) {
  return page.getByRole("status").first();
}
test.describe("19A.5 phonetic verification", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(WRITER);
    await page.evaluate((key) => localStorage.removeItem(key), DRAFT_KEY);
    await page.reload();
    await expect(page.locator("#roman-input")).toBeVisible();
  });
  test("literary target converts to Urdu script", async ({ page }) => {
    const input = "Dilon mein rehm, tabiyat mein saadgi, khuloos mein muhabbat ata farma.";
    await fillRoman(page, input);
    const out = outputLocator(page);
    await expect(out).toContainText("دلوں");
    await expect(out).toContainText("رحم");
    await expect(out).toContainText("سادگی");
    await expect(out).toContainText("خلوص");
    await expect(out).toContainText("محبت");
    await expect(out).toContainText("عطا");
    await expect(out).toContainText("فرما");
  });
  test("loanword flow", async ({ page }) => {
    await fillRoman(page, "kal meeting mein ana");
    await expect(outputLocator(page)).toContainText("میٹنگ");
    await fillRoman(page, "WhatsApp group mein bhejo");
    const text = (await outputLocator(page).textContent()) ?? "";
    expect(text).toContain("WhatsApp");
    expect(text).toContain("گروپ");
  });
  test("English safety remains Latin", async ({ page }) => {
    for (const s of ["meeting starts at 5 pm", "please send the video", "office is closed today"]) {
      await fillRoman(page, s);
      const text = ((await outputLocator(page).textContent()) ?? "").trim();
      const latin = (text.match(/[A-Za-z]/g) || []).length;
      const arabic = (text.match(/[\u0600-\u06FF]/g) || []).length;
      expect(latin).toBeGreaterThan(arabic);
    }
  });
  test("synthetic unknown phonetic", async ({ page }) => {
    await fillRoman(page, "zarmook");
    const text = (await outputLocator(page).textContent()) ?? "";
    expect(text).toMatch(/[\u0600-\u06FF]/);
    expect(text.toLowerCase()).not.toContain("zarmook");
  });
  test("hard protection exact", async ({ page }) => {
    for (const s of ["https://example.com/khuloos", "muhabbat@example.com", "meeting.pdf", "video.mp4"]) {
      await fillRoman(page, s);
      const text = ((await outputLocator(page).textContent()) ?? "").trim();
      expect(text).toContain(s);
    }
  });
  test("literary survives refresh persistence", async ({ page }) => {
    const input = "Dilon mein rehm, tabiyat mein saadgi, khuloos mein muhabbat ata farma.";
    await fillRoman(page, input);
    await page.waitForTimeout(400);
    await page.reload();
    await expect(page.locator("#roman-input")).toHaveValue(input);
    await page.waitForTimeout(400);
    await expect(outputLocator(page)).toContainText("دلوں");
  });
});
