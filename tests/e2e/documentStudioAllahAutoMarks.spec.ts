import { expect, test, type Page } from "@playwright/test";

async function clear(page: Page) {
  await page.locator('[data-studio-tool-button="text"]').click();
  await page.locator(".ProseMirror").click();
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Backspace");
  await page.locator("[data-studio-font-family]").selectOption("Digital Khatt Indo-Pak");
  await page.locator(".ProseMirror").focus();
}

test.beforeEach(async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.addInitScript(() => localStorage.setItem("qalam-site-language", "en"));
  await page.goto("/tools/document-studio");
  await expect(page.locator(".ProseMirror")).toBeEditable();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("qalam-document-studio-active-document-v1"))).not.toBeNull();
  await clear(page);
});

test("typed complete Allah words get only the missing marks; other words stay unchanged", async ({ page }, testInfo) => {
  const cases = [
    ["اللہ", "اللّٰہ"], ["الله", "اللّٰه"], ["ٱللہ", "ٱللّٰہ"],
    ["واللہ", "واللّٰہ"], ["باللہ", "باللّٰہ"], ["للہ", "للّٰہ"], ["اللہم", "اللّٰہم"],
    ["اللّٰہ", "اللّٰہ"], ["اللّہ", "اللّہ"], ["اللّٰہ", "اللّٰہ"],
    ["اللَّهْو", "اللَّهْو"], ["اللَّهَب", "اللَّهَب"], ["الٰہ", "الٰہ"], ["الہام", "الہام"],
  ];
  for (const [input, output] of cases) {
    await clear(page);
    await page.keyboard.insertText(input);
    expect(await page.locator(".ProseMirror").textContent()).toBe(input);
    await page.keyboard.press("Space");
    await expect(page.locator(".ProseMirror")).toHaveText(output + " ", { useInnerText: false });
    expect(await page.locator(".ProseMirror").textContent()).toBe(output + " ");
  }
  await clear(page);
  await page.keyboard.insertText("اللہ الله ٱللہ واللہ باللہ للہ اللہم");
  await page.keyboard.press("Space");
  await page.screenshot({ path: testInfo.outputPath("allah-auto-marks.png") });
});

test("auto marks are one separate undo step after space, punctuation and Enter", async ({ page }) => {
  for (const key of ["Space", "Enter", "،"]) {
    await clear(page);
    await page.keyboard.insertText("اللہ");
    if (key === "،") await page.keyboard.insertText(key);
    else await page.keyboard.press(key);
    await expect(page.locator(".ProseMirror")).toContainText("اللّٰہ");
    await page.keyboard.press("Control+z");
    await expect(page.locator(".ProseMirror")).toContainText("اللہ");
    expect(await page.locator(".ProseMirror").textContent()).not.toContain("ّٰ");
    if (key === "Enter") expect(await page.locator(".ProseMirror p").count()).toBe(2);
    else expect(await page.locator(".ProseMirror").textContent()).toBe("اللہ" + (key === "Space" ? " " : key));
    await page.keyboard.press("Control+Shift+z");
    await expect(page.locator(".ProseMirror")).toContainText("اللّٰہ");
  }
});

test("real rich clipboard paste retains Digital Khatt and can undo only the auto marks", async ({ page }) => {
  const original = "اللہ الله\nاللّہ اللَّهَب\nواللہ";
  await page.evaluate(async text => {
    const html=text.split('\n').map(line=>`<p><span style="font-family:Digital Khatt Indo-Pak">${line}</span></p>`).join('');
    await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([html],{type:'text/html'}),'text/plain':new Blob([text],{type:'text/plain'})})]);
  }, original);
  await page.keyboard.press("Control+v");
  await expect(page.locator(".ProseMirror")).toContainText("اللّٰہ اللّٰه");
  await expect(page.locator(".ProseMirror")).toContainText("واللّٰہ");
  expect(await page.locator(".ProseMirror p").allTextContents()).toEqual(["اللّٰہ اللّٰه", "اللّہ اللَّهَب", "واللّٰہ"]);
  await page.keyboard.press("Control+z");
  expect(await page.locator(".ProseMirror p").allTextContents()).toEqual(original.split("\n"));
});

