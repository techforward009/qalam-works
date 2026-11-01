import {test,expect} from "@playwright/test";
test("Insert Table and Table Format text fields select all on both mouse focus and keyboard Tab",async({page})=>{
 await page.addInitScript(()=>localStorage.setItem("qalam-site-language","en"));
 await page.goto("/tools/document-studio");
 const editor=page.locator(".ProseMirror");await expect(editor).toBeEditable({timeout:30000});
 await editor.click();await page.locator('[data-menu-root="insert"]').click();await page.locator('[data-menu-action="insert.table"]').click();
 const insert=page.getByRole("dialog",{name:"Insert Table"});
 const rows=insert.getByRole("spinbutton",{name:"Rows"}),cols=insert.getByRole("spinbutton",{name:"Columns"}),width=insert.getByRole("textbox",{name:"Column Width"});
 await rows.click();await page.keyboard.type("3");await expect(rows).toHaveValue("3");
 await page.keyboard.press("Tab");await expect(cols).toBeFocused();await page.keyboard.type("3");await expect(cols).toHaveValue("3");
 await page.keyboard.press("Tab");await expect(width).toBeFocused();await page.keyboard.type("30mm");await expect(width).toHaveValue("30mm");
 await insert.getByRole("button",{name:"OK"}).click();
 await expect(editor.locator("table tr")).toHaveCount(3);
 await editor.locator("table td").first().click({button:"right"});
 await page.getByRole("menuitem",{name:"Table Format",exact:true}).click();
 const format=page.getByRole("dialog",{name:"Table Format"});
 for(const [field,value] of [["Column Width","30mm"],["Column Gap","2mm"],["Table Indent","10mm"],["Border Width","1.5pt"]] as const){
   await format.getByRole("textbox",{name:field}).click();await page.keyboard.type(value);
   await expect(format.getByRole("textbox",{name:field})).toHaveValue(value);
 }
 await format.getByRole("button",{name:"OK"}).click();
 await editor.locator("table td").first().click({button:"right"});
 await page.getByRole("menuitem",{name:"Table Format",exact:true}).click();
 await expect(page.getByRole("dialog",{name:"Table Format"}).getByRole("textbox",{name:"Column Width"})).toHaveValue("30mm");
});
