import { expect, test, type Page } from "@playwright/test";

const words = ["عبادت", "انسان", "معرفت", "محبت", "سلام", "زندگی", "بندگی"];
const line = `${"عبادت، انسان، معرفت، محبت، سلام، زندگی، بندگی ".repeat(6)}`;

const frames = [
  { id: "pic-page1", kind: "picture-rect", page: 1, xMm: 58, yMm: 42, wMm: 40, hMm: 34, flip: false, text: "", runAround: true, runAroundLeftMm: 1, runAroundRightMm: 2, runAroundTopMm: 0.4, runAroundBottomMm: 0.8 },
  { id: "pic-page2", kind: "picture-rect", page: 2, xMm: 58, yMm: 32, wMm: 34, hMm: 30, flip: false, text: "", runAround: true, runAroundLeftMm: 1, runAroundRightMm: 4, runAroundTopMm: 0.5, runAroundBottomMm: 1 },
  { id: "text-page2", kind: "text", page: 2, xMm: 126, yMm: 32, wMm: 34, hMm: 28, flip: false, text: "دوسرا خانہ", runAround: true, runAroundLeftMm: 2, runAroundRightMm: 3, runAroundTopMm: 0.4, runAroundBottomMm: 1.2 },
];

async function open(page: Page) {
  await page.addInitScript(() => localStorage.setItem("qalam-site-language", "en"));
  await page.goto("/tools/document-studio");
  await expect(page.locator(".ProseMirror")).toBeEditable({ timeout: 45000 });
  await expect.poll(() => page.evaluate(() => localStorage.getItem("qalam-document-studio-active-document-v1")), { timeout: 20000 }).not.toBeNull();
}

async function seed(page: Page) {
  await page.evaluate(next => {
    const id = localStorage.getItem("qalam-document-studio-active-document-v1")!;
    const map = JSON.parse(localStorage.getItem("qalam-studio-frames-v1") || "{}") as Record<string, unknown>;
    map[id] = next;
    localStorage.setItem("qalam-studio-frames-v1", JSON.stringify(map));
  }, frames);
  await page.reload();
  await expect(page.locator(".ProseMirror")).toHaveAttribute("data-studio-font-layout", "ready", { timeout: 25000 });
  await page.locator(".ProseMirror").click();
  await page.locator(".ProseMirror").evaluate((root, text) => {
    const editor = (root as HTMLElement & { editor: { commands: { setContent: (doc: unknown) => void; focus: (at: string) => void } } }).editor;
    editor.commands.setContent({
      type: "doc",
      content: Array.from({ length: 32 }, (_, index) => ({
        type: "paragraph",
        attrs: { dir: "rtl" },
        content: [{ type: "text", text: `حصہ${index} ${text}` }],
      })),
    });
    editor.commands.focus("start");
  }, line);
  await expect(page.locator(".ProseMirror")).toContainText("حصہ0");
  await expect(page.locator("[data-document-page-break]")).toHaveCount(0);
  await expect.poll(() => page.locator("[data-studio-page-paper]").count(), { timeout: 20000 }).toBeGreaterThan(1);
  await expect.poll(() => page.locator("[data-run-around-gap]").count(), { timeout: 20000 }).toBeGreaterThan(0);
}

async function sides(page: Page, id: string) {
  return page.evaluate(frameId => {
    const frame = document.querySelector(`[data-studio-frame-id="${frameId}"]`)?.getBoundingClientRect();
    if (!frame) return { left: false, right: false };
    const root = document.querySelector(".ProseMirror");
    if (!root) return { left: false, right: false };
    let left = false;
    let right = false;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
      if (!node.data.trim()) continue;
      if (node.parentElement?.closest("[data-studio-frame-id], [data-run-around-gap], [data-run-around-skip]")) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const rect of range.getClientRects()) {
        if (rect.width < 2 || rect.height < 2) continue;
        if (rect.bottom <= frame.top + 1 || rect.top >= frame.bottom - 1) continue;
        if (rect.right <= frame.left - 1) left = true;
        if (rect.left >= frame.right + 1) right = true;
      }
    }
    return { left, right };
  }, id);
}

async function beside(page: Page, id: string) {
  return page.evaluate(frameId => {
    const frame = document.querySelector(`[data-studio-frame-id="${frameId}"]`)?.getBoundingClientRect();
    if (!frame) return "";
    const root = document.querySelector(".ProseMirror");
    if (!root) return "";
    const parts: string[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
      if (!node.data.trim()) continue;
      if (node.parentElement?.closest("[data-studio-frame-id], [data-run-around-gap], [data-run-around-skip]")) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const rect of range.getClientRects()) {
        const midY = (rect.top + rect.bottom) / 2;
        if (rect.width < 2 || midY <= frame.top + 1 || midY >= frame.bottom - 1) continue;
        parts.push(node.data);
        break;
      }
    }
    return parts.join("");
  }, id);
}

