import { test, expect } from "@playwright/test";

for (const locale of ["ur", "en"] as const) test(`Public book library (${locale}) remains readable without legacy owner upload`, async ({ page }) => {
  await page.route("**/api/khateeb/library**", route => route.fulfill({ json: {
    ready: true, sources: [], recordCount: 4978
  } }));
  await page.goto("/tools/khateeb-studio");
  await page.getByRole("button", { name: locale === "ur" ? "اردو" : "ENG", exact: true }).click();
  await page.getByRole("button", { name: locale === "ur" ? "کتابی ذخیرہ" : "Book library", exact: true }).click();
  const library = page.getByTestId("book-library");
  await expect(library.getByRole("button", { name: locale === "ur" ? "کتاب میں تلاش کریں" : "Search books" })).toBeVisible();
  await expect(library.getByText("کتابی ذخیرے کا انتظام — مالک کے لیے")).toHaveCount(0);
  await expect(library.getByText("Book library management — owner only")).toHaveCount(0);
  await expect(library.locator('input[type="file"]')).toHaveCount(0);
  await expect(library.getByText("ریسرچ اسٹوڈیو مقفل ہے۔ رسائی ترتیب نہیں دی گئی۔")).toHaveCount(0);
});
