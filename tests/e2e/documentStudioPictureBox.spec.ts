import { deflateSync } from "node:zlib";
import { expect, test, type Page } from "@playwright/test";

/** Builds a solid-colour RGB PNG so the test does not depend on files outside the repo. */
function makePng(width: number, height: number, rgb: [number, number, number] = [200, 40, 40]): Buffer {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf: Buffer) => {
    let c = 0xffffffff;
    for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(body));
    return Buffer.concat([len, body, sum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(width * 3).map((_, i) => rgb[i % 3])]);
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const WIDE_PNG = { name: "wide.png", mimeType: "image/png", buffer: makePng(400, 100) };

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("qalam-site-language", "en"));
  page.on("dialog", (dialog) => dialog.accept());
  // Keep file-chooser interception on for the whole test so a chooser opened
  // right after a click is never missed while waitForEvent enables it.
  page.on("filechooser", () => {});
  await page.goto("/tools/document-studio");
  await expect(page.locator(".ProseMirror")).toHaveAttribute("data-studio-font-layout", "ready");
});

async function drawPictureBox(page: Page, toolId = "cross-square", kind = "picture-rect") {
  await page.locator(`[data-studio-tool-button="${toolId}"]`).click();
  const surface = page.locator("[data-studio-objects]");
  const box = await surface.boundingBox();
  if (!box) throw new Error("Object layer is not rendered.");
  const startX = box.x + 100;
  const startY = box.y + 100;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 180, startY + 120, { steps: 5 });
  await page.mouse.up();
  const frame = page.locator(`[data-studio-frame="${kind}"]`);
  await expect(frame).toBeVisible();
  return frame;
}

for (const { tool, label, kind, clip } of [
  { tool: "cross-circle", label: "Elliptical Picture Box", kind: "picture-ellipse", clip: "ellipse" },
  { tool: "cross-round", label: "Round Rectangular Picture Box", kind: "picture-round-rect", clip: "round" },
]) {
test(`${label} imports a clipped picture inside the frame`, async ({ page }) => {
  await expect(page.locator(`[data-studio-tool-button="${tool}"]`)).toHaveAccessibleName(label);
  const frame = await drawPictureBox(page, tool, kind);
  const chooser = page.waitForEvent("filechooser");
  await frame.dblclick();
  await (await chooser).setFiles(WIDE_PNG);

  const clipNode = frame.locator(`[data-studio-picture-clip="${kind}"]`);
  const image = clipNode.locator("img");
  await expect(image).toBeVisible();
  expect(await clipNode.evaluate((element) => getComputedStyle(element).clipPath)).toContain(clip);
  const frameBox = await frame.boundingBox();
  const imageBox = await image.boundingBox();
  if (!frameBox || !imageBox) throw new Error("Picture geometry is unavailable.");
  expect(imageBox.x).toBeGreaterThanOrEqual(frameBox.x - 1);
  expect(imageBox.y).toBeGreaterThanOrEqual(frameBox.y - 1);
  expect(imageBox.x + imageBox.width).toBeLessThanOrEqual(frameBox.x + frameBox.width + 1);
  expect(imageBox.y + imageBox.height).toBeLessThanOrEqual(frameBox.y + frameBox.height + 1);
});
}