async function wordFaults(page: Page, ids: string[]) {
  return page.evaluate(({ ids: frameIds, words: list }) => {
    const failures: string[] = [];
    const root = document.querySelector(".ProseMirror");
    if (!root) return ["missing story"];
    for (const id of frameIds) {
      const frame = document.querySelector(`[data-studio-frame-id="${id}"]`)?.getBoundingClientRect();
      if (!frame) { failures.push(`${id} missing`); continue; }
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
        if (node.parentElement?.closest("[data-studio-frame-id], [data-run-around-gap], [data-run-around-skip]")) continue;
        for (const word of list) {
          let from = 0;
          while (from < node.data.length) {
            const at = node.data.indexOf(word, from);
            if (at < 0) break;
            const range = document.createRange();
            range.setStart(node, at);
            range.setEnd(node, at + word.length);
            const rects = [...range.getClientRects()].filter(rect => rect.width > 1 && rect.height > 1);
            const besideRects = rects.filter(rect => {
              const midY = (rect.top + rect.bottom) / 2;
              return midY > frame.top + 1 && midY < frame.bottom - 1;
            });
            const sides = new Set(besideRects.map(rect => {
              const mid = (rect.left + rect.right) / 2;
              if (mid <= frame.left + 1) return "left";
              if (mid >= frame.right - 1) return "right";
              return "over";
            }));
            if (sides.has("over") || sides.size > 1) failures.push(`${id}:${word}:${[...sides].join("+")}`);
            if (new Set(besideRects.map(rect => Math.round(rect.top / 2))).size > 1) failures.push(`${id}:${word}:split-line`);
            from = at + word.length;
          }
        }
      }
    }
    return failures;
  }, { ids, words });
}

async function paperGaps(page: Page, paper: string) {
  return page.evaluate(number => {
    const sheet = document.querySelector(`[data-studio-page-paper="${number}"]`)?.getBoundingClientRect();
    if (!sheet) return "";
    return [...document.querySelectorAll("[data-run-around-gap], [data-run-around-break]")].flatMap(el => {
      const rect = el.getBoundingClientRect();
      if (rect.top < sheet.top - 2 || rect.top > sheet.bottom + 2) return [];
      const kind = el.hasAttribute("data-run-around-gap") ? "g" : "b";
      return [`${kind}${Math.round(rect.left - sheet.left)}:${Math.round(rect.top - sheet.top)}`];
    }).join("|");
  }, paper);
}

async function drag(page: Page, id: string, dx: number, dy: number) {
  await page.locator('[data-studio-tool-button="select"]').click();
  const box = page.locator(`[data-studio-frame-id="${id}"]`);
  await box.evaluate(el => el.scrollIntoView({ block: "center", inline: "nearest" }));
  const start = await box.boundingBox();
  expect(start).toBeTruthy();
  const x = start!.x + start!.width / 2;
  const y = start!.y + start!.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 6 });
  await page.mouse.up();
}

async function resizeSouth(page: Page, id: string, dy: number) {
  await page.locator('[data-studio-tool-button="select"]').click();
  const frame = page.locator(`[data-studio-frame-id="${id}"]`);
  await frame.evaluate(el => el.scrollIntoView({ block: "center", inline: "nearest" }));
  await frame.click();
  const handle = frame.locator('[data-studio-frame-handle="s"]');
  await expect(handle).toBeVisible();
  const start = await handle.boundingBox();
  expect(start).toBeTruthy();
  const x = start!.x + start!.width / 2;
  const y = start!.y + start!.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + dy, { steps: 6 });
  await page.mouse.up();
}

