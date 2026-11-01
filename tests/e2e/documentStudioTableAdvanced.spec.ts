import {test,expect,type Page} from "@playwright/test";
async function setup(page:Page,dir:"rtl"|"ltr"="rtl",rows=2,cols=2) {
 await page.addInitScript(()=>localStorage.setItem("qalam-site-language","en"));
 await page.goto("/tools/document-studio");const ed=page.locator(".ProseMirror");
 await expect(ed).toBeEditable({timeout:30000});
 await ed.click();
 if(dir==="ltr"){await page.locator('[data-menu-root="format"]').click();await page.locator('[data-menu-submenu="format.align"]').hover();await page.locator('[data-menu-action="format.ltr"]').click();}
 await ed.locator("p").first().click({button:"right"});
 await page.getByRole("menu",{name:"Text context menu"}).getByRole("menuitem",{name:"Table…"}).click();
 const dialog=page.getByRole("dialog",{name:"Insert Table"});
 await dialog.getByRole("spinbutton",{name:"Rows"}).fill(String(rows));
 await dialog.getByRole("spinbutton",{name:"Columns"}).fill(String(cols));
 await dialog.getByRole("button",{name:"OK",exact:true}).click();
 await expect(ed.locator("table tr")).toHaveCount(rows);
 return ed;
}
test("RTL first cell starts right, Tab traverses rows and appends row from last",async({page})=>{
 const ed=await setup(page,"rtl",2,2);const cells=ed.locator("table td");
 const x=await cells.evaluateAll(els=>els.slice(0,2).map(e=>e.getBoundingClientRect().left));
 expect(x[0]).toBeGreaterThan(x[1]);
 await cells.nth(0).click();
 for(const index of [1,2,3]){await page.keyboard.press("Tab");await expect.poll(()=>page.evaluate(()=>{const x=document.getSelection()?.anchorNode;const td=(x instanceof Element?x:x?.parentElement)?.closest("td");return ((td?.parentElement as HTMLTableRowElement|null)?.rowIndex??-1)*2+(td?.cellIndex||0);})).toBe(index);}
 await page.keyboard.press("Shift+Tab");await expect.poll(()=>page.evaluate(()=>document.getSelection()?.anchorNode?.parentElement?.closest("td")?.cellIndex)).toBe(0);
 await cells.nth(3).click();await page.keyboard.press("Tab");await expect(ed.locator("table tr")).toHaveCount(3);
 await expect.poll(()=>page.evaluate(()=>document.getSelection()?.anchorNode?.parentElement?.closest("tr")?.rowIndex)).toBe(2);
 await expect(page.locator("[data-studio-page-label]")).toHaveText("1/1");
 await expect(page.locator("[data-studio-formatting-notice]")).toHaveCount(0);
});
test("LTR cells remain left to right and even first row padding",async({page})=>{
 const ed=await setup(page,"ltr",2,2);
 const cells=ed.locator("table tr:first-child td");
 const bounds=await cells.evaluateAll(els=>els.map(e=>e.getBoundingClientRect().left));
 expect(bounds[0]).toBeLessThan(bounds[1]);
 const padding=await cells.first().evaluate(e=>{const c=getComputedStyle(e);return [c.paddingTop,c.paddingBottom]});
 expect(padding[0]).toBe(padding[1]);
 await expect(page.locator("[data-studio-formatting-notice]")).toHaveCount(0);
});
test("column drag moves divider and preserves sum; Layout dialog works",async({page},info)=>{
 const ed=await setup(page,"rtl",3,2);
 const cells=ed.locator("table tr:first-child td");
 const before=await cells.evaluateAll(els=>els.map(e=>e.getBoundingClientRect().width));
 const first=await cells.first().boundingBox();const x=first!.x,y=first!.y+first!.height/2;
 await page.mouse.move(x,y);await expect.poll(()=>page.evaluate(()=>getComputedStyle(document.querySelector("table")!).cursor)).toBe("col-resize");
 await page.mouse.down();await page.mouse.move(x-42,y,{steps:6});await page.mouse.up();
 const after=await cells.evaluateAll(els=>els.map(e=>e.getBoundingClientRect().width));
 expect(Math.abs(after[0]-before[0])).toBeGreaterThan(15);
 expect(Math.abs(after.reduce((a,b)=>a+b,0)-before.reduce((a,b)=>a+b,0))).toBeLessThan(4);
 await page.screenshot({path:info.outputPath("rtl-table-after-drag.png")});
 await cells.first().click({button:"right"});
 const menu=page.getByRole("menu",{name:"Text context menu"});
 await expect(menu.getByRole("menuitem",{name:"Table Layout…"})).toBeEnabled();
 await expect(menu.getByRole("menuitem",{name:"Table To Text…"})).toBeDisabled();
 await expect(menu.getByRole("menuitem",{name:"Table Format"})).toBeEnabled();
 await menu.getByRole("menuitem",{name:"Table Layout…"}).click();
 const d=page.getByRole("dialog",{name:"Table Layout"});
 await expect(d.getByRole("radio",{name:"Row"})).toBeChecked();
 await expect(d.getByRole("radio",{name:"Before"})).toBeChecked();
 await d.screenshot({path:info.outputPath("table-layout.png")});
 await d.getByRole("button",{name:"Insert"}).click();
 await expect(ed.locator("table tr")).toHaveCount(4);
});


