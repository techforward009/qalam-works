import sharp from "sharp";
import { unicodeInpage } from "../fixtures/inpage";
import { placeInkLines } from "../../app/tools/document-studio/utils/pdfInkPagination";
import { expect, test } from "@playwright/test";

for (const zoom of [100, 200]) {
  test(`first line and selection start at the frame top at ${zoom}%`, async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/tools/document-studio");
    const story = page.locator(".ProseMirror");
    await expect(story).toBeEditable();
    await expect.poll(() => page.evaluate(() => localStorage.getItem("qalam-document-studio-active-document-v1"))).not.toBeNull();
    await page.locator('[data-studio-tool-button="text"]').click();
    await story.click();
    await page.keyboard.type("ترجمہ قرآن");
    await page.keyboard.press("Shift+Enter");
    await page.keyboard.type("السلام علیکم اللہ وبرکاتہ");
    await page.keyboard.press("Shift+Enter");
    await page.keyboard.type("یہ تیسری سطر ہے");
    await page.keyboard.press("Control+A");
    await page.locator('[data-studio-font-family]').selectOption({ label: "Mehr Nastaliq Web" });
    await page.locator('[data-studio-font-size]').selectOption("24");
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    // Exercise the same sheet transform at 200% without adding a new UI preset.
    await page.locator('[data-studio-zoom-surface]').evaluate((surface, zoom) => {
      (surface as HTMLElement).style.transform = `scale(${zoom / 100})`;
      window.dispatchEvent(new Event("resize"));
      document.dispatchEvent(new Event("selectionchange"));
    }, zoom);
    await expect.poll(() => page.evaluate(() => {
      const prose = document.querySelector<HTMLElement>(".ProseMirror")!;
      const naturalWidth = parseFloat(getComputedStyle(prose).width);
      const scale = prose.getBoundingClientRect().width / naturalWidth;
      const frameTop = prose.getBoundingClientRect().top + parseFloat(getComputedStyle(prose).paddingTop) * scale;
      const paragraph = prose.querySelector("p")!;
      const range = document.createRange(); range.selectNodeContents(paragraph);
      const lineTop = paragraph.getBoundingClientRect().top;
      const boxes = [...document.querySelectorAll("[data-studio-line-selection]")].map(el => el.getBoundingClientRect()).sort((a,b) => a.top-b.top);
      const lines: DOMRect[][] = [];
      for (const box of boxes) {
        const prior = lines[lines.length-1];
        if (prior && Math.abs(prior[0].top-box.top) < 1) prior.push(box); else lines.push([box]);
      }
      if (lines.length !== 3) return { visualLines: lines.length };
      const run = paragraph.querySelector<HTMLElement>("[data-studio-line-run]")!;
      const leading = parseFloat(getComputedStyle(run).lineHeight) * scale;
      const blockDelta = Math.abs(lineTop-frameTop), highlightDelta = Math.abs(boxes[0].top-frameTop);
      const heightError = Math.max(...boxes.map(box => Math.abs(box.height-leading)));
      // The last two natural pixels are transparent, preserving a visible white gap.
      const gap = lines[1][0].top-Math.max(...lines[0].map(box=>box.bottom)) + 2*scale;
      const laterError = Math.max(...lines.slice(1).map((line,index) => Math.abs(line[0].top - (paragraph.getBoundingClientRect().top + (index+1)*leading))));
      return { block: blockDelta <= 1 ? true : blockDelta, highlight: highlightDelta <= 1 ? true : highlightDelta,
        later: laterError <= 1 ? true : laterError, leading: heightError <= 1 ? true : heightError, gap: gap >= 1 ? true : gap };
    })).toEqual({block:true,highlight:true,later:true,leading:true,gap:true});
    await expect(story).toHaveText("ترجمہ قرآنالسلام علیکم اللہ وبرکاتہیہ تیسری سطر ہے");
    await page.keyboard.press("Control+End");
    await expect.poll(() => story.evaluate(root => {
      const paragraph = root.querySelector("p")!, run = paragraph.querySelector<HTMLElement>("[data-studio-line-run]")!;
      const scale = root.getBoundingClientRect().width / parseFloat(getComputedStyle(root).width);
      const expectedTop = paragraph.getBoundingClientRect().top + 2*parseFloat(getComputedStyle(run).lineHeight)*scale;
      const caret = document.querySelector("[data-studio-caret]");
      return caret ? Math.abs(caret.getBoundingClientRect().top-expectedTop) : 999;
    })).toBeLessThanOrEqual(1);
  });

  test(`text box retains padding and native selection at ${zoom}%`, async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/tools/document-studio");
    await expect(page.locator(".ProseMirror")).toBeEditable();
    await expect.poll(() => page.evaluate(() => localStorage.getItem("qalam-document-studio-active-document-v1"))).not.toBeNull();
    await page.locator('[data-studio-tool-button="textbox"]').click();
    const paper = (await page.locator('[data-studio-page-paper]').first().boundingBox())!;
    await page.mouse.move(paper.x + 100, paper.y + 100);
    await page.mouse.down();
    await page.mouse.move(paper.x + 380, paper.y + 250, { steps: 8 });
    await page.mouse.up();
    const box = page.getByRole("textbox", { name: "Text box", exact: true });
    await expect(box).toBeFocused();
    await page.keyboard.type("ترجمہ قرآن\nالسلام علیکم");
    await page.keyboard.press("Control+A");
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    await page.locator('[data-studio-zoom-surface]').evaluate((surface, zoom) => {
      (surface as HTMLElement).style.transform = `scale(${zoom / 100})`;
      window.dispatchEvent(new Event("resize"));
      document.dispatchEvent(new Event("selectionchange"));
    }, zoom);
    // Textareas retain their original inset/wrapping and native selection.
    await expect(box).toHaveCSS("padding", "2px");
    await expect(page.locator("[data-studio-line-selection]")).toHaveCount(0);
    await expect(box).toHaveValue("ترجمہ قرآن\nالسلام علیکم");
    expect(await box.evaluate(el => (el as HTMLTextAreaElement).selectionEnd - (el as HTMLTextAreaElement).selectionStart)).toBeGreaterThan(0);
    // Real production pixels, not just a non-collapsed range: a bare global
    // transparent ::selection rule makes this native blue highlight disappear.
    const countBlue = async () => {
      const { data, info } = await sharp(await box.screenshot()).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      let count = 0;
      for (let i = 0; i < data.length; i += info.channels) if (data[i+2] > data[i]+40 && data[i+2] > data[i+1]+30) count++;
      return count;
    };
    const selected = await countBlue();
    await box.evaluate(el => { const input = el as HTMLTextAreaElement; input.setSelectionRange(0,0); });
    const collapsed = await countBlue();
    expect(selected - collapsed).toBeGreaterThan(100);
  });
}

