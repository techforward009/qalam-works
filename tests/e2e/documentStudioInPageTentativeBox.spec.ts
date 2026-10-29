import { test, expect } from "@playwright/test";
import { inpageContainer } from "../fixtures/inpage";

function makeControlledInPage(storyIndex = 1): Buffer {
  const main = Buffer.from("یہ صفحے کی عام عبارت ہے جو دو پیراگراف کے اندر مکمل طور پر موجود ہے۔ اس پر کوئی نیا باکس نہیں بنایا جانا چاہیے۔\r", "utf16le");
  const inside = Buffer.from("یہ ٹیکسٹ باکس کے اندر الگ عبارت ہے۔\r", "utf16le");
  const words = [main.length, 0, inside.length, 0];
  const lengths = Buffer.alloc(words.length * 4);
  words.forEach((v, i) => lengths.writeUInt32LE(v, i * 4));
  const descriptor = Buffer.alloc(62);
  Buffer.from([3, 0, 6, 0, 2, 0, 0, 0]).copy(descriptor);
  descriptor.writeUInt32LE(50, 8);
  Buffer.from([0x80, 0, 0xff, 0xff, 0xff, 0xff, 0x82, 0, storyIndex, 0, 0, 0, 5, 3, 1, 0, 8, 3, 0x4c, 0, 0, 0]).copy(descriptor, 12);
  const dims = [170068, 93768, 396850, 170078];
  for (let i = 0; i < 4; i++) {
    descriptor[i * 6 + 34] = i;
    descriptor[i * 6 + 35] = 0x7e;
    descriptor.writeUInt32LE(dims[i], i * 6 + 36);
  }
  Buffer.from([15, 0x7e, 1, 0]).copy(descriptor, 58);
  return inpageContainer(Buffer.concat([
    Buffer.from([100, 0, 3, 0]), Buffer.alloc(36), descriptor, Buffer.alloc(60),
    lengths, Buffer.from([255, 255, 255, 255]), main, inside,
  ]));
}
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("qalam-site-language", "en"));
  await page.goto("/tools/document-studio");
  await expect(page.locator(".ProseMirror")).toBeEditable({ timeout: 15000 });
});
async function importFixture(page: import("@playwright/test").Page, storyIndex = 1) {
  await page.locator('[data-menu-root="file"]').click();
  await page.locator('[data-menu-action="file.open"]').click();
  const [picker] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByRole("button", { name: "Open InPage file…" }).click(),
  ]);
  await picker.setFiles({
    name: "controlled-box.inp",
    mimeType: "application/octet-stream",
    buffer: makeControlledInPage(storyIndex),
  });
}
test("validated unique secondary 0x82 story offers opt-in screen-only box placement", async ({ page }) => {
  await importFixture(page);
  await expect(page.locator("[data-studio-inpage-objects-preview]")).toBeVisible();
  const toggle = page.locator('[data-studio-toggle-inpage-box-preview="true"]');
  await expect(toggle).toHaveText(/Show experimental placement/);
  await expect(page.locator("[data-studio-inpage-box-overlay]")).toHaveCount(0);
  await toggle.click();
  const overlay = page.locator("[data-studio-inpage-box-overlay]");
  await expect(overlay).toBeVisible();
  await expect(overlay).toHaveAttribute("data-story-number", "2");
  await expect(overlay).toContainText("ٹیکسٹ باکس کے اندر الگ عبارت");
  await expect(page.locator(".ProseMirror")).not.toContainText("ٹیکسٹ باکس کے اندر الگ عبارت");
  const paper = page.locator("[data-studio-page-paper]").first();
  const placement = await overlay.boundingBox(), pageRect = await paper.boundingBox();
  expect(placement).not.toBeNull(); expect(pageRect).not.toBeNull();
  expect(placement!.x).toBeGreaterThan(pageRect!.x);
  expect(placement!.y).toBeGreaterThan(pageRect!.y);
  await toggle.click();
  await expect(overlay).toHaveCount(0);
  await page.reload();
  await expect(overlay).toHaveCount(0);
});
test("same-main-story association is rejected: no duplicated overlay", async ({ page }) => {
  await importFixture(page, 0);
  await expect(page.locator("[data-studio-inpage-objects-preview]")).toBeVisible();
  await expect(page.locator("[data-studio-toggle-inpage-box-preview]")).toHaveCount(0);
  await expect(page.locator("[data-studio-inpage-box-overlay]")).toHaveCount(0);
});
