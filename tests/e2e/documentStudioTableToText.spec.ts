import {test,expect,type Page} from "@playwright/test";
const words=["ایک","دو","تین","چار","پانچ","چھ"];
async function setup(page:Page) {
 await page.addInitScript(()=>localStorage.setItem("qalam-site-language","en"));
 await page.goto("/tools/document-studio");
 const ed=page.locator(".ProseMirror");await expect(ed).toBeEditable({timeout:30000});
 await ed.click();await page.locator('[data-menu-root="format"]').click();
 await page.locator('[data-menu-submenu="format.align"]').hover();
 await page.locator('[data-menu-action="format.rtl"]').click();
 await page.locator('[data-menu-root="insert"]').click();
 await page.locator('[data-menu-action="insert.table"]').click();
 const ins=page.getByRole("dialog",{name:"Insert Table"});
 await ins.getByRole("spinbutton",{name:"Rows"}).fill("2");
 await ins.getByRole("spinbutton",{name:"Columns"}).fill("3");
 await ins.getByRole("button",{name:"OK",exact:true}).click();
 for(let i=0;i<words.length;i++){await page.keyboard.type(words[i],{delay:20});if(i<words.length-1)await page.keyboard.press("Tab");}
 await expect(ed.locator("table td")).toHaveCount(6);
 return ed;
}
async function context(page:Page){
 await page.locator(".ProseMirror table td").nth(1).click({button:"right"});
 const menu=page.getByRole("menu",{name:"Text context menu"});
 await expect(menu.getByRole("menuitem",{name:"Table To Text…"})).toBeEnabled();
 await menu.getByRole("menuitem",{name:"Table To Text…"}).click();
 return page.getByRole("dialog",{name:"Table To Text"});
}
test("RTL context converts to Tabs, keeps order and one Undo restores table",async({page},info)=>{
 const ed=await setup(page),initial=await ed.evaluate(el=>el.innerHTML);
 const dialog=await context(page);
 await expect(dialog.getByRole("radio",{name:"Tabs"})).toBeChecked();
 await dialog.screenshot({path:info.outputPath("table-to-text-dialog.png")});
 await dialog.getByRole("button",{name:"OK",exact:true}).click();
 await expect(ed.locator("table")).toHaveCount(0);
 await expect(ed.locator("p").filter({hasText:"ایک"})).toContainText("ایک\tدو\tتین");
 await expect(ed.locator("p").filter({hasText:"چار"})).toContainText("چار\tپانچ\tچھ");
 await page.screenshot({path:info.outputPath("table-to-text-result.png")});
 await page.keyboard.press("Control+z");
 await expect(ed.locator("table td")).toHaveCount(6);
 await expect(ed.locator("table td").first()).toContainText("ایک");
});
test("Paragraph converts each Urdu cell, Esc and Cancel leave original intact",async({page})=>{
 const ed=await setup(page);
 let dialog=await context(page);await page.keyboard.press("Escape");
 await expect(dialog).toHaveCount(0);await expect(ed.locator("table")).toHaveCount(1);
 dialog=await context(page);await dialog.getByRole("button",{name:"Cancel"}).click();
 await expect(ed.locator("table")).toHaveCount(1);
 dialog=await context(page);await dialog.getByRole("radio",{name:"Paragraph"}).check();
 await dialog.getByRole("button",{name:"OK",exact:true}).click();
 await expect(ed.locator("table")).toHaveCount(0);
 for(const w of words)await expect(ed.locator("p").filter({hasText:w})).toHaveCount(1);
 await page.keyboard.press("Control+z");await expect(ed.locator("table td")).toHaveCount(6);
});
test("Insert menu Table To Text enables only when in table; Enter applies",async({page})=>{
 await page.addInitScript(()=>localStorage.setItem("qalam-site-language","en"));
 await page.goto("/tools/document-studio");const ed=page.locator(".ProseMirror");await ed.click();
 await page.locator('[data-menu-root="insert"]').click();
 await expect(page.locator('[data-menu-action="insert.tableToText"]')).toBeDisabled();
 await page.keyboard.press("Escape");
 await ed.locator("p").first().click({button:"right"});
 await expect(page.getByRole("menu",{name:"Text context menu"}).getByRole("menuitem",{name:"Table To Text…"})).toBeDisabled();
 await page.keyboard.press("Escape");
 await setup(page);await ed.locator("table td").first().click();
 await page.locator('[data-menu-root="insert"]').click();
 await expect(page.locator('[data-menu-action="insert.tableToText"]')).toBeEnabled();
 await page.locator('[data-menu-action="insert.tableToText"]').click();
 const dialog=page.getByRole("dialog",{name:"Table To Text"});await expect(dialog).toBeVisible();
 await page.keyboard.press("Enter");
 await expect(dialog).toHaveCount(0);await expect(ed.locator("table")).toHaveCount(0);
});
