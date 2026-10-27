import { expect, test, type Page } from "@playwright/test";
import type { Editor } from "@tiptap/core";
import { execFileSync } from "node:child_process";

const story = ".ProseMirror";

async function open(page: Page) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.addInitScript(() => localStorage.setItem("qalam-site-language", "en"));
  await page.goto("/tools/document-studio");
  await expect(page.locator(story)).toBeEditable();
}

async function openCharacter(page: Page) {
  await page.locator(story).evaluate((el) => {
    const editor = (el as HTMLElement & { editor: Editor }).editor;
    editor.commands.selectAll();
    const rect = el.getBoundingClientRect();
    el.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: rect.left + 24, clientY: rect.top + 14 }));
  });
  await page.getByRole("menuitem", { name: "Character…", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Character", exact: true })).toBeVisible();
}

test("mixed sizes stay when only scaling changes, undo once, and cancel", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop-chrome", "character dialog is covered on desktop");
  await open(page);
  await page.locator(story).click();
  await page.keyboard.insertText("سلام");
  await openCharacter(page);
  const dialog = page.getByRole("dialog", { name: "Character", exact: true });
  const box = await dialog.boundingBox();
  expect(Math.round(box?.width ?? 0)).toBe(390);
  expect(Math.round(box?.height ?? 0)).toBe(270);
  await dialog.screenshot({ path: "/workspace/screenshots/character-dialog.png" });
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.locator(story).evaluate((el) => {
    const editor = (el as HTMLElement & { editor: Editor }).editor;
    editor.commands.setContent({
      type: "doc",
      content: [{
        type: "paragraph",
        attrs: { dir: "rtl" },
        content: [
          { type: "text", text: "پہلا", marks: [{ type: "textStyle", attrs: { fontSize: "18pt" } }] },
          { type: "text", text: " " },
          { type: "text", text: "دوسرا", marks: [{ type: "textStyle", attrs: { fontSize: "36pt" } }] },
        ],
      }],
    });
  });
  await openCharacter(page);
  await expect(dialog.getByLabel("Size", { exact: true })).toHaveValue("");
  await expect(dialog.getByLabel("Scaling", { exact: true })).toHaveValue("100%");
  await dialog.getByLabel("Scaling", { exact: true }).fill("80%");
  await dialog.getByRole("button", { name: "OK", exact: true }).click();
  await expect(dialog).toBeHidden();
  const first = page.locator(`${story} span[style*="font-size"]`, { hasText: "پہلا" });
  const second = page.locator(`${story} span[style*="font-size"]`, { hasText: "دوسرا" });
  await expect(first).toHaveAttribute("data-char-scale", "80");
  await expect(second).toHaveAttribute("data-char-scale", "80");
  await expect(first).toHaveAttribute("data-scale", "80");
  await expect(second).toHaveAttribute("data-scale", "80");
  await expect(first).toHaveAttribute("style", /font-size:\s*18pt/);
  await expect(second).toHaveAttribute("style", /font-size:\s*36pt/);
  await page.locator(story).focus();
  await page.keyboard.press("Control+z");
  await expect(first).not.toHaveAttribute("data-char-scale", "80");
  await expect(second).not.toHaveAttribute("data-char-scale", "80");
  await expect(first).toHaveAttribute("style", /font-size:\s*18pt/);
  await expect(second).toHaveAttribute("style", /font-size:\s*36pt/);
  await openCharacter(page);
  await dialog.getByLabel("Scaling", { exact: true }).fill("50%");
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(first).not.toHaveAttribute("data-char-scale", "50");
  await expect(second).not.toHaveAttribute("data-char-scale", "50");
  await expect(first).toHaveAttribute("style", /font-size:\s*18pt/);
  await expect(second).toHaveAttribute("style", /font-size:\s*36pt/);
  await openCharacter(page);
  await dialog.getByLabel("Scaling", { exact: true }).fill("50%");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(first).not.toHaveAttribute("data-char-scale", "50");
  await expect(second).toHaveAttribute("style", /font-size:\s*36pt/);
});

