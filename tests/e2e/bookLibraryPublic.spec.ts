import { test, expect } from "@playwright/test";
import { mockKhateebBookReader, readerRecord } from "./fixtures/khateebBookReader";

for (const locale of ["ur", "en"] as const) test(`Public book library (${locale}) remains readable without legacy owner upload`, async ({ page }) => {
  await mockKhateebBookReader(page);
  await page.addInitScript(language => localStorage.setItem("qalam-site-language", language), locale);
  await page.goto("/tools/khateeb-studio");
  await page.getByRole("link", { name: locale === "ur"
    ? "کتاب خانہ — مکمل کتابیں پڑھیں" : "Book library — read full books", exact: true }).click();
  await expect(page).toHaveURL(/\/tools\/khateeb-studio\/library$/);
  const library = page.getByTestId("khateeb-book-reader");
  await expect(library).toBeVisible();
  await expect(library.getByRole("combobox", { name: locale === "ur" ? "کتاب منتخب کریں" : "Choose book", exact: true })).toHaveValue("sahifa-ar");
  await expect(library.getByRole("button", { name: locale === "ur" ? "تلاش" : "Search", exact: true })).toBeVisible();
  const text = library.getByTestId("book-reading-page").locator(".khateeb-book-ar.qalam-book-arabic").first();
  await expect(text).toBeVisible();
  await expect(text).toHaveText(readerRecord.paragraphs[0].text);
  await expect(library.getByRole("alert")).toHaveCount(0);
  await expect(library.getByText("کتابی ذخیرے کا انتظام — مالک کے لیے")).toHaveCount(0);
  await expect(library.getByText("Book library management — owner only")).toHaveCount(0);
  await expect(library.locator('input[type="file"]')).toHaveCount(0);
  await expect(library.getByText("ریسرچ اسٹوڈیو مقفل ہے۔ رسائی ترتیب نہیں دی گئی۔")).toHaveCount(0);
});
