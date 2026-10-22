import { test, expect } from "@playwright/test";
import { readerLineMetrics } from "./review/readerLineMetrics";
import { mockVisualReader, visualRecords } from "./fixtures/khateebReaderVisual";

for (const width of [390, 1280]) for (const language of ["ar", "ur"] as const) {
  test(`${language} reader contains its text after delayed fonts at ${width}px`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(() => {
      localStorage.setItem("qalam-site-language", "en");
      localStorage.setItem("qalam-theme", "light");
    });
    let fontRequests = 0;
    const family = language === "ar" ? "Noorehuda" : "Nafees Nastaleeq";
    const filename = language === "ar" ? "Noorehuda.woff2" : "NafeesNastaleeq-v1.02.woff2";
    await page.route(/\.(woff2?|ttf)(\?.*)?$/, async route => {
      fontRequests++;
      await new Promise(resolve => setTimeout(resolve, 2000));
      // First paint uses fallback metrics; the primary face arrives later,
      // as on a slow connection/retry after the initial font-ready promise.
      if (route.request().url().includes(filename) && !route.request().url().includes("reader-retry")) return route.abort();
      await route.continue();
    });
    await mockVisualReader(page);
    await page.goto("/tools/khateeb-studio/library");
    if (language === "ur") await page.getByRole("combobox", { name: "Choose book", exact: true }).selectOption("nahj-ur");
    const article = page.getByTestId("book-reading-page");
    const area = page.getByTestId("reader-page-text-area");
    await expect(area.locator(`.khateeb-book-${language}`).first()).toBeVisible();
    await page.evaluate(async () => { await document.fonts.ready; });
    const next = article.getByRole("button", { name: "Next page", exact: true });
    await expect(next).toBeEnabled();
    expect(fontRequests).toBeGreaterThan(0);
    await page.evaluate(async ({ family, filename }) => {
      const face = new FontFace(family, `url("/fonts/${filename}?reader-retry")`, { display: "swap" });
      document.fonts.add(face);
      await face.load();
      await Promise.allSettled([document.fonts.load(`22px "${family}"`)]);
      await document.fonts.ready;
    }, { family, filename });
    if (await article.getAttribute("aria-busy") !== null) await expect(article).toHaveAttribute("aria-busy", "false");
    async function overflow() {
      return area.evaluate(el => {
        const box = el.getBoundingClientRect();
        const card = el.closest("article")!.getBoundingClientRect();
        const children = Array.from(el.children).map(child => child.getBoundingClientRect());
        return Math.max(el.scrollHeight - el.clientHeight, ...children.map(r => r.bottom - box.bottom), box.bottom - card.bottom);
      });
    }
    async function capture() {
      if (width === 390 && process.env.READER_CAPTURE_LABEL) {
        await article.scrollIntoViewIfNeeded();
        await page.screenshot({ path: `docs/review/khateeb-reader/font-overflow/${process.env.READER_CAPTURE_LABEL}-${language}-390.png`, animations: "disabled", scale: "css" });
      }
    }
    if (process.env.READER_CAPTURE_LABEL === "before") await capture();
    await expect.poll(async () => (await readerLineMetrics(area)).lines, { timeout: 15_000 }).toBeGreaterThanOrEqual(10);
    await expect.poll(overflow, { timeout: 15_000 }).toBeLessThanOrEqual(1);
    if (process.env.READER_CAPTURE_LABEL !== "before") await capture();
    // Check every page of the first section, not just a clipped first page.
    const covered = new Map<string, number>();
    for (let i = 0; i < 12; i++) {
      await expect.poll(overflow, { timeout: 15_000 }).toBeLessThanOrEqual(1);
      const fragments = area.locator('[data-source-kind="original"]');
      if (i === 1) {
        const position = await fragments.first().evaluate(el => ({ id: el.getAttribute("data-paragraph-id"), offset: Number(el.getAttribute("data-start-offset")) }));
        async function includesPosition() {
          return fragments.evaluateAll((elements, position) => elements.some(el => el.getAttribute("data-paragraph-id") === position.id
            && Number(el.getAttribute("data-start-offset")) <= position.offset
            && Number(el.getAttribute("data-end-offset")) > position.offset), position);
        }
        for (const size of [{ width: width === 390 ? 420 : 1180, height: 900 }, { width, height: 1000 }]) {
          await page.setViewportSize(size);
          await page.evaluate(async () => {
            window.dispatchEvent(new Event("orientationchange"));
            await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
          });
          await expect(article).toHaveAttribute("aria-busy", "false");
          await expect.poll(overflow, { timeout: 15_000 }).toBeLessThanOrEqual(1);
          await expect.poll(includesPosition).toBe(true);
        }
      }
      for (const fragment of await fragments.evaluateAll(elements => elements.map(el => ({
        id: el.getAttribute("data-paragraph-id")!, start: Number(el.getAttribute("data-start-offset")), end: Number(el.getAttribute("data-end-offset")),
      })))) {
        // Reflow may repeat a prefix, but must never leave a source gap.
        expect(fragment.start).toBeLessThanOrEqual(covered.get(fragment.id) ?? 0);
        covered.set(fragment.id, Math.max(covered.get(fragment.id) ?? 0, fragment.end));
      }
      const counter = Number(await article.locator("nav strong").innerText());
      await next.click();
      if (Number(await article.locator("nav strong").innerText()) <= counter) break;
    }
    const record = visualRecords.find(record => record.sourceId === `nahj-${language}` && record.kind === "sermon" && record.number === 1)!;
    for (const paragraph of record.paragraphs) expect(covered.get(paragraph.id)).toBe(paragraph.text.length);
  });
}
