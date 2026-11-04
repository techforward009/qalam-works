import {test,expect,type Page} from "@playwright/test";

const WORDS=["ایک","دو","تین","چار","پانچ","چھ","سات","آٹھ","نو"];

async function insertUrduTable(page:Page) {
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
  const dialog=page.getByRole("dialog",{name:"Insert Table"});
  await dialog.getByRole("spinbutton",{name:"Rows"}).fill("3");
  await dialog.getByRole("spinbutton",{name:"Columns"}).fill("3");
  await dialog.getByRole("button",{name:"OK",exact:true}).click();
  await expect(editor.locator("table tr")).toHaveCount(3);
  return editor;
}

function cellAtCaret(){
  const node=document.getSelection()?.anchorNode;
  const cell=(node instanceof Element?node:node?.parentElement)?.closest<HTMLTableCellElement>("td,th");
  return cell?{row:(cell.parentElement as HTMLTableRowElement).rowIndex,col:cell.cellIndex}:null;
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
      await expect.poll(()=>page.evaluate(cellAtCaret)).toEqual({row:1,col:0});
      await page.keyboard.press("Tab");
      await expect.poll(()=>page.evaluate(cellAtCaret)).toEqual({row:1,col:1});
    }
    if(i<WORDS.length-1) {
      await page.keyboard.press("Tab");
      await expect.poll(()=>page.evaluate(cellAtCaret)).toEqual({row:Math.floor((i+1)/3),col:(i+1)%3});
    }
  }
  for(let i=0;i<WORDS.length;i++)await expect(cells.nth(i)).toHaveText(WORDS[i]);
  await expect(editor.locator("table tr")).toHaveCount(3);
  await expect(editor.locator("table td")).toHaveCount(9);
  // Native Urdu typing must leave each glyph inside the visible cell box,
  // not on the top border or in the previous/next cell.
  const ink=await cells.first().evaluate(cell=>{
    const paragraph=cell.querySelector("p")!,range=document.createRange();
    range.selectNodeContents(paragraph);
    const border=cell.getBoundingClientRect(),glyph=range.getBoundingClientRect();
    return {top:glyph.top,bottom:glyph.bottom,cellTop:border.top,cellBottom:border.bottom};
  });
  expect(ink.top).toBeGreaterThanOrEqual(ink.cellTop+1);
  expect(ink.bottom).toBeLessThanOrEqual(ink.cellBottom-1);
  await cells.nth(4).click();
  await expect.poll(()=>page.evaluate(cellAtCaret)).toEqual({row:1,col:1});
  await page.keyboard.press("Shift+Tab");
  await expect.poll(()=>page.evaluate(cellAtCaret)).toEqual({row:1,col:0});
  await page.keyboard.press("Tab");
  await expect.poll(()=>page.evaluate(cellAtCaret)).toEqual({row:1,col:1});
  await page.screenshot({path:test.info().outputPath("urdu-nine-words.png")});
});

