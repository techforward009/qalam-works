import { expect, test, type Page } from "@playwright/test";

const words = ["عبادت", "انسان", "معرفت", "محبت", "سلام", "زندگی", "بندگی", "سلام\u200cعلی", "زن\u200dدگی", "محب\u064et", "بندگی،"];

const narrowFrames = [
  { id: "pic-narrow", kind: "picture-rect", page: 1, xMm: 28, yMm: 42, wMm: 150, hMm: 32, flip: false, text: "", runAround: true, runAroundLeftMm: 0.5, runAroundRightMm: 0.5, runAroundTopMm: 0.3, runAroundBottomMm: 0.6 },
  { id: "text-narrow", kind: "text", page: 1, xMm: 36, yMm: 88, wMm: 140, hMm: 24, flip: false, text: "تنگ", runAround: true, runAroundLeftMm: 0.5, runAroundRightMm: 0.5, runAroundTopMm: 0.3, runAroundBottomMm: 0.6 },
];

function markedRun() {
  const plain = (text: string) => ({ type: "text", text });
  const bold = (text: string) => ({ type: "text", text, marks: [{ type: "bold" }] });
  const italic = (text: string) => ({ type: "text", text, marks: [{ type: "italic" }] });
  const both = (text: string) => ({ type: "text", text, marks: [{ type: "bold" }, { type: "italic" }] });
  return [
    plain("عب"), bold("ادت، "),
    plain("انس"), italic("ان، "),
    plain("م"), bold("عر"), italic("فت، "),
    plain("مح"), bold("بت، "),
    plain("سل"), italic("ام، "),
    plain("زن"), bold("دگی، "),
    plain("بن"), both("دگی، "),
    plain("سلام"), bold("\u200cعلی، "),
    plain("زن"), italic("\u200dدگی، "),
    plain("مح"), bold("ب\u064eت، "),
    plain("بندگی"), italic("، "),
  ];
}

async function open(page: Page) {
  await page.addInitScript(() => localStorage.setItem("qalam-site-language", "en"));
  await page.goto("/tools/document-studio");
  await expect(page.locator(".ProseMirror")).toBeEditable({ timeout: 45000 });
  await expect.poll(() => page.evaluate(() => localStorage.getItem("qalam-document-studio-active-document-v1")), { timeout: 20000 }).not.toBeNull();
}

test("a formatting boundary does not split an Urdu word", async ({ page }) => {
  test.setTimeout(120000);
  await open(page);
  await page.evaluate(next => {
    const id = localStorage.getItem("qalam-document-studio-active-document-v1")!;
    const map = JSON.parse(localStorage.getItem("qalam-studio-frames-v1") || "{}") as Record<string, unknown>;
    map[id] = next;
    localStorage.setItem("qalam-studio-frames-v1", JSON.stringify(map));
  }, narrowFrames);
  await page.reload();
  await expect(page.locator(".ProseMirror")).toHaveAttribute("data-studio-font-layout", "ready", { timeout: 25000 });
  await page.locator(".ProseMirror").click();
  const run = markedRun();
  await page.locator(".ProseMirror").evaluate((root, content) => {
    const editor = (root as HTMLElement & { editor: { commands: { setContent: (doc: unknown) => void; focus: (at: string) => void } } }).editor;
    editor.commands.setContent({
      type: "doc",
      content: [{ type: "paragraph", attrs: { dir: "rtl" }, content }],
    });
    editor.commands.focus("start");
  }, Array.from({ length: 28 }, () => run).flat());
  await expect(page.locator(".ProseMirror")).toContainText("عبادت");
  await expect(page.locator(".ProseMirror strong, .ProseMirror b")).not.toHaveCount(0);
  await expect(page.locator(".ProseMirror em, .ProseMirror i")).not.toHaveCount(0);
  await expect.poll(() => page.locator("[data-run-around-gap], [data-run-around-break], [data-run-around-skip]").count(), { timeout: 15000 }).toBeGreaterThan(0);

  const broken = await page.evaluate(list => {
    const failures: string[] = [];
    const root = document.querySelector(".ProseMirror");
    if (!root) return ["missing story"];
    const inline = new Set(["SPAN", "STRONG", "EM", "B", "I", "A", "U", "S", "SUB", "SUP", "MARK", "FONT", "BDI", "BDO"]);
    const runs: Text[][] = [];
    let current: Text[] = [];
    const flush = () => { if (current.length) { runs.push(current); current = []; } };
    const walk = (el: Node) => {
      for (const child of el.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) {
          if ((child as Text).data.length && !(child as Text).parentElement?.closest("[data-studio-frame-id], [data-run-around-gap], [data-run-around-skip]")) current.push(child as Text);
          continue;
        }
        if (child.nodeType !== Node.ELEMENT_NODE) continue;
        const tag = (child as Element).tagName;
        if (tag === "BR" || tag === "IMG") { flush(); continue; }
        if (!inline.has(tag)) { flush(); walk(child); flush(); continue; }
        walk(child);
      }
    };
    walk(root);
    flush();
    let crossed = 0;
    const point = (nodes: Text[], index: number) => {
      let cursor = 0;
      for (let i = 0; i < nodes.length; i += 1) {
        const len = nodes[i].data.length;
        if (index < cursor + len || i === nodes.length - 1) return { node: nodes[i], offset: Math.max(0, Math.min(len, index - cursor)) };
        cursor += len;
      }
      return { node: nodes[0], offset: 0 };
    };
    for (const id of ["pic-narrow", "text-narrow"]) {
      const frame = document.querySelector(`[data-studio-frame-id="${id}"]`)?.getBoundingClientRect();
      if (!frame) { failures.push(`${id} missing`); continue; }
      for (const runNodes of runs) {
        const text = runNodes.map(node => node.data).join("");
        if (runNodes.length > 1) crossed += 1;
        for (const word of list) {
          let from = 0;
          while (from < text.length) {
            const at = text.indexOf(word, from);
            if (at < 0) break;
            let boundary = false;
            let cursor = 0;
            for (let i = 0; i < runNodes.length - 1; i += 1) {
              cursor += runNodes[i].data.length;
              if (cursor > at && cursor < at + word.length) boundary = true;
            }
            if (!boundary) { from = at + word.length; continue; }
            const start = point(runNodes, at);
            const finish = point(runNodes, at + word.length);
            const range = document.createRange();
            range.setStart(start.node, start.offset);
            range.setEnd(finish.node, finish.offset);
            const rects = [...range.getClientRects()].filter(rect => rect.width > 1 && rect.height > 1);
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
              failures.push(`${id}:${word}:${[...sides].join("+")} ${beside.map(rect => `${Math.round(rect.left)},${Math.round(rect.top)}`).join(" ")}`);
            }
            const tops = new Set(beside.map(rect => Math.round(rect.top / 2)));
            if (tops.size > 1) failures.push(`${id}:${word}:split-line`);
            from = at + word.length;
          }
        }
      }
    }
    if (crossed < 1) failures.push("no mark boundary in the story");
    return failures;
  }, words);
  expect(broken).toEqual([]);
});
