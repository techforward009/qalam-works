import {test,expect,type Page} from "@playwright/test";
import {PDFDocument} from "pdf-lib";
import {inflateSync} from "node:zlib";
import {readFileSync} from "node:fs";
async function setup(page:Page){
 await page.addInitScript(()=>{localStorage.clear();localStorage.setItem("qalam-site-language","en")});
 await page.goto(process.env.QALAM_PARITY_URL||"/tools/document-studio");
 const ed=page.locator(".ProseMirror");await expect(ed).toBeEditable({timeout:30000});
 await ed.click();await page.locator('[data-menu-root="insert"]').click();await page.locator('[data-menu-action="insert.table"]').click();
 const d=page.getByRole("dialog",{name:"Insert Table"});
 await d.getByRole("spinbutton",{name:"Rows"}).fill("3");
 await d.getByRole("spinbutton",{name:"Columns"}).fill("3");
 await d.getByRole("button",{name:"OK",exact:true}).click();
 for(const [i,word] of ["ایک","دو","تین","چار","پانچ","چھ","سات","آٹھ","نو"].entries()){
  await page.keyboard.insertText(word);if(i<8)await page.keyboard.press("Tab");
 }
 await expect(ed.locator("table td")).toHaveCount(9);
 return ed;
}
async function format(page:Page,index:number){
 await page.locator(".ProseMirror table td").nth(index).click({button:"right"});
 await page.getByRole("menu",{name:"Text context menu"}).getByRole("menuitem",{name:"Table Format…"}).click();
 return page.getByRole("dialog",{name:"Table Format"});
}
test("InPage pure colour lists, exact order and legacy colour values",async({page},info)=>{
 const ed=await setup(page);
 const d=await format(page,4);
 for(const [name,values] of [["Border Color",["White","Black","Gray","Red","Yellow","Green","Cyan","Blue","Magenta"]],["Fill Color",["None","White","Black","Gray","Red","Yellow","Green","Cyan","Blue","Magenta"]]] as const){
  await d.getByRole("button",{name:name==="Fill Color"?"Open fill palette":"Open border palette"}).click();
  const list=d.getByRole("listbox",{name});
  await expect(list.getByRole("option")).toHaveCount(values.length);
  expect(await list.getByRole("option").allTextContents()).toEqual([...values]);
  for(const [label,hex] of [["Red","#ff0000"],["Yellow","#ffff00"],["Green","#00ff00"],["Cyan","#00ffff"],["Blue","#0000ff"],["Magenta","#ff00ff"],["Gray","#808080"]]){
   await expect(list.getByRole("option",{name:label}).locator("[data-option-swatch]")).toHaveCSS("background-color",hex==="#808080"?"rgb(128, 128, 128)":hex==="#ff0000"?"rgb(255, 0, 0)":hex==="#ffff00"?"rgb(255, 255, 0)":hex==="#00ff00"?"rgb(0, 255, 0)":hex==="#00ffff"?"rgb(0, 255, 255)":hex==="#0000ff"?"rgb(0, 0, 255)":"rgb(255, 0, 255)");
  }
  await page.keyboard.press("Escape");
  await expect(d).toBeVisible();
  await expect(list).toHaveCount(0);
 }
 await d.getByRole("button",{name:"Open fill palette"}).click();
 await d.screenshot({path:info.outputPath("pure-colour-palette-open.png")});
 await page.keyboard.press("Escape");
 await page.keyboard.press("Escape");await expect(d).toHaveCount(0);
 // Older saved cell values must remain usable and visible, without altering them.
 await ed.evaluate(el=>{
  const editor=(el as HTMLElement & {editor:any}).editor,doc=editor.getJSON();
  doc.content.find((x:any)=>x.type==="table").content[1].content[1].attrs.tableBorderColor="#990000";
  editor.commands.setContent(doc);
 });
 const legacy=await format(page,4);
 await expect(legacy.getByLabel("Border Color")).toHaveValue("#990000");
 await expect(legacy.locator('[data-classic-picker="Border Color"] [data-picker-box]')).toContainText("#990000");
 await page.keyboard.press("Escape");
});
test("one middle RTL cell: Red 2pt paints all 4 shared sides, outer cells unchanged, real PDF has red strokes",async({page},info)=>{
 const ed=await setup(page),d=await format(page,4);
 await d.getByLabel("Border Color").selectOption("#FF0000");
 await d.getByRole("textbox",{name:"Border Width"}).fill("2pt");
 await d.getByRole("button",{name:"OK",exact:true}).click();
 const cell=ed.locator("table td").nth(4);
 for(const side of ["Top","Right","Bottom","Left"]){
  await expect(cell).toHaveCSS("border-"+side.toLowerCase()+"-style","solid");
  await expect(cell).toHaveCSS("border-"+side.toLowerCase()+"-color","rgb(255, 0, 0)");
  await expect(cell).toHaveCSS("border-"+side.toLowerCase()+"-width",/2px|2.6|2.7/);
 }
 await expect(ed.locator("table td").first()).toHaveAttribute("data-table-border-style","none");
 await page.screenshot({path:info.outputPath("red-middle-cell-screen.png")});
 await page.locator('[data-menu-root="file"]').click();
 await page.locator('[data-menu-submenu="file.download"]').hover();
 const [download]=await Promise.all([page.waitForEvent("download",{timeout:80000}),page.locator('[data-menu-action="file.downloadPdf"]').click()]);
 const file=info.outputPath("middle-red-border.pdf");await download.saveAs(file);
 const pdf=await PDFDocument.load(readFileSync(file));
 expect(pdf.getPageCount()).toBe(1);
 const stream=pdf.context.lookup(pdf.getPages()[0].node.Contents()) as unknown as {contents:Uint8Array};
 const pdfOps=inflateSync(stream.contents).toString("latin1");
 expect(pdfOps).toMatch(/1 0 0 RG/);
 expect((pdfOps.match(/1 0 0 RG/g)||[]).length).toBe(1);
 // Chromium prints the border as four independent red filled rectangles.
 const redPart=pdfOps.slice(pdfOps.indexOf("1 0 0 RG"),pdfOps.indexOf(".0667 .0667 .0667 RG"));
 const edges=[...redPart.matchAll(/([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+) re\s+f/g)];
 expect(edges).toHaveLength(4);
 expect(edges.filter(x=>Number(x[3])<3)).toHaveLength(2);
 expect(edges.filter(x=>Number(x[4])<3)).toHaveLength(2);
});
test("Esc closes only active picker, then cancels Table Format",async({page})=>{
 await setup(page);const d=await format(page,4);
 await d.getByRole("button",{name:"Open fill palette"}).click();
 await expect(d.getByRole("listbox",{name:"Fill Color"})).toBeVisible();
 await page.keyboard.press("Escape");
 await expect(d).toBeVisible();await expect(d.getByRole("listbox",{name:"Fill Color"})).toHaveCount(0);
 await page.keyboard.press("Escape");await expect(d).toHaveCount(0);
});

test("mixed selected cells show blank border fields, untouched values preserved, whole-table Blue",async({page},info)=>{
 const ed=await setup(page);
 let d=await format(page,4);
 await d.getByLabel("Border Color").selectOption("#FF0000");
 await d.getByRole("textbox",{name:"Border Width"}).fill("2pt");
 await d.getByRole("button",{name:"OK",exact:true}).click();
 const cells=ed.locator("table td");
 const first=await cells.first().boundingBox(),last=await cells.last().boundingBox();
 await page.mouse.move(first!.x+first!.width/2,first!.y+first!.height/2);
 await page.mouse.down();await page.mouse.move(last!.x+last!.width/2,last!.y+last!.height/2,{steps:12});await page.mouse.up();
 await expect.poll(()=>ed.evaluate(el=>(el as HTMLElement & {editor:any}).editor.state.selection.ranges.length)).toBeGreaterThan(1);
 await page.keyboard.press("Control+Alt+f");
 d=page.getByRole("dialog",{name:"Table Format"});
 await expect(d.getByLabel("Border Color")).toHaveValue("");
 await expect(d.getByLabel("Border Style")).toHaveValue("");
 await expect(d.getByRole("textbox",{name:"Border Width"})).toHaveValue("");
 await d.getByRole("button",{name:"Cancel"}).click();
 await expect(cells.nth(4)).toHaveAttribute("data-table-border-color","#ff0000");
 await expect(cells.first()).toHaveAttribute("data-table-border-style","none");
 await page.keyboard.press("Control+Alt+f");
 d=page.getByRole("dialog",{name:"Table Format"});
 await d.getByLabel("Border Color").selectOption("#0000FF");
 await d.getByLabel("Border Style").selectOption("solid");
 await d.getByRole("textbox",{name:"Border Width"}).fill("2pt");
 await d.getByRole("button",{name:"OK",exact:true}).click();
 for(let i=0;i<9;i++)await expect(cells.nth(i)).toHaveAttribute("data-table-border-color","#0000ff");
 await page.screenshot({path:info.outputPath("whole-table-blue.png")});
});