test("drawing a picture box activates the hand tool; single click selects and double-click imports", async ({ page }) => {
  const frame = await drawPictureBox(page);
  await expect(page.locator('[data-studio-tool-button="text"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('[data-studio-tool-button="select"]')).toHaveAttribute("aria-pressed", "false");
  const handCursor = await frame.evaluate((element) => getComputedStyle(element).cursor);
  expect(handCursor).toContain("url(");
  expect(handCursor).not.toBe("pointer");

  const noSingleClickChooser = page.waitForEvent("filechooser", { timeout: 800 }).then(() => false).catch(() => true);
  await frame.click();
  await expect(frame.locator("[data-studio-frame-handle]")).toHaveCount(8);
  await expect(page.locator('[data-studio-tool-button="text"]')).toHaveAttribute("aria-pressed", "true");
  expect(await noSingleClickChooser).toBe(true);

  const chooser = page.waitForEvent("filechooser");
  await frame.dblclick();
  await (await chooser).setFiles(WIDE_PNG);

  const img = frame.locator("[data-studio-picture-clip] img");
  await expect(img).toBeVisible();
  await expect(img).toHaveAttribute("src", /^data:image\//);
  await expect(page.locator(".ProseMirror img")).toHaveCount(0);
  const filledChooser = page.waitForEvent("filechooser");
  await frame.dblclick();
  await (await filledChooser).setFiles([]);
  const frameBox = (await frame.boundingBox())!;
  const imgBox = (await img.boundingBox())!;
  expect(imgBox.width / imgBox.height).toBeCloseTo(4, 1);
  expect(imgBox.x).toBeGreaterThanOrEqual(frameBox.x - 1);
  expect(imgBox.y).toBeGreaterThanOrEqual(frameBox.y - 1);
  expect(imgBox.x + imgBox.width).toBeLessThanOrEqual(frameBox.x + frameBox.width + 1);
  expect(imgBox.y + imgBox.height).toBeLessThanOrEqual(frameBox.y + frameBox.height + 1);

  const beforeMove = await img.boundingBox();
  await page.locator('[data-studio-tool-button="select"]').click();
  const selectCursor = await frame.evaluate((element) => getComputedStyle(element).cursor);
  expect(selectCursor).not.toContain("url(");
  const frameBeforeMove = await frame.boundingBox();
  if (!beforeMove || !frameBeforeMove) throw new Error("Picture geometry is unavailable before moving the frame.");
  await page.mouse.move(frameBeforeMove.x + 12, frameBeforeMove.y + 12);
  await page.mouse.down();
  await page.mouse.move(frameBeforeMove.x + 52, frameBeforeMove.y + 12, { steps: 4 });
  await page.mouse.up();
  const afterMove = await img.boundingBox();
  const frameAfterMove = await frame.boundingBox();
  if (!afterMove || !frameAfterMove) throw new Error("Picture geometry is unavailable after moving the frame.");
  expect(afterMove.x - beforeMove.x).toBeCloseTo(40, 0);
  expect(afterMove.y - beforeMove.y).toBeCloseTo(0, 0);
  expect(afterMove.x).toBeGreaterThanOrEqual(frameAfterMove.x - 1);
  expect(afterMove.y).toBeGreaterThanOrEqual(frameAfterMove.y - 1);
  expect(afterMove.x + afterMove.width).toBeLessThanOrEqual(frameAfterMove.x + frameAfterMove.width + 1);
  expect(afterMove.y + afterMove.height).toBeLessThanOrEqual(frameAfterMove.y + frameAfterMove.height + 1);
});

test("Arrow double-click opens the chooser and Insert > Picture fills the selected box", async ({ page }) => {
  const insertDisabled = async () => {
    await page.locator('[data-menu-root="insert"]').click();
    const disabled = await page.locator('[data-menu-action="insert.image"]').getAttribute("aria-disabled");
    await page.keyboard.press("Escape");
    return disabled === "true";
  };
  expect(await insertDisabled()).toBe(false);

  const frame = await drawPictureBox(page);
  await page.locator('[data-studio-tool-button="select"]').click();
  const selectCursor = await frame.evaluate((element) => getComputedStyle(element).cursor);
  expect(selectCursor).not.toContain("url(");
  const chooser = page.waitForEvent("filechooser");
  await frame.dblclick();
  await (await chooser).setFiles([]);

  await page.locator('[data-menu-root="insert"]').click();
  const viaMenu = page.waitForEvent("filechooser");
  await page.locator('[data-menu-action="insert.image"]').click();
  await (await viaMenu).setFiles(WIDE_PNG);
  await expect(frame.locator("img")).toBeVisible();
  await expect(page.locator(".ProseMirror img")).toHaveCount(0);
});

test("selected picture box shows the object ribbon and right-click Format Object edits that box", async ({ page }) => {
  const frame = await drawPictureBox(page);
  await frame.click();
  const ribbon = page.locator('[data-studio-object-ribbon="true"]');
  await expect(ribbon).toBeVisible();
  await expect(page.locator('[data-studio-font-size="true"]')).toHaveCount(0);
  const before = await frame.boundingBox();
  const width = ribbon.locator('[data-object-field="w"]');
  const ribbonWidth = parseFloat(await width.inputValue());
  expect(Number.isFinite(ribbonWidth)).toBe(true);
  await width.fill(`${(ribbonWidth + 20).toFixed(2)}mm`);
  await width.press("Enter");
  await expect.poll(async () => (await frame.boundingBox())!.width).toBeGreaterThan(before!.width + 10);
  await ribbon.getByRole("button", { name: "Elliptical Picture Box" }).click();
  const ellipse = page.locator('[data-studio-frame="picture-ellipse"]');
  await expect(ellipse).toBeVisible();

  await ellipse.click({ button: "right" });
  await page.locator('[data-object-menu="format"]').click();
  const dialog = page.locator('[data-studio-format-object-dialog="true"]');
  await expect(dialog).toBeVisible();
  const x0 = (await ellipse.boundingBox())!.x;
  const dx = dialog.locator('[data-object-field="x"]');
  const xValue = parseFloat(await dx.inputValue());
  expect(Number.isFinite(xValue)).toBe(true);
  await dx.fill(`${(xValue + 10).toFixed(2)}mm`);
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toHaveCount(0);
  expect((await ellipse.boundingBox())!.x).toBeCloseTo(x0, 0);

  await ellipse.click({ button: "right" });
  await page.locator('[data-object-menu="format"]').click();
  const xOk = parseFloat(await dx.inputValue());
  expect(Number.isFinite(xOk)).toBe(true);
  await dx.fill(`${(xOk + 10).toFixed(2)}mm`);
  await dialog.getByRole("button", { name: "OK" }).click();
  await expect.poll(async () => Math.abs((await ellipse.boundingBox())!.x - x0)).toBeGreaterThan(10);

  await page.locator('[data-studio-tool-button="text"]').click();
  await page.locator(".ProseMirror").click();
  await expect(ribbon).toHaveCount(0);
  await expect(page.locator('[data-studio-font-size="true"]')).toBeVisible();
});

test.describe("object menu and Format Object dialog regressions", () => {
  async function centre(page: Page, frame: import("@playwright/test").Locator) {
    const b = (await frame.boundingBox())!;
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  }
  for (const mode of ["hand", "select", "text"] as const) {
    test(`right-click centre of a selected ellipse opens the object menu (${mode})`, async ({ page }) => {
      const frame = await drawPictureBox(page, "cross-circle", "picture-ellipse");
      await frame.click();
      if (mode !== "hand") await page.locator(`[data-studio-tool-button="${mode}"]`).click();
      if (mode === "select") await frame.click();
      const c = await centre(page, frame);
      await page.mouse.click(c.x, c.y, { button: "right" });
      await expect(page.locator('[data-object-menu="format"]')).toBeVisible();
    });
  }
  test("object menu closes on outside click and Escape, and stays in the viewport", async ({ page }) => {
    const frame = await drawPictureBox(page);
    await frame.click();
    await frame.click({ button: "right" });
    const menu = page.locator('[data-object-menu-root="true"]');
    await expect(menu).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    await frame.click({ button: "right" });
    await expect(menu).toBeVisible();
    await page.mouse.click(5, 300);
    await expect(menu).toHaveCount(0);
  });
  test("Enter in a Format Object field applies the typed value and focus starts in the dialog", async ({ page }) => {
    const frame = await drawPictureBox(page);
    await frame.click();
    await frame.click({ button: "right" });
    await page.locator('[data-object-menu="format"]').click();
    const dialog = page.locator('[data-studio-format-object-dialog="true"]');
    const w = dialog.locator('[data-object-field="w"]');
    await expect(w.or(dialog.locator('[data-object-field="x"]')).first()).toBeFocused().catch(async () => { await expect(dialog.locator("input").first()).toBeFocused(); });
    const before = (await frame.boundingBox())!.width;
    const dialogWidth = parseFloat(await w.inputValue());
    expect(Number.isFinite(dialogWidth)).toBe(true);
    await w.fill(`${(dialogWidth + 20).toFixed(2)}mm`);
    await w.press("Enter");
    await expect(dialog).toHaveCount(0);
    await expect.poll(async () => (await frame.boundingBox())!.width).toBeGreaterThan(before + 10);
  });
});

test("Modify Object dialog renders at the measured 352x322 window size", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chrome", "desktop geometry check");
  const frame = await drawPictureBox(page);
  await frame.click();
  await frame.click({ button: "right" });
  await page.locator('[data-object-menu="format"]').click();
  const win = page.locator("[data-modify-object-window]");
  await expect(win).toBeVisible();
  for (const field of ["x", "y", "w", "h"]) {
    await expect(win.locator(`[data-object-field="${field}"]`)).toHaveValue(/\d+(\.\d+)?mm$/);
  }
  const b = (await win.boundingBox())!;
  expect(Math.round(b.width)).toBe(352);
  expect(Math.round(b.height)).toBe(322);
  await win.screenshot({ path: "/workspace/inpage-reference/qalam-modify-object.png" });
});
