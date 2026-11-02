import {test,expect,type Page} from "@playwright/test";
const mm=96/25.4;
async function create(page:Page){
 await page.addInitScript(()=>{localStorage.clear();localStorage.setItem("qalam-site-language","en")});
 await page.goto(process.env.QALAM_PARITY_URL||"/tools/document-studio");
 const ed=page.locator(".ProseMirror");await expect(ed).toBeEditable({timeout:30000});
 await ed.click();await page.locator('[data-menu-root="insert"]').click();await page.locator('[data-menu-action="insert.table"]').click();
 const d=page.getByRole("dialog",{name:"Insert Table"});
 await d.getByRole("spinbutton",{name:"Rows"}).fill("2");
 await d.getByRole("spinbutton",{name:"Columns"}).fill("3");
 await d.getByRole("button",{name:"OK",exact:true}).click();
 for(const [i,s] of ["ایک","دو","تین","چار","پانچ","چھ"].entries()){
  await page.keyboard.insertText(s);if(i<5)await page.keyboard.press("Tab");
 }
 await expect(ed.locator("table td")).toHaveCount(6);
 return ed;
}
async function dialog(page:Page,col:number,key=false){
 await page.locator(".ProseMirror table tr:first-child td").nth(col).click();
 if(key)await page.keyboard.press("Control+Alt+f");
 else{
  await page.locator(".ProseMirror table tr:first-child td").nth(col).click({button:"right"});
  await page.getByRole("menu",{name:"Text context menu"}).getByRole("menuitem",{name:"Table Format…"}).click();
 }
 return page.getByRole("dialog",{name:"Table Format"});
}
test("each RTL column retains independent 20, 50, 30 mm width and displays same dialog value",async({page},info)=>{
 const ed=await create(page);
 for(const [i,width] of [20,50,30].entries()){
  const before=await ed.locator("table tr:first-child td").evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().width));
  const d=await dialog(page,i,i===1);
  await d.getByRole("textbox",{name:"Column Width"}).fill(width+"mm");
  await d.getByRole("button",{name:"OK",exact:true}).click();
  const after=await ed.locator("table tr:first-child td").evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().width));
  for(let other=0;other<3;other++)if(other!==i)expect(Math.abs(after[other]-before[other])/(96/25.4)).toBeLessThanOrEqual(.5);
  const again=await dialog(page,i);
  await expect(again.getByRole("textbox",{name:"Column Width"})).toHaveValue(width+"mm");
  await again.getByRole("button",{name:"Cancel"}).click();
 }
 const actual=await ed.locator("table tr:first-child td").evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().width/(96/25.4)));
 for(let i=0;i<3;i++)expect(Math.abs(actual[i]-[20,50,30][i])).toBeLessThanOrEqual(.5);
 for(let i=0;i<3;i++){
  const d=await dialog(page,i);
  await expect(d.getByRole("textbox",{name:"Column Width"})).toHaveValue([20,50,30][i]+"mm");
  await d.getByRole("button",{name:"Cancel"}).click();
 }
 await page.screenshot({path:info.outputPath("rtl-table-format-parity.png")});
});
test("compact InPage Table Format chrome defaults, groups and samples",async({page},info)=>{
 await create(page);
 const d=await dialog(page,0);
 await expect(d.locator('[data-classic-group="Cell"]')).toBeVisible();
 await expect(d.locator('[data-classic-group="Border"]')).toBeVisible();
 await expect(d.locator('[data-classic-group="Column"]')).toBeVisible();
 await expect(d.locator('[data-classic-group="Table"]')).toBeVisible();
 await expect(d.locator('[data-classic-group="Flow"]')).toHaveCount(0);
 await expect(d.getByRole("button",{name:"Title bar help"})).toHaveCount(0);
 await expect(d.getByLabel("Border Width")).toHaveValue("0.5");
 await expect(d.getByLabel("Border Style")).toHaveValue("solid");
 await expect(d.getByRole("checkbox",{name:"Split Table Row"})).toBeVisible();
 await expect(d.getByLabel("Border Width")).toHaveAttribute("type","number");
 await d.screenshot({path:info.outputPath("table-format-inpage-dialog.png")});
});
test("cell context order and black solid editing-only grid",async({page})=>{
 const ed=await create(page);
 const first=ed.locator("table td").first();
 await expect.poll(()=>first.evaluate(el=>getComputedStyle(el).borderTopStyle)).toBe("solid");
 await expect.poll(()=>first.evaluate(el=>getComputedStyle(el).borderTopColor)).toBe("rgb(0, 0, 0)");
 await first.click({button:"right"});
 const menu=page.getByRole("menu",{name:"Text context menu"});
 const names=await menu.locator('[role="menuitem"]').allTextContents();
 expect(names.join("|")).toContain("Table To Text…|Table Format…|Table Layout…");
});
test("Tab copies centre alignment, red 18pt bold Urdu, fill and border from each column",async({page},info)=>{
 const ed=await create(page);
 await ed.evaluate(el=>{
  const editor=(el as HTMLElement & {editor:import("@tiptap/core").Editor}).editor;
  const doc=editor.getJSON() as any;
  const tbl=doc.content.find((n:any)=>n.type==="table");
  for(const cell of tbl.content[1].content){
   cell.attrs={...cell.attrs,tableFill:"#ffe082",tableBorderColor:"#990000",tableBorderStyle:"solid",tableBorderWidthPt:.5};
   const paragraph=cell.content[0];
   paragraph.attrs={...paragraph.attrs,textAlign:"center"};
   paragraph.content[0].marks=[{type:"bold"},{type:"textStyle",attrs:{fontSize:"18pt",color:"#ff0000",fontFamily:"Alvi Nastaleeq"}}];
  }
  editor.commands.setContent(doc);
 });
 const last=ed.locator("table tr").nth(1).locator("td");
 await last.nth(2).click();
 await page.keyboard.press("Tab");
 await expect(ed.locator("table tr")).toHaveCount(3);
 for(let i=0;i<3;i++){
  const fresh=ed.locator("table tr").nth(2).locator("td").nth(i);
  await expect(fresh).toHaveAttribute("data-table-fill","#ffe082");
  await expect(fresh).toHaveAttribute("data-table-border-color","#990000");
  await expect(fresh).toHaveAttribute("data-table-border-style","solid");
  await expect(fresh.locator("p")).toHaveCSS("text-align","center");
 }
 await page.keyboard.insertText("نیا");
 const first=ed.locator("table tr").nth(2).locator("td").first();
 await expect(first).toContainText("نیا");
 await expect(first.locator("strong")).toContainText("نیا");
 await expect(first.locator("[style*='font-size']")).toHaveAttribute("style",/18pt/);
 await page.screenshot({path:info.outputPath("table-new-formatted-row.png")});
});
