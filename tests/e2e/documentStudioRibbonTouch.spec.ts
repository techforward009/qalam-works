import { expect, test, type Page } from "@playwright/test";

const NAMES = ["style", "leading-icon", "leading", "english-font", "bold", "italic", "size", "tracking-icon", "tracking", "tabs", "language", "align-left", "align-right", "align-center", "align-justify", "align-full", "interline-icon", "gap", "urdu-font", "ltr", "rtl", "colour", "scale-icon", "scale", "outline", "text-style", "kashida"];

async function swipe(page: Page, y: number, fromX: number, toX: number) {
  const client = await page.context().newCDPSession(page);
  await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: fromX, y, id: 0 }] });
  const steps = 12;
  for (let i = 1; i <= steps; i += 1) {
    const x = fromX + ((toX - fromX) * i) / steps;
    await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y, id: 0 }] });
  }
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await client.detach();
}

async function scrollLeftOfRibbon(page: Page) {
  return page.evaluate(() => {
    const toolbar = document.querySelector("[data-studio-toolbar]");
    let node = toolbar?.parentElement ?? null;
    while (node) {
      if (node.scrollWidth > node.clientWidth + 8) return node.scrollLeft;
      node = node.parentElement;
    }
    return -1;
  });
}

test.describe("mobile ribbon touch", () => {
  for (const width of [393, 360]) {
    test(`every control is reachable by touch at ${width}px`, async ({ page }, info) => {
      test.skip(info.project.name !== "mobile-android", "real touch swipe is covered on the mobile project");
      test.setTimeout(90_000);
      await page.setViewportSize({ width, height: 800 });
      await page.addInitScript(() => localStorage.setItem("qalam-site-language", "en"));
      await page.goto("/tools/document-studio", { waitUntil: "domcontentloaded" });
      await expect(page.locator(".ProseMirror")).toBeEditable();
      const bar = page.locator("[data-studio-chrome='toolbar']");
      await expect(bar).toBeVisible();
      const before = await scrollLeftOfRibbon(page);
      expect(before).toBeGreaterThanOrEqual(0);
      const box = await bar.boundingBox();
      expect(box).toBeTruthy();
      await swipe(page, Math.round(box!.y + box!.height / 2), Math.round(box!.x + box!.width - 24), Math.round(box!.x + 24));
      await expect.poll(() => scrollLeftOfRibbon(page)).toBeGreaterThan(before + 20);
      if (width === 393) await bar.screenshot({ path: "/workspace/qalam-toolbar-393.png" });
      for (const name of NAMES) {
        const control = page.locator(`[data-studio-geom='${name}']`);
        await expect.poll(async () => {
          const target = await control.boundingBox();
          const ribbon = await bar.boundingBox();
          if (!target || !ribbon) return false;
          const center = target.x + target.width / 2;
          const left = target.x;
          const right = target.x + target.width;
          const fits = target.width <= ribbon.width - 8;
          const inView = fits
            ? left >= ribbon.x + 1 && right <= ribbon.x + ribbon.width - 1
            : center >= ribbon.x + 8 && center <= ribbon.x + ribbon.width - 8;
          if (!inView) {
            const direction = left < ribbon.x ? 1 : -1;
            await swipe(page, Math.round(ribbon.y + ribbon.height / 2), Math.round(ribbon.x + ribbon.width / 2), Math.round(ribbon.x + ribbon.width / 2 + direction * Math.min(180, ribbon.width * 0.7)));
            return false;
          }
          return target.height >= 24 && target.width >= 24;
        }, { timeout: 15_000 }).toBe(true);
        const point = await control.boundingBox();
        expect(point).toBeTruthy();
        expect(point!.width).toBeGreaterThanOrEqual(24);
        expect(point!.height).toBeGreaterThanOrEqual(24);
        const hits = await page.evaluate(({ x, y, width, height }) => {
          const probe = (px: number, py: number) => {
            const node = document.elementFromPoint(px, py);
            return node?.closest("[data-studio-geom]")?.getAttribute("data-studio-geom") ?? "";
          };
          const left = Math.round(x) + 1;
          const right = Math.round(x + width) - 2;
          const top = Math.round(y) + 1;
          const bottom = Math.round(y + height) - 2;
          const midX = Math.round(x + width / 2);
          const midY = Math.round(y + height / 2);
          return [probe(midX, midY), probe(left, midY), probe(right, midY), probe(midX, top), probe(midX, bottom)];
        }, { x: point!.x, y: point!.y, width: point!.width, height: point!.height });
        for (const hit of hits) expect(hit, name).toBe(name);
        await page.touchscreen.tap(point!.x + point!.width / 2, point!.y + point!.height / 2);
      }
      const overlaps = await page.evaluate((names) => {
        const boxes = names.map((name) => {
          const node = document.querySelector(`[data-studio-geom='${name}']`);
          const rect = node?.getBoundingClientRect();
          return rect ? { name, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height } : null;
        }).filter((box): box is { name: string; left: number; right: number; top: number; bottom: number; width: number; height: number } => !!box);
        const hits: string[] = [];
        for (let i = 0; i < boxes.length; i += 1) {
          if (boxes[i].width < 24 || boxes[i].height < 24) hits.push(`${boxes[i].name} ${boxes[i].width.toFixed(1)}x${boxes[i].height.toFixed(1)}`);
          for (let j = i + 1; j < boxes.length; j += 1) {
            const w = Math.min(boxes[i].right, boxes[j].right) - Math.max(boxes[i].left, boxes[j].left);
            const h = Math.min(boxes[i].bottom, boxes[j].bottom) - Math.max(boxes[i].top, boxes[j].top);
            if (w > 0.5 && h > 0.5) hits.push(`${boxes[i].name}/${boxes[j].name}`);
          }
        }
        return hits;
      }, NAMES);
      expect(overlaps).toEqual([]);
    });
  }
});
