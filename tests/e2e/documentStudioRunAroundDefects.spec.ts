import { expect, test, type Page } from "@playwright/test";

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

async function allStoredFrames(page: Page) {
  return page.evaluate(() => {
    const doc = localStorage.getItem("qalam-document-studio-active-document-v1");
    const map = JSON.parse(localStorage.getItem("qalam-studio-frames-v1") || "{}") as Record<string, Array<Record<string, unknown>>>;
    return doc ? (map[doc] || []) : [];
  });
}

async function storedFrame(page: Page, id: string) {
  return (await allStoredFrames(page)).find((frame) => frame.id === id);
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

test.describe("Run Around C1/H1/H2/H3/M2 Browser Verification", () => {
  test("H2: keeps ProseMirror print padding at 0 and aligns Page-1 Nastaliq text under emulated print media", async ({ page }) => {
    test.setTimeout(120000);
    await open(page);
    await seedFramesAndDoc(
      page,
      [
        { id: "p1-tight", kind: "picture-rect", page: 1, xMm: 84, yMm: 36, wMm: 42, hMm: 26, flip: false, text: "", runAround: true },
        { id: "p2-after-break", kind: "rect", page: 2, xMm: 86, yMm: 38, wMm: 38, hMm: 24, flip: false, text: "", runAround: true },
      ],
      {
        type: "doc",
        content: [
          { type: "paragraph", attrs: { dir: "rtl" }, content: [{ type: "text", text: `بِسم اللہ ${"سلام\u200cعلی عبادت ".repeat(80)}` }] },
          { type: "pageBreak" },
          { type: "paragraph", attrs: { dir: "rtl" }, content: [{ type: "text", text: `صفحہ دو ${"سلام\u200cعلی ".repeat(70)}` }] },
        ],
      },
    );

    await expect.poll(() => page.locator("[data-run-around-gap]").count(), { timeout: 15000 }).toBeGreaterThan(0);

    // Editor reference: the same Page-1 frame already wraps Nastaliq text on both sides without overlap.
    await expect.poll(() => page.evaluate(() => {
      const frame = document.querySelector('[data-studio-frame-id="p1-tight"]')!.getBoundingClientRect();
      const p = document.querySelector(".qalam-editor-content .ProseMirror p")!;
      let left = false, right = false, overlap = 0;
      const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
        if (!node.data.trim() || node.parentElement?.closest("[data-run-around-gap], [data-run-around-skip]")) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const r of range.getClientRects()) {
          if (r.width < 2 || r.height < 2 || r.bottom <= frame.top + 1 || r.top >= frame.bottom - 1) continue;
          if (r.right <= frame.left - 1) left = true;
          if (r.left >= frame.right + 1) right = true;
          if (r.right > frame.left + 2 && r.left < frame.right - 2) overlap += 1;
        }
      }
      return { left, right, overlap };
    }), { timeout: 15000 }).toEqual({ left: true, right: true, overlap: 0 });

    await stubWindowPrint(page);
    try {
      await page.locator('[data-menu-root="file"]').click();
      await page.locator('[data-menu-action="file.print"]').click();
      await expect.poll(() => page.evaluate(() => (window as Window & { __printCalled?: number }).__printCalled), { timeout: 15000 }).toBe(1);
      await expect(page.locator('[data-studio-print-portal][data-print-waited-fonts="true"]')).toHaveCount(1);

      // Screen-mode measurement portal must already have padding: 0px on .ProseMirror
      const screenPortalMetrics = await page.evaluate(() => {
        const pm = document.querySelector<HTMLElement>("[data-studio-print-portal] .ProseMirror")!;
        const cs = getComputedStyle(pm);
        return {
          pt: parseFloat(cs.paddingTop),
          pr: parseFloat(cs.paddingRight),
          pb: parseFloat(cs.paddingBottom),
          pl: parseFloat(cs.paddingLeft),
          editorPmPl: parseFloat(getComputedStyle(document.querySelector(".qalam-editor-content .ProseMirror")!).paddingLeft),
          leftMarginPx: Number(document.querySelector("[data-studio-print-root]")!.getAttribute("data-print-margin-left-mm")) * (96 / 25.4),
        };
      });
      expect(screenPortalMetrics.pt).toBe(0);
      expect(screenPortalMetrics.pr).toBe(0);
      expect(screenPortalMetrics.pb).toBe(0);
      expect(screenPortalMetrics.pl).toBe(0);
      // Normal document editor keeps its configured sheet margin padding (not an arbitrary threshold).
      expect(screenPortalMetrics.leftMarginPx).toBeGreaterThan(0);
      expect(Math.abs(screenPortalMetrics.editorPmPl - screenPortalMetrics.leftMarginPx)).toBeLessThan(1);

      // Switch Chromium into actual @media print mode and verify Page-1 geometry & zero collisions
      await page.emulateMedia({ media: "print" });
      const printMediaMetrics = await page.evaluate(() => {
        const portal = document.querySelector("[data-studio-print-portal]")!;
        const printPage = portal.querySelector<HTMLElement>("[data-studio-print-page]")!;
        const pm = portal.querySelector<HTMLElement>(".ProseMirror")!;
        const cs = getComputedStyle(pm);
        const pageWidthMm = Number(portal.getAttribute("data-print-page-width-mm") || 210);
        const leftMm = Number(document.querySelector("[data-studio-print-root]")?.getAttribute("data-print-margin-left-mm") || 25.4);
        const rightMm = Number(document.querySelector("[data-studio-print-root]")?.getAttribute("data-print-margin-right-mm") || 25.4);
        const pageBox = printPage.getBoundingClientRect();
        const pmBox = pm.getBoundingClientRect();
        const pxPerMm = pageBox.width / pageWidthMm;
        const expectedContentWidth = (pageWidthMm - leftMm - rightMm) * pxPerMm;

        // Frame 1 on Page 1 sits directly at printPage coordinates (in @media print printPage includes top/left padding via box-decoration-break / styles)
        const p1Frame = portal.querySelector('[data-print-frame-id="p1-tight"]')!.getBoundingClientRect();
        const p1Paragraph = pm.querySelectorAll("p")[0];
        let left = false;
        let right = false;
        let above = false;
        let collisions = 0;
        let minLeftGap = Infinity;
        let minRightGap = Infinity;
        const walker = document.createTreeWalker(p1Paragraph, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
          if (!node.data.trim() || node.parentElement?.closest("[data-print-run-around]")) continue;
          const range = document.createRange();
          range.selectNodeContents(node);
          for (const r of range.getClientRects()) {
            if (r.width < 2 || r.height < 2) continue;
            if (r.bottom <= p1Frame.top + 0.5) { above = true; continue; }
            if (r.top >= p1Frame.bottom - 0.5) continue;
            if (r.right <= p1Frame.left - 0.5) { left = true; minLeftGap = Math.min(minLeftGap, p1Frame.left - r.right); }
            if (r.left >= p1Frame.right + 0.5) { right = true; minRightGap = Math.min(minRightGap, r.left - p1Frame.right); }
            if (r.right > p1Frame.left + 1 && r.left < p1Frame.right - 1) collisions += 1;
          }
        }
        const topMm = Number(document.querySelector("[data-studio-print-root]")?.getAttribute("data-print-margin-top-mm") || 0);
        return {
          pt: parseFloat(cs.paddingTop),
          pr: parseFloat(cs.paddingRight),
          pb: parseFloat(cs.paddingBottom),
          pl: parseFloat(cs.paddingLeft),
          pmWidthDiff: Math.abs(pmBox.width - expectedContentWidth),
          pmTopDiffMm: Math.abs((pmBox.top - pageBox.top) / pxPerMm - topMm),
          frameTopDiffMm: Math.abs((p1Frame.top - pageBox.top) / pxPerMm - 36),
          frameLeftDiffMm: Math.abs((p1Frame.left - pageBox.left) / pxPerMm - 84),
          minLeftGapMm: minLeftGap / pxPerMm,
          minRightGapMm: minRightGap / pxPerMm,
          above,
          left,
          right,
          collisions,
          p2Present: portal.querySelectorAll('[data-print-frame-id="p2-after-break"]').length,
        };
      });
      await page.emulateMedia({ media: "screen" });

      expect(printMediaMetrics.pt).toBe(0);
      expect(printMediaMetrics.pr).toBe(0);
      expect(printMediaMetrics.pb).toBe(0);
      expect(printMediaMetrics.pl).toBe(0);
      expect(printMediaMetrics.pmWidthDiff).toBeLessThan(4);
      // Vertical alignment: text column starts at the top margin and the frame sits at its page-local mm.
      expect(printMediaMetrics.pmTopDiffMm).toBeLessThan(0.5);
      expect(printMediaMetrics.frameTopDiffMm).toBeLessThan(0.5);
      expect(printMediaMetrics.frameLeftDiffMm).toBeLessThan(0.5);
      expect(printMediaMetrics.above).toBe(true);
      expect(printMediaMetrics.left).toBe(true);
      expect(printMediaMetrics.right).toBe(true);
      expect(printMediaMetrics.collisions).toBe(0);
      // Balanced default clearance (2.5mm) is preserved: comfortable margin on both sides, no overlap, and no phantom padding shift.
      expect(printMediaMetrics.minLeftGapMm).toBeGreaterThanOrEqual(1.5);
      expect(printMediaMetrics.minRightGapMm).toBeGreaterThanOrEqual(1.5);
      expect(printMediaMetrics.minLeftGapMm).toBeLessThan(4.5);
      // Right lane is ragged on its left edge in non-justified RTL, so clearance + at most one whole Urdu word (~10mm).
      expect(printMediaMetrics.minRightGapMm).toBeLessThan(14);
      expect(printMediaMetrics.p2Present).toBe(1);
    } finally {
      await page.emulateMedia({ media: "screen" });
      await restoreWindowPrint(page);
    }
  });

  test("H3: clamps Single Pages and Facing Pages resize to owning page and unprojects Facing Pages drawing with Undo/Redo", async ({ page }) => {
    test.setTimeout(120000);
    await open(page);
    await seedFramesAndDoc(
      page,
      [
        { id: "tall-p1", kind: "picture-rect", page: 1, xMm: 40, yMm: 220, wMm: 45, hMm: 40, flip: false, text: "", runAround: true },
        { id: "p2-facing", kind: "rect", page: 2, xMm: 30, yMm: 40, wMm: 50, hMm: 35, flip: false, text: "", runAround: true },
      ],
      {
        type: "doc",
        content: Array.from({ length: 34 }, (_, i) => ({
          type: "paragraph",
          attrs: { dir: "rtl" },
          content: [{ type: "text", text: `حصہ ${i} ${"سلام\u200cعلی ".repeat(24)}` }],
        })),
      },
    );

    await expect.poll(() => page.locator("[data-studio-page-paper]").count(), { timeout: 15000 }).toBeGreaterThan(1);
    await page.locator('[data-studio-zoom-control]').selectOption("50");
    await page.locator('[data-studio-tool-button="select"]').click();

    // 1. Single Pages: drag south handle of tall-p1 past bottom of Page 1 into Page 2 gap -> stays on Page 1 with valid clamped hMm!
    const tallLocator = page.locator('[data-studio-frame-id="tall-p1"]');
    await tallLocator.scrollIntoViewIfNeeded();
    await tallLocator.click();
    const sHandle = tallLocator.locator('[data-studio-frame-handle="s"]');
    const sBox = (await sHandle.boundingBox())!;
    const paper1 = (await page.locator('[data-studio-page-paper="1"]').boundingBox())!;
    const paper2 = (await page.locator('[data-studio-page-paper="2"]').boundingBox())!;
    const dragDown = Math.round(paper2.y - sBox.y + 80);
    await page.mouse.move(sBox.x + sBox.width / 2, sBox.y + sBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(sBox.x + sBox.width / 2, sBox.y + sBox.height / 2 + dragDown, { steps: 6 });
    await page.mouse.up();

    await expect.poll(async () => Number((await storedFrame(page, "tall-p1"))?.hMm), { timeout: 10000 }).toBeGreaterThan(60);
    const resizedSingle = await storedFrame(page, "tall-p1");
    expect(resizedSingle?.page).toBe(1);
    expect(Number(resizedSingle?.yMm)).toBeGreaterThanOrEqual(0);
    expect(Number(resizedSingle?.yMm) + Number(resizedSingle?.hMm)).toBeLessThanOrEqual(297.5);
    expect((await tallLocator.boundingBox())!.y + (await tallLocator.boundingBox())!.height).toBeLessThanOrEqual(paper1.y + paper1.height + 3);

    // Undo restores hMm ~ 40, Redo restores clamped height
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press("Control+z");
    await expect.poll(async () => Number((await storedFrame(page, "tall-p1"))?.hMm), { timeout: 10000 }).toBeLessThan(45);
    await page.keyboard.press("Control+Shift+z");
    await expect.poll(async () => Number((await storedFrame(page, "tall-p1"))?.hMm), { timeout: 10000 }).toBeGreaterThan(60);

    // 2. Facing Pages: switch to view.facing and draw a new Picture Box on Page 1 -> rendered rect matches drawn pointer coordinates!
    await page.locator('[data-menu-root="view"]').click();
    await page.locator('[data-menu-action="view.facing"]').click();
    await expect(page.locator("[data-studio-view]")).toHaveAttribute("data-studio-view", "facing");
    await expect(page.locator(".ProseMirror [data-facing-projected]").first()).toBeVisible({ timeout: 15000 });

    const facingPaper1 = (await page.locator('[data-studio-page-paper="1"]').boundingBox())!;
    const beforeIds = new Set((await allStoredFrames(page)).map((f) => String(f.id)));
    await page.locator('[data-studio-tool-button="cross-square"]').click();
    const startX = facingPaper1.x + facingPaper1.width * 0.25;
    const startY = facingPaper1.y + facingPaper1.height * 0.25;
    const drawW = 80;
    const drawH = 55;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + drawW, startY + drawH, { steps: 5 });
    await page.mouse.up();

    let createdId = "";
    await expect.poll(async () => {
      const added = (await allStoredFrames(page)).find((f) => !beforeIds.has(String(f.id)));
      if (added) createdId = String(added.id);
      return createdId;
    }, { timeout: 10000 }).not.toBe("");

    const createdRecord = await storedFrame(page, createdId);
    expect(createdRecord?.page).toBe(1);
    const createdEl = page.locator(`[data-studio-frame-id="${createdId}"]`);
    const createdBox = (await createdEl.boundingBox())!;
    expect(Math.abs(createdBox.x - startX)).toBeLessThan(8);
    expect(Math.abs(createdBox.y - startY)).toBeLessThan(8);

    // 3. Draw & resize a singleLine Title Text Box in Facing Pages on Page 1
    await page.locator('[data-studio-tool-button="title-text"]').click();
    const titleStartX = facingPaper1.x + facingPaper1.width * 0.2;
    const titleStartY = facingPaper1.y + facingPaper1.height * 0.14;
    await page.mouse.move(titleStartX, titleStartY);
    await page.mouse.down();
    await page.mouse.move(titleStartX + 70, titleStartY, { steps: 4 });
    await page.mouse.up();

    let titleId = "";
    await expect.poll(async () => {
      const added = (await allStoredFrames(page)).find((f) => !beforeIds.has(String(f.id)) && f.id !== createdId);
      if (added) titleId = String(added.id);
      return titleId;
    }, { timeout: 10000 }).not.toBe("");
    const titleInitial = await storedFrame(page, titleId);
    expect(titleInitial?.page).toBe(1);

    await page.locator('[data-studio-tool-button="select"]').click();
    await page.locator(`[data-studio-frame-id="${titleId}"]`).click();
    const titleEast = page.locator(`[data-studio-frame-id="${titleId}"] [data-studio-frame-handle="e"]`);
    const titleEastBox = (await titleEast.boundingBox())!;
    await page.mouse.move(titleEastBox.x + titleEastBox.width / 2, titleEastBox.y + titleEastBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(titleEastBox.x + 50, titleEastBox.y, { steps: 4 });
    await page.mouse.up();
    await expect.poll(async () => Number((await storedFrame(page, titleId))?.wMm), { timeout: 10000 }).toBeGreaterThan(Number(titleInitial?.wMm) + 10);
    const titleResized = await storedFrame(page, titleId);
    expect(Math.abs(Number(titleResized?.xMm) - Number(titleInitial?.xMm))).toBeLessThan(2);

    // 4. Resize Page-2 Facing Pages frame west handle past spread spine -> stays on Page 2, xMm >= 0
    const p2Locator = page.locator('[data-studio-frame-id="p2-facing"]');
    await p2Locator.scrollIntoViewIfNeeded();
    await p2Locator.click();
    const p2West = p2Locator.locator('[data-studio-frame-handle="w"]');
    const p2WestBox = (await p2West.boundingBox())!;
    await page.mouse.move(p2WestBox.x + p2WestBox.width / 2, p2WestBox.y + p2WestBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(p2WestBox.x - 160, p2WestBox.y, { steps: 5 });
    await page.mouse.up();

    await expect.poll(async () => Number((await storedFrame(page, "p2-facing"))?.xMm), { timeout: 10000 }).toBeLessThan(2);
    const p2After = await storedFrame(page, "p2-facing");
    expect(p2After?.page).toBe(2);
    expect(Number(p2After?.xMm)).toBeGreaterThanOrEqual(0);
    expect(await page.evaluate(() => window.getSelection()?.isCollapsed ?? true)).toBe(true);

    // Undo restores Page-2 west-handle resize in one logical step, Redo reapplies it
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press("Control+z");
    await expect.poll(async () => Number((await storedFrame(page, "p2-facing"))?.xMm), { timeout: 10000 }).toBeGreaterThan(25);
    await page.keyboard.press("Control+Shift+z");
    await expect.poll(async () => Number((await storedFrame(page, "p2-facing"))?.xMm), { timeout: 10000 }).toBeLessThan(2);

    // 5. Resize Page-2 Facing Pages frame east handle -> grows width without shifting xMm or leaving Page 2
    const p2East = p2Locator.locator('[data-studio-frame-handle="e"]');
    const p2EastBox = (await p2East.boundingBox())!;
    const wBeforeEast = Number((await storedFrame(page, "p2-facing"))?.wMm);
    await page.mouse.move(p2EastBox.x + p2EastBox.width / 2, p2EastBox.y + p2EastBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(p2EastBox.x + 60, p2EastBox.y, { steps: 4 });
    await page.mouse.up();

    await expect.poll(async () => Number((await storedFrame(page, "p2-facing"))?.wMm), { timeout: 10000 }).toBeGreaterThan(wBeforeEast + 15);
    const p2AfterEast = await storedFrame(page, "p2-facing");
    expect(p2AfterEast?.page).toBe(2);
    expect(Number(p2AfterEast?.xMm)).toBeLessThan(2);
    expect(Number(p2AfterEast?.xMm) + Number(p2AfterEast?.wMm)).toBeLessThanOrEqual(210.5);
  });

  test("M2: keeps Page-2 frames visible when story shrinks to 1 page and collapses Page 2 once frame is removed", async ({ page }) => {
    test.setTimeout(120000);
    await open(page);
    await seedFramesAndDoc(
      page,
      [
        { id: "p1-trigger", kind: "picture-rect", page: 1, xMm: 62, yMm: 95, wMm: 86, hMm: 78, flip: false, text: "", runAround: true },
        { id: "p2-kept", kind: "rect", page: 2, xMm: 50, yMm: 45, wMm: 60, hMm: 36, flip: false, text: "", runAround: false },
      ],
      {
        type: "doc",
        content: Array.from({ length: 8 }, (_, i) => ({
          type: "paragraph",
          attrs: { dir: "rtl" },
          content: [{ type: "text", text: `${i === 0 ? "بِسم اللہ " : ""}${"سلام\u200cعلی ".repeat(14)}` }],
        })),
      },
    );

    // Even when short story fits easily on Page 1, Page 2 remains alive because p2-kept sits on Page 2
    await expect(page.locator("[data-studio-page-paper]")).toHaveCount(2, { timeout: 15000 });
    const p2Frame = page.locator('[data-studio-frame-id="p2-kept"]');
    await p2Frame.scrollIntoViewIfNeeded();
    await expect(p2Frame).toBeVisible();

    // Facing Pages must NOT clip p2-kept off when story is 1 page long
    await page.locator('[data-menu-root="view"]').click();
    await page.locator('[data-menu-action="view.facing"]').click();
    await expect(page.locator("[data-studio-view]")).toHaveAttribute("data-studio-view", "facing");
    await expect(page.locator("[data-studio-page-paper]")).toHaveCount(2);
    await p2Frame.scrollIntoViewIfNeeded();
    await expect(p2Frame).toBeVisible();

    // Selecting and deleting p2-kept removes the last Page-2 object -> trailing empty Page 2 collapses to 1 page!
    await page.locator('[data-studio-tool-button="select"]').click();
    await p2Frame.click();
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press("Delete");
    await expect(p2Frame).toHaveCount(0);
    await expect.poll(() => page.locator("[data-studio-page-paper]").count(), { timeout: 15000 }).toBe(1);
  });
});
