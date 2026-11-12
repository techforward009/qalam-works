import { expect, test } from "@playwright/test";
import { join } from "node:path";

const readers = [
  { name: "Quran Reader", path: "/quran/ahmedgraf/1/1" },
  { name: "Digital Khatt Reader", path: "/quran/indopak-digital-khatt/1/1" },
  { name: "Madinah Reader", path: "/quran/madinah/1/1" },
] as const;

test.describe("localized Surah search across Quran readers", () => {
  test.describe.configure({ timeout: 90_000 });

  for (const reader of readers) {
    for (const language of ["ur", "en"] as const) {
      test(`${reader.name} searches and navigates in ${language}`, async ({ page }) => {
        await page.addInitScript((lang) => localStorage.setItem("qalam-site-language", lang), language);
        await page.goto(reader.path, { waitUntil: "domcontentloaded" });
        const html = page.locator("html");
        const searchName = language === "ur" ? "سورت تلاش کریں" : "Search Surahs";
        await page.waitForFunction((name) => {
          const field = Array.from(document.querySelectorAll<HTMLInputElement>("input[role=combobox]")).find((input) => input.getAttribute("aria-label") === name);
          return Boolean(field && Object.keys(field).some((key) => key.startsWith("__reactProps$")));
        }, searchName);
        await expect(html).toHaveAttribute("lang", language);

        const search = page.getByRole("combobox", { name: searchName });
        const surah = page.getByRole("combobox", { name: language === "ur" ? "سورۃ" : "Surah" });
        await expect(search).toBeVisible();
        await expect(surah.locator("option").first()).toHaveText(language === "ur" ? "1. الفاتحة" : "1. Al-Fatihah");

        const query = language === "ur" ? "احقاف" : "Al-Ahqaf";
        await search.fill(query);
        const option = page.getByRole("listbox").getByRole("option", { name: language === "ur" ? "46. الأحقاف" : "46. Al-Ahqaf" });
        await expect(option).toBeVisible();
        await page.screenshot({
          path: join("/tmp", `quran-surah-search-${reader.name.toLowerCase().replaceAll(" ", "-")}-${language}.png`),
          fullPage: false,
        });

        await search.press("Enter");
        await expect(page).toHaveURL(new RegExp(reader.path.replace("/1/1", "/46/1") + "$"));
        await expect(search).toHaveValue("");
      });
    }
  }
});