test("a 3pt baseline shift keeps PDF lines from overlapping", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop-chrome", "character dialog is covered on desktop");
  test.setTimeout(90_000);
  await open(page);
  await page.locator(story).evaluate((el) => {
    const editor = (el as HTMLElement & { editor: Editor }).editor;
    editor.commands.setContent({
      type: "doc",
      content: [
        {
          type: "paragraph",
          attrs: { dir: "ltr" },
          content: [
            { type: "text", text: "Alpha " },
            { type: "text", text: "SHIFT", marks: [{ type: "textStyle", attrs: { baselineShift: 3 } }] },
            { type: "text", text: " Beta" },
          ],
        },
        { type: "paragraph", attrs: { dir: "ltr" }, content: [{ type: "text", text: "Gamma line" }] },
      ],
    });
  });
  const shifted = page.locator(`${story} [data-baseline="3"]`);
  await expect(shifted).toHaveAttribute("style", /position:\s*relative/);
  await expect(shifted).toHaveAttribute("style", /top:\s*-3pt/);
  const responsePromise = page.waitForResponse((response) => response.url().includes("/api/export-pdf") && response.request().method() === "POST", { timeout: 70_000 });
  const downloadPromise = page.waitForEvent("download");
  await page.locator('[data-menu-root="file"]').click();
  await page.locator('[data-menu-submenu="file.download"]').hover();
  await page.locator('[data-menu-action="file.downloadPdf"]').click();
  const response = await responsePromise;
  if (response.status() !== 200) throw new Error(await response.text());
  const download = await downloadPromise;
  expect(await download.failure()).toBeNull();
  const file = "/tmp/character-baseline.pdf";
  await download.saveAs(file);
  const raw = execFileSync("python3", ["-c", `
import json, sys
from pypdf import PdfReader
items = []
def visitor(text, cm, tm, font_dict, font_size):
    if text:
        items.append({"text": text, "x": float(tm[4]), "y": float(tm[5])})
reader = PdfReader(sys.argv[1])
for pdf_page in reader.pages:
    pdf_page.extract_text(visitor_text=visitor)
print(json.dumps(items))
`, file], { encoding: "utf8" });
  const items = JSON.parse(raw) as { text: string; x: number; y: number }[];
  const at = (needle: string) => items.find((item) => item.text.includes(needle));
  const alpha = at("Alpha");
  const shift = at("SHIFT");
  const beta = at("Beta");
  const gamma = at("Gamma");
  expect(alpha && shift && beta && gamma).toBeTruthy();
  expect(alpha!.x).toBeLessThan(shift!.x);
  expect(shift!.x).toBeLessThan(beta!.x);
  expect(Math.abs(alpha!.y - beta!.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(shift!.y - alpha!.y)).toBeLessThanOrEqual(5);
  expect(Math.abs(shift!.y - gamma!.y)).toBeGreaterThan(8);
});

const LAYOUT = [
  ["ok", 309, 5, 60, 23],
  ["cancel", 309, 31, 60, 23],
  ["help", 309, 57, 60, 23],
  ["size", 38, 5, 113, 21],
  ["style", 191, 5, 113, 21],
  ["color", 38, 29, 113, 20],
  ["hatch", 191, 29, 113, 20],
  ["latinFont", 95, 54, 210, 20],
  ["urduFont", 95, 83, 210, 21],
  ["language", 95, 109, 210, 21],
  ["kashida", 239, 138, 113, 21],
  ["spacing", 47, 166, 60, 20],
  ["scaling", 155, 166, 60, 20],
  ["baseline", 293, 166, 60, 20],
  ["bold", 2, 146, 13, 13],
  ["italics", 50, 146, 13, 13],
  ["outline", 105, 146, 13, 13],
  ["meem", 5, 198, 13, 13],
  ["be", 62, 198, 13, 13],
  ["jeem", 104, 199, 13, 13],
  ["ain", 155, 199, 13, 13],
  ["kaaf", 194, 199, 13, 13],
] as const;

