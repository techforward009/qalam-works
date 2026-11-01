import {test,expect,type Page} from "@playwright/test";
const words=["ایک","دو","تین","چار","پانچ","چھ","سات","آٹھ","نو"];
async function table(page:Page,rows=3,cols=3) {
 await page.addInitScript(()=>localStorage.setItem("qalam-site-language","en"));
 await page.goto("/tools/document-studio");
 const editor=page.locator(".ProseMirror");
 await expect(editor).toBeEditable({timeout:30000});
 await editor.click();await page.locator('[data-menu-root="format"]').click();
 await page.locator('[data-menu-submenu="format.align"]').hover();
 await page.locator('[data-menu-action="format.rtl"]').click();
 await page.locator('[data-menu-root="insert"]').click();
 await page.locator('[data-menu-action="insert.table"]').click();
 const d=page.getByRole("dialog",{name:"Insert Table"});
 await d.getByRole("spinbutton",{name:"Rows"}).fill(String(rows));
 await d.getByRole("spinbutton",{name:"Columns"}).fill(String(cols));
 await d.getByRole("button",{name:"OK",exact:true}).click();
 const cells=editor.locator("table td");
 for(let i=0;i<rows*cols;i++){await page.keyboard.type(words[i],{delay:15});if(i<rows*cols-1)await page.keyboard.press("Tab");}
 return {editor,cells};
}
test("Urdu paragraph below 3x3 table flows below its last border and does not intercept the top-right cell",async({page})=>{
 const {editor,cells}=await table(page);
 const before=await editor.locator("table").boundingBox();
 // Click just below the table, matching the user rather than inserting through commands.
 await page.mouse.click(before!.x+before!.width-18,before!.y+before!.height+13);
 await page.keyboard.type("نیچے کی عبارت یہاں ہے",{delay:25});
 const metrics=await editor.evaluate(root=>{
  const table=root.querySelector("table")!,paragraphs=[...root.querySelectorAll(":scope > p")],
   last=paragraphs.find(p=>p.textContent?.includes("نیچے کی عبارت"));
  const tr=table.getBoundingClientRect(),pr=last?.getBoundingClientRect();
  const range=document.createRange();
  if(last)range.selectNodeContents(last);
  const wr=last?range.getBoundingClientRect():null;
  return {table:{top:tr.top,bottom:tr.bottom},p:pr?{top:pr.top,bottom:pr.bottom,html:last?.outerHTML.slice(0,500)}:null,
   text:wr?{top:wr.top,bottom:wr.bottom,style:last?.querySelector("[data-studio-line-run]")?.getAttribute("style")}:null,children:[...root.children].slice(0,8).map(n=>({tag:n.tagName,top:n.getBoundingClientRect().top,content:n.textContent?.slice(0,16)}))};
 });
 await expect(editor.locator(":scope > p").filter({hasText:"نیچے کی عبارت یہاں ہے"})).toHaveCount(1);
 expect(metrics.p!.top).toBeGreaterThanOrEqual(metrics.table.bottom-2);
 expect(metrics.text!.top).toBeGreaterThanOrEqual(metrics.table.bottom-2);
 await page.keyboard.press("Enter");
 await page.keyboard.type("دوسری سطر نیچے ہے",{delay:20});
 const lines=await editor.evaluate(root=>{
  const p=[...root.querySelectorAll(":scope > p")];
  const first=p.find(x=>x.textContent?.includes("نیچے کی عبارت"))!;
  const second=p.find(x=>x.textContent?.includes("دوسری سطر"))!;
  const ink=(element:Element)=>{const range=document.createRange();range.selectNodeContents(element);return range.getBoundingClientRect()};
  return {firstBottom:ink(first).bottom,secondTop:ink(second).top,firstLineTop:first.getBoundingClientRect().top,secondLineTop:second.getBoundingClientRect().top};
 });
 expect(lines.secondTop).toBeGreaterThanOrEqual(lines.firstBottom-2);
 // Verify clicking first cell still edits it, not the paragraph after the table.
 await cells.first().locator("p").click();
 await page.keyboard.type("درست",{delay:25});
 await expect(cells.first()).toContainText("درست");
 await expect(editor.locator(":scope > p").filter({hasText:"نیچے کی عبارت یہاں ہے"})).not.toContainText("درست");
});
test("paragraph before a table, between two tables, and after second table keeps normal order",async({page})=>{
 const {editor}=await table(page,2,2);
 const first=await editor.locator("table").boundingBox();
 await page.mouse.click(first!.x+first!.width-10,first!.y+first!.height+10);
 await page.keyboard.type("درمیان کا متن",{delay:20});
 // A second table after the paragraph is inserted via the real Insert menu.
 await editor.locator(":scope > p").filter({hasText:"درمیان کا متن"}).last().click();
 await page.keyboard.press("End");
 await page.locator('[data-menu-root="insert"]').click();
 await page.locator('[data-menu-action="insert.table"]').click();
 const d=page.getByRole("dialog",{name:"Insert Table"});
 await d.getByRole("spinbutton",{name:"Rows"}).fill("2");await d.getByRole("spinbutton",{name:"Columns"}).fill("2");
 await d.getByRole("button",{name:"OK"}).click();
 await expect(editor.locator("table")).toHaveCount(2);
 const top=await editor.locator("table").first().boundingBox(),between=await editor.locator(":scope > p").filter({hasText:"درمیان کا متن"}).boundingBox();
 const bottom=await editor.locator("table").last().boundingBox();
 console.log("TWO_TABLE_ORDER",JSON.stringify({top,between:between,bottom}));
 expect(between!.y).toBeGreaterThanOrEqual(top!.y+top!.height-2);
 expect(bottom!.y).toBeGreaterThanOrEqual(between!.y+between!.height-2);
});

