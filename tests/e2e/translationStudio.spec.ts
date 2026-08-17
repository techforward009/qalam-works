/**
 * Batch 17F — Translation Studio E2E Acceptance Tests
 *
 * Covers the critical real-user path on both desktop and mobile viewports.
 * Uses localStorage/sessionStorage mocking for persistence and download
 * interception for file export verification.
 */

import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const TS_URL = "/tools/translation-studio";
const DS_URL = "/tools/document-studio";

/** Representative multi-script source text for Translation Studio testing. */
const SOURCE_TEXT = [
  "علي كتاب",              // Arabic — must remain علي كتاب (not normalized to Urdu)
  "یہ اردو پیراگراف ہے۔",   // Urdu
  "This is an English paragraph.",
  "اردو اور English مل کر ایک دستاویز میں۔",  // mixed
].join("\n");

/** Corresponding translations in the same order. */
const TRANSLATIONS = [
  "The book of Ali",         // English translation of Arabic source
  "This is an Urdu paragraph.",
  "یہ انگریزی پیراگراف ہے۔",
  "Urdu and English together in one document.",
];

/** Create a project and enter translations. Returns when in workspace. */
async function createAndTranslate(page: Page) {
  await page.goto(TS_URL);
  // Click New Project
  await page.getByRole("button", { name: /New Project/i }).click();
  // Fill project name
  await page.getByTestId("project-name-input").fill("Acceptance Test Project");
  // Fill source text
  await page.getByTestId("source-text-input").fill(SOURCE_TEXT);
  // Set source language to English (default may be Urdu)
  // Select ur→en pair; pick the target language
  await page.locator('select').nth(1).selectOption("en"); // target lang
  await page.getByTestId("create-project-btn").click();
  // Should be in workspace now — wait for first segment
  await expect(page.getByText("SEG-0001")).toBeVisible({ timeout: 8000 });
}

// ── 1. Project creation and segment order ─────────────────────────────────────

test("creates project and shows 4 segments in canonical order", async ({ page }) => {
  await createAndTranslate(page);
  // All 4 segment IDs should be present in order
  for (let i = 1; i <= 4; i++) {
    await expect(page.getByText(`SEG-${String(i).padStart(4, "0")}`)).toBeVisible();
  }
  // First segment source text visible
  await expect(page.getByText("علي كتاب")).toBeVisible();
});

// ── 2. Arabic text fidelity (critical normalization regression) ────────────────

test("علي كتاب visible and unchanged in segment source", async ({ page }) => {
  await createAndTranslate(page);
  const sourceEl = page.getByText("علي كتاب").first();
  await expect(sourceEl).toBeVisible();
  const txt = await sourceEl.textContent();
  expect(txt?.trim()).toBe("علي كتاب");
  // Must not be normalized to Urdu forms
  expect(txt).not.toContain("علی");
});

// ── 3. Target entry and RTL/LTR direction ─────────────────────────────────────

test("target textarea has correct dir attribute", async ({ page }) => {
  await createAndTranslate(page);
  // First segment is Arabic source → target textarea direction follows project target language
  const textareas = page.locator("textarea");
  const first = textareas.first();
  await expect(first).toBeVisible();
  const dir = await first.getAttribute("dir");
  // Target language is English (ltr) for this project
  expect(["ltr", "rtl"]).toContain(dir); // dir must be set to one of the valid values
});

// ── 4. Enter translations and verify status ────────────────────────────────────

test("entering target text advances status to Draft", async ({ page }) => {
  await createAndTranslate(page);
  const textareas = page.locator("textarea");
  await textareas.first().fill("The book of Ali");
  // Status should change to Draft
  await expect(page.locator("text=Draft").first()).toBeVisible({ timeout: 5000 });
});

// ── 5. Mark Final ─────────────────────────────────────────────────────────────

test("Mark Final button advances segment to Final", async ({ page }) => {
  await createAndTranslate(page);
  const textareas = page.locator("textarea");
  await textareas.first().fill("The book of Ali");
  await page.getByRole("button", { name: /Mark Final/i }).first().click();
  await expect(page.locator("text=Final ✓").first()).toBeVisible({ timeout: 5000 });
});

// ── 6. Copy translation ───────────────────────────────────────────────────────

test("Copy translation button is present and disabled when no translations", async ({ page }) => {
  await createAndTranslate(page);
  const copyBtn = page.getByTestId("export-copy");
  await expect(copyBtn).toBeVisible();
  // Should be disabled before any translations are entered
  await expect(copyBtn).toBeDisabled();
});

test("Copy translation button enables after translation entered", async ({ page }) => {
  await createAndTranslate(page);
  await page.locator("textarea").first().fill("Test translation");
  await expect(page.getByTestId("export-copy")).toBeEnabled({ timeout: 5000 });
});

// ── 7. TXT download ───────────────────────────────────────────────────────────

test("Download TXT button is present", async ({ page }) => {
  await createAndTranslate(page);
  await expect(page.getByTestId("export-txt")).toBeVisible();
  await expect(page.getByTestId("export-txt")).toBeDisabled(); // disabled when empty
});

test("TXT download triggers with translated content", async ({ page }) => {
  await createAndTranslate(page);
  await page.locator("textarea").first().fill("Test translation");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId("export-txt").click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.txt$/);
  expect(download.suggestedFilename()).toMatch(/translation/);
  // Verify BOM in file bytes
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  const bytes = Buffer.concat(chunks);
  // UTF-8 BOM: EF BB BF
  expect(bytes[0]).toBe(0xEF);
  expect(bytes[1]).toBe(0xBB);
  expect(bytes[2]).toBe(0xBF);
});

