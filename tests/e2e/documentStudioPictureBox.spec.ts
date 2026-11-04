import path from "node:path";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("qalam-site-language", "en"));
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto("/tools/document-studio");
  await expect(page.locator(".ProseMirror")).toHaveAttribute("data-studio-font-layout", "ready");
});

test("draw rectangular picture box and import an image via file chooser", async ({ page }) => {
  // 1. Select the rectangular picture box tool
  const toolButton = page.locator('[data-studio-tool-button="cross-square"]');
  await expect(toolButton).toBeEnabled();
  await toolButton.click();

  // 2. Drag to draw on canvas
  const surface = page.locator("[data-studio-objects]");
  await expect(surface).toBeVisible();
  const box = await surface.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;

  const startX = box.x + 100;
  const startY = box.y + 100;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 180, startY + 120, { steps: 5 });
  await page.mouse.up();

  // 3. The new box is selected and tool reverts to select
  const frame = page.locator('[data-studio-frame="picture-rect"]');
  await expect(frame).toBeVisible();
  await expect(page.locator('[data-studio-tool-button="select"]')).toHaveAttribute("aria-pressed", "true");

  // 4. File input for picture import receives file
  const testImagePath = path.resolve("/workspace/inpage-picture/test_source.png");
  const pictureInput = page.locator('input[data-studio-picture-input="true"]');
  await pictureInput.setInputFiles(testImagePath);

  // 5. Image is present in the frame
  const img = frame.locator("img");
  await expect(img).toBeVisible();
  await expect(img).toHaveAttribute("src", /^data:image\//);
});
