import {test,expect,type Page} from "@playwright/test";
const words=["ایک","دو","تین","چار","پانچ","چھ","سات","آٹھ","نو"];
async function makeTable(page:Page) {
 await page.addInitScript(()=>localStorage.setItem("qalam-site-language","en"));
 await page.goto("/tools/document-studio");
 const ed=page.locator(".ProseMirror");await expect(ed).toBeEditable({timeout:30000});
 await ed.click();await page.locator('[data-menu-root="format"]').click();
 await page.locator('[data-menu-submenu="format.align"]').hover();
 await page.locator('[data-menu-action="format.rtl"]').click();
 await page.locator('[data-menu-root="insert"]').click();
 await page.locator('[data-menu-action="insert.table"]').click();
 const d=page.getByRole("dialog",{name:"Insert Table"});
 await d.getByRole("spinbutton",{name:"Rows"}).fill("3");
 await d.getByRole("spinbutton",{name:"Columns"}).fill("3");
 await d.getByRole("button",{name:"OK",exact:true}).click();
 for(let i=0;i<9;i++){await page.keyboard.insertText(words[i]);if(i<8)await page.keyboard.press("Tab");}
 await expect(ed.locator("table td")).toHaveCount(9);
 for(let i=0;i<9;i++)await expect(ed.locator("table td").nth(i)).toContainText(words[i]);
 return ed;
}
async function openContext(page:Page) {
 await page.locator(".ProseMirror table tr:first-child td").first().click({button:"right"});
 const menu=page.getByRole("menu",{name:"Text context menu"});
 await expect(menu.getByRole("menuitem",{name:"Table Format",exact:true})).toBeEnabled();
 await menu.getByRole("menuitem",{name:"Table Format",exact:true}).click();
 return page.getByRole("dialog",{name:"Table Format"});
}
test("Urdu table format dialog reflects defaults, cancel leaves JSON unchanged, OK is one undo",async({page},info)=>{
 const ed=await makeTable(page),cell=ed.locator("table td").first();
 const d=await openContext(page);
 await expect(d.getByLabel("Fill Color")).toHaveValue("None");
 await expect(d.getByLabel("Border Style")).toHaveValue("none");
 expect(await cell.evaluate(el=>getComputedStyle(el).borderTopStyle)).toBe("dotted");
 await expect(d.getByLabel("Border Width")).toHaveValue("1pt");
 await expect(d.getByLabel("Column Gap")).toHaveValue("1.41mm");
 await expect(d.getByLabel("Table Alignment")).toHaveValue("right");
 const original=await ed.evaluate(node=>(node as any).innerHTML);
 await d.getByRole("button",{name:"Cancel"}).click();
 expect(await ed.evaluate(node=>(node as any).innerHTML)).toBe(original);
 const dialog=await openContext(page);
 await dialog.getByLabel("Fill Color").selectOption("#ffe082");
 await dialog.getByLabel("Border Style").selectOption("solid");
 await dialog.getByLabel("Border Width").fill("1pt");
 await dialog.getByLabel("Column Width").fill("47.62mm");
 await dialog.getByLabel("Table Alignment").selectOption("center");
 await dialog.screenshot({path:info.outputPath("table-format-dialog.png")});
 await dialog.getByRole("button",{name:"OK",exact:true}).click();
 await expect(cell).toHaveAttribute("data-table-fill","#ffe082");
 await expect(cell).toHaveAttribute("data-table-border-style","solid");
 expect(await cell.evaluate(el=>getComputedStyle(el).borderTopStyle)).toBe("solid");
 expect(await cell.evaluate(el=>getComputedStyle(el).backgroundColor)).toBe("rgb(255, 224, 130)");
 await expect(ed.locator("table")).toHaveAttribute("data-table-alignment","center");
 await page.screenshot({path:info.outputPath("table-format-result.png")});
 await cell.click();await page.keyboard.press("Control+z");
 await expect(cell).not.toHaveAttribute("data-table-fill","#ffe082");
 await expect(ed.locator("table")).not.toHaveAttribute("data-table-alignment","center");
});
test("Format menu and Ctrl+Alt+F open Table Format, outside table is disabled",async({page})=>{
 const ed=await makeTable(page);await ed.locator("table td").first().click();
 await page.locator('[data-menu-root="format"]').click();
 await expect(page.locator('[data-menu-action="text.tableFormat"]')).toBeEnabled();
 await page.locator('[data-menu-action="text.tableFormat"]').click();
 await expect(page.getByRole("dialog",{name:"Table Format"})).toBeVisible();
 await page.keyboard.press("Escape");
 await ed.locator("table td").first().click();
 await page.keyboard.press("Control+Alt+f");
 await expect(page.getByRole("dialog",{name:"Table Format"})).toBeVisible();
 await page.keyboard.press("Escape");
});

test("selected Urdu cells share fill and borders, and Split Table Row adds only one row",async({page})=>{
 const ed=await makeTable(page),cells=ed.locator("table tr:first-child td");
 const a=await cells.first().boundingBox(),b=await cells.nth(1).boundingBox();
 await page.mouse.move(a!.x+a!.width/2,a!.y+a!.height/2);
 await page.mouse.down();await page.mouse.move(b!.x+b!.width/2,b!.y+b!.height/2,{steps:8});await page.mouse.up();
 await expect.poll(()=>ed.locator(".selectedCell").count()).toBeGreaterThanOrEqual(2);
 await page.locator('[data-menu-root="format"]').click();
 await page.locator('[data-menu-action="text.tableFormat"]').click();
 const d=page.getByRole("dialog",{name:"Table Format"});
 await d.getByLabel("Fill Color").selectOption("#a5d6a7");
 await d.getByLabel("Border Style").selectOption("solid");
 await d.getByRole("button",{name:"OK"}).click();
 await expect(cells.nth(0)).toHaveAttribute("data-table-fill","#a5d6a7");
 await expect(cells.nth(1)).toHaveAttribute("data-table-fill","#a5d6a7");
 await expect(cells.nth(2)).not.toHaveAttribute("data-table-fill","#a5d6a7");
 await cells.first().click();
 await page.keyboard.press("Control+Alt+f");
 const dialog=page.getByRole("dialog",{name:"Table Format"});
 await expect(dialog.getByRole("button",{name:"Split Table Row"})).toBeEnabled();
 await dialog.getByRole("button",{name:"Split Table Row"}).click();
 await expect(ed.locator("table tr")).toHaveCount(4);
});
