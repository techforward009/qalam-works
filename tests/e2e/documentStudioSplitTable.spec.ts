import {test,expect,type Page} from "@playwright/test";
const words=["ایک","دو","تین","چار"];
async function setup(page:Page){
 await page.addInitScript(()=>{localStorage.clear();localStorage.setItem("qalam-site-language","en");});
 await page.goto("/tools/document-studio");
 const ed=page.locator(".ProseMirror");await expect(ed).toBeEditable({timeout:30000});
 await ed.click();
 await page.locator('[data-menu-root="insert"]').click();
 await page.locator('[data-menu-action="insert.table"]').click();
 const dlg=page.getByRole("dialog",{name:"Insert Table"});
 await dlg.getByRole("spinbutton",{name:"Rows"}).fill("2");
 await dlg.getByRole("spinbutton",{name:"Columns"}).fill("2");
 await dlg.getByRole("button",{name:"OK",exact:true}).click();
 for(let i=0;i<4;i++){await page.keyboard.insertText(words[i]);if(i!==3)await page.keyboard.press("Tab");}
 await expect(ed.locator("table td")).toHaveCount(4);
 return ed;
}
async function split(page:Page){
 await page.locator('[data-menu-root="insert"]').click();
 const item=page.locator('[data-menu-action="insert.splitTable"]');
 await expect(item).toBeEnabled();
 await item.click();
}
test("table first: row-two Split Table leaves table intact, types Urdu above it and undo restores",async({page},info)=>{
 const ed=await setup(page);
 await expect(ed.locator(":scope > table")).toHaveCount(1);
 const beforeTable=await ed.locator("table").evaluate(el=>el.outerHTML);
 const count=await page.locator("[data-studio-page-count]").getAttribute("data-studio-page-count");
 await ed.locator("table td").nth(2).click();
 await page.locator('[data-menu-root="insert"]').click();
 await expect(page.locator('[data-menu-action="insert.splitTable"]')).toBeEnabled();
 await page.locator('[data-menu-dropdown="insert"]').screenshot({path:info.outputPath("split-table-enabled-in-insert.png")});
 await page.locator('[data-menu-action="insert.splitTable"]').click();
 await expect(ed.locator(":scope > p")).toHaveCount(1);
 await expect(ed.locator(":scope > p").first()).toBeEmpty();
 await expect(ed.locator(":scope > table")).toHaveCount(1);
 await expect(ed.locator("table").evaluate(el=>el.outerHTML)).resolves.toBe(beforeTable);
 await page.keyboard.insertText("سرخی");
 await expect(ed.locator(":scope > p").first()).toHaveText("سرخی");
 await expect.poll(async()=>{
  const p=await ed.locator(":scope > p").first().boundingBox(),t=await ed.locator("table").boundingBox();
  return !!p&&!!t&&p.y+p.height<=t.y+2;
 }).toBe(true);
 await expect(page.locator("[data-studio-page-count]")).toHaveAttribute("data-studio-page-count",count!);
 await page.screenshot({path:info.outputPath("split-table-urdu-heading.png")});
 await page.keyboard.press("Control+z");
 await expect(ed.locator("table")).toHaveCount(1);
});
test("surrounding Urdu text remains and Split Table twice inserts two blank lines",async({page})=>{
 const ed=await setup(page);
 await ed.locator("table").first().click();
 await page.keyboard.press("Control+Home");
 await page.keyboard.insertText("پہلے");
 await page.keyboard.press("End");
 await page.keyboard.press("Enter");
 await ed.locator("table td").nth(2).click();
 await split(page);
 await ed.locator("table td").nth(2).click();
 await split(page);
 const paragraphs=ed.locator(":scope > p");
 await expect(paragraphs).toHaveCount(3);
 await expect(paragraphs.nth(0)).toHaveText("پہلے");
 await expect(paragraphs.nth(1)).toBeEmpty();
 await expect(paragraphs.nth(2)).toBeEmpty();
 await expect(ed.locator("table td")).toHaveCount(4);
});
test("Split Table only enabled in table and absent from cell context menu",async({page})=>{
 const ed=await setup(page);
 await ed.locator("table td").first().click();
 await page.locator('[data-menu-root="insert"]').click();
 await expect(page.locator('[data-menu-action="insert.splitTable"]')).toBeEnabled();
 await page.keyboard.press("Escape");
 await ed.locator("table td").first().click({button:"right"});
 await expect(page.getByRole("menu",{name:"Text context menu"}).getByRole("menuitem",{name:"Split Table"})).toHaveCount(0);
 await page.keyboard.press("Escape");
 await ed.locator("table").last().click();
 await page.keyboard.press("Control+End");
 await page.keyboard.press("ArrowDown");
 await page.locator('[data-menu-root="insert"]').click();
 // When the caret is still inside the final cell, navigate to normal prose before asserting disabled.
 await page.keyboard.press("Escape");
 await page.keyboard.press("Control+Home");
 await page.keyboard.press("ArrowLeft");
 await page.locator('[data-menu-root="insert"]').click();
 await expect(page.locator('[data-menu-action="insert.splitTable"]')).toBeDisabled();
});