for(const font of ['Mehr Nastaliq Web','Gulzar','Jameel Noori Nastaleeq','Arial Unicode MS'])test(`${font}: typing and clipboard paste retain authored Allah`,async({page})=>{
 await page.locator('.ProseMirror').evaluate((el,font)=>(el as HTMLElement & {editor:import('@tiptap/core').Editor}).editor.commands.setMark('textStyle',{fontFamily:font}),font);
 await page.keyboard.insertText('اللہ');await page.keyboard.press('Space');
 expect(await page.locator('.ProseMirror').textContent()).toBe('اللہ ');
 await page.evaluate(()=>navigator.clipboard.writeText('اللہ واللہ اللّہ'));
 await page.keyboard.press('Control+v');
 expect(await page.locator('.ProseMirror').textContent()).toBe('اللہ اللہ واللہ اللّہ');
});

test('Mehr and Digital Khatt keep their editor text in a real downloaded PDF',async({page},info)=>{
 test.setTimeout(120000);
 const editor=page.locator('.ProseMirror');
 await editor.evaluate(el=>(el as HTMLElement & {editor:import('@tiptap/core').Editor}).editor.commands.setMark('textStyle',{fontFamily:'Mehr Nastaliq Web',fontSize:'36pt'}));
 await page.keyboard.insertText('اللہ');await page.keyboard.press('Space');
 expect(await editor.textContent()).toBe('اللہ ');
 await page.evaluate(()=>document.fonts.ready);
 await page.locator('[data-studio-pages-stack]').screenshot({path:info.outputPath('mehr-allah.png'),scale:'css'});
 await page.keyboard.press('Enter');
 await editor.evaluate(el=>(el as HTMLElement & {editor:import('@tiptap/core').Editor}).editor.commands.setMark('textStyle',{fontFamily:'Digital Khatt Indo-Pak',fontSize:'36pt'}));
 await page.keyboard.insertText('اللہ');await page.keyboard.press('Space');
 const texts=await editor.locator('p').allTextContents();expect(texts).toEqual(['اللہ ','اللّٰہ ']);
 await page.evaluate(()=>document.fonts.ready);
 await page.locator('[data-studio-pages-stack]').screenshot({path:info.outputPath('digital-khatt-allah.png'),scale:'css'});
 const doc=await editor.evaluate(el=>(el as HTMLElement & {editor:import('@tiptap/core').Editor}).editor.getJSON());
 const {POST}=await import('../../app/api/export-pdf/route');const {PdfExportTestRequest}=await import('../helpers/pdfExportRequest');
 const {default:chromium}=await import('@sparticuz/chromium');const {default:puppeteer}=await import('puppeteer-core');
 const {writeFileSync}=await import('node:fs');const {execFileSync}=await import('node:child_process');
 const originalPath=chromium.executablePath,originalLaunch=puppeteer.launch,launch=puppeteer.launch.bind(puppeteer);let pdfText:string[]=[];
 chromium.executablePath=async()=>process.env.PLAYWRIGHT_CHROMIUM_PATH!;
 puppeteer.launch=async options=>{const browser=await launch({...options,args:['--no-sandbox']});const newPage=browser.newPage.bind(browser);browser.newPage=async()=>{const p=await newPage(),pdf=p.pdf.bind(p);p.pdf=async opts=>{pdfText=await p.evaluate(()=>[...document.querySelectorAll('[data-pdf-ink-line]')].map(el=>el.textContent??''));return pdf(opts);};return p;};return browser;};
 try{
  const response=await POST(new PdfExportTestRequest('http://localhost/api/export-pdf',{method:'POST',body:JSON.stringify({doc,dir:'rtl'})}));
  expect(response.status,response.status===200?'':await response.text()).toBe(200);
  expect(pdfText.map(s=>s.trim())).toEqual(texts.map(s=>s.trim()));
  const file=info.outputPath('allah-fonts.pdf');writeFileSync(file,Buffer.from(await response.arrayBuffer()));
  const fonts=execFileSync('pdffonts',[file],{encoding:'utf8'});expect(fonts).toContain('Mehr');expect(fonts).toContain('DigitalKhatt');expect(fonts).toContain('CID TrueType');
  execFileSync('pdftoppm',['-f','1','-singlefile','-r','96','-png',file,info.outputPath('allah-fonts-pdf')]);
 }finally{chromium.executablePath=originalPath;puppeteer.launch=originalLaunch;}
});
