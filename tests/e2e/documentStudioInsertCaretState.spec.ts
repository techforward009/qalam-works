import {test,expect,type Page} from "@playwright/test";

async function setup(page:Page) {
 await page.addInitScript(()=>{localStorage.clear();localStorage.setItem("qalam-site-language","en");});
 await page.goto(process.env.QALAM_CARET_PREVIEW_URL || "/tools/document-studio");
 const editor=page.locator(".ProseMirror");
 await expect(editor).toBeEditable({timeout:30000});
 await editor.click();
 await page.keyboard.insertText("پہلے");
 await page.keyboard.press("Enter");
 await page.locator('[data-menu-root="insert"]').click();
 await page.locator('[data-menu-action="insert.table"]').click();
 const dialog=page.getByRole("dialog",{name:"Insert Table"});
 await dialog.getByRole("spinbutton",{name:"Rows"}).fill("2");
 await dialog.getByRole("spinbutton",{name:"Columns"}).fill("2");
 await dialog.getByRole("button",{name:"OK",exact:true}).click();
 for(const [i,word] of ["ایک","دو","تین","چار"].entries()){
   await page.keyboard.insertText(word);
   if(i<3)await page.keyboard.press("Tab");
 }
 await expect(editor.locator("table td")).toHaveCount(4);
 // The trailing paragraph is outside the table; populate it without editing a cell afterwards.
 await editor.locator(":scope > p").last().click();
 await page.keyboard.insertText("بعد");
 await expect(editor.locator(":scope > p").last()).toContainText("بعد");
 return editor;
}
async function state(page:Page,label:"Table…"|"Text To Table…"|"Table To Text…",enabled:boolean) {
 await page.locator('[data-menu-root="insert"]').click();
 const dropdown=page.locator('[data-menu-dropdown="insert"]');
 await expect(dropdown.locator('[data-menu-action="insert.table"],[data-menu-action="insert.textToTable"],[data-menu-action="insert.tableToText"]')).toHaveCount(1);
 const id=label==="Table To Text…"?"insert.tableToText":label==="Text To Table…"?"insert.textToTable":"insert.table";
 await expect(dropdown.locator('[data-menu-action="'+id+'"]')).toHaveText(label);
 if(enabled)await expect(dropdown.locator('[data-menu-action="insert.splitTable"]')).toBeEnabled();
 else await expect(dropdown.locator('[data-menu-action="insert.splitTable"]')).toBeDisabled();
 await page.keyboard.press("Escape");
}
test("Insert menu reads current mouse-only Urdu caret and selected text, both directions",async({page},info)=>{
 const editor=await setup(page);
 await editor.locator("table td").nth(2).click();
 await state(page,"Table To Text…",true);
 await editor.locator("table td").nth(0).click();
 await page.locator('[data-menu-root="insert"]').click();
 await page.locator('[data-menu-dropdown="insert"]').screenshot({path:info.outputPath("insert-table-caret.png")});
 await expect(page.locator('[data-menu-action="insert.splitTable"]')).toBeEnabled();
 await page.keyboard.press("Escape");
 await editor.locator(":scope > p").first().click();
 await state(page,"Table…",false);
 await editor.locator(":scope > p").first().click({clickCount:3});
 await expect.poll(()=>page.evaluate(()=>window.getSelection()?.toString()||"")).toContain("پہلے");
 await page.locator('[data-menu-root="insert"]').click();
 await page.locator('[data-menu-dropdown="insert"]').screenshot({path:info.outputPath("insert-selected-urdu.png")});
 await expect(page.locator('[data-menu-action="insert.textToTable"]')).toHaveText("Text To Table…");
 await expect(page.locator('[data-menu-action="insert.splitTable"]')).toBeDisabled();
 await page.keyboard.press("Escape");
 await editor.locator("table td").last().click();
 await state(page,"Table To Text…",true);
 await editor.locator(":scope > p").last().click();
 await state(page,"Table…",false);
});
test("Insert menu follows Tab, Shift+Tab, arrows, Home/End, undo and redo without cell typing",async({page})=>{
 const editor=await setup(page);
 await editor.locator("table td").first().click();
 await page.keyboard.press("Tab");
 await state(page,"Table To Text…",true);
 await page.keyboard.press("Shift+Tab");
 await state(page,"Table To Text…",true);
 await page.keyboard.press("Home");
 await page.keyboard.press("ArrowRight");
 await page.keyboard.press("End");
 await state(page,"Table To Text…",true);
 await editor.locator(":scope > p").first().click();
 await page.keyboard.press("End");
 await page.keyboard.press("ArrowDown");
 const inside=await page.evaluate(()=>!!(window.getSelection()?.anchorNode?.parentElement?.closest("table")));
 await state(page,inside?"Table To Text…":"Table…",inside);
 await editor.locator("table td").nth(2).click();
 await page.locator('[data-menu-root="insert"]').click();
 await page.locator('[data-menu-action="insert.splitTable"]').click();
 for(const key of ["Control+z","Control+y"]){
   await page.keyboard.press(key);
   const selected=await page.evaluate(()=>{
    const sel=window.getSelection();
    const ancestor=sel?.anchorNode?.nodeType===Node.ELEMENT_NODE?sel.anchorNode as Element:sel?.anchorNode?.parentElement;
    return !!ancestor?.closest("table");
   });
   await state(page,selected?"Table To Text…":"Table…",selected);
 }
 await page.keyboard.press("Control+End");
 const inTable=await page.evaluate(()=>!!window.getSelection()?.anchorNode?.parentElement?.closest("table"));
 await state(page,inTable?"Table To Text…":"Table…",inTable);
});
