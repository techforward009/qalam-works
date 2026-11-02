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
async function matchesCurrentCaret(page:Page){
 const value=await page.evaluate(()=>{
  const selection=window.getSelection();
  const anchor=selection?.anchorNode;
  const element=anchor?.nodeType===Node.ELEMENT_NODE?anchor as Element:anchor?.parentElement;
  const inTable=!!element?.closest("table");
  return {label:inTable?"Table To Text…":selection&&!selection.isCollapsed?"Text To Table…":"Table…",inTable};
 });
 await state(page,value.label as "Table…"|"Text To Table…"|"Table To Text…",value.inTable);
}
test("Insert follows Tab, Shift+Tab, arrow keys, Home/End and undo/redo caret without typing",async({page})=>{
 const editor=await setup(page);
 await editor.locator("table td").first().click();
 await page.keyboard.press("Tab");
 await matchesCurrentCaret(page);
 await editor.locator("table td").nth(2).click();
 await page.keyboard.press("Shift+Tab");
 await matchesCurrentCaret(page);
 await editor.locator("table td").nth(1).click();
 for(const key of ["Home","ArrowLeft","ArrowRight","End"])await page.keyboard.press(key);
 await matchesCurrentCaret(page);
 await editor.locator(":scope > p").first().click();
 await page.keyboard.press("End");
 await page.keyboard.press("ArrowDown");
 await matchesCurrentCaret(page);
 await editor.locator("table td").nth(2).click();
 await page.locator('[data-menu-root="insert"]').click();
 await page.locator('[data-menu-action="insert.splitTable"]').click();
 for(const key of ["Control+z","Control+y"]){
   await editor.focus();
   await page.keyboard.press(key);
   await matchesCurrentCaret(page);
 }
 await editor.focus();
 await page.keyboard.press("Control+End");
 await matchesCurrentCaret(page);
});