test("empty rows equal one line, first Urdu word stays fully inside, and row heights grow independently",async({page})=>{
  const editor=await insertUrduTable(page),rows=editor.locator("table tr"),cells=editor.locator("table tr:first-child td");
  const empty=await rows.evaluateAll(nodes=>nodes.map(n=>Math.round(n.getBoundingClientRect().height)));
  expect(Math.max(...empty)-Math.min(...empty)).toBeLessThanOrEqual(2);
  // A single table row gives every cell the same height. The first row
  // cannot collapse while other rows retain their one-line height.
  const emptyCellHeights=await editor.locator("table td").evaluateAll(nodes=>nodes.map(n=>Math.round(n.getBoundingClientRect().height)));
  expect(Math.max(...emptyCellHeights)-Math.min(...emptyCellHeights)).toBeLessThanOrEqual(2);
  await editor.evaluate(el=>el.style.setProperty("--qalam-first-line-indent","12mm"));
  await expect(cells.first().locator("p")).toHaveCSS("text-indent","0px");
  const line=await cells.first().locator("p").evaluate(p=>parseFloat(getComputedStyle(p).lineHeight));
  expect(empty[0]).toBeLessThanOrEqual(line+6); // no large fixed 8px top and bottom
  await page.keyboard.type("ایک",{delay:40});
  await expect(cells.first().locator("[data-studio-line-run]")).toHaveCount(0);
  const geometry=await cells.first().evaluate(el=>{
    const p=el.querySelector("p")!,range=document.createRange();
    range.selectNodeContents(p);
    const c=el.getBoundingClientRect(),r=range.getBoundingClientRect();
    return {cellTop:c.top,textTop:r.top,cellBottom:c.bottom,textBottom:r.bottom,paddingTop:parseFloat(getComputedStyle(el).paddingTop)};
  });
  expect(geometry.textTop).toBeGreaterThanOrEqual(geometry.cellTop+1);
  expect(geometry.textBottom).toBeLessThanOrEqual(geometry.cellBottom-1);
  expect(geometry.paddingTop).toBeLessThanOrEqual(3);
  // Enter inside the middle row adds a line only to that row.
  await editor.locator("table tr:nth-child(2) td").first().click();
  await page.keyboard.type("دو",{delay:40});
  await page.keyboard.press("Enter");
  await page.keyboard.type("تین",{delay:40});
  const grown=await rows.evaluateAll(nodes=>nodes.map(n=>Math.round(n.getBoundingClientRect().height)));
  expect(grown[1]).toBeGreaterThan(grown[0]+line/2);
  expect(Math.abs(grown[2]-empty[2])).toBeLessThanOrEqual(3);
  expect(Math.abs(grown[0]-empty[0])).toBeLessThanOrEqual(3);
  await page.screenshot({path:test.info().outputPath("urdu-enter-row.png")});
});

