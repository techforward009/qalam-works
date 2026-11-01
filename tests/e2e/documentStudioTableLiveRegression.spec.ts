import {test,expect,type Page} from "@playwright/test";

async function insertRTL(page:Page,rows=3,columns=3) {
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
 await dialog.getByRole("spinbutton",{name:"Columns"}).fill(String(columns));
 await dialog.getByRole("button",{name:"OK",exact:true}).click();
 await expect(editor.locator("table tr")).toHaveCount(rows);
 return editor;
}

test("Insert Table 3x3 RTL places caret in top-right first cell, no yellow notice and top padding",async({page})=>{
 const editor=await insertRTL(page);
 const cells=editor.locator("table tr:first-child td");
 const coords=await cells.evaluateAll(nodes=>nodes.map(el=>el.getBoundingClientRect().left));
 expect(coords[0]).toBeGreaterThan(coords[1]);
 await expect.poll(()=>page.evaluate(()=>{
  const n=document.getSelection()?.anchorNode;
  const td=(n instanceof Element?n:n?.parentElement)?.closest("td,th");
  return td ? {row:(td.parentElement as HTMLTableRowElement).rowIndex,column:(td as HTMLTableCellElement).cellIndex}:null;
 })).toEqual({row:0,column:0});
 await expect(page.locator("[data-studio-formatting-notice]")).toHaveCount(0);
 await page.keyboard.insertText("پہلی سطر");
 const gaps=await cells.first().evaluate(cell=>{
  const c=cell.getBoundingClientRect(),p=cell.querySelector("p")!.getBoundingClientRect();
  return {top:p.top-c.top,bottom:c.bottom-p.bottom};
 });
 expect(gaps.top).toBeGreaterThan(3);
 expect(gaps.bottom).toBeGreaterThan(3);
 await page.screenshot({path:test.info().outputPath("rtl-first-cell.png")});
});

test("drag 40px on inner divider shows col-resize, changes neighbours and undo restores width",async({page})=>{
 const editor=await insertRTL(page,3,3);
 const firstRow=editor.locator("table tr:first-child td");
 const before=await firstRow.evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().width));
 const rect=await firstRow.first().boundingBox();
 const x=rect!.x,y=rect!.y+rect!.height/2;
 await page.mouse.move(x,y);
 await expect.poll(()=>firstRow.first().evaluate(e=>getComputedStyle(e.closest("table")!).cursor)).toBe("col-resize");
 await page.mouse.down();
 await page.mouse.move(x-40,y,{steps:7});
 await page.mouse.up();
 const after=await firstRow.evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().width));
 expect(Math.abs(after[0]-before[0])).toBeGreaterThan(20);
 expect(Math.abs(after[1]-before[1])).toBeGreaterThan(20);
 expect(Math.abs(after.reduce((a,b)=>a+b,0)-before.reduce((a,b)=>a+b,0))).toBeLessThan(4);
 await page.screenshot({path:test.info().outputPath("rtl-column-drag.png")});
 await firstRow.first().click();
 await page.keyboard.press("Control+z");
 await expect.poll(()=>firstRow.evaluateAll(nodes=>nodes.map(n=>Math.round(n.getBoundingClientRect().width)))).toEqual(before.map(Math.round));
});

test("drag across cells visibly highlights selection and Table Layout merges selection",async({page})=>{
 const editor=await insertRTL(page,2,3);
 const a=await editor.locator("table tr:first-child td").first().boundingBox();
 const b=await editor.locator("table tr:first-child td").nth(1).boundingBox();
 await page.mouse.move(a!.x+a!.width/2,a!.y+a!.height/2);
 await page.mouse.down();
 await page.mouse.move(b!.x+b!.width/2,b!.y+b!.height/2,{steps:8});
 await page.mouse.up();
 await expect.poll(()=>editor.locator("table .selectedCell").count()).toBeGreaterThanOrEqual(2);
 const visible=await editor.locator("table .selectedCell").first().evaluate(el=>getComputedStyle(el,"::after").backgroundColor);
 expect(visible).not.toBe("rgba(0, 0, 0, 0)");
 await page.locator('[data-menu-root="format"]').click();
 await page.locator('[data-menu-action="text.tableLayout"]').click();
 const dialog=page.getByRole("dialog",{name:"Table Layout"});
 await expect(dialog.getByRole("button",{name:"Merge Selection"})).toBeEnabled();
 await dialog.getByRole("button",{name:"Merge Selection"}).click();
 await expect(editor.locator("table tr:first-child td")).toHaveCount(2);
});