test("character dialog layout matches InPage 3", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop-chrome", "character dialog is covered on desktop");
  await open(page);
  await page.locator(story).click();
  await page.keyboard.insertText("سلام");
  await openCharacter(page);
  const dialog = page.getByRole("dialog", { name: "Character", exact: true });
  await expect(dialog.getByLabel("Size", { exact: true })).toBeFocused();
  const client = await page.locator("[data-character-client]").boundingBox();
  expect(Math.abs((client?.width ?? 0) - 374)).toBeLessThanOrEqual(1);
  expect(Math.abs((client?.height ?? 0) - 232)).toBeLessThanOrEqual(1);
  await dialog.screenshot({ path: "/workspace/screenshots/character-dialog-inpage-layout.png" });
  for (const [id, x, y, w, h] of LAYOUT) {
    const box = await page.locator(`[data-character-box="${id}"]`).boundingBox();
    expect(box, id).toBeTruthy();
    expect(Math.abs(box!.x - client!.x - x), `${id} x`).toBeLessThanOrEqual(2);
    expect(Math.abs(box!.y - client!.y - y), `${id} y`).toBeLessThanOrEqual(2);
    expect(Math.abs(box!.width - w), `${id} w`).toBeLessThanOrEqual(2);
    expect(Math.abs(box!.height - h), `${id} h`).toBeLessThanOrEqual(2);
  }
  await expect(dialog.getByText("Re", { exact: true }).first()).toBeVisible();
  const urdu = dialog.getByLabel("Urdu Font Name", { exact: true });
  await expect(urdu.locator("option").first()).toContainText(/Mehr/);
  await expect(dialog.getByLabel("Language", { exact: true }).locator("option")).toHaveText(["Urdu", "English"]);
});

async function textWidth(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  return page.locator(`${story} p`).first().evaluate((paragraph) => {
    const range = document.createRange();
    range.selectNodeContents(paragraph);
    return range.getBoundingClientRect().width;
  });
}

test("scaling and spacing change the width of Urdu, Arabic and English", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop-chrome", "character dialog is covered on desktop");
  await open(page);
  const samples = [
    { text: "سلام", dir: "rtl", font: "Mehr Nastaliq Web", attr: "fontFamily" },
    { text: "كتاب", dir: "rtl", font: "Digital Khatt Indo-Pak", attr: "fontFamily" },
    { text: "Width", dir: "ltr", font: "Arial", attr: "latinFontFamily" },
  ];
  for (const sample of samples) {
    await page.locator(story).evaluate((el, item) => {
      const editor = (el as HTMLElement & { editor: Editor }).editor;
      editor.commands.setContent({
        type: "doc",
        content: [{
          type: "paragraph",
          attrs: { dir: item.dir },
          content: [{ type: "text", text: item.text, marks: [{ type: "textStyle", attrs: { [item.attr]: item.font } }] }],
        }],
      });
    }, sample);
    const before = await textWidth(page);
    await openCharacter(page);
    const dialog = page.getByRole("dialog", { name: "Character", exact: true });
    await dialog.getByLabel("Scaling", { exact: true }).fill("50%");
    await dialog.getByRole("button", { name: "OK", exact: true }).click();
    await expect(page.locator(`${story} [data-char-scale="50"]`)).toHaveCount(1);
    expect(await textWidth(page), sample.font).toBeLessThan(before * 0.8);
    await page.locator(story).focus();
    await page.keyboard.press("Control+z");
    await expect(page.locator(`${story} [data-char-scale="50"]`)).toHaveCount(0);
    const restored = await textWidth(page);
    await openCharacter(page);
    await dialog.getByLabel("Spacing", { exact: true }).fill("80%");
    await dialog.getByRole("button", { name: "OK", exact: true }).click();
    await expect(page.locator(`${story} [data-tracking="80"]`)).toHaveCount(1);
    expect(await textWidth(page), `${sample.font} spacing`).toBeGreaterThan(restored * 1.15);
  }
});


