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
  expect(Math.round(box?.width ?? 0)).toBe(400);
  expect(Math.round(box?.height ?? 0)).toBe(283);
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