test("a new page starts its first selected line at the top margin", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/tools/document-studio");
  const story = page.locator(".ProseMirror");
  await expect(story).toBeEditable();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("qalam-document-studio-active-document-v1"))).not.toBeNull();
  await page.locator('[data-studio-tool-button="text"]').click();
  await story.click();
  await page.keyboard.insertText(Array(65).fill("السلام علیکم اللہ وبرکاتہ").join("\n"));
  await page.keyboard.press("Control+A");
  await expect(page.locator('[data-studio-page-paper="2"]')).toBeAttached();
  await page.locator('[data-studio-page-paper="2"]').evaluate(paper => {
    const scroller = document.querySelector<HTMLElement>('[data-studio-scroller]')!;
    scroller.scrollTop += paper.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 10;
  });
  await expect.poll(() => page.evaluate(() => {
    const prose = document.querySelector<HTMLElement>(".ProseMirror")!;
    const paper = document.querySelectorAll("[data-studio-page-paper]")[1].getBoundingClientRect();
    const top = paper.top + parseFloat(getComputedStyle(prose).paddingTop);
    const boxes = [...document.querySelectorAll("[data-studio-line-selection]")].map(el => el.getBoundingClientRect());
    return boxes.length ? Math.min(...boxes.map(box => Math.abs(box.top - top))) : 999;
  })).toBeLessThanOrEqual(1);
});

