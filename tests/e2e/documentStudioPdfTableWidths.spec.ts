import {test,expect,type Page} from "@playwright/test";
import {PDFDocument} from "pdf-lib";
import {inflateSync} from "node:zlib";
import {readFileSync} from "node:fs";
const pxPerMm=96/25.4;
async function table(page:Page){
 await page.addInitScript(()=>{localStorage.clear();localStorage.setItem("qalam-site-language","en");});
 await page.goto(process.env.QALAM_TABLE_PDF_URL||"/tools/document-studio");
 const editor=page.locator(".ProseMirror");
 await expect(editor).toBeEditable({timeout:30000});
 await editor.click();
 await page.locator('[data-menu-root="insert"]').click();
 await page.locator('[data-menu-action="insert.table"]').click();
 const d=page.getByRole("dialog",{name:"Insert Table"});
 await d.getByRole("spinbutton",{name:"Rows"}).fill("2");
 await d.getByRole("spinbutton",{name:"Columns"}).fill("3");
 await d.getByRole("button",{name:"OK",exact:true}).click();
 const words=["ایک","دو","تین","چار","پانچ","چھ"];
 for(const [i,word] of words.entries()){await page.keyboard.insertText(word);if(i<5)await page.keyboard.press("Tab");}
 await expect(editor.locator("table td")).toHaveCount(6);
 return editor;
}
async function formatCell(page:Page,col:number,widthMm:number){
 await page.locator(".ProseMirror table tr:first-child td").nth(col).click({button:"right"});
 await page.getByRole("menu",{name:"Text context menu"}).getByRole("menuitem",{name:"Table Format…",exact:true}).click();
 const d=page.getByRole("dialog",{name:"Table Format"});
 await d.getByRole("textbox",{name:"Column Width"}).fill(widthMm+"mm");
 await d.getByLabel("Fill Color").selectOption("#FFFF00");
 await d.getByLabel("Border Style").selectOption("solid");
 await d.getByRole("button",{name:"OK",exact:true}).click();
}
async function download(page:Page,dest:string){
 await page.locator('[data-menu-root="file"]').click();
 await page.locator('[data-menu-submenu="file.download"]').hover();
 const [file]=await Promise.all([page.waitForEvent("download",{timeout:75000}),page.locator('[data-menu-action="file.downloadPdf"]').click()]);
 await file.saveAs(dest);
 const pdf=await PDFDocument.load(readFileSync(dest));
 expect(pdf.getPageCount()).toBeGreaterThanOrEqual(1);
 const stream=pdf.context.lookup(pdf.getPages()[0].node.Contents()) as {contents?:Uint8Array;getContents?:()=>Uint8Array};
 const ops=inflateSync(stream.contents??stream.getContents!()).toString("latin1");
 const cols=[...ops.matchAll(/\/TD <<\/MCID \d+ >>BDC\s+([\d.-]+) ([\d.-]+) ([\d.-]+) ([\d.-]+) re\s+f/g)]
  .map(m=>({x:Number(m[1]),width:Number(m[3])}));
 return cols;
}
test("Table Format mm column widths survive real UI PDF export in RTL order",async({page},info)=>{
 const editor=await table(page);
 for(const [i,width] of [20,50,30].entries())await formatCell(page,i,width);
 const widths=await editor.locator("table tr:first-child td").evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().width));
 await page.screenshot({path:info.outputPath("screen-table-mm.png"),fullPage:false});
 const pdfCells=await download(page,info.outputPath("export-table-mm.pdf"));
 expect(pdfCells.length).toBeGreaterThanOrEqual(3);
 for(let i=0;i<3;i++)expect(Math.abs(pdfCells[i].width/pxPerMm-[20,50,30][i])).toBeLessThanOrEqual(.5);
 expect(pdfCells[0].x).toBeGreaterThan(pdfCells[1].x);
 expect(pdfCells[1].x).toBeGreaterThan(pdfCells[2].x);
 for(let i=0;i<3;i++)expect(Math.abs(pdfCells[i].width-widths[i])/pxPerMm).toBeLessThanOrEqual(.5);
});
test("dragging an RTL inner divider keeps real PDF columns in screen order",async({page},info)=>{
 const editor=await table(page);
 for(let i=0;i<3;i++)await formatCell(page,i,30);
 const cells=editor.locator("table tr:first-child td");
 const rect=await cells.first().boundingBox();
 const x=rect!.x,y=rect!.y+rect!.height/2;
 await page.mouse.move(x,y);
 await page.mouse.down();
 await page.mouse.move(x-26,y,{steps:6});
 await page.mouse.up();
 const widths=await cells.evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().width));
 expect(Math.abs(widths[0]-widths[1])).toBeGreaterThan(15);
 await page.screenshot({path:info.outputPath("screen-after-drag.png")});
 const pdfCells=await download(page,info.outputPath("export-table-drag.pdf"));
 expect(pdfCells.length).toBeGreaterThanOrEqual(3);
 for(let i=0;i<3;i++)expect(Math.abs(pdfCells[i].width-widths[i])/pxPerMm).toBeLessThanOrEqual(.5);
});