test("Urdu text before table and two subsequent tables keep every block in vertical order",async({page})=>{
 await page.addInitScript(()=>localStorage.setItem("qalam-site-language","en"));
 await page.goto("/tools/document-studio");
 const editor=page.locator(".ProseMirror");await expect(editor).toBeEditable({timeout:30000});
 await editor.click();await page.keyboard.type("جدول سے پہلے کی عبارت",{delay:12});await page.keyboard.press("Enter");
 await page.locator('[data-menu-root="format"]').click();await page.locator('[data-menu-submenu="format.align"]').hover();await page.locator('[data-menu-action="format.rtl"]').click();
 async function addTable(){
  await page.locator('[data-menu-root="insert"]').click();await page.locator('[data-menu-action="insert.table"]').click();
  const d=page.getByRole("dialog",{name:"Insert Table"});
  await d.getByRole("spinbutton",{name:"Rows"}).fill("2");await d.getByRole("spinbutton",{name:"Columns"}).fill("2");
  await d.getByRole("button",{name:"OK"}).click();
 }
 await addTable();
 const first=await editor.locator("table").first().boundingBox();
 await page.mouse.click(first!.x+first!.width-12,first!.y+first!.height+13);
 await page.keyboard.type("دوسرے جدول سے پہلے",{delay:12});
 await addTable();
 await expect(editor.locator("table")).toHaveCount(2);
 const geometry=await editor.evaluate(root=>{
  const tables=[...root.querySelectorAll("table")].map(el=>el.getBoundingClientRect());
  const before=[...root.querySelectorAll(":scope > p")].find(el=>el.textContent?.includes("جدول سے پہلے"));
  const between=[...root.querySelectorAll(":scope > p")].find(el=>el.textContent?.includes("دوسرے جدول سے پہلے"));
  return {beforeBottom:before?.getBoundingClientRect().bottom,firstTop:tables[0].top,firstBottom:tables[0].bottom,
   betweenTop:between?.getBoundingClientRect().top,betweenBottom:between?.getBoundingClientRect().bottom,secondTop:tables[1].top};
 });
 expect(geometry.firstTop).toBeGreaterThanOrEqual(geometry.beforeBottom!-2);
 expect(geometry.betweenTop).toBeGreaterThanOrEqual(geometry.firstBottom-2);
 expect(geometry.secondTop).toBeGreaterThanOrEqual(geometry.betweenBottom!-2);
});
