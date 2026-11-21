import { expect, test, type Page } from "@playwright/test";

const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL9WAAAAABJRU5ErkJggg==";

async function open(page: Page) {
  await page.addInitScript(() => localStorage.setItem("qalam-site-language", "en"));
  await page.goto("/tools/document-studio");
  await expect(page.locator(".ProseMirror")).toBeEditable({ timeout: 45000 });
  await expect(page.locator(".ProseMirror")).toHaveAttribute("data-studio-font-layout", "ready", { timeout: 25000 });
  await expect.poll(
    () => page.evaluate(() => localStorage.getItem("qalam-document-studio-active-document-v1")),
    { timeout: 20000 },
  ).not.toBeNull();
}

async function seedFramesAndDoc(page: Page, frames: Array<Record<string, unknown>>, doc: Record<string, unknown>) {
  await page.evaluate((nextFrames) => {
    const id = localStorage.getItem("qalam-document-studio-active-document-v1")!;
    const map = JSON.parse(localStorage.getItem("qalam-studio-frames-v1") || "{}") as Record<string, unknown>;
    map[id] = nextFrames;
    localStorage.setItem("qalam-studio-frames-v1", JSON.stringify(map));
  }, frames);
  await page.reload();
  await expect(page.locator(".ProseMirror")).toBeEditable({ timeout: 45000 });
  await expect(page.locator(".ProseMirror")).toHaveAttribute("data-studio-font-layout", "ready", { timeout: 25000 });
  await page.locator(".ProseMirror").click();
  await page.locator(".ProseMirror").evaluate((root, content) => {
    const editor = (root as HTMLElement & {
      editor: { commands: { setContent: (doc: unknown) => void; focus: (at: string) => void } };
    }).editor;
    editor.commands.setContent(content);
    editor.commands.focus("start");
  }, doc);
}

async function storedFrame(page: Page, id: string) {
  return page.evaluate((frameId) => {
    const doc = localStorage.getItem("qalam-document-studio-active-document-v1");
    const map = JSON.parse(localStorage.getItem("qalam-studio-frames-v1") || "{}") as Record<string, Array<Record<string, unknown>>>;
    return doc ? (map[doc] || []).find((frame) => frame.id === frameId) : undefined;
  }, id);
}

async function measureFrameFlow(page: Page, id: string) {
  return page.evaluate((frameId) => {
    const frame = document.querySelector(`[data-studio-frame-id="${frameId}"]`)?.getBoundingClientRect();
    const root = document.querySelector(".ProseMirror");
    if (!frame || !root) return { left: false, right: false, overlap: 0 };
    let left = false;
    let right = false;
    let overlap = 0;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
      if (!node.data.trim()) continue;
      if (node.parentElement?.closest("[data-studio-frame-id], [data-run-around-gap], [data-run-around-skip], [data-document-page-break], [data-document-section-break]")) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const rect of range.getClientRects()) {
        if (rect.width < 2 || rect.height < 2) continue;
        if (rect.bottom <= frame.top + 1 || rect.top >= frame.bottom - 1) continue;
        if (rect.right <= frame.left - 1) left = true;
        if (rect.left >= frame.right + 1) right = true;
        if (rect.right > frame.left + 2 && rect.left < frame.right - 2) overlap += 1;
      }
    }
    return { left, right, overlap };
  }, id);
}

async function stubWindowPrint(page: Page) {
  await page.evaluate(() => {
    const w = window as Window & { __origPrint?: typeof window.print; __printCalled?: number };
    w.__origPrint = window.print;
    w.__printCalled = 0;
    window.print = () => {
      w.__printCalled = (w.__printCalled ?? 0) + 1;
    };
  });
}

async function restoreWindowPrint(page: Page) {
  await page.evaluate(() => {
    window.dispatchEvent(new Event("afterprint"));
    const w = window as Window & { __origPrint?: typeof window.print };
    if (w.__origPrint) {
      window.print = w.__origPrint;
      delete w.__origPrint;
    }
  });
}

