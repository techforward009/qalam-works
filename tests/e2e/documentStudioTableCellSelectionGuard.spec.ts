import {test,expect,type Page} from "@playwright/test";

const WORDS=["اردو متن","پاکستان","لاہور","کراچی","اسلام آباد","پشاور","کوئٹہ","ملتان","فیصل آباد"];

async function urduTable(page:Page) {
  await page.addInitScript(()=>localStorage.setItem("qalam-site-language","en"));
  await page.goto("/tools/document-studio");
  const editor=page.locator(".ProseMirror");
  await expect(editor).toBeEditable({timeout:30000});
  await editor.click();
  await page.locator('[data-menu-root="insert"]').click();
  await page.locator('[data-menu-action="insert.table"]').click();
  const dialog=page.getByRole("dialog",{name:"Insert Table"});
  await dialog.getByRole("spinbutton",{name:"Rows"}).fill("3");
  await dialog.getByRole("spinbutton",{name:"Columns"}).fill("3");
  await dialog.getByRole("button",{name:"OK",exact:true}).click();
  await expect(editor.locator("table tr")).toHaveCount(3);
  for(let i=0;i<WORDS.length;i++){
    await page.keyboard.type(WORDS[i]);
    if(i<WORDS.length-1)await page.keyboard.press("Tab");
  }
  const cells=editor.locator("table td");
  await expect(cells).toHaveCount(9);
  return {editor,cells};
}

async function dragSelect(page:Page,cells:ReturnType<Page["locator"]>,from:number,to:number) {
  const a=(await cells.nth(from).boundingBox())!,b=(await cells.nth(to).boundingBox())!;
  await page.mouse.move(a.x+a.width/2,a.y+a.height/2);
  await page.mouse.down();
  await page.mouse.move(a.x+a.width/2-20,a.y+a.height/2,{steps:4});
  await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:10});
  await page.mouse.up();
  await expect(page.locator(".ProseMirror td.selectedCell")).toHaveCount(4);
}

test("clicking another cell after a 4-cell selection clears it; Space only adds a space there",async({page})=>{
  const {cells}=await urduTable(page);
  await dragSelect(page,cells,0,4);
  await cells.nth(8).click();
  await expect(page.locator(".ProseMirror td.selectedCell")).toHaveCount(0);
  await page.keyboard.press("Space");
  for(const i of [0,1,2,3,4,5,6,7])await expect(cells.nth(i)).toHaveText(WORDS[i]);
  await expect(cells.nth(8)).toHaveText(new RegExp(`^\\s?${WORDS[8]}\\s?$`));
  expect((await cells.nth(8).innerText()).replace(/\s/g,"")).toBe(WORDS[8].replace(/\s/g,""));
});

test("typing over an active cell selection replaces only the drag-start cell; one Ctrl+Z restores it",async({page})=>{
  const {cells}=await urduTable(page);
  await dragSelect(page,cells,0,4);
  await page.keyboard.press("Space");
  await expect(cells.nth(0)).toHaveText(" ");
  await expect(cells.nth(1)).toHaveText(WORDS[1]);
  await expect(cells.nth(3)).toHaveText(WORDS[3]);
  await expect(cells.nth(4)).toHaveText(WORDS[4]);
  await page.keyboard.press("Control+z");
  for(let i=0;i<WORDS.length;i++)await expect(cells.nth(i)).toHaveText(WORDS[i]);
});
