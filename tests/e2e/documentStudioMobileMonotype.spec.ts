import { expect, test } from "@playwright/test";

test("Monotype maps virtual-keyboard text in the story and a text frame", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("qalam-site-language", "en");
    localStorage.setItem("qalam.keyboard.layout", "inpageMonotype");
  });
  await page.goto("/tools/document-studio");
  const story = page.locator(".ProseMirror");
  await expect(story).toBeEditable({ timeout: 15000 });
  await expect.poll(() => page.evaluate(() => localStorage.getItem("qalam-document-studio-active-document-v1"))).not.toBeNull();
  await page.locator('[data-studio-tool-button="text"]').click();
  await story.evaluate(el => (el as HTMLElement & { editor: import("@tiptap/core").Editor }).editor.commands.setContent("<p></p>"));
  await story.click();

  const session = await page.context().newCDPSession(page);
  await session.send("Input.insertText", { text: "ab" });
  await expect(story).toContainText("قگ");
  await expect(story).not.toContainText("ab");
  await expect(story).toHaveText("قگ");

  await page.locator('[data-studio-tool-button="textbox"]').click();
  const layer = page.locator("[data-studio-objects]");
  const bounds = (await layer.boundingBox())!;
  await page.mouse.move(bounds.x + 90, bounds.y + 130);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 280, bounds.y + 220, { steps: 5 });
  await page.mouse.up();
  const frame = page.locator('[data-studio-frame="text"] textarea');
  await expect(frame).toBeFocused();
  await session.send("Input.insertText", { text: "ab" });
  await expect(frame).toHaveValue("قگ");
  await session.detach();
});
