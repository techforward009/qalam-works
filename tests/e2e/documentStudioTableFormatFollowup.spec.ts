import {test,expect,type Page} from "@playwright/test";

const words=["ایک","دو","تین","چار","پانچ","چھ","سات","آٹھ","نو"];
async function table(page:Page,rows=3,cols=3){
 await page.addInitScript(()=>localStorage.setItem("qalam-site-language","en"));
 await page.goto("/tools/document-studio");
 const editor=page.locator(".ProseMirror");
 await expect(editor).toBeEditable({timeout:30000});
 await editor.click();
 await page.locator('[data-menu-root="format"]').click();
 await page.locator('[data-menu-submenu="format.align"]').hover();
 await page.locator('[data-menu-action="format.rtl"]').click();
 await page.locator('[data-menu-root="insert"]').click();
 await page.locator('[data-menu-action="insert.table"]').click();
 const dialog=page.getByRole("dialog",{name:"Insert Table"});
 await dialog.getByRole("spinbutton",{name:"Rows"}).fill(String(rows));
 await dialog.getByRole("spinbutton",{name:"Columns"}).fill(String(cols));
 await dialog.getByRole("button",{name:"OK",exact:true}).click();
 const cells=editor.locator("table td");
 await expect(cells).toHaveCount(rows*cols);
 for(let i=0;i<rows*cols;i++){
  await page.keyboard.type(words[i],{delay:25});
  if(i<rows*cols-1)await page.keyboard.press("Tab");
 }
 return {editor,cells};
}
test("RTL cell click after leaving the table always puts new Urdu letters in the clicked cell",async({page},info)=>{
 const {editor,cells}=await table(page);
 for(const [index,suffix] of [[4,"نیا"],[2,"ہاں"],[4,"اور"],[2,"جی"],[0,"خوب"]] as const){
  // Leave the table via the grey canvas, then use the actual mouse on text.
  const pageRect=await page.locator("[data-studio-scroller]").boundingBox();
  await page.mouse.click(pageRect!.x+pageRect!.width-12,pageRect!.y+pageRect!.height/2);
  const paragraph=cells.nth(index).locator("p");
  const glyph=await paragraph.evaluate(el=>{
   const range=document.createRange();
   range.selectNodeContents(el);
   const rect=range.getBoundingClientRect();
   return {x:rect.left+Math.max(2,Math.min(5,rect.width/2)),y:rect.top+rect.height/2};
  });
  await page.mouse.click(glyph.x,glyph.y);
  await page.keyboard.type(suffix,{delay:30});
  await expect(cells.nth(index)).toContainText(suffix);
  await expect(cells.last()).toHaveText(words[words.length-1]!);
 }
 // Regression: a click within the former 8px resize-grip region
 // must still put the caret inside the clicked cell (no pointer movement).
 const near=cells.nth(4).locator("p");
 const box=await near.boundingBox();
 await page.mouse.click(box!.x+box!.width-2,box!.y+box!.height/2);
 await page.keyboard.type("سرحد",{delay:30});
 await expect(cells.nth(4)).toContainText("سرحد");
 await expect(cells.last()).toHaveText(words[words.length-1]!);
 await page.screenshot({path:info.outputPath("rtl-table-click-repeat.png")});
});
test("Table Format mm and pt fields and right indent change screen and PDF geometry",async({page},info)=>{
 const {editor,cells}=await table(page,2,2);
 const before=await editor.locator("table").evaluate(el=>el.getBoundingClientRect().right);
 await cells.first().click({button:"right"});
 await page.getByRole("menuitem",{name:"Table Format…",exact:true}).click();
 const dialog=page.getByRole("dialog",{name:"Table Format"});
 await expect(dialog.getByLabel("Column Width")).toHaveValue(/mm$/);
 await expect(dialog.getByLabel("Column Gap")).toHaveValue("1.41mm");
 await expect(dialog.getByLabel("Table Indent")).toHaveValue("0mm");
 await expect(dialog.getByLabel("Border Width")).toHaveValue("0.5pt");
 await dialog.getByLabel("Column Width").fill("30mm");
 await dialog.getByLabel("Table Indent").fill("10mm");
 await dialog.getByLabel("Table Alignment").selectOption("right");
 await dialog.getByRole("button",{name:"OK"}).click();
 const geometry=await editor.locator("table").evaluate(table=>{
  const container=(table as HTMLTableElement).closest(".ProseMirror")!;
  const cell=(table as HTMLTableElement).rows[0].cells[0];
  return {right:table.getBoundingClientRect().right,
   containerRight:container.getBoundingClientRect().right,
   cellWidth:cell.getBoundingClientRect().width};
 });
 expect(before-geometry.right).toBeGreaterThan(30);
 expect(before-geometry.right).toBeLessThan(47);
 expect(geometry.cellWidth).toBeGreaterThan(95);
 expect(geometry.cellWidth).toBeLessThan(135);
 await page.screenshot({path:info.outputPath("rtl-table-30mm-10mm.png")});
 const {readFileSync}=await import("node:fs");
 const {PDFDocument}=await import("pdf-lib");
 await page.locator('[data-menu-root="file"]').click();
 const download=page.waitForEvent("download",{timeout:60000});
 await page.locator('[data-menu-action="file.downloadPdf"]').click();
 const pdf=await download;
 const file=(await pdf.path())!;
 const bytes=readFileSync(file);
 expect(bytes.length).toBeGreaterThan(3000);
 const exported=await PDFDocument.load(bytes);
 expect(exported.getPageCount()).toBeGreaterThanOrEqual(1);
 const {copyFileSync}=await import("node:fs");
 copyFileSync(file,info.outputPath("rtl-table-30mm-10mm.pdf"));
 // A 15mm column is smaller than the unrelated drag-resize grip minimum.
 await cells.first().click({button:"right"});
 await page.getByRole("menuitem",{name:"Table Format…",exact:true}).click();
 const narrow=page.getByRole("dialog",{name:"Table Format"});
 await narrow.getByLabel("Column Width").fill("15mm");
 await narrow.getByRole("button",{name:"OK"}).click();
 const narrowWidth=await cells.first().evaluate(el=>el.getBoundingClientRect().width);
 expect(narrowWidth).toBeGreaterThan(51);
 expect(narrowWidth).toBeLessThan(64);

});