test("a heading followed by body text uses the same first-line-only rule as PDF", async ({ page }) => {
  // Isolate line painting from the existing heading/float pagination behavior.
  // Heading pagination is outside this PR; this fixture has one controlled frame.
  await page.setViewportSize({width:1920,height:1080});
  await page.goto("/tools/document-studio");
  await page.addStyleTag({content:".ProseMirror h1 { clear: none !important; }"});
  const story = page.locator(".ProseMirror");
  await expect(story).toBeEditable();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("qalam-document-studio-active-document-v1"))).not.toBeNull();
  await page.locator('[data-studio-tool-button="text"]').click(); await story.click();
  await page.locator('[data-studio-style-control]').selectOption("heading-1");
  await page.keyboard.type("اردو عنوان"); await page.keyboard.press("Enter");
  await page.locator('[data-studio-style-control]').selectOption("normal");
  await page.keyboard.type("یہ متن اپنی عام جگہ پر رہتا ہے۔");
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await expect(story.locator("h1 [data-studio-line-run]")).toHaveCount(1);
  await expect(story.locator("p [data-studio-line-run]")).toHaveCount(0);
  const measured = await story.evaluate(root => {
    const prose = root as HTMLElement, box = prose.getBoundingClientRect(), style = getComputedStyle(prose);
    const scale = box.width / parseFloat(style.width), top = box.top + parseFloat(style.paddingTop) * scale;
    const canvas = document.createElement("canvas").getContext("2d")!;
    return [...prose.querySelectorAll<HTMLElement>("h1,p")].filter(block => block.textContent).map((block, index) => {
      const text = document.createTreeWalker(block, NodeFilter.SHOW_TEXT).nextNode()!;
      const range = document.createRange(); range.setStart(text,0);range.setEnd(text,1);
      const rect = range.getBoundingClientRect(), parent = text.parentElement!;
      canvas.font = getComputedStyle(parent).font;
      const metric = canvas.measureText(block.textContent!);
      const offset = parseFloat(getComputedStyle(parent.closest("[data-studio-line-run]") ?? parent).top) || 0;
      const paintedBaseline = (rect.top-top)/scale + metric.fontBoundingBoxAscent;
      const baseline = paintedBaseline-offset;
      const layoutTop = (block.getBoundingClientRect().top-top)/scale;
      const layoutBottom = layoutTop + block.getBoundingClientRect().height/scale;
      return { paintedBaseline, line: {block:index,heading:index===0,baseline,offset:0,frameTop:0,frameBottom:1000,frameLeft:0,frameRight:700,
        inkTop:-metric.actualBoundingBoxAscent,inkBottom:metric.actualBoundingBoxDescent,inkLeft:0,inkRight:100,
        metricTop:0,metricBottom:0,boxTop:layoutTop-baseline,boxBottom:layoutBottom-baseline,paintBoxTop:-metric.fontBoundingBoxAscent} };
    });
  });
  expect(measured).toHaveLength(2);
  const pdf = placeInkLines(measured.map(item => item.line), 1000);
  expect(Math.abs(pdf[0].baseline - measured[0].paintedBaseline)).toBeLessThanOrEqual(1);
  expect(Math.abs(pdf[1].baseline - measured[1].paintedBaseline)).toBeLessThanOrEqual(1);
  await page.locator('[data-menu-root="file"]').click();
  const menu = page.locator('[data-menu-action="file.new"]');
  await expect(menu).toBeVisible();
  expect(await menu.evaluate(el => !el.closest('[data-studio-scroller]'))).toBe(true);
  await page.keyboard.press("Escape");
});

test("typing in a 100-page-length Urdu document measures a bounded viewport", async ({ page }) => {
  test.setTimeout(90000);
  await page.setViewportSize({width:1920,height:1080});
  await page.goto("/tools/document-studio");
  const story = page.locator(".ProseMirror");
  await expect(story).toBeEditable();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("qalam-document-studio-active-document-v1"))).not.toBeNull();
  await page.locator('[data-menu-root="file"]').click();
  await page.locator('[data-menu-action="file.open"]').click();
  const [picker] = await Promise.all([page.waitForEvent("filechooser"), page.getByRole("button", {name:"Open InPage file…"}).click()]);
  await picker.setFiles({name:"long.inp",mimeType:"application/octet-stream",buffer:unicodeInpage([Array(2500).fill("یہ اردو دستاویز کی کارکردگی کی جانچ ہے۔")])});
  const imported = page.getByRole("dialog",{name:"InPage text imported"});
  await expect(imported).toBeVisible();
  await imported.getByRole("button",{name:"Close",exact:true}).click();
  await expect(story.locator("p")).toHaveCount(2500);
  await page.locator('[data-studio-tool-button="text"]').click();
  await story.locator("p").first().scrollIntoViewIfNeeded();
  await story.locator("p").first().click();
  await page.evaluate(() => {
    const saved = Element.prototype.getBoundingClientRect;
    const probe = {reads:0,started:performance.now(),restore:()=>{Element.prototype.getBoundingClientRect=saved;}};
    (window as unknown as {linePaintProbe:typeof probe}).linePaintProbe=probe;
    Element.prototype.getBoundingClientRect=function(){if(this.matches(".ProseMirror p,.ProseMirror h1,.ProseMirror h2"))probe.reads++;return saved.call(this);};
  });
  await page.keyboard.type("آزمائش");
  const result = await page.evaluate(async () => {
    await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
    const probe=(window as unknown as {linePaintProbe:{reads:number;started:number;restore:()=>void}}).linePaintProbe;
    probe.restore();return {reads:probe.reads,ms:performance.now()-probe.started};
  });
  expect(result.reads).toBeLessThan(500);
  expect(result.ms).toBeLessThan(5000);
  await expect(story.locator("p").first()).toContainText("آزمائش");
  console.log("100-page-length typing", result);
});

