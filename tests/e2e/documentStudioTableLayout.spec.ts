import {expect,test} from "@playwright/test";
test.beforeEach(async({page})=>{
 await page.addInitScript(()=>localStorage.setItem("qalam-site-language","en"));
 await page.goto("/tools/document-studio");
 await expect(page.locator(".ProseMirror")).toBeEditable({timeout:30000});
});
async function table(page:import("@playwright/test").Page,dir:"rtl"|"ltr"="rtl",rows=2,columns=2){
 const ed=page.locator(".ProseMirror");
 await ed.click();
 await page.locator('[data-menu-root="format"]').click();
 await page.locator('[data-menu-submenu="format.align"]').hover();
 await page.locator(`[data-menu-action="format.${dir}"]`).click();
 await page.locator('[data-menu-root="insert"]').click();
 await page.locator('[data-menu-action="insert.table"]').click();
 const d=page.getByRole("dialog",{name:"Insert Table"});
 await d.getByRole("spinbutton",{name:"Rows"}).fill(String(rows));
 await d.getByRole("spinbutton",{name:"Columns"}).fill(String(columns));
 await d.getByRole("button",{name:"OK"}).click();
 await expect(ed.locator("table")).toBeVisible();
 await expect(page.locator("[data-studio-formatting-notice]")).toHaveCount(0);
 return ed;
}
test("RTL first cell is rightmost, Tab wraps to following row and adds final row",async({page})=>{
 const ed=await table(page,"rtl",2,2);
 const cells=ed.locator("tr").first().locator("td");
 expect((await cells.nth(0).boundingBox())!.x).toBeGreaterThan((await cells.nth(1).boundingBox())!.x);
 await cells.first().click();await page.keyboard.press("Tab");
 await expect.poll(()=>page.evaluate(()=>document.getSelection()?.anchorNode?.parentElement?.closest("td")?.cellIndex)).toBe(1);
 await page.keyboard.press("Tab");
 await expect.poll(()=>page.evaluate(()=>document.getSelection()?.anchorNode?.parentElement?.closest("tr")?.rowIndex)).toBe(1);
 await ed.locator("tr").last().locator("td").last().click();await page.keyboard.press("Tab");
 await expect(ed.locator("tr")).toHaveCount(3);
 await expect.poll(()=>page.evaluate(()=>document.getSelection()?.anchorNode?.parentElement?.closest("tr")?.rowIndex)).toBe(2);
});
test("InPage Table Layout dialog inserts and removes a row in one undo step",async({page})=>{
 const ed=await table(page,"rtl");
 await ed.locator("td").first().click({button:"right"});
 await page.getByRole("menu",{name:"Text context menu"}).getByRole("menuitem",{name:"Table Layout…"}).click();
 const d=page.getByRole("dialog",{name:"Table Layout"});
 await expect(d.getByRole("radio",{name:"Row"})).toBeChecked();
 await expect(d.getByRole("radio",{name:"Before"})).toBeChecked();
 await page.screenshot({path:test.info().outputPath("table-layout.png")});
 await d.getByRole("button",{name:"Insert",exact:true}).click();
 await expect(ed.locator("tr")).toHaveCount(3);
 await ed.click();await page.keyboard.press("Control+z");await expect(ed.locator("tr")).toHaveCount(2);
});
test("dragging an inner vertical divider updates widths without changing table width",async({page})=>{
 const ed=await table(page,"rtl",3,2);
 const row=ed.locator("tr").first(),cells=row.locator("td");
 const start=await cells.first().boundingBox(); const outside=await ed.locator("table").boundingBox();
 await page.mouse.move(start!.x+3,start!.y+start!.height/2);
 await expect(cells.first()).toHaveCSS("cursor",/col-resize|auto/);
 await page.mouse.down();await page.mouse.move(start!.x-42,start!.y+start!.height/2,{steps:7});await page.mouse.up();
 const widths=await cells.evaluateAll(els=>els.map(e=>Math.round(e.getBoundingClientRect().width)));
 expect(await cells.evaluateAll(els=>els.map(e=>e.getAttribute("colwidth")))).toEqual(expect.arrayContaining([expect.stringMatching(/^\d+$/)]));
 expect(Math.abs(widths[0]-widths[1])).toBeGreaterThan(25);
 expect(Math.abs((await ed.locator("table").boundingBox())!.width-outside!.width)).toBeLessThan(2);
 await page.screenshot({path:test.info().outputPath("rtl-table-resized.png")});
 await ed.click();await page.keyboard.press("Control+z");
 await expect.poll(()=>cells.evaluateAll(els=>els.every(el=>el.getAttribute("colwidth")===null))).toBe(true);
 await page.keyboard.press("Control+Shift+z");
 await expect.poll(()=>cells.evaluateAll(els=>els.every(el=>el.hasAttribute("colwidth")))).toBe(true);
});
test("RTL far-left outer border resizes the edge column with no page growth",async({page})=>{
 const ed=await table(page,"rtl",2,3);
 const tableNode=ed.locator("table"),last=ed.locator("tr").first().locator("td").last();
 const rect=await last.boundingBox(),before=(await tableNode.boundingBox())!.width;
 await page.mouse.move(rect!.x+2,rect!.y+rect!.height/2);
 await page.mouse.down();await page.mouse.move(rect!.x-35,rect!.y+rect!.height/2,{steps:6});await page.mouse.up();
 const sizes=await ed.locator("tr").first().locator("td").evaluateAll(nodes=>nodes.map(e=>e.getBoundingClientRect().width));
 expect(Math.max(...sizes)-Math.min(...sizes)).toBeGreaterThan(18);
 expect(Math.abs((await tableNode.boundingBox())!.width-before)).toBeLessThan(2);
 await expect(page.locator("[data-studio-page-label]")).toHaveText("1/1");
});
test("first and subsequent table row content stays below its top border",async({page})=>{
 const ed=await table(page,"rtl",2,2);
 for(const cell of await ed.locator("table tr td").all()){
  const gap=await cell.evaluate(el=>el.querySelector("p")!.getBoundingClientRect().top-el.getBoundingClientRect().top);
  expect(gap).toBeGreaterThanOrEqual(1);
  expect(gap).toBeLessThanOrEqual(4);
 }
});
