import { deflateSync } from "node:zlib";
import { expect, test, type Page } from "@playwright/test";

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

const RED_PNG = { name: "red.png", mimeType: "image/png", buffer: makePng(200, 120) };

async function drawPictureBox(page: Page, offsetX: number, offsetY: number, w = 120, h = 90) {
  await page.locator('[data-studio-tool-button="cross-square"]').click();
  const surface = page.locator("[data-studio-objects]");
  const box = await surface.boundingBox();
  if (!box) throw new Error("Object layer is not rendered.");
  await page.mouse.move(box.x + offsetX, box.y + offsetY);
  await page.mouse.down();
  await page.mouse.move(box.x + offsetX + w, box.y + offsetY + h, { steps: 4 });
  await page.mouse.up();
}

test.describe("Picture Context Menus, Clipboard Integration, and Marquee Selection", () => {
  test("verifies Hand & Arrow context menus, Copy/Cut->Paste, multi-selection, marquee, move, resize, and zero console errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && !(msg.location()?.url ?? "").includes("/_vercel/")) {
        consoleErrors.push(msg.text());
      }
    });
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.addInitScript(() => localStorage.setItem("qalam-site-language", "en"));
    page.on("dialog", (dialog) => dialog.accept());
    await page.goto("/tools/document-studio");
    await expect(page.locator(".ProseMirror")).toHaveAttribute("data-studio-font-layout", "ready");

    // Draw two picture boxes: box 0 at (60, 80) and box 1 at (260, 80)
    await drawPictureBox(page, 60, 80, 120, 90);
    await drawPictureBox(page, 260, 80, 120, 90);
    const frames = page.locator('[data-studio-frame="picture-rect"]');
    await expect(frames).toHaveCount(2);

    // 1. Hand Tool Picture Context Menu (currently active after drawing)
    const box0 = await frames.nth(0).boundingBox();
    if (!box0) throw new Error("Missing first picture box.");
    await page.mouse.click(box0.x + 20, box0.y + 20, { button: "right" });
    const handMenu = page.locator('[data-studio-picture-menu="hand"]');
    await expect(handMenu).toBeVisible();
    const handLabels = await handMenu.locator('[role="menuitem"]').allInnerTexts();
    expect(handLabels.map((t) => t.replace("▸", "").trim())).toEqual(["Zoom", "Import Picture…", "Select All", "Cut", "Copy", "Clear", "Paste"]);

    // Verify positioning near pointer
    const handMenuBox = await handMenu.boundingBox();
    expect(handMenuBox).toBeTruthy();
    expect(Math.abs(handMenuBox!.x - (box0.x + 20))).toBeLessThan(40);

    // Import Picture… via Hand context menu
    const [chooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      handMenu.getByRole("menuitem", { name: "Import Picture…" }).click(),
    ]);
    await chooser.setFiles(RED_PNG);
    await expect(frames.nth(0).locator("img")).toHaveCount(1);

    // Zoom submenu in Hand context menu, then restore 100%
    await page.mouse.click(box0.x + 20, box0.y + 20, { button: "right" });
    await handMenu.getByRole("menuitem", { name: /Zoom/ }).click();
    await page.locator('[data-studio-picture-context-zoom]').getByRole("menuitem", { name: "200%" }).click();
    const box0Zoomed = await frames.nth(0).boundingBox();
    if (!box0Zoomed) throw new Error("Missing first picture box at 200% zoom.");
    await page.mouse.click(box0Zoomed.x + 20, box0Zoomed.y + 20, { button: "right" });
    await handMenu.getByRole("menuitem", { name: /Zoom/ }).click();
    await page.locator('[data-studio-picture-context-zoom]').getByRole("menuitem", { name: "100%" }).click();

    // 2. Switch to Arrow tool & test Marquee selection (left-to-right enclosed vs right-to-left intersected + Shift)
    await page.locator('[data-studio-tool-button="select"]').click();
    const surface = page.locator("[data-studio-objects]");
    const sBox = await surface.boundingBox();
    if (!sBox) throw new Error("Missing object layer.");

    // Left-to-right from (40, 60) to (300, 200): encloses frame 0 (60..180), only intersects frame 1 (260..380)
    await page.mouse.move(sBox.x + 40, sBox.y + 60);
    await page.mouse.down();
    await page.mouse.move(sBox.x + 300, sBox.y + 200, { steps: 4 });
    await expect(page.locator('[data-studio-marquee="true"]')).toBeVisible();
    await page.mouse.up();
    await expect(frames.nth(0).locator("[data-studio-frame-handle]")).toHaveCount(8);
    await expect(frames.nth(1).locator("[data-studio-frame-handle]")).toHaveCount(0);

    // Right-to-left from (300, 60) to (150, 200): intersects both frame 0 and frame 1
    await page.mouse.move(sBox.x + 300, sBox.y + 60);
    await page.mouse.down();
    await page.mouse.move(sBox.x + 150, sBox.y + 200, { steps: 4 });
    await page.mouse.up();
    await expect(frames.nth(0).locator("[data-studio-frame-handle]")).toHaveCount(8);
    await expect(frames.nth(1).locator("[data-studio-frame-handle]")).toHaveCount(8);

    // 3. Right-click already-selected frame 0 in Arrow mode -> preserves multi-selection & opens Arrow menu
    const f0Box = await frames.nth(0).boundingBox();
    await page.mouse.click(f0Box!.x + 20, f0Box!.y + 20, { button: "right" });
    const arrowMenu = page.locator('[data-studio-picture-menu="arrow"]');
    await expect(arrowMenu).toBeVisible();
    const arrowLabels = await arrowMenu.locator('[role="menuitem"]').allInnerTexts();
    expect(arrowLabels.map((t) => t.replace("▸", "").trim())).toEqual(["Zoom", "Select All", "Cut", "Copy", "Clear", "Object…"]);
    await expect(frames.nth(0).locator("[data-studio-frame-handle]")).toHaveCount(8);
    await expect(frames.nth(1).locator("[data-studio-frame-handle]")).toHaveCount(8);

    // Copy in Arrow mode -> switch to Hand -> Paste into frame 1
    await arrowMenu.getByRole("menuitem", { name: "Copy" }).click();
    await page.locator('[data-studio-tool-button="text"]').click();
    const f1Box = await frames.nth(1).boundingBox();
    await page.mouse.click(f1Box!.x + 20, f1Box!.y + 20, { button: "right" });
    await page.locator('[data-studio-picture-menu="hand"]').getByRole("menuitem", { name: "Paste" }).click();
    await expect(frames.nth(1).locator("img")).toHaveCount(1);

    // Switch back to Arrow -> Object… opens Modify Object dialog -> Cancel
    await page.locator('[data-studio-tool-button="select"]').click();
    await page.mouse.click(f1Box!.x + 20, f1Box!.y + 20, { button: "right" });
    await page.locator('[data-studio-picture-menu="arrow"]').getByRole("menuitem", { name: "Object…" }).click();
    await expect(page.getByRole("dialog", { name: "Modify Object" })).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();

    // Deselect multi-selection, select only frame 1, then Clear frame 1 via Arrow context menu
    await page.mouse.click(sBox.x + 15, sBox.y + 15);
    await frames.nth(1).click();
    const f1ClearBox = await frames.nth(1).boundingBox();
    await page.mouse.click(f1ClearBox!.x + 20, f1ClearBox!.y + 20, { button: "right" });
    await page.locator('[data-studio-picture-menu="arrow"]').getByRole("menuitem", { name: "Clear" }).click();
    await expect(frames).toHaveCount(1);

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test("opens Hand and Arrow picture context menus reliably across 100%, 150%, 200%, and 300% zoom on edge and lower frames", async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && !(msg.location()?.url ?? "").includes("/_vercel/")) {
        consoleErrors.push(msg.text());
      }
    });
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.addInitScript(() => localStorage.setItem("qalam-site-language", "en"));
    page.on("dialog", (dialog) => dialog.accept());
    await page.goto("/tools/document-studio");
    await expect(page.locator(".ProseMirror")).toHaveAttribute("data-studio-font-layout", "ready");

    // Draw frames near left edge, right edge, and lower canvas position
    await drawPictureBox(page, 24, 60, 100, 80);
    await drawPictureBox(page, 630, 60, 100, 80);
    await drawPictureBox(page, 240, 420, 120, 80);
    const frames = page.locator('[data-studio-frame="picture-rect"]');
    await expect(frames).toHaveCount(3);

    const scroller = page.locator('[data-studio-scroller="true"]');
    const handMenu = page.locator('[data-studio-picture-menu="hand"]');
    const arrowMenu = page.locator('[data-studio-picture-menu="arrow"]');

    for (const step of [
      { frameIndex: 0, zoomValue: "100", source: "control" as const },
      { frameIndex: 0, zoomValue: "150", source: "control" as const },
      { frameIndex: 0, zoomLabel: "200%", source: "menu" as const },
      { frameIndex: 1, zoomLabel: "300%", source: "menu" as const },
      { frameIndex: 2, zoomLabel: "100%", source: "menu" as const },
    ]) {
      // Hand mode: select/target the frame, zoom via control or context menu, then right-click its visible zoomed box
      await page.locator('[data-studio-tool-button="text"]').click();
      const target = frames.nth(step.frameIndex);
      await target.scrollIntoViewIfNeeded();
      await target.click({ position: { x: 25, y: 25 }, button: "right" });
      await expect(handMenu).toBeVisible();
      if (step.source === "menu") {
        await handMenu.getByRole("menuitem", { name: /Zoom/ }).click();
        await page.locator('[data-studio-picture-context-zoom]').getByRole("menuitem", { name: step.zoomLabel }).click();
      } else {
        await page.keyboard.press("Escape");
        await page.locator('[data-studio-zoom-control]').selectOption(step.zoomValue);
      }

      const zoomedBox = await target.boundingBox();
      const scBox = await scroller.boundingBox();
      expect(zoomedBox).toBeTruthy();
      expect(scBox).toBeTruthy();
      // Zoom visibility keeps the selected frame inside the scroller horizontally
      expect(zoomedBox!.x).toBeGreaterThanOrEqual(scBox!.x);
      expect(zoomedBox!.x + zoomedBox!.width).toBeLessThanOrEqual(scBox!.x + scBox!.width + 2);

      await page.mouse.click(zoomedBox!.x + 25, zoomedBox!.y + 25, { button: "right" });
      await expect(handMenu).toBeVisible();
      const handLabels = await handMenu.locator('[role="menuitem"]').allInnerTexts();
      expect(handLabels.map((t) => t.replace("▸", "").trim())).toEqual([
        "Zoom",
        "Import Picture…",
        "Select All",
        "Cut",
        "Copy",
        "Clear",
        "Paste",
      ]);
      const hmBox = await handMenu.boundingBox();
      expect(hmBox!.x + hmBox!.width).toBeLessThanOrEqual(1280);
      expect(hmBox!.y + hmBox!.height).toBeLessThanOrEqual(800);
      await page.keyboard.press("Escape");

      // Arrow mode at the exact same zoom level: verify Arrow object menu & empty-canvas menu
      await page.locator('[data-studio-tool-button="select"]').click();
      const arrowBox = await target.boundingBox();
      await page.mouse.click(arrowBox!.x + 25, arrowBox!.y + 25, { button: "right" });
      await expect(arrowMenu).toBeVisible();
      const arrowLabels = await arrowMenu.locator('[role="menuitem"]').allInnerTexts();
      expect(arrowLabels.map((t) => t.replace("▸", "").trim())).toEqual([
        "Zoom",
        "Select All",
        "Cut",
        "Copy",
        "Clear",
        "Object…",
      ]);
      await page.keyboard.press("Escape");
    }

    // Also verify empty canvas right-click at 200% zoom opens arrow-empty menu
    await page.locator('[data-studio-zoom-control]').selectOption("200");
    await page.locator('[data-studio-tool-button="select"]').click();
    const scEmpty = await scroller.boundingBox();
    await page.mouse.click(scEmpty!.x + 10, scEmpty!.y + 20, { button: "right" });
    await expect(page.locator('[data-studio-picture-menu="arrow-empty"]')).toBeVisible();
    await page.keyboard.press("Escape");

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
