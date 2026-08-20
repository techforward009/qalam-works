import { test, expect } from "@playwright/test";

const P1 =
  "Aam aawam ki falah-o-behbood ke liye tayyar kiye gaye qawaneen aur policy documents par bilaa-ta'assub amal-daramad karwana riyasat ki pehli zimmedari hai.";
const P2 =
  "Mulaazmeen ki mahana tankhwah aur pension ki adaiyagi ke liye bank account ki tasdeeq nihayat zaroori hai.";
const P3 =
  "Aaj kal ke jadeed daur mein social media ke bighaar aur naazuk mua'aamlaat par ghair-zimmedarana guftagu ne mu'aashray mein shadeed anjaam paida kar diye hain.";

async function typeRoman(page: import("@playwright/test").Page, text: string) {
  await page.goto("/tools/roman-urdu-writer");
  const input = page.locator("#roman-input");
  await input.fill(text);
  await page.waitForTimeout(400);
}

function hasUnjustifiedLatin(s: string): string[] {
  return (s.match(/[A-Za-z]{2,}/g) || []).filter(
    (w) => !/^https?:/i.test(w) && !w.includes("@") && !/\.(pdf|com|org)/i.test(w)
  );
}

test.describe("19A.7 intelligence browser gate", () => {
  test("P1 hard acceptance — no Latin leakage", async ({ page }) => {
    await typeRoman(page, P1);
    const out = await page.getByRole("status").innerText();
    expect(hasUnjustifiedLatin(out)).toEqual([]);
    expect(out).toMatch(/فلاح/);
    expect(out).toMatch(/ذمہ داری/);
  });

  test("P2 hard acceptance — no Latin leakage", async ({ page }) => {
    await typeRoman(page, P2);
    const out = await page.getByRole("status").innerText();
    expect(hasUnjustifiedLatin(out)).toEqual([]);
    expect(out).toMatch(/تنخواہ/);
  });

  test("P3 hard acceptance — no Latin leakage", async ({ page }) => {
    await typeRoman(page, P3);
    const out = await page.getByRole("status").innerText();
    expect(hasUnjustifiedLatin(out)).toEqual([]);
    expect(out).toMatch(/معاشر/);
  });

  test("Copy uses Urdu output", async ({ page }) => {
    await typeRoman(page, "kal meeting mein ana");
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    const copy = page.getByTestId("writer-copy");
    await expect(copy).toBeEnabled();
    await copy.click();
    const out = await page.getByRole("status").innerText();
    expect(out.length).toBeGreaterThan(0);
    expect(hasUnjustifiedLatin(out)).toEqual([]);
  });

  test("TXT download enabled when output present", async ({ page }) => {
    await typeRoman(page, P2);
    await expect(page.getByTestId("writer-download-txt")).toBeEnabled();
  });

  test("Document Studio handoff enabled", async ({ page }) => {
    await typeRoman(page, P1);
    await expect(page.getByTestId("writer-document-studio")).toBeEnabled();
  });

  test("WhatsApp Ready opens preview", async ({ page }) => {
    await typeRoman(page, "yeh theek hai");
    await page.getByTestId("writer-whatsapp-ready").click();
    await expect(page.getByTestId("writer-whatsapp-preview")).toBeVisible();
  });

  test("no horizontal overflow on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await typeRoman(page, P3);
    const overflow = await page.evaluate(() => {
      const el = document.documentElement;
      return el.scrollWidth > el.clientWidth + 2;
    });
    expect(overflow).toBe(false);
  });

  test("RTL output pane", async ({ page }) => {
    await typeRoman(page, P1);
    const dir = await page.getByRole("status").getAttribute("dir");
    expect(dir).toBe("rtl");
  });

  test("persistence survives refresh", async ({ page }) => {
    await typeRoman(page, "kal meeting mein ana");
    const before = await page.getByRole("status").innerText();
    await page.reload();
    await page.waitForTimeout(300);
    const roman = page.locator("#roman-input");
    await expect(roman).toHaveValue("kal meeting mein ana");
    // wait for reconvert
    await page.waitForTimeout(400);
    const after = await page.getByRole("status").innerText();
    expect(after.length).toBeGreaterThan(0);
    expect(before.length).toBeGreaterThan(0);
  });
});