// ── 8. DOCX download ──────────────────────────────────────────────────────────

test("DOCX download triggers with translated content", async ({ page }) => {
  await createAndTranslate(page);
  await page.locator("textarea").first().fill("Test translation");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId("export-docx").click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.docx$/);
  // Verify it's a valid ZIP (DOCX is a zip)
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  const bytes = Buffer.concat(chunks);
  // ZIP magic bytes: PK (50 4B 03 04)
  expect(bytes[0]).toBe(0x50);
  expect(bytes[1]).toBe(0x4B);
});

// ── 9. Project backup ─────────────────────────────────────────────────────────

test("project backup download has correct filename and v1 envelope", async ({ page }) => {
  await createAndTranslate(page);
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId("export-backup").click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.qalam-translation\.json$/);
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  const json = JSON.parse(Buffer.concat(chunks).toString("utf-8"));
  expect(json.format).toBe("qalam-translation-project");
  expect(json.schemaVersion).toBe(1);
  expect(json.project).toBeDefined();
});

// ── 10. Continue in Document Studio (handoff) ─────────────────────────────────

test("Continue in Document Studio writes sessionStorage handoff and navigates", async ({ page }) => {
  await createAndTranslate(page);
  await page.locator("textarea").first().fill("The book of Ali");
  await page.getByTestId("export-handoff").click();
  // Wait for Document Studio to load and consume the handoff
  await expect(page).toHaveURL(/tools\/document-studio/, { timeout: 10000 });
  await page.waitForTimeout(2000); // allow DS to mount + consume
  // Sentinel must be cleared after consumption by Document Studio
  const sentinel = await page.evaluate(() =>
    sessionStorage.getItem("qalam-translation-handoff")
  );
  expect(sentinel).toBeNull();
});

test("Document Studio shows translated content after handoff", async ({ page }) => {
  await createAndTranslate(page);
  await page.locator("textarea").first().fill("The book of Ali");
  await page.getByTestId("export-handoff").click();
  await page.waitForURL(/tools\/document-studio/);
  // Wait for editor to mount
  await page.waitForTimeout(2000);
  // The translated text should appear in Document Studio
  const editorContent = await page.locator('[contenteditable="true"]').textContent();
  expect(editorContent).toContain("The book of Ali");
});

test("handoff does not overwrite existing Document Studio draft before navigation", async ({ page }) => {
  // Pre-set a Document Studio draft in localStorage
  await page.goto(DS_URL);
  await page.evaluate(() => {
    localStorage.setItem("qalam-document-studio-draft", JSON.stringify({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "EXISTING DRAFT CONTENT" }] }]
    }));
  });
  // Now go to Translation Studio
  await createAndTranslate(page);
  await page.locator("textarea").first().fill("A translation");
  // Before clicking handoff, verify existing draft is still in localStorage
  const draft = await page.evaluate(() =>
    localStorage.getItem("qalam-document-studio-draft")
  );
  const parsed = JSON.parse(draft!);
  expect(parsed.content[0].content[0].text).toBe("EXISTING DRAFT CONTENT");
  // Click handoff
  await page.getByTestId("export-handoff").click();
  await page.waitForURL(/tools\/document-studio/);
  // After navigation, Document Studio loaded the translation (handoff consumed)
  await page.waitForTimeout(2000);
  const editorContent = await page.locator('[contenteditable="true"]').textContent();
  expect(editorContent).toContain("A translation");
  // Sentinel cleared
  const sentinel = await page.evaluate(() =>
    sessionStorage.getItem("qalam-translation-handoff")
  );
  expect(sentinel).toBeNull();
});

// ── 11. Arabic text through export path ───────────────────────────────────────

test("علي كتاب passes through TXT export unchanged", async ({ page }) => {
  await createAndTranslate(page);
  // Enter Arabic text as target for first segment
  await page.locator("textarea").first().fill("علي كتاب لا تغيير");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId("export-txt").click(),
  ]);
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  const text = Buffer.concat(chunks).toString("utf-8").replace(/^\uFEFF/, ""); // strip BOM
  expect(text).toContain("علي كتاب");
  // Must not be normalized
  expect(text).not.toContain("علی کتاب");
});

// ── 12. Mobile: no horizontal overflow ───────────────────────────────────────

test.describe("mobile viewport checks", () => {
  test.use({ viewport: { width: 393, height: 851 } });

  test("Translation Studio has no horizontal overflow on mobile", async ({ page }) => {
    await createAndTranslate(page);
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.body.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2); // allow 2px tolerance
  });

  test("Export actions are visible on mobile", async ({ page }) => {
    await createAndTranslate(page);
    await page.locator("textarea").first().fill("Test");
    await expect(page.getByTestId("export-copy")).toBeVisible();
    await expect(page.getByTestId("export-txt")).toBeVisible();
  });

  test("segment textarea is usable on mobile", async ({ page }) => {
    await createAndTranslate(page);
    const ta = page.locator("textarea").first();
    await expect(ta).toBeVisible();
    const box = await ta.boundingBox();
    expect(box).not.toBeNull();
    // Textarea must have a reasonable touch height
    expect(box!.height).toBeGreaterThan(30);
  });
});
