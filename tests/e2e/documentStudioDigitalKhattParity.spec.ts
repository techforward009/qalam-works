import { test, expect } from "@playwright/test";
import type { Editor } from "@tiptap/core";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { defaultDocumentSettings } from "../../app/tools/document-studio/utils/documentSettings";

// Match export's font-render-hinting setting so the comparison isolates font
// bytes/shaping rather than OS-specific integer advance rounding.
test.use({ launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH, args: ["--no-sandbox", "--font-render-hinting=none"] } });

test("Digital Khatt la-fatha paragraphs end every line on the same word in editor and exported PDF", async ({ page }, testInfo) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 1280, height: 1080 });
  await page.addInitScript(() => localStorage.setItem("qalam-site-language", "en"));
  await page.goto("/tools/document-studio");
  const editor = page.locator(".ProseMirror");
  await expect(editor).toBeFocused();
  await page.locator('[data-menu-root="file"]').click();
  await page.locator('[data-menu-action="file.new"]').click();
  const dialog = page.getByRole("dialog", { name: "New Document", exact: true });
  for (const side of ["left", "right", "top", "bottom"]) await dialog.getByLabel(`${side} margin`, { exact: true }).fill("25.4");
  await dialog.getByRole("button", { name: "OK", exact: true }).click();
  // Non-joining Arabic-letter tags identify each word without introducing
  // LTR numeric isolates or depending on presentation-form PDF extraction.
  const stems = ["لَا", "فِی", "قُلِ", "كُفُوًا", "اَحَدٌ", "لَا"];
  const tag = (index: number) => "ء" + [27, 9, 3, 1].map(place => "درو"[Math.floor(index / place) % 3]).join("");
  const text = Array.from({ length: 60 }, (_, i) => stems[i % stems.length] + tag(i)).join(" ");
  await editor.evaluate((root, text) => {
    const e = (root as HTMLElement & { editor: Editor }).editor;
    e.commands.setContent({ type: "doc", content: [{ type: "paragraph", attrs: { dir: "rtl" }, content: [{ type: "text", text,
      marks: [{ type: "textStyle", attrs: { fontFamily: "Digital Khatt Indo-Pak", fontSize: "24pt" } }] }] }] });
    e.commands.blur();
  }, text);
  await page.evaluate(async () => { await document.fonts.load('24pt "Digital Khatt Indo-Pak"'); await document.fonts.ready; });
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  const editorEnds = await editor.evaluate(root => {
    const groups: { y: number; ids: number[] }[] = [];
    const walker = document.createTreeWalker(root.querySelector("p")!, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      for (const match of node.data.matchAll(/ء[درو]{4}/g)) {
        const range = document.createRange(); range.setStart(node, match.index!); range.setEnd(node, match.index! + 5);
        const y = range.getBoundingClientRect().top;
        let group = groups.find(g => Math.abs(g.y - y) < 1);
        if (!group) { group = { y, ids: [] }; groups.push(group); }
        group.ids.push([...match[0].slice(1)].reduce((value, char) => value * 3 + "درو".indexOf(char), 0) + 1);
      }
    }
    return groups.sort((a, b) => a.y - b.y).map(group => Math.max(...group.ids));
  });
  const doc = await editor.evaluate(root => (root as HTMLElement & { editor: Editor }).editor.getJSON());
  const response = await page.request.post("/api/export-pdf", { data: { doc, dir: "rtl", settings: defaultDocumentSettings() }, timeout: 60000 });
  expect(response.status()).toBe(200);
  const pdf = testInfo.outputPath("download.pdf"); writeFileSync(pdf, await response.body());
  const layout = execFileSync("pdftotext", ["-layout", pdf, "-"], { encoding: "utf8" });
  const rows = layout.split("\n").map(line => [...line.matchAll(/ء[درو]{4}|[درو]{4}ء/g)].map(m => m[0])).filter(ids => ids.length);
  const decode = (raw: string) => {
    const value = raw.startsWith("ء") ? raw : [...raw].reverse().join("");
    return [...value.slice(1)].reduce((number, char) => number * 3 + "درو".indexOf(char), 0) + 1;
  };
  const ids = rows.map(row => row.map(decode));
  expect(ids.flat().sort((a, b) => a - b)).toEqual(Array.from({ length: 60 }, (_, i) => i + 1));
  const pdfEnds = ids.map(row => Math.max(...row));
  await testInfo.attach("line-endings.json", { body: JSON.stringify({ editorEnds, pdfEnds }), contentType: "application/json" });
  console.log("WORD_ENDINGS", JSON.stringify({ editorEnds, pdfEnds }));
  expect(editorEnds.length).toBeGreaterThan(2);
  expect(pdfEnds).toEqual(editorEnds);
});
