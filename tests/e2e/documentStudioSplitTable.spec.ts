import {test,expect,type Page} from "@playwright/test";
const words=["ایک","دو","تین","چار"];
async function openUrduEditor(page:Page){
 await page.addInitScript(()=>{localStorage.clear();localStorage.setItem("qalam-site-language","en");});
 await page.goto("/tools/document-studio");
 const ed=page.locator(".ProseMirror");
 await expect(ed).toBeEditable({timeout:30000});
 await ed.click();
 return ed;
}
async function insertTwoByTwo(page:Page){
 await page.locator('[data-menu-root="insert"]').click();
 await page.locator('[data-menu-action="insert.table"]').click();
 const dlg=page.getByRole("dialog",{name:"Insert Table"});
 await dlg.getByRole("spinbutton",{name:"Rows"}).fill("2");
 await dlg.getByRole("spinbutton",{name:"Columns"}).fill("2");
 await dlg.getByRole("button",{name:"OK",exact:true}).click();
 for(let i=0;i<4;i++){
  await page.keyboard.insertText(words[i]);
  if(i!==3)await page.keyboard.press("Tab");
 }
 await expect(page.locator(".ProseMirror table td")).toHaveCount(4);
}
async function split(page:Page){
 await page.locator('[data-menu-root="insert"]').click();
 const action=page.locator('[data-menu-action="insert.splitTable"]');
 await expect(action).toBeEnabled();
 await action.click();
}
test("first-block Urdu table: row-two action creates one nonoverlapping paragraph and undo restores it",async({page},info)=>{
 const ed=await openUrduEditor(page);
 await insertTwoByTwo(page);
 await expect(ed.locator(":scope > div.tableWrapper")).toHaveCount(1);
 const beforeTable=await ed.locator("table").evaluate(el=>el.outerHTML);
 const count=await page.locator("[data-studio-page-count]").getAttribute("data-studio-page-count");
 await ed.locator("table td").nth(2).click();
 await page.locator('[data-menu-root="insert"]').click();
 await expect(page.locator('[data-menu-action="insert.splitTable"]')).toBeEnabled();
 await page.locator('[data-menu-dropdown="insert"]').screenshot({path:info.outputPath("split-table-menu.png")});
 await page.locator('[data-menu-action="insert.splitTable"]').click();
 await expect.poll(()=>ed.locator(":scope > div.tableWrapper").evaluate(el=>el.previousElementSibling?.tagName)).toBe("P");
 await expect(ed.locator(":scope > p").first()).toBeEmpty();
 expect(await ed.locator("table").evaluate(el=>el.outerHTML)).toBe(beforeTable);
 await expect.poll(async()=>{
  const p=await ed.locator(":scope > p").first().boundingBox(),t=await ed.locator("table").boundingBox();
  return !!p&&!!t&&p.y+p.height<=t.y+2;
 }).toBe(true);
 await expect(page.locator("[data-studio-page-count]")).toHaveAttribute("data-studio-page-count",count!);
 await page.keyboard.press("Control+z");
 await expect.poll(()=>ed.locator(":scope > div.tableWrapper").evaluate(el=>el.previousElementSibling?.tagName)).toBe("DIV");
 expect(await ed.locator("table").evaluate(el=>el.outerHTML)).toBe(beforeTable);
 // Repeat, then use the inserted empty paragraph for Urdu text.
 await ed.locator("table td").nth(2).click();
 await split(page);
 await page.keyboard.insertText("سرخی");
 await expect(ed.locator(":scope > p").first()).toHaveText("سرخی");
 await page.screenshot({path:info.outputPath("split-table-heading.png")});
});
test("repeating the command adds two empty paragraphs before the unchanged Urdu table",async({page})=>{
 const ed=await openUrduEditor(page);
 await insertTwoByTwo(page);
 const tableHtml=await ed.locator("table").evaluate(el=>el.outerHTML);
 await ed.locator("table td").nth(2).click();
 await split(page);
 await ed.locator("table td").nth(2).click();
 await split(page);
 const preceding=await ed.locator(":scope > div.tableWrapper").evaluate(el=>{
  const lines:string[]=[];
  for(let p=el.previousElementSibling;p&&p.tagName==="P";p=p.previousElementSibling)lines.unshift(p.textContent||"");
  return lines;
 });
 expect(preceding).toEqual(["",""]);
 expect(await ed.locator("table").evaluate(el=>el.outerHTML)).toBe(tableHtml);
});
test("Insert-only item is grey in normal Urdu text; cell menu never contains it",async({page})=>{
 const ed=await openUrduEditor(page);
 await page.keyboard.insertText("عام عبارت");
 await page.locator('[data-menu-root="insert"]').click();
 await expect(page.locator('[data-menu-action="insert.splitTable"]')).toBeDisabled();
 await page.keyboard.press("Escape");
 await insertTwoByTwo(page);
 await ed.locator("table td").first().click();
 await page.locator('[data-menu-root="insert"]').click();
 await expect(page.locator('[data-menu-action="insert.splitTable"]')).toBeEnabled();
 await page.keyboard.press("Escape");
 await ed.locator("table td").first().click({button:"right"});
 await expect(page.getByRole("menu",{name:"Text context menu"}).getByRole("menuitem",{name:"Split Table"})).toHaveCount(0);
});