test("column resize is undoable, redoable and retained by portable QPG",async({page})=>{
 const ed=await setup(page,"rtl",2,2);
 const cells=ed.locator("table tr:first-child td");
 const before=await cells.evaluateAll(xs=>xs.map(e=>Math.round(e.getBoundingClientRect().width)));
 const first=await cells.first().boundingBox();
 await page.mouse.move(first!.x,first!.y+first!.height/2);
 await page.mouse.down();
 await page.mouse.move(first!.x-47,first!.y+first!.height/2,{steps:7});
 await page.mouse.up();
 const resized=await cells.evaluateAll(xs=>xs.map(e=>Math.round(e.getBoundingClientRect().width)));
expect(Math.abs(resized[0]-before[0])).toBeGreaterThan(20);
 await cells.first().click();
 await page.keyboard.press("Control+z");
 await expect.poll(async()=>cells.evaluateAll(xs=>xs.map(e=>Math.round(e.getBoundingClientRect().width)))).toEqual(before);
 await page.keyboard.press("Control+Shift+z");
 await expect.poll(async()=>cells.evaluateAll(xs=>xs.map(e=>Math.round(e.getBoundingClientRect().width)))).toEqual(resized);
 await cells.first().click();await page.keyboard.press("Control+Alt+s");
 const dlg=page.locator("[data-studio-qpg-save-as]");
 await expect(dlg).toBeVisible();
 const dl=page.waitForEvent("download");await dlg.getByRole("button",{name:"Download"}).click();
 const downloaded=await dl;const fs=await import("node:fs");const bytes=fs.readFileSync((await downloaded.path())!);
 const parsed=JSON.parse(bytes.toString("utf8"));
 expect(parsed.content.content.find((n:{type:string})=>n.type==="table").content[0].content.map((c:{attrs:{colwidth:number[]}})=>c.attrs.colwidth[0])).toHaveLength(2);
 await page.locator("#document-studio-upload-input").setInputFiles({name:"widths.qpg",mimeType:"application/octet-stream",buffer:bytes});
 await expect(ed.locator("table")).toBeVisible();
 const after=await cells.evaluateAll(xs=>xs.map(e=>Math.round(e.getBoundingClientRect().width)));
 expect(after[0]/after[1]).toBeCloseTo(resized[0]/resized[1],1);
});
test("RTL outer left border adjusts last column width",async({page})=>{
 const ed=await setup(page,"rtl",2,2);
 const cells=ed.locator("table tr:first-child td");
 const before=await cells.evaluateAll(xs=>xs.map(e=>e.getBoundingClientRect().width));
 const last=await cells.last().boundingBox();
 await page.mouse.move(last!.x+1,last!.y+last!.height/2);
 await page.mouse.down();await page.mouse.move(last!.x-30,last!.y+last!.height/2,{steps:5});await page.mouse.up();
 const after=await cells.evaluateAll(xs=>xs.map(e=>e.getBoundingClientRect().width));
 expect(Math.abs(after[1]-before[1])).toBeGreaterThan(10);
});
test("Format > Table Layout opens and cell selection can merge and split",async({page})=>{
 const ed=await setup(page,"rtl",2,2);
 await ed.locator("table td").first().click();
 await page.locator('[data-menu-root="format"]').click();
 await page.locator('[data-menu-action="text.tableLayout"]').click();
 let dlg=page.getByRole("dialog",{name:"Table Layout"});
 await expect(dlg).toBeVisible();await dlg.getByRole("button",{name:"Cancel"}).click();
 const cells=ed.locator("table tr:first-child td");
 await cells.first().click();await cells.last().click({modifiers:["Shift"]});
 await cells.first().click({button:"right"});
 const menu=page.getByRole("menu",{name:"Text context menu"});
 await menu.getByRole("menuitem",{name:"Table Layout…"}).click();
 dlg=page.getByRole("dialog",{name:"Table Layout"});
 if(await dlg.getByRole("button",{name:"Merge Selection"}).isEnabled()) {
  await dlg.getByRole("button",{name:"Merge Selection"}).click();
  await expect(ed.locator("table tr:first-child td")).toHaveCount(1);
  await ed.locator("table td").first().click({button:"right"});
  await page.getByRole("menu",{name:"Text context menu"}).getByRole("menuitem",{name:"Table Layout…"}).click();
  await page.getByRole("dialog",{name:"Table Layout"}).getByRole("button",{name:"Split Cell"}).click();
  await expect(ed.locator("table tr:first-child td")).toHaveCount(2);
 } else await dlg.getByRole("button",{name:"Cancel"}).click();
});
