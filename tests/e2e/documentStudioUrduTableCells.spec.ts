import {test,expect,type Page} from "@playwright/test";

const WORDS=["ایک","دو","تین","چار","پانچ","چھ","سات","آٹھ","نو"];

async function insertUrduTable(page:Page) {
  await page.addInitScript(()=>localStorage.setItem("qalam-site-language","en"));
  await page.goto("/tools/document-studio");
  const editor=page.locator(".ProseMirror");
  await expect(editor).toBeEditable({timeout:30000});
  await editor.click();
  await page.locator('[data-menu-root="format"]').click();
  const alignSubmenu=page.locator('[data-menu-submenu="format.align"]');
  if(await page.evaluate(()=>window.matchMedia("(max-width: 639px)").matches)){
    await alignSubmenu.click();
  }else{
    await alignSubmenu.hover();
  }
  await expect(page.locator('[data-menu-action="format.rtl"]')).toBeVisible();
  await page.locator('[data-menu-action="format.rtl"]').click();
  await page.locator('[data-menu-root="insert"]').click();
  await page.locator('[data-menu-action="insert.table"]').click();
  const dialog=page.getByRole("dialog",{name:"Insert Table"});
  await dialog.getByRole("spinbutton",{name:"Rows"}).fill("3");
  await dialog.getByRole("spinbutton",{name:"Columns"}).fill("3");
  await dialog.getByRole("button",{name:"OK",exact:true}).click();
  await expect(editor.locator("table tr")).toHaveCount(3);
  return editor;
}

test("nine complete Urdu words fill their own RTL cells and reverse Tab moves to previous cell",async({page})=>{
  const editor=await insertUrduTable(page);
  const cells=editor.locator("table td");
  await expect.poll(()=>page.evaluate(cellAtCaret)).toEqual({row:0,col:0});
  for(let i=0;i<WORDS.length;i++){
    await page.keyboard.type(WORDS[i],{delay:40});
    await expect.poll(()=>page.evaluate(cellAtCaret)).toEqual({row:Math.floor(i/3),col:i%3});
    await expect(cells.nth(i)).toHaveText(WORDS[i]);
    if(i===4) {
      // Shift+Tab must move left-to-right back within row 2, not down a row.
      await page.keyboard.press("Shift+Tab");
      await expect.poll(()=>page.e...[truncated]