test("48pt Urdu word enlarges only its own row; Enter and explicit paragraph spacing also grow only their rows",async({page})=>{
  const editor=await insertUrduTable(page),rows=editor.locator("table tr");
  const before=await rows.evaluateAll(nodes=>nodes.map(el=>el.getBoundingClientRect().height));
  const first=editor.locator("table tr:first-child td").first();
  await first.click();
  await page.keyboard.type("بڑا",{delay:40});
  await first.locator("p").dblclick();
  const fontSize=page.locator("[data-studio-font-size]");
  await expect(fontSize).toBeVisible();
  await fontSize.fill("48");
  await fontSize.press("Enter");
  await expect.poll(()=>first.locator('[style*="font-size"]').count()).toBeGreaterThan(0);
  const bigger=await rows.evaluateAll(nodes=>nodes.map(el=>el.getBoundingClientRect().height));
  expect(bigger[0]).toBeGreaterThan(before[0]+18);
  expect(Math.abs(bigger[1]-before[1])).toBeLessThanOrEqual(3);
  expect(Math.abs(bigger[2]-before[2])).toBeLessThanOrEqual(3);
  const second=editor.locator("table tr:nth-child(2) td").first();
  await second.click();await page.keyboard.type("دو",{delay:40});
  await page.keyboard.press("Enter");
  await page.keyboard.type("تین",{delay:40});
  const multiline=await rows.evaluateAll(nodes=>nodes.map(el=>el.getBoundingClientRect().height));
  expect(multiline[1]).toBeGreaterThan(before[1]+18);
  expect(Math.abs(multiline[2]-before[2])).toBeLessThanOrEqual(3);
  // The paragraph-format commands write per-paragraph attributes; honour
  // those specific values inside the cell instead of a blanket margin:0.
  await second.locator("p").first().evaluate(p=>{
    const editor=(p.closest(".ProseMirror") as HTMLElement & {editor:import("@tiptap/core").Editor}).editor;
    const pos=editor.view.posAtDOM(p,0);
    const node=editor.state.doc.nodeAt(pos-1);
    if(!node||node.type.name!=="paragraph")throw Error("paragraph position not found");
    editor.view.dispatch(editor.state.tr.setNodeMarkup(pos-1,undefined,{...node.attrs,spaceBeforePt:9,spaceAfterPt:8,lineGapPt:8}));
  });
  await second.locator("p").nth(1).evaluate(p=>{
    const editor=(p.closest(".ProseMirror") as HTMLElement & {editor:import("@tiptap/core").Editor}).editor;
    const pos=editor.view.posAtDOM(p,0)-1,node=editor.state.doc.nodeAt(pos);
    if(!node||node.type.name!=="paragraph")throw Error("second paragraph position not found");
    editor.view.dispatch(editor.state.tr.setNodeMarkup(pos,undefined,{...node.attrs,spaceBeforePt:6}));
  });
  await expect.poll(()=>second.locator("p").first().evaluate(p=>getComputedStyle(p).paddingBlockStart)).toBe("12px");
  const paragraphGap=await second.locator("p").evaluateAll(ps=>{
    const box=(p:Element)=>{const r=document.createRange();r.selectNodeContents(p);return r.getBoundingClientRect();};
    return box(ps[1]).top-box(ps[0]).bottom;
  });
  expect(paragraphGap).toBeGreaterThanOrEqual(18); // 8pt after + 6pt before; do not collapse to 8pt.
  const spaced=await rows.evaluateAll(nodes=>nodes.map(el=>el.getBoundingClientRect().height));
  expect(spaced[1]).toBeGreaterThan(multiline[1]+10);
  expect(Math.abs(spaced[2]-before[2])).toBeLessThanOrEqual(3);

  // Reducing paragraph spacing and line leading must compact the same row.
  // Marked text runs use the parent's leading unless their own font needs
  // more room, so the cell can shrink without clipping larger characters.
  await second.locator("p").evaluateAll((paragraphs) => {
    const editor=(paragraphs[0].closest(".ProseMirror") as HTMLElement & {editor:import("@tiptap/core").Editor}).editor;
    let tr=editor.state.tr;
    for(const p of paragraphs){
      const pos=editor.view.posAtDOM(p,0)-1;
      const node=tr.doc.nodeAt(pos);
      if(!node||node.type.name!=="paragraph")throw Error("paragraph position not found");
      const from=pos+1,to=from+node.content.size;
      tr=tr.addMark(from,to,editor.schema.marks.textStyle.create({fontSize:"12pt"}));
      tr=tr.setNodeMarkup(pos,undefined,{...node.attrs,spaceBeforePt:0,spaceAfterPt:0,lineGapPt:0});
    }
    editor.view.dispatch(tr);
  });
  const compact=await rows.evaluateAll(nodes=>nodes.map(el=>el.getBoundingClientRect().height));
  const normalSpanLine=await second.locator("p").first().evaluate(p=>parseFloat(getComputedStyle(p.querySelector("span")!).lineHeight));

  // The paragraph leading must reach marked spans instead of being replaced by normal.
  await second.locator("p").evaluateAll((paragraphs) => {
    const editor=(paragraphs[0].closest(".ProseMirror") as HTMLElement & {editor:import("@tiptap/core").Editor}).editor;
    let tr=editor.state.tr;
    for(const p of paragraphs){
      const pos=editor.view.posAtDOM(p,0)-1;
      const node=tr.doc.nodeAt(pos);
      if(!node||node.type.name!=="paragraph")throw Error("paragraph position not found");
      tr=tr.setNodeMarkup(pos,undefined,{...node.attrs,leading:{mode:"points",value:8},lineHeight:null});
    }
    editor.view.dispatch(tr);
  });
  const tight=await rows.evaluateAll(nodes=>nodes.map(el=>el.getBoundingClientRect().height));
  expect(tight[1]).toBeLessThan(compact[1]-3);
  expect(Math.abs(tight[2]-before[2])).toBeLessThanOrEqual(3);
  const tightLine=await second.locator("p").first().evaluate(p=>parseFloat(getComputedStyle(p.querySelector("span")!).lineHeight));
  expect(tightLine).toBeCloseTo(16,0);
  expect(tightLine).toBeLessThan(normalSpanLine-1);
  await page.screenshot({path:test.info().outputPath("urdu-48pt-paragraph-space.png")});
});


test("hovering and dragging a horizontal row divider never changes row heights",async({page})=>{
  const editor=await insertUrduTable(page),rows=editor.locator("table tr");
  const heights=()=>rows.evaluateAll(nodes=>nodes.map(n=>Math.round(n.getBoundingClientRect().height)));
  const before=await heights(),cell=await editor.locator("table tr:first-child td").nth(1).boundingBox();
  const x=cell!.x+cell!.width/2,y=cell!.y+cell!.height;
  await page.mouse.move(x,y);
  const cursor=await page.evaluate(({x,y})=>getComputedStyle(document.elementFromPoint(x,y)!).cursor,{x,y});
  expect(cursor).not.toBe("row-resize");
  await page.mouse.down();
  await page.mouse.move(x,y+28,{steps:6});
  await page.mouse.up();
  expect(await heights()).toEqual(before);
});