test("an empty first paragraph and its caret use the frame start", async ({page}) => {
  await page.setViewportSize({width:1920,height:1080});
  await page.goto("/tools/document-studio");
  const story=page.locator(".ProseMirror");
  await expect(story).toBeEditable();
  await expect.poll(()=>page.evaluate(()=>localStorage.getItem("qalam-document-studio-active-document-v1"))).not.toBeNull();
  await page.locator('[data-studio-tool-button="text"]').click(); await story.click();
  await page.keyboard.press("Enter"); await page.keyboard.type("یہ دوسرا پیراگراف ہے۔");
  await page.keyboard.press("Control+Home");
  await expect(page.locator('[data-studio-caret]')).toBeVisible();
  await expect.poll(()=>story.evaluate(root=>{
    const prose=root as HTMLElement, rect=prose.getBoundingClientRect(), style=getComputedStyle(prose);
    const frameTop=rect.top+parseFloat(style.paddingTop)*rect.width/parseFloat(style.width);
    const caret=document.querySelector('[data-studio-caret]')!.getBoundingClientRect();
    return Math.abs(caret.top-frameTop);
  })).toBeLessThanOrEqual(1);
  await expect(story.locator('p').last().locator('[data-studio-line-run]')).toHaveCount(0);
});

test("mixed Urdu/Latin sizes share the first line box and highlight height", async ({page}) => {
  await page.setViewportSize({width:1920,height:1080}); await page.goto("/tools/document-studio");
  const story=page.locator(".ProseMirror"); await expect(story).toBeEditable();
  await expect.poll(()=>page.evaluate(()=>localStorage.getItem("qalam-document-studio-active-document-v1"))).not.toBeNull();
  await page.locator('[data-studio-tool-button="text"]').click();
  await story.evaluate(el=>{
    const editor=(el as HTMLElement & {editor:{commands:{setContent:(doc:unknown)=>void;focus:()=>void;setTextSelection:(range:{from:number;to:number})=>void};state:{doc:{content:{size:number}}}}}).editor;
    editor.commands.setContent({type:"doc",content:[{type:"paragraph",attrs:{dir:"rtl"},content:[
      {type:"text",text:"اردو ",marks:[{type:"textStyle",attrs:{fontSize:"12pt",fontFamily:"Mehr Nastaliq Web"}}]},
      {type:"text",text:"English ",marks:[{type:"textStyle",attrs:{fontSize:"12pt",fontFamily:"Arial Unicode MS"}}]},
      {type:"text",text:"عبارت",marks:[{type:"textStyle",attrs:{fontSize:"36pt",fontFamily:"Mehr Nastaliq Web"}}]},
    ]}]});
    editor.commands.focus(); editor.commands.setTextSelection({from:1,to:editor.state.doc.content.size-1});
  });
  await page.evaluate(()=>document.fonts.ready.then(()=>undefined));
  await expect.poll(()=>story.evaluate(root=>{
    const prose=root as HTMLElement, style=getComputedStyle(prose), rect=prose.getBoundingClientRect();
    const frameTop=rect.top+parseFloat(style.paddingTop);
    const boxes=[...document.querySelectorAll('[data-studio-line-selection]')].map(el=>el.getBoundingClientRect());
    const leading=Math.max(...[...prose.querySelectorAll('span')].map(el=>parseFloat(getComputedStyle(el).lineHeight)));
    return boxes.length>=3 && boxes.every(box=>Math.abs(box.top-frameTop)<=1 && Math.abs(box.height-leading)<=1);
  })).toBe(true);
});
