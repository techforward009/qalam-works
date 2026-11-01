import {test,expect,type Page} from "@playwright/test";

async function insert(page:Page,rows=3,columns=3) {
  await page.addInitScript(()=>localStorage.setItem("qalam-site-language","en"));
  await page.goto("/tools/document-studio");
  const editor=page.locator(".ProseMirror");
  await expect(editor).toBeEditable({timeout:30000});
  await editor.click();
  await page.locator('[data-menu-root="format"]').click();
  await page.locator('[data-menu-submenu="format.align"]').hover();
  await page.locator('[data-menu-action="format.rtl"]').click();
  await page.locator('[data-menu-root="insert"]').click();
  await page.locator('[data-menu-action="insert.table"]').click();
  const d=page.getByRole("dialog",{name:"Insert Table"});
  await d.getByRole("spinbutton",{name:"Rows"}).fill(String(rows));
  await d.getByRole("spinbutton",{name:"Columns"}).fill(String(columns));
  await d.getByRole("button",{name:"OK",exact:true}).click();
  await expect(editor.locator("table tr")).toHaveCount(rows);
  return editor;
}

for(const letters of [["a","b","c","d","e","f","g","h","i"],["ا","ب","پ","ت","ث","ج","چ","ح","خ"]]){
  const kind=letters[0]==="a"?"Latin":"Urdu";
  test(`RTL 3x3 ${kind} typing through Tab keeps first top-right, nine padded rows stable`,async({page})=>{
    const editor=await insert(page);
    for(let i=0;i<9;i++){
      await page.keyboard.insertText(letters[i]);
      const active=await page.evaluate(()=>{
        const n=document.getSelection()?.anchorNode,cell=(n instanceof Element?n:n?.parentElement)?.closest("td");
        return cell?{row:(cell.parentElement as HTMLTableRowElement).rowIndex,col:cell.cellIndex}:null;
      });
      expect(active).toEqual({row:Math.floor(i/3),col:i%3});
      if(i<8)await page.keyboard.press("Tab");
    }
    const table=editor.locator("table.qalam-document-table");
    await expect(table).toHaveAttribute("dir","rtl");
    expect(await table.evaluate(el=>getComputedStyle(el).direction)).toBe("rtl");
    const rects=await editor.locator("table tr:first-child td").evaluateAll(xs=>xs.map(x=>({x:x.getBoundingClientRect().left,top:x.getBoundingClientRect().top,pTop:x.querySelector("p")!.getBoundingClientRect().top,dir:getComputedStyle(x).direction})));
    expect(rects[0].x).toBeGreaterThan(rects[1].x);
    expect(rects[0].pTop-rects[0].top).toBeGreaterThan(1);
    for(let i=0;i<9;i++)await expect(editor.locator("table td").nth(i)).toContainText(letters[i]);
    await expect(page.locator("[data-studio-page-label]")).toHaveText("1/1");
    await page.screenshot({path:test.info().outputPath(`rtl-${kind}-filled.png`)});
  });
}

test("pointer moves on inner line and RTL left edge show col-resize and drag, undo restores",async({page})=>{
  const editor=await insert(page,3,3),table=editor.locator("table"),cells=editor.locator("table tr:first-child td");
  const widths=()=>cells.evaluateAll(xs=>xs.map(x=>Math.round(x.getBoundingClientRect().width)));
  const before=await widths();
  const box=await cells.first().boundingBox(),x=box!.x,y=box!.y+box!.height/2;
  await page.mouse.move(x,y);
  const cursor=await page.evaluate(({x,y})=>getComputedStyle(document.elementFromPoint(x,y)!).cursor,{x,y});
  expect(cursor).toBe("col-resize");
  await page.mouse.down();await page.mouse.move(x-40,y,{steps:8});await page.mouse.up();
  const after=await widths();
  expect(Math.abs(after[0]-before[0])).toBeGreaterThan(18);
  expect(Math.abs(after[1]-before[1])).toBeGreaterThan(18);
  expect(Math.abs(after.reduce((a,b)=>a+b,0)-before.reduce((a,b)=>a+b,0))).toBeLessThan(4);
  await page.screenshot({path:test.info().outputPath("rtl-drag-inner.png")});
  await cells.first().click();await page.keyboard.press("Control+z");
  await expect.poll(widths).toEqual(before);
  const last=await cells.last().boundingBox(),leftEdge=last!.x,y2=last!.y+last!.height/2;
  await page.mouse.move(leftEdge,y2);
  expect(await page.evaluate(({x,y})=>getComputedStyle(document.elementFromPoint(x,y)!).cursor,{x:leftEdge,y:y2})).toBe("col-resize");
  await page.mouse.down();await page.mouse.move(leftEdge-35,y2,{steps:7});await page.mouse.up();
  expect(Math.abs((await widths())[2]-before[2])).toBeGreaterThan(15);
});

test("drag over adjacent cells uses clear selected-cell overlay and merges",async({page})=>{
  const editor=await insert(page,2,3),cells=editor.locator("table tr:first-child td");
  const a=await cells.first().boundingBox(),b=await cells.nth(1).boundingBox();
  await page.mouse.move(a!.x+a!.width/2,a!.y+a!.height/2);await page.mouse.down();
  await page.mouse.move(b!.x+b!.width/2,b!.y+b!.height/2,{steps:10});await page.mouse.up();
  await expect.poll(()=>editor.locator(".selectedCell").count()).toBeGreaterThanOrEqual(2);
  const style=await editor.locator(".selectedCell").first().evaluate(el=>{
    const s=getComputedStyle(el,"::after");return {content:s.content,bg:s.backgroundColor,position:s.position};
  });
  expect(style.content).not.toBe("none");expect(style.bg).not.toBe("rgba(0, 0, 0, 0)");
  await page.screenshot({path:test.info().outputPath("selected-cells.png")});
  await page.locator('[data-menu-root="format"]').click();
  await page.locator('[data-menu-action="text.tableLayout"]').click();
  const d=page.getByRole("dialog",{name:"Table Layout"});
  await expect(d.getByRole("button",{name:"Merge Selection"})).toBeEnabled();
  await d.getByRole("button",{name:"Merge Selection"}).click();
  await expect(cells).toHaveCount(2);
});

test("40-row table stops runaway pagination with sensible page count and survives frames",async({page})=>{
  const editor=await insert(page,40,2);
  const count=page.locator("[data-studio-page-label]");
  await expect(editor.locator("table tr")).toHaveCount(40);
  await expect.poll(async()=>{
    const txt=(await count.textContent())||"";
    return Number(txt.split("/")[1]||0);
  },{timeout:17000}).toBeGreaterThanOrEqual(2);
  const first=Number(((await count.textContent())||"").split("/")[1]);
  expect(first).toBeLessThan(12);
  await page.waitForTimeout(1000);
  const second=Number(((await count.textContent())||"").split("/")[1]);
  expect(second).toBe(first);
  await page.screenshot({path:test.info().outputPath("table-40-rows.png")});
});