test("page-1 run around changes the text that page 2 wraps", async ({ page }) => {
  test.setTimeout(180000);
  const messages: string[] = [];
  page.on("console", message => {
    if (/hydration|did not match/i.test(message.text())) messages.push(message.text());
  });
  await open(page);
  await seed(page);
  expect(await sides(page, "pic-page1")).toEqual({ left: true, right: true });
  await page.locator('[data-studio-frame-id="pic-page2"]').scrollIntoViewIfNeeded();
  expect(await sides(page, "pic-page2")).toEqual({ left: true, right: true });
  expect(await sides(page, "text-page2")).toEqual({ left: true, right: true });
  expect(await wordFaults(page, ["pic-page1", "pic-page2", "text-page2"])).toEqual([]);
  const arrived = await beside(page, "pic-page2");
  expect(arrived.length).toBeGreaterThan(12);
  expect(arrived).toMatch(/عبادت|انسان|معرفت|محبت|سلام|زندگی|بندگی/);

  const pageOneBefore = await paperGaps(page, "1");
  expect(pageOneBefore.length).toBeGreaterThan(0);
  await drag(page, "pic-page1", 24, 30);
  await expect.poll(() => page.locator("[data-run-around-gap]").count(), { timeout: 15000 }).toBeGreaterThan(0);
  await page.locator('[data-studio-frame-id="pic-page2"]').scrollIntoViewIfNeeded();
  const arrivedAfterMove = await beside(page, "pic-page2");
  expect(arrivedAfterMove).not.toBe(arrived);
  expect(await sides(page, "pic-page2")).toEqual({ left: true, right: true });
  expect(await wordFaults(page, ["pic-page1", "pic-page2", "text-page2"])).toEqual([]);

  const beforeH = await page.evaluate(() => {
    const doc = localStorage.getItem("qalam-document-studio-active-document-v1");
    const map = JSON.parse(localStorage.getItem("qalam-studio-frames-v1") || "{}") as Record<string, Array<Record<string, number>>>;
    return doc ? map[doc]?.find(frame => frame.id === "pic-page1")?.hMm : undefined;
  });
  await resizeSouth(page, "pic-page1", 80);
  await expect.poll(async () => page.evaluate(() => {
    const doc = localStorage.getItem("qalam-document-studio-active-document-v1");
    const map = JSON.parse(localStorage.getItem("qalam-studio-frames-v1") || "{}") as Record<string, Array<Record<string, number>>>;
    return doc ? map[doc]?.find(frame => frame.id === "pic-page1")?.hMm : undefined;
  }), { timeout: 8000 }).toBeGreaterThan(Number(beforeH) + 2);
  await page.locator('[data-studio-frame-id="text-page2"]').scrollIntoViewIfNeeded();
  expect(await sides(page, "text-page2")).toEqual({ left: true, right: true });
  expect(await wordFaults(page, ["pic-page2", "text-page2"])).toEqual([]);

  const pageOneSettled = await paperGaps(page, "1");
  await drag(page, "pic-page2", 20, 16);
  await resizeSouth(page, "text-page2", 24);
  await page.locator('[data-studio-frame-id="pic-page1"]').scrollIntoViewIfNeeded();
  expect(await paperGaps(page, "1")).toBe(pageOneSettled);
  expect(await sides(page, "pic-page2")).toEqual({ left: true, right: true });
  expect(await sides(page, "text-page2")).toEqual({ left: true, right: true });

  await page.locator('[data-menu-root="view"]').click();
  await page.locator('[data-menu-action="view.pageless"]').click();
  await expect(page.locator("[data-studio-pageless]")).toBeVisible();
  await page.locator('[data-studio-frame-id="pic-page2"]').scrollIntoViewIfNeeded();
  expect(await sides(page, "pic-page1")).toEqual({ left: true, right: true });
  expect(await sides(page, "pic-page2")).toEqual({ left: true, right: true });
  expect(await sides(page, "text-page2")).toEqual({ left: true, right: true });
  expect(await wordFaults(page, ["pic-page1", "pic-page2", "text-page2"])).toEqual([]);

  await page.locator('[data-menu-root="view"]').click();
  await page.locator('[data-menu-action="view.pages"]').click();
  await expect(page.locator("[data-studio-page-paper]").nth(1)).toBeVisible();
  await page.locator('[data-studio-frame-id="text-page2"]').scrollIntoViewIfNeeded();
  expect(await sides(page, "pic-page2")).toEqual({ left: true, right: true });
  expect(await sides(page, "text-page2")).toEqual({ left: true, right: true });
  expect(await wordFaults(page, ["pic-page2", "text-page2"])).toEqual([]);

  await page.evaluate(() => { window.print = () => undefined; });
  await page.locator('[data-menu-root="file"]').click();
  await page.locator('[data-menu-action="file.print"]').click();
  const portal = page.locator("[data-studio-print-portal]");
  await expect(portal).toHaveAttribute("data-print-waited-fonts", "true", { timeout: 15000 });
  await expect(portal.locator('[data-print-frame-id="pic-page2"]')).toHaveCount(1);
  await expect(portal.locator('[data-print-frame-id="text-page2"]')).toHaveCount(1);
  await expect.poll(() => portal.locator("[data-print-run-around]").count()).toBeGreaterThan(0);
  expect(messages, messages.join("\n")).toEqual([]);
});
