import {test,expect,type Page} from "@playwright/test";

async function settledOnePage(page:Page) {
 const table=page.locator(".ProseMirror table.qalam-document-table");
 await expect(table).toBeVisible();
 await expect(page.locator("[data-studio-page-label]")).toHaveText("1/1");
 const paper=page.locator('[data-studio-page-paper="1"]');
 await expect(paper).toBeVisible();
 expect(await table.evaluate((element,sheet)=>{
   const t=element.getBoundingClientRect(),p=document.querySelector(sheet)!.getBoundingClientRect();
   return t.top>=p.top-2&&t.top<p.bottom&&t.left>=p.left-2&&t.right<=p.right+2;
 },'[data-studio-page-paper="1"]')).toBe(true);
 await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())))));
 await expect(page.locator("[data-studio-page-label]")).toHaveText("1/1");
 await page.screenshot({path:test.info().outputPath("table-page-1.png")});
}

async function openInsert(page:Page) {
 const story=page.locator(".ProseMirror");
 await story.locator("p").first().click({button:"right"});
 await page.getByRole("menu",{name:"Text context menu"}).getByRole("menuitem",{name:"Table…",exact:true}).click();
 return page.getByRole("dialog",{name:"Insert Table"});
}

test.beforeEach(async({page})=>{
 await page.addInitScript(()=>localStorage.setItem("qalam-site-language","en"));
 await page.goto("/tools/document-studio");
 await expect(page.locator(".ProseMirror")).toBeEditable({timeout:30000});
});

test("Insert Table 3x2 Auto remains on page 1 and does not runaway",async({page})=>{
 const d=await openInsert(page);
 await d.getByRole("spinbutton",{name:"Rows"}).fill("3");
 await d.getByRole("spinbutton",{name:"Columns"}).fill("2");
 await d.getByRole("button",{name:"OK",exact:true}).click();
 await expect(page.locator(".ProseMirror tr")).toHaveCount(3);
 await settledOnePage(page);
});
test("Insert Table still works after grey-page-area click invalidates target",async({page})=>{
 await page.locator("[data-studio-scroller]").click({position:{x:5,y:5}});
 await page.locator('[data-menu-root="insert"]').click();
 await page.locator('[data-menu-action="insert.table"]').click();
 const d=page.getByRole("dialog",{name:"Insert Table"});
 await d.getByRole("button",{name:"OK",exact:true}).click();
 await settledOnePage(page);
});
for(const mode of ["Tabs","Paragraph"] as const) {
 test(`Text To Table ${mode} three lines stays on first page`,async({page})=>{
   const story=page.locator(".ProseMirror");
   await story.click();
   for(let i=0;i<3;i++){
     await page.keyboard.insertText("aaa");
     await page.keyboard.press("Tab");
     await page.keyboard.insertText("bbb");
     if(i<2)await page.keyboard.press("Enter");
   }
   await page.keyboard.press("Control+a");
   await story.locator("p").first().click({button:"right"});
   await page.getByRole("menu",{name:"Text context menu"}).getByRole("menuitem",{name:"Text To Table…",exact:true}).click();
   const d=page.getByRole("dialog",{name:"Text To Table"});
   await d.getByRole("radio",{name:mode}).check();
   await d.getByRole("button",{name:"OK"}).click();
   await expect(story.locator("tr")).toHaveCount(3);
   await expect(story.locator("tr").first().locator("td")).toHaveCount(mode==="Tabs"?2:1);
   await settledOnePage(page);
 });
}
for(const dir of ["rtl","ltr"] as const) {
 test(`Tab follows ${dir} cell order and Shift+Tab reverses; last cell adds a row`,async({page})=>{
  const story=page.locator(".ProseMirror");
  await story.click();
  await page.locator('[data-menu-root="format"]').click();
  await page.locator('[data-menu-submenu="format.align"]').hover();
  await page.locator(`[data-menu-action="format.${dir}"]`).click();
  await page.locator('[data-menu-root="insert"]').click();
  await page.locator('[data-menu-action="insert.table"]').click();
  const d=page.getByRole("dialog",{name:"Insert Table"});
  await d.getByRole("button",{name:"OK",exact:true}).click();
  const cells=story.locator("table tr:first-child td");
  await expect(cells).toHaveCount(2);
  const boxes=await cells.evaluateAll(els=>els.map(e=>e.getBoundingClientRect().left));
  expect(dir==="rtl"?boxes[0]>boxes[1]:boxes[0]<boxes[1]).toBe(true);
  await cells.first().click();
  await page.keyboard.press("Tab");
  await expect.poll(()=>page.evaluate(()=>document.getSelection()?.anchorNode?.parentElement?.closest("td")?.cellIndex)).toBe(1);
  await page.keyboard.press("Shift+Tab");
  await expect.poll(()=>page.evaluate(()=>document.getSelection()?.anchorNode?.parentElement?.closest("td")?.cellIndex)).toBe(0);
  await cells.last().click();await page.keyboard.press("Tab");
  await expect(story.locator("table tr")).toHaveCount(2);
  await settledOnePage(page);
 });
}
