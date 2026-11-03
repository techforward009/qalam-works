import {test,expect,type Page,type Locator} from "@playwright/test";

/**
 * Real-input regression for hidden table CellSelection data loss.
 * Everything here uses page.mouse / page.keyboard only: mousedown, intermediate
 * mousemoves, mouseup and a separate plain click — never a synthetic selection.
 */
const WORDS=["اردو متن","پاکستان","لاہور","کراچی","اسلام آباد","پشاور","کوئٹہ","ملتان","فیصل آباد"];
// 2x2 block of the 3x3 table: cells 0,1,3,4 (drag starts in cell 0, ends in cell 4).
const BLOCK=[0,1,3,4];

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

async function centre(cell:Locator) {
  const box=(await cell.boundingBox())!;
  return {x:box.x+box.width/2,y:box.y+box.height/2};
}

/** Real mouse drag from the first cell to the diagonal cell of the 2x2 block. */
async function dragSelectBlock(page:Page,cells:Locator) {
  const a=await centre(cells.nth(0)),b=await centre(cells.nth(4));
  await page.mouse.move(a.x,a.y);
  await page.mouse.down();
  await page.mouse.move(b.x,b.y,{steps:10});
  await page.mouse.up();
  await expect(page.locator(".ProseMirror td.selectedCell")).toHaveCount(4);
}

async function realClick(page:Page,cell:Locator) {
  const c=await centre(cell);
  await page.mouse.click(c.x,c.y);
}

async function texts(cells:Locator) {
  return (await cells.allInnerTexts()).map(text=>text.replace(/[\u200b-\u200f\u202a-\u202e\ufeff\r\n]/g,""));
}

async function expectOriginalExcept(cells:Locator,except:number[]) {
  const actual=await texts(cells);
  WORDS.forEach((word,i)=>{if(!except.includes(i))expect(actual[i],`cell ${i}`).toBe(word);});
}

test("click OUTSIDE a real-mouse 2x2 block, then Space: block keeps Urdu, only clicked cell gains a space",async({page})=>{
  const {cells}=await urduTable(page);
  await dragSelectBlock(page,cells);
  await realClick(page,cells.nth(8));
  await expect(page.locator(".ProseMirror td.selectedCell")).toHaveCount(0);
  await page.keyboard.press("Space");
  await expectOriginalExcept(cells,[8]);
  const clicked=(await texts(cells))[8];
  expect(clicked.replace(/ /g,"")).toBe(WORDS[8].replace(/ /g,""));
  expect(clicked.length).toBe(WORDS[8].length+1);
});

test("click INSIDE a real-mouse 2x2 block, then Space: block keeps Urdu, only clicked cell gains a space",async({page})=>{
  const {cells}=await urduTable(page);
  await dragSelectBlock(page,cells);
  await realClick(page,cells.nth(3));
  await expect(page.locator(".ProseMirror td.selectedCell")).toHaveCount(0);
  await page.keyboard.press("Space");
  await expectOriginalExcept(cells,[3]);
  const clicked=(await texts(cells))[3];
  expect(clicked.replace(/ /g,"")).toBe(WORDS[3].replace(/ /g,""));
  expect(clicked.length).toBe(WORDS[3].length+1);
});

test("Delete, Ctrl+Z restores the block, click elsewhere, Space: no cell is wiped",async({page})=>{
  const {cells}=await urduTable(page);
  await dragSelectBlock(page,cells);
  await page.keyboard.press("Delete");
  const emptied=await texts(cells);
  for(const i of BLOCK)expect(emptied[i],`cell ${i} emptied by Delete`).toBe("");
  await page.keyboard.press("Control+z");
  await expectOriginalExcept(cells,[]);
  await realClick(page,cells.nth(8));
  await page.keyboard.press("Space");
  await expectOriginalExcept(cells,[8]);
});

test("typing a letter over a selected block replaces only the drag-start cell; one Ctrl+Z restores it",async({page})=>{
  const {cells}=await urduTable(page);
  await dragSelectBlock(page,cells);
  await page.keyboard.press("x");
  const after=await texts(cells);
  expect(after[0]).toBe("x");
  for(const i of [1,2,3,4,5,6,7,8])expect(after[i],`cell ${i}`).toBe(WORDS[i]);
  await expect(page.locator(".ProseMirror td.selectedCell")).toHaveCount(0);
  await page.keyboard.press("Control+z");
  await expectOriginalExcept(cells,[]);
});

test("drag selecting from the bottom-right cell makes THAT cell the first cell (not document order)",async({page})=>{
  const {cells}=await urduTable(page);
  const a=await centre(cells.nth(4)),b=await centre(cells.nth(0));
  await page.mouse.move(a.x,a.y);
  await page.mouse.down();
  await page.mouse.move(b.x,b.y,{steps:10});
  await page.mouse.up();
  await expect(page.locator(".ProseMirror td.selectedCell")).toHaveCount(4);
  await page.keyboard.press("Space");
  const after=await texts(cells);
  expect(after[4]).toBe(" ");
  for(const i of [0,1,2,3,5,6,7,8])expect(after[i],`cell ${i}`).toBe(WORDS[i]);
});

test("Space and Backspace over a selected block touch only the first cell",async({page})=>{
  const {cells}=await urduTable(page);
  await dragSelectBlock(page,cells);
  await page.keyboard.press("Backspace");
  const after=await texts(cells);
  expect(after[0]).toBe("");
  for(const i of [1,2,3,4,5,6,7,8])expect(after[i],`cell ${i}`).toBe(WORDS[i]);
  await expect(page.locator(".ProseMirror td.selectedCell")).toHaveCount(0);
});

test("Delete empties every selected cell at once and one Ctrl+Z restores and re-selects the block",async({page})=>{
  const {cells}=await urduTable(page);
  await dragSelectBlock(page,cells);
  await page.keyboard.press("Delete");
  const after=await texts(cells);
  for(const i of BLOCK)expect(after[i],`cell ${i}`).toBe("");
  for(const i of [2,5,6,7,8])expect(after[i],`cell ${i}`).toBe(WORDS[i]);
  await page.keyboard.press("Control+z");
  await expectOriginalExcept(cells,[]);
  await expect(page.locator(".ProseMirror td.selectedCell")).toHaveCount(4);
});

test("shift+click extends and right-click keeps a real-mouse cell selection",async({page})=>{
  const {cells}=await urduTable(page);
  const a=await centre(cells.nth(0)),b=await centre(cells.nth(1));
  await page.mouse.move(a.x,a.y);
  await page.mouse.down();
  await page.mouse.move(b.x,b.y,{steps:10});
  await page.mouse.up();
  await expect(page.locator(".ProseMirror td.selectedCell")).toHaveCount(2);
  const c=await centre(cells.nth(4));
  await page.keyboard.down("Shift");
  await page.mouse.click(c.x,c.y);
  await page.keyboard.up("Shift");
  await expect(page.locator(".ProseMirror td.selectedCell")).toHaveCount(4);
  await page.mouse.click(c.x,c.y,{button:"right"});
  await expect(page.locator(".ProseMirror td.selectedCell")).toHaveCount(4);
});
