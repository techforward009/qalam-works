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

async function drawPictureBox(page: Page) {
  await page.locator('[data-studio-tool-button="cross-square"]').click();
  const surface = page.locator("[data-studio-objects]");
  const box = await surface.boundingBox();
  if (!box) throw new Error("Object layer is not rendered.");
  const startX = box.x + 100;
  const startY = box.y + 100;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 180, startY + 120, { steps: 5 });
  await page.mouse.up();
  const frame = page.locator('[data-studio-frame="picture-rect"]');
  await expect(frame).toBeVisible();
  return frame;
}

test("drawing a picture box activates the hand tool and one click imports a fitted picture", async ({ page }) => {
  const frame = await drawPictureBox(page);
  await expect(page.locator('[data-studio-tool-button="text"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('[data-studio-tool-button="select"]')).toHaveAttribute("aria-pressed", "false");
  await expect(frame).toHaveCSS("cursor", "pointer");

  const chooser = page.waitForEvent("filechooser");
  await frame.click();
  await (await chooser).setFiles(WIDE_PNG);

  const img = frame.locator("[data-studio-picture-clip] img");
  await expect(img).toBeVisible();
  await expect(img).toHaveAttribute("src", /^data:image\//);
  await expect(page.locator(".ProseMirror img")).toHaveCount(0);
  const frameBox = (await frame.boundingBox())!;
  const imgBox = (await img.boundingBox())!;
  expect(imgBox.width).toBeCloseTo(frameBox.width, 0);
  expect(imgBox.width / imgBox.height).toBeCloseTo(4, 1);
  expect(imgBox.y).toBeGreaterThanOrEqual(frameBox.y - 1);
  expect(imgBox.y + imgBox.height).toBeLessThanOrEqual(frameBox.y + frameBox.height + 1);
});

test("Arrow double-click opens the chooser and Insert > Picture fills the selected box", async ({ page }) => {
  const insertDisabled = async () => {
    await page.locator('[data-menu-root="insert"]').click();
    const disabled = await page.locator('[data-menu-action="insert.image"]').getAttribute("aria-disabled");
    await page.keyboard.press("Escape");
    return disabled === "true";
  };
  expect(await insertDisabled()).toBe(true);

  const frame = await drawPictureBox(page);
  await page.locator('[data-studio-tool-button="select"]').click();
  await expect(frame).not.toHaveCSS("cursor", "pointer");
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
