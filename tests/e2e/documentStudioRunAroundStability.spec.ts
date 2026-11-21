import { expect, test, type Page } from "@playwright/test";

const words = ["عبادت", "انسان", "معرفت", "محبت", "سلام", "زندگی", "بندگی"];
const story = `بِسم اللہ ${"عبادت، انسان، معرفت، محبت، سلام، زندگی، بندگی ".repeat(48)} Hello 2026 عبادت،`;

const dragFrames = [
  { id: "pic-drag", kind: "picture-rect", page: 1, xMm: 72, yMm: 48, wMm: 36, hMm: 30, flip: false, text: "", runAround: true, runAroundLeftMm: 1, runAroundRightMm: 2, runAroundTopMm: 0.4, runAroundBottomMm: 0.8 },
  { id: "text-drag", kind: "text", page: 1, xMm: 78, yMm: 96, wMm: 34, hMm: 22, flip: false, text: "خانہ", runAround: true, runAroundLeftMm: 1.5, runAroundRightMm: 1.5, runAroundTopMm: 0.4, runAroundBottomMm: 0.8 },
];

const narrowFrames = [
  { id: "pic-narrow", kind: "picture-rect", page: 1, xMm: 28, yMm: 42, wMm: 150, hMm: 32, flip: false, text: "", runAround: true, runAroundLeftMm: 0.5, runAroundRightMm: 0.5, runAroundTopMm: 0.3, runAroundBottomMm: 0.6 },
  { id: "text-narrow", kind: "text", page: 1, xMm: 36, yMm: 88, wMm: 140, hMm: 24, flip: false, text: "تنگ", runAround: true, runAroundLeftMm: 0.5, runAroundRightMm: 0.5, runAroundTopMm: 0.3, runAroundBottomMm: 0.6 },
];

async function open(page: Page) {
  await page.addInitScript(() => localStorage.setItem("qalam-site-language", "en"));
  await page.goto("/tools/document-studio");
  await expect(page.locator(".ProseMirror")).toBeEditable({ timeout: 45000 });
  await expect.poll(() => page.evaluate(() => localStorage.getItem("qalam-document-studio-active-document-v1")), { timeout: 20000 }).not.toBeNull();
}

async function seed(page: Page, frames: unknown[]) {
  await page.evaluate(next => {
    const id = localStorage.getItem("qalam-document-studio-active-document-v1")!;
    const map = JSON.parse(localStorage.getItem("qalam-studio-frames-v1") || "{}") as Record<string, unknown>;
    map[id] = next;
    localStorage.setItem("qalam-studio-frames-v1", JSON.stringify(map));
  }, frames);
  await page.reload();
  await expect(page.locator(".ProseMirror")).toHaveAttribute("data-studio-font-layout", "ready", { timeout: 25000 });
  await page.locator(".ProseMirror").click();
  await page.keyboard.insertText(story);
  await expect(page.locator(".ProseMirror")).toContainText("عبادت");
  await expect.poll(() => page.locator("[data-run-around-gap], [data-run-around-break], [data-run-around-skip]").count(), { timeout: 15000 }).toBeGreaterThan(0);
}

async function signature(page: Page) {
  return page.evaluate(() => [...document.querySelectorAll("[data-run-around-gap], [data-run-around-break], [data-run-around-skip]")].map(el => {
    const rect = el.getBoundingClientRect();
    const kind = el.hasAttribute("data-run-around-gap") ? "g" : el.hasAttribute("data-run-around-break") ? "b" : "s";
    return `${kind}${Math.round(rect.left)}:${Math.round(rect.top)}:${Math.round(rect.width)}`;
  }).join("|"));
}

/** After the pointer stops, the wrap may correct once. It must not alternate. */
async function expectSettled(page: Page) {
  const seen: string[] = [];
  for (let i = 0; i < 6; i += 1) {
    await page.waitForTimeout(50);
    seen.push(await signature(page));
  }
  expect(new Set(seen.slice(2)).size, seen.join("\n")).toBeLessThanOrEqual(1);
}

async function drag(page: Page, id: string, dx: number, steps: number, pause: boolean) {
  await page.locator('[data-studio-tool-button="select"]').click();
  const box = page.locator(`[data-studio-frame-id="${id}"]`);
  await box.evaluate(el => el.scrollIntoView({ block: "center", inline: "nearest" }));
  const start = await box.boundingBox();
  expect(start).toBeTruthy();
  const x = start!.x + start!.width / 2;
  const y = start!.y + start!.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let step = 1; step <= steps; step += 1) {
    await page.mouse.move(x + (dx * step) / steps, y, { steps: pause ? 4 : 1 });
    if (pause) await expectSettled(page);
  }
  await page.mouse.up();
  await expectSettled(page);
}

test("dragging an image box and a text box settles instead of oscillating", async ({ page }) => {
  test.setTimeout(180000);
  await open(page);
  await seed(page, dragFrames);
  await expectSettled(page);
  await drag(page, "pic-drag", 48, 6, true);
  await drag(page, "pic-drag", -36, 2, false);
  await drag(page, "text-drag", 40, 5, true);
  await drag(page, "text-drag", -28, 2, false);
  expect(await page.locator("[data-run-around-gap], [data-run-around-break]").count()).toBeGreaterThan(0);
});

test("Urdu words stay whole beside narrow image and text boxes", async ({ page }) => {
  test.setTimeout(120000);
  await open(page);
  await seed(page, narrowFrames);
  const broken = await page.evaluate(list => {
    const failures: string[] = [];
    const root = document.querySelector(".ProseMirror");
    if (!root) return ["missing story"];
    for (const id of ["pic-narrow", "text-narrow"]) {
      const frame = document.querySelector(`[data-studio-frame-id="${id}"]`)?.getBoundingClientRect();
      if (!frame) {
        failures.push(`${id} missing`);
        continue;
      }
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
            // A line below the object can still graze its box. Only ink whose
            // vertical center sits beside the object can be split around it.
            const beside = rects.filter(rect => {
              const midY = (rect.top + rect.bottom) / 2;
              return midY > frame.top + 1 && midY < frame.bottom - 1;
            });
            const sides = new Set(beside.map(rect => {
              const mid = (rect.left + rect.right) / 2;
              if (mid <= frame.left + 1) return "left";
              if (mid >= frame.right - 1) return "right";
              return "over";
            }));
            if (sides.has("over") || sides.size > 1) {
              failures.push(`${id}:${word}:${[...sides].join("+")} ${beside.map(rect => `${Math.round(rect.left)},${Math.round(rect.top)},${Math.round(rect.width)}x${Math.round(rect.height)}`).join(" ")}`);
            }
            const tops = new Set(beside.map(rect => Math.round(rect.top / 2)));
            if (tops.size > 1) failures.push(`${id}:${word}:split-line`);
            from = at + word.length;
          }
        }
      }
    }
    return failures;
  }, words);
  expect(broken).toEqual([]);
  await expect(page.locator(".ProseMirror")).toContainText("Hello 2026");
  await expect(page.locator(".ProseMirror")).toContainText("عبادت،");
});