test.describe("Run Around Editor, Facing Pages, Print Parity", () => {
  test("1. excludes dontPrint Run Around frames and aligns page-2 boxes after manual pageBreak in Browser Print", async ({ page }) => {
    test.setTimeout(120000);
    await open(page);
    await seedFramesAndDoc(
      page,
      [
        { id: "hidden-dont-print", kind: "picture-rect", page: 1, xMm: 78, yMm: 34, wMm: 44, hMm: 24, flip: false, text: "", dontPrint: true, runAround: true },
        { id: "p2-visible", kind: "picture-rect", page: 2, xMm: 86, yMm: 36, wMm: 38, hMm: 26, flip: false, text: "", dontPrint: false, runAround: true, runAroundLeftMm: 2, runAroundRightMm: 2, runAroundTopMm: 0.5, runAroundBottomMm: 0.5 },
      ],
      {
        type: "doc",
        content: [
          { type: "paragraph", attrs: { dir: "rtl" }, content: [{ type: "text", text: `بِسم اللہ ${"سلام\u200cعلی ".repeat(65)}` }] },
          { type: "pageBreak" },
          { type: "paragraph", attrs: { dir: "rtl" }, content: [{ type: "text", text: `دوسرا صفحہ ${"سلام\u200cعلی ".repeat(110)}` }] },
        ],
      },
    );

    await expect(page.locator('[data-studio-frame-id="hidden-dont-print"]')).toBeVisible();
    await expect.poll(() => measureFrameFlow(page, "hidden-dont-print"), { timeout: 15000 }).toEqual({ left: true, right: true, overlap: 0 });

    await stubWindowPrint(page);
    try {
      await page.locator('[data-menu-root="file"]').click();
      await page.locator('[data-menu-action="file.print"]').click();
      await expect.poll(() => page.evaluate(() => (window as Window & { __printCalled?: number }).__printCalled), { timeout: 15000 }).toBe(1);
      await expect(page.locator('[data-studio-print-portal][data-print-waited-fonts="true"]')).toHaveCount(1);

      const snapshot = await page.evaluate(() => {
        const portal = document.querySelector("[data-studio-print-portal]")!;
        const printPage = portal.querySelector<HTMLElement>("[data-studio-print-page]")!;
        const pageLeft = printPage.getBoundingClientRect().left;
        const pxPerMm = printPage.getBoundingClientRect().width / Number(portal.getAttribute("data-print-page-width-mm") || 210);
        const hiddenRendered = portal.querySelectorAll('[data-print-frame-id="hidden-dont-print"]').length;
        const visibleRendered = portal.querySelectorAll('[data-print-frame-id="p2-visible"]').length;
        const paras = Array.from(portal.querySelectorAll<HTMLElement>(".ProseMirror p"));
        const p1 = paras[0];
        const p2 = paras[1];
        const p1Gaps = p1 ? p1.querySelectorAll("[data-print-run-around]").length : -1;
        const p2Gaps = p2 ? p2.querySelectorAll('[data-print-run-around="gap"]').length : 0;

        // Verify story text flows straight through the hidden frame x=78..122mm on page 1
        let p1ThroughHidden = 0;
        if (p1) {
          const walker = document.createTreeWalker(p1, NodeFilter.SHOW_TEXT);
          for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
            if (!node.data.trim()) continue;
            const range = document.createRange();
            range.selectNodeContents(node);
            for (const r of range.getClientRects()) {
              if (r.width < 2 || r.height < 2) continue;
              const relLeft = r.left - pageLeft;
              const relRight = r.right - pageLeft;
              if (relRight > 82 * pxPerMm && relLeft < 118 * pxPerMm) p1ThroughHidden += 1;
            }
          }
        }

        // Verify page-2 paragraph wraps cleanly on both sides around p2-visible (x=86..124mm, page y=36..62mm)
        const marginTopMm = Number(document.querySelector("[data-studio-print-root]")?.getAttribute("data-print-margin-top-mm") || 25.4);
        let p2Left = false;
        let p2Right = false;
        let p2Collisions = 0;
        if (p2) {
          const p2Top = p2.getBoundingClientRect().top;
          const walker = document.createTreeWalker(p2, NodeFilter.SHOW_TEXT);
          for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
            if (!node.data.trim()) continue;
            if (node.parentElement?.closest("[data-print-run-around]")) continue;
            const range = document.createRange();
            range.selectNodeContents(node);
            for (const r of range.getClientRects()) {
              if (r.width < 2 || r.height < 2) continue;
              const pageY = (r.top + r.bottom) / 2 - p2Top + marginTopMm * pxPerMm;
              if (pageY <= 36.5 * pxPerMm || pageY >= 61.5 * pxPerMm) continue;
              const relLeft = r.left - pageLeft;
              const relRight = r.right - pageLeft;
              if (relRight <= 86 * pxPerMm) p2Left = true;
              if (relLeft >= 124 * pxPerMm) p2Right = true;
              if (relRight > 88 * pxPerMm && relLeft < 122 * pxPerMm) p2Collisions += 1;
            }
          }
        }
        return { hiddenRendered, visibleRendered, p1Gaps, p2Gaps, p1ThroughHidden, p2Left, p2Right, p2Collisions };
      });

      expect(snapshot.hiddenRendered).toBe(0);
      expect(snapshot.visibleRendered).toBe(1);
      expect(snapshot.p1Gaps).toBe(0);
      expect(snapshot.p1ThroughHidden).toBeGreaterThan(0);
      expect(snapshot.p2Gaps).toBeGreaterThan(0);
      expect(snapshot.p2Left).toBe(true);
      expect(snapshot.p2Right).toBe(true);
      expect(snapshot.p2Collisions).toBe(0);
    } finally {
      await restoreWindowPrint(page);
    }
  });

  test("2. updates page and page-local yMm across page boundary drag with Undo/Redo and Browser Print parity", async ({ page }) => {
    test.setTimeout(120000);
    await open(page);
    await seedFramesAndDoc(
      page,
      [{ id: "cross-box", kind: "picture-rect", page: 1, xMm: 88, yMm: 220, wMm: 34, hMm: 24, flip: false, text: "", runAround: true }],
      {
        type: "doc",
        content: Array.from({ length: 38 }, (_, i) => ({
          type: "paragraph",
          attrs: { dir: "rtl" },
          content: [{ type: "text", text: `${i === 0 ? "بِسم اللہ " : ""}${"سلام\u200cعلی ".repeat(36)}` }],
        })),
      },
    );

    await expect.poll(() => page.locator("[data-studio-page-paper]").count(), { timeout: 20000 }).toBeGreaterThan(1);
    await expect.poll(() => page.locator("[data-run-around-gap]").count(), { timeout: 15000 }).toBeGreaterThan(0);
    await page.locator('[data-studio-frame-id="cross-box"]').scrollIntoViewIfNeeded();
    await expect.poll(() => measureFrameFlow(page, "cross-box"), { timeout: 15000 }).toEqual({ left: true, right: true, overlap: 0 });

    await page.locator('[data-studio-zoom-control]').selectOption("50");
    await page.locator('[data-studio-tool-button="select"]').click();

    const frameLocator = page.locator('[data-studio-frame-id="cross-box"]');
    await frameLocator.evaluate((el) => el.scrollIntoView({ block: "center", inline: "nearest" }));
    const box1 = (await frameLocator.boundingBox())!;
    const paper1 = (await page.locator('[data-studio-page-paper="1"]').boundingBox())!;
    const paper2 = (await page.locator('[data-studio-page-paper="2"]').boundingBox())!;
    expect(box1 && paper1 && paper2).toBeTruthy();

    // Scroll so upper page 2 is also clearly inside viewport while cross-box (y=220mm on page 1) stays visible
    await page.locator("[data-studio-scroller]").evaluate((sc) => {
      sc.scrollTop = Math.max(0, sc.scrollTop + 120);
    });
    const boxStart = (await frameLocator.boundingBox())!;
    const paper1After = (await page.locator('[data-studio-page-paper="1"]').boundingBox())!;
    const paper2After = (await page.locator('[data-studio-page-paper="2"]').boundingBox())!;
    const stride = paper2After.y - paper1After.y;
    const orig = await storedFrame(page, "cross-box");
    const dragDeltaY = Math.round(stride - (170 / 297) * paper1After.height);

    const startX = boxStart.x + boxStart.width / 2;
    const startY = boxStart.y + boxStart.height / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, startY + dragDeltaY, { steps: 10 });
    await page.mouse.up();

    await expect.poll(async () => (await storedFrame(page, "cross-box"))?.page, { timeout: 10000 }).toBe(2);
    const moved = await storedFrame(page, "cross-box");
    expect(Number(moved?.yMm)).toBeGreaterThan(25);
    expect(Number(moved?.yMm)).toBeLessThan(95);
    await expect.poll(() => measureFrameFlow(page, "cross-box"), { timeout: 15000 }).toEqual({ left: true, right: true, overlap: 0 });

    // Confirm Browser Print renders cross-box on page 2
    await stubWindowPrint(page);
    try {
      await page.locator('[data-menu-root="file"]').click();
      await page.locator('[data-menu-action="file.print"]').click();
      await expect.poll(() => page.evaluate(() => (window as Window & { __printCalled?: number }).__printCalled), { timeout: 15000 }).toBe(1);
      const printPageNum = await page.evaluate(() => {
        const el = document.querySelector('[data-studio-print-portal] [data-print-frame-id="cross-box"]');
        return el?.closest("[data-print-object-page]")?.getAttribute("data-print-object-page");
      });
      expect(printPageNum).toBe("2");
    } finally {
      await restoreWindowPrint(page);
    }

    // Drag back to Page 1 and verify Undo/Redo restores page transitions cleanly
    const box2 = (await frameLocator.boundingBox())!;
    const backStartX = box2.x + box2.width / 2;
    const backStartY = box2.y + box2.height / 2;
    await page.mouse.move(backStartX, backStartY);
    await page.mouse.down();
    await page.mouse.move(backStartX, backStartY - dragDeltaY, { steps: 10 });
    await page.mouse.up();

    await expect.poll(async () => (await storedFrame(page, "cross-box"))?.page, { timeout: 10000 }).toBe(1);
    const returned = await storedFrame(page, "cross-box");
    expect(Math.abs(Number(returned?.yMm) - Number(orig?.yMm))).toBeLessThan(6);

    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press("Control+z");
    await expect.poll(async () => (await storedFrame(page, "cross-box"))?.page, { timeout: 10000 }).toBe(2);

    await page.keyboard.press("Control+Shift+z");
    await expect.poll(async () => (await storedFrame(page, "cross-box"))?.page, { timeout: 10000 }).toBe(1);
  });

  test("3. collapses trailing empty page when Run Around is disabled and updates Facing Pages layout", async ({ page }) => {
    test.setTimeout(120000);
    await open(page);
    await seedFramesAndDoc(
      page,
      [{ id: "tail-box", kind: "picture-rect", page: 1, xMm: 62, yMm: 95, wMm: 86, hMm: 78, flip: false, text: "", runAround: false }],
      { type: "doc", content: [{ type: "paragraph", attrs: { dir: "rtl" }, content: [{ type: "text", text: "آغاز" }] }] },
    );

    // Calibrate paragraph count so the unwrapped document ends near the bottom of Page 1 (~82% full -> 1 page)
    await page.locator(".ProseMirror").evaluate(async (root) => {
      const editor = (root as HTMLElement & {
        editor: { commands: { setContent: (doc: unknown) => void } };
      }).editor;
      const makeDoc = (count: number) => ({
        type: "doc",
        content: Array.from({ length: count }, (_, i) => ({
          type: "paragraph",
          attrs: { dir: "rtl" },
          content: [{ type: "text", text: `${i === 0 ? "بِسم اللہ " : ""}${"سلام\u200cعلی ".repeat(16)}` }],
        })),
      });
      const waitFrames = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
      let lo = 10;
      let hi = 40;
      let best = 14;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        editor.commands.setContent(makeDoc(mid));
        await waitFrames();
        await waitFrames();
        const pages = document.querySelectorAll("[data-studio-page-paper]").length;
        if (pages === 1) {
          best = mid;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }
      // Step 2 paragraphs back from 2-page boundary so Page 1 stays comfortably 1 sheet when Run Around is OFF
      // while turning Run Around ON over the 86x78mm box reliably overflows onto Page 2.
      editor.commands.setContent(makeDoc(Math.max(8, best - 2)));
      await waitFrames();
      await waitFrames();
    });

    await expect(page.locator("[data-studio-page-paper]")).toHaveCount(1);
    await page.locator('[data-studio-tool-button="select"]').click();
    await page.locator('[data-studio-frame-id="tail-box"]').click();
    const runAroundBtn = page.locator('[data-ribbon-field="run-around"]');
    await expect(runAroundBtn).toHaveAttribute("aria-pressed", "false");

    // Turn Run Around ON -> story flows to Page 2
    await runAroundBtn.click();
    await expect(runAroundBtn).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => page.locator("[data-studio-page-paper]").count(), { timeout: 15000 }).toBe(2);

    // Turn Run Around OFF -> unnecessary trailing empty Page 2 collapses back to 1
    await runAroundBtn.click();
    await expect(runAroundBtn).toHaveAttribute("aria-pressed", "false");
    await expect.poll(() => page.locator("[data-studio-page-paper]").count(), { timeout: 15000 }).toBe(1);

    // Repeat toggle -> no page-count drift
    await runAroundBtn.click();
    await expect.poll(() => page.locator("[data-studio-page-paper]").count(), { timeout: 15000 }).toBe(2);
    await runAroundBtn.click();
    await expect.poll(() => page.locator("[data-studio-page-paper]").count(), { timeout: 15000 }).toBe(1);

    // Undo restores ON (2 pages); Redo restores OFF (1 page)
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press("Control+z");
    await expect.poll(async () => (await storedFrame(page, "tail-box"))?.runAround, { timeout: 10000 }).toBe(true);
    await expect.poll(() => page.locator("[data-studio-page-paper]").count(), { timeout: 15000 }).toBe(2);

    await page.keyboard.press("Control+Shift+z");
    await expect.poll(async () => (await storedFrame(page, "tail-box"))?.runAround, { timeout: 10000 }).toBe(false);
    await expect.poll(() => page.locator("[data-studio-page-paper]").count(), { timeout: 15000 }).toBe(1);

    // Switch to Facing Pages and toggle Run Around ON and OFF
    await page.locator('[data-menu-root="view"]').click();
    await page.locator('[data-menu-action="view.facing"]').click();
    await expect(page.locator('[data-studio-view]')).toHaveAttribute("data-studio-view", "facing");
    await expect(page.locator(".ProseMirror [data-facing-projected]").first()).toBeVisible({ timeout: 15000 });

    await page.locator('[data-studio-frame-id="tail-box"]').click();
    await runAroundBtn.click();
    await expect.poll(() => page.locator("[data-studio-page-paper]").count(), { timeout: 15000 }).toBe(2);
    await expect.poll(() => page.locator("[data-run-around-gap]").count(), { timeout: 15000 }).toBeGreaterThan(0);
    await expect.poll(() => measureFrameFlow(page, "tail-box"), { timeout: 15000 }).toEqual({ left: true, right: true, overlap: 0 });

    await runAroundBtn.click();
    await expect.poll(() => page.locator("[data-studio-page-paper]").count(), { timeout: 15000 }).toBe(1);
    await expect(page.locator("[data-run-around-gap]")).toHaveCount(0);
  });

  test("4. coexists floated DocumentImage (wrapMode='wrap') and Run Around StudioFrame in Editor and Browser Print", async ({ page }) => {
    test.setTimeout(120000);
    await open(page);
    await seedFramesAndDoc(
      page,
      [{ id: "coexist-frame", kind: "picture-rect", page: 1, xMm: 62, yMm: 30, wMm: 34, hMm: 26, flip: false, text: "", runAround: true }],
      {
        type: "doc",
        content: [
          { type: "image", attrs: { src: TINY_PNG, alt: "Wrapped image", width: 140, height: 100, alignment: "right", wrapMode: "wrap" } },
          { type: "paragraph", attrs: { dir: "rtl" }, content: [{ type: "text", text: `بِسم اللہ ${"سلام\u200cعلی ".repeat(180)}` }] },
        ],
      },
    );

    await expect.poll(() => page.locator("[data-run-around-gap]").count(), { timeout: 15000 }).toBeGreaterThan(0);
    await expect.poll(() => measureFrameFlow(page, "coexist-frame"), { timeout: 15000 }).toEqual({ left: true, right: true, overlap: 0 });

    const editorImgOverlap = await page.evaluate(() => {
      const img = document.querySelector(".ProseMirror [data-resize-container] img")?.getBoundingClientRect();
      const root = document.querySelector(".ProseMirror");
      if (!img || !root) return -1;
      let collisions = 0;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
        if (!node.data.trim()) continue;
        if (node.parentElement?.closest("[data-studio-frame-id], [data-run-around-gap], [data-run-around-skip]")) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const r of range.getClientRects()) {
          if (r.width < 2 || r.height < 2) continue;
          if (r.bottom <= img.top + 4 || r.top >= img.bottom - 4) continue;
          if (r.right > img.left + 4 && r.left < img.right - 4) collisions += 1;
        }
      }
      return collisions;
    });
    expect(editorImgOverlap).toBe(0);

    await stubWindowPrint(page);
    try {
      await page.locator('[data-menu-root="file"]').click();
      await page.locator('[data-menu-action="file.print"]').click();
      await expect.poll(() => page.evaluate(() => (window as Window & { __printCalled?: number }).__printCalled), { timeout: 15000 }).toBe(1);

      const printSnapshot = await page.evaluate(() => {
        const portal = document.querySelector("[data-studio-print-portal]")!;
        const gaps = portal.querySelectorAll('[data-print-run-around="gap"]').length;
        const img = portal.querySelector(".ProseMirror [data-resize-container] img")?.getBoundingClientRect();
        const frame = portal.querySelector('[data-print-frame-id="coexist-frame"]')?.getBoundingClientRect();
        const printPage = portal.querySelector<HTMLElement>("[data-studio-print-page]")!;
        const marginTopMm = Number(document.querySelector("[data-studio-print-root]")?.getAttribute("data-print-margin-top-mm") || 25.4);
        const pxPerMm = printPage.getBoundingClientRect().width / Number(portal.getAttribute("data-print-page-width-mm") || 210);
        // On the screen portal, page margins are added at @media print, so shift story coordinates by marginTopMm
        const topOffset = marginTopMm * pxPerMm;
        let imgCollisions = 0;
        let frameCollisions = 0;
        let frameLeft = false;
        let frameRight = false;
        const walker = document.createTreeWalker(portal.querySelector(".ProseMirror")!, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
          if (!node.data.trim()) continue;
          if (node.parentElement?.closest("[data-print-run-around]")) continue;
          const range = document.createRange();
          range.selectNodeContents(node);
          for (const r of range.getClientRects()) {
            if (r.width < 2 || r.height < 2) continue;
            if (img && r.bottom > img.top + 4 && r.top < img.bottom - 4 && r.right > img.left + 4 && r.left < img.right - 4) {
              imgCollisions += 1;
            }
            if (frame && r.bottom + topOffset > frame.top + 2 && r.top + topOffset < frame.bottom - 2) {
              if (r.right <= frame.left - 1) frameLeft = true;
              if (r.left >= frame.right + 1) frameRight = true;
              if (r.right > frame.left + 2 && r.left < frame.right - 2) frameCollisions += 1;
            }
          }
        }
        return { gaps, imgFound: Boolean(img), imgCollisions, frameCollisions, frameLeft, frameRight };
      });

      expect(printSnapshot.imgFound).toBe(true);
      expect(printSnapshot.gaps).toBeGreaterThan(0);
      expect(printSnapshot.imgCollisions).toBe(0);
      expect(printSnapshot.frameLeft).toBe(true);
      expect(printSnapshot.frameRight).toBe(true);
      expect(printSnapshot.frameCollisions).toBe(0);
    } finally {
      await restoreWindowPrint(page);
    }
  });
});
