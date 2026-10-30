import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("qalam-site-language", "en"));
  await page.goto("/tools/document-studio");
  await expect(page.locator(".ProseMirror")).toBeEditable({ timeout: 15000 });
  await expect.poll(()=>page.evaluate(()=>localStorage.getItem("qalam-document-studio-active-document-v1"))).not.toBeNull();
});

test("Character title bar can be dragged without changing the format form", async ({ page }) => {
  await page.locator(".ProseMirror").click();
  await page.locator('[data-menu-root="format"]').click();
  await page.locator('[data-menu-action="format.character"]').click();
  const dlg = page.locator('[data-studio-character-dialog]');
  const handle = dlg.locator('[data-studio-character-drag-handle]');
  await expect(handle).toHaveCSS("cursor","default");
  const before = (await dlg.boundingBox())!;
  const grip = (await handle.boundingBox())!;
  await page.mouse.move(grip.x + 85, grip.y + 12);
  await page.mouse.down();
  await page.mouse.move(grip.x + 145, grip.y + 38, { steps: 6 });
  await page.mouse.up();
  const after = (await dlg.boundingBox())!;
  if(page.viewportSize()!.width>600) expect(after.x).toBeGreaterThan(before.x + 35);
  else {expect(after.x).toBeGreaterThanOrEqual(0);expect(after.x+after.width).toBeLessThanOrEqual(page.viewportSize()!.width);}
  expect(after.y).toBeGreaterThan(before.y + 12);
  await expect(dlg.getByRole("combobox", { name: "Size" })).toBeVisible();
  await dlg.getByRole("button", { name: "Cancel" }).click();
});

test("Paragraph Preferences has compact classical groups", async ({ page }) => {
  await page.locator(".ProseMirror").click();
  await page.locator('[data-menu-root="format"]').click();
  await page.locator('[data-menu-action="format.paragraph"]').click();
  const dlg = page.locator('[data-studio-paragraph-dialog]');
  await expect(dlg).toBeVisible();
  await expect(dlg.getByRole("group", { name: "Indents" })).toBeVisible();
  await expect(dlg.getByRole("group", { name: "Breaks" })).toBeVisible();
  const box = (await dlg.boundingBox())!;
  expect(box.width).toBeLessThanOrEqual(448);
  await dlg.getByRole("button", { name: "Cancel" }).click();
});

test("Format > Document opens a real Page Setup; cancel preserves the page and text", async ({ page }) => {
  const before = await page.locator(".ProseMirror").innerText();
  await page.locator('[data-menu-root="format"]').click();
  await page.locator('[data-menu-action="file.pageSetup"]').click();
  const dlg = page.getByRole("dialog", { name: "Page Setup" });
  await expect(dlg).toBeVisible();
  await expect(dlg.getByRole('checkbox',{name:'Facing Pages'})).toHaveCount(0);
  await dlg.getByLabel('Page size',{exact:true}).selectOption('b4');
  await expect(dlg.getByLabel('Width',{exact:true})).toHaveValue('250mm');
  await dlg.getByRole("button", { name: "Cancel" }).click();
  expect(await page.locator(".ProseMirror").innerText()).toBe(before);
});

test("File > Open has a classical dialog and real saved-document / InPage actions", async ({ page }) => {
  await page.locator('[data-menu-root="file"]').click();
  await page.locator('[data-menu-action="file.open"]').click();
  const dlg = page.locator('[data-studio-open-dialog]');
  await expect(dlg).toBeVisible();
  await expect(dlg.getByRole("listbox", { name: "Saved documents" })).toBeVisible();
  await expect(dlg.getByRole("button", { name: "Open InPage file…" })).toHaveCount(0);
  await expect(dlg.getByRole("combobox", {name:"Files of type"})).toContainText("InPage files (*.inp)");
  await dlg.getByRole("button", { name: "Cancel" }).click();
  await expect(dlg).toHaveCount(0);
});

// Fidelity review: behavior and viewport geometry, without a production build.
async function settingsDialog(page: import('@playwright/test').Page) {
  await page.locator('[data-menu-root="format"]').click(); await page.locator('[data-menu-action="file.pageSetup"]').click();
  return page.getByRole('dialog', { name: 'Page Setup', exact: true });
}
test('review: capture all four dialogs before/after and preserve cancelled content', async ({ page }, info) => {
  await page.locator('.ProseMirror').click(); await page.keyboard.insertText('محفوظ عبارت');
  const before = await page.locator('.ProseMirror').evaluate(el => (el as HTMLElement & { editor: import('@tiptap/core').Editor }).editor.getJSON());
  for(const [menu,action,selector,name] of [
    ['format','format.character','[data-studio-character-dialog]','character'],
    ['format','format.paragraph','[data-studio-paragraph-dialog]','paragraph'],
    ['format','file.pageSetup','[data-studio-page-setup]','page-setup-a'],
    ['file','file.open','[data-studio-open-dialog]','open'],
  ]) {
    await page.locator(`[data-menu-root="${menu}"]`).click(); await page.locator(`[data-menu-action="${action}"]`).click();
    const dialog = page.locator(selector); await expect(dialog).toBeVisible();
    await dialog.screenshot({path:info.outputPath(`${name}.png`),scale:'css'});
    const measurements=await dialog.evaluate(el=>{const root=el.getBoundingClientRect();return {width:root.width,height:root.height,controls:[...el.querySelectorAll('fieldset,input,select,button')].map(n=>{const r=n.getBoundingClientRect();return {label:n.getAttribute('aria-label')||n.querySelector('legend')?.textContent||n.textContent?.slice(0,35),x:r.left-root.left,y:r.top-root.top,width:r.width,height:r.height};})};});
    await info.attach(`${name}-geometry`,{body:JSON.stringify(measurements,null,2),contentType:'application/json'});
    const rect=(await dialog.boundingBox())!, viewport=page.viewportSize()!;
    expect(rect.x).toBeGreaterThanOrEqual(0); expect(rect.y).toBeGreaterThanOrEqual(0);
    expect(rect.x+rect.width).toBeLessThanOrEqual(viewport.width+1);
    await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
  }
  expect(await page.locator('.ProseMirror').evaluate(el => (el as HTMLElement & { editor: import('@tiptap/core').Editor }).editor.getJSON())).toEqual(before);
});
test('review: Character stays inside a 375px viewport and after resizing a dragged window', async ({ page }) => {
  await page.setViewportSize({width:375,height:740}); await page.locator('.ProseMirror').click();
  await page.locator('[data-menu-root="format"]').click(); await page.locator('[data-menu-action="format.character"]').click();
  const dlg=page.locator('[data-studio-character-dialog]');
  await expect.poll(async()=>{const b=(await dlg.boundingBox())!;return b.x>=0&&b.x+b.width<=375.5;}).toBe(true);
  await page.setViewportSize({width:1280,height:800});
  const grip=(await dlg.locator('[data-studio-character-drag-handle]').boundingBox())!;
  await page.mouse.move(grip.x+30,grip.y+8);await page.mouse.down();await page.mouse.move(1200,700,{steps:4});await page.mouse.up();
  await page.setViewportSize({width:375,height:740});
  await expect.poll(async()=>{const b=(await dlg.boundingBox())!;return b.x>=0&&b.x+b.width<=375.5&&b.y>=0&&b.y+b.height<=740.5;}).toBe(true);
});
test('review: Page Setup exposes paper controls only, with the requested classic size',async({page},info)=>{
 const dlg=await settingsDialog(page);
 await expect(dlg.getByRole('checkbox')).toHaveCount(0);
 const r=(await dlg.boundingBox())!;expect(r.width).toBeLessThanOrEqual(389);expect(r.height).toBeLessThanOrEqual(179);
 await expect(dlg.getByLabel('Width',{exact:true})).toBeEditable();
 await expect(dlg.getByLabel('Height',{exact:true})).toBeEditable();
 await dlg.screenshot({path:info.outputPath('page-setup-b.png'),scale:'css'});
 await page.keyboard.press('Escape');await expect(dlg).toHaveCount(0);
});
test('review: Page Setup rejects invalid values, applies A5 geometry and preserves authored text', async ({ page }) => {
  await page.locator('.ProseMirror').click();await page.keyboard.insertText('Keep this document محفوظ');
  const content=await page.locator('.ProseMirror').innerText();let dlg=await settingsDialog(page);
  await dlg.getByLabel('left margin',{exact:true}).fill('not-a-number');await dlg.getByRole('button',{name:'OK',exact:true}).click();
  await expect(dlg.getByRole('alert')).toBeVisible();await dlg.getByLabel('left margin',{exact:true}).fill('15mm');
  await dlg.getByLabel('Page size',{exact:true}).selectOption('a5');await dlg.getByLabel('Landscape',{exact:true}).check();
  await dlg.getByLabel('right margin',{exact:true}).fill('20mm');await dlg.getByRole('button',{name:'OK',exact:true}).click();
  await expect(page.locator('[data-studio-print-root]')).toHaveAttribute('data-print-page-width-mm','210');
  await expect(page.locator('[data-studio-print-root]')).toHaveAttribute('data-print-page-height-mm','148');
  expect(await page.locator('.ProseMirror').innerText()).toBe(content);
  await page.locator('[data-menu-root="file"]').click();await page.locator('[data-menu-action="file.save"]').click();await expect(page.locator('[data-studio-save-status="saved"]')).toBeVisible();
  await page.reload();await expect(page.locator('.ProseMirror')).toBeEditable();
  dlg=await settingsDialog(page);await expect(dlg.getByLabel('Page size',{exact:true})).toHaveValue('a5');
  await expect(dlg.getByLabel('left margin',{exact:true})).toHaveValue('15mm');await expect(dlg.getByLabel('right margin',{exact:true})).toHaveValue('20mm');
});
test('review: Open focuses safely, Escape closes it, and advertises only supported import', async ({ page }) => {
  await page.locator('[data-menu-root="file"]').click();await page.locator('[data-menu-action="file.open"]').click();
  const dlg=page.locator('[data-studio-open-dialog]');await expect(dlg.getByRole('combobox',{name:'Files of type'})).not.toContainText('*.int');
  expect(await dlg.evaluate(el=>el.contains(document.activeElement))).toBe(true);
  const chooser=page.waitForEvent('filechooser');await dlg.getByRole('combobox',{name:'Files of type'}).selectOption('inpage');await dlg.getByRole('button',{name:'Open',exact:true}).click();
  const picker=await chooser;expect(await picker.isMultiple()).toBe(false);await picker.setFiles([]);
  await page.keyboard.press('Escape');await expect(dlg).toHaveCount(0);
});
test('review: drag all directions, dropdown follows, and Character still formats the selected story', async ({ page },info) => {
  await page.locator('.ProseMirror').click();await page.keyboard.insertText('محفوظ عبارت');await page.keyboard.press('Control+a');
  const snapshot=()=>page.locator('.ProseMirror').evaluate(el=>(el as HTMLElement & {editor:import('@tiptap/core').Editor}).editor.getJSON());const before=await snapshot();
  await page.locator('[data-menu-root="format"]').click();await page.locator('[data-menu-action="format.character"]').click();
  const dlg=page.locator('[data-studio-character-dialog]');
  for(const [x,y] of [[0,0],[1280,0],[1280,900],[0,900]]){
    const grip=(await dlg.locator('[data-studio-character-drag-handle]').boundingBox())!;
    await page.mouse.move(grip.x+Math.min(30,grip.width/2),grip.y+8);await page.mouse.down();await page.mouse.move(x,y,{steps:3});await page.mouse.up();
    const r=(await dlg.boundingBox())!,v=page.viewportSize()!;expect(r.x).toBeGreaterThanOrEqual(0);expect(r.y).toBeGreaterThanOrEqual(0);expect(r.x+r.width).toBeLessThanOrEqual(v.width+1);expect(r.y+r.height).toBeLessThanOrEqual(v.height+1);
  }
  if(info.project.name==='mobile-android'){
    const session=await page.context().newCDPSession(page),grip=(await dlg.locator('[data-studio-character-drag-handle]').boundingBox())!;
    const x=grip.x+30,y=grip.y+8;
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-25}]});
    await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    const moved=(await dlg.boundingBox())!;expect(moved.y).toBeLessThan(grip.y-10);await session.detach();
  }
  expect(await snapshot()).toEqual(before);
  await dlg.getByRole('button',{name:'Size list',exact:true}).click();const list=page.getByRole('listbox',{name:'Size choices'});await expect(list).toBeVisible();
  const r=(await list.boundingBox())!,v=page.viewportSize()!;expect(r.x).toBeGreaterThanOrEqual(0);expect(r.x+r.width).toBeLessThanOrEqual(v.width+1);
  await list.getByRole('option',{name:'14pt',exact:true}).click();await dlg.getByRole('button',{name:'OK',exact:true}).click();
  expect(JSON.stringify(await snapshot())).toContain('14pt');
});
test('review: Paragraph validation and apply work, then Cancel preserves the result', async ({page})=>{
  await page.locator('.ProseMirror').click();await page.keyboard.insertText('محفوظ پیراگراف');await page.keyboard.press('Control+a');
  const snapshot=()=>page.locator('.ProseMirror').evaluate(el=>(el as HTMLElement & {editor:import('@tiptap/core').Editor}).editor.getJSON());
  const open=async()=>{await page.locator('[data-menu-root="format"]').click();await page.locator('[data-menu-action="format.paragraph"]').click();return page.getByRole('dialog',{name:'Paragraph Preferences',exact:true});};
  let dlg=await open();const before=await snapshot();await dlg.getByLabel('First Line',{exact:true}).fill('bad');await dlg.getByRole('button',{name:'OK',exact:true}).click();await expect(dlg.getByRole('alert')).toBeVisible();expect(await snapshot()).toEqual(before);
  await dlg.getByLabel('First Line',{exact:true}).fill('5mm');await dlg.getByLabel('Line Height',{exact:true}).fill('24pt');await dlg.getByRole('button',{name:'OK',exact:true}).click();
  expect(JSON.stringify(await snapshot())).toContain('firstLineIndentMm');const applied=await snapshot();expect(applied).not.toEqual(before);
  dlg=await open();await dlg.getByLabel('Alignment',{exact:true}).selectOption('left');await dlg.getByRole('button',{name:'Cancel',exact:true}).click();expect(await snapshot()).toEqual(applied);
});
test('review: saved documents open by double-click and Enter; rename/delete and page settings remain real',async({page})=>{
  const rename=async(name:string)=>{await page.locator('button[data-studio-document-title]').click();await page.locator('input[data-studio-document-title]').fill(name);await page.locator('input[data-studio-document-title]').press('Enter');};
  const save=async()=>{await page.locator('[data-menu-root="file"]').click();await page.locator('[data-menu-action="file.save"]').click();await expect(page.locator('[data-studio-save-status="saved"]')).toBeVisible();};
  const library=async()=>{await page.locator('[data-menu-root="file"]').click();await page.locator('[data-menu-action="file.open"]').click();return page.locator('[data-studio-open-dialog]');};
  await rename('Dialog Alpha');await page.locator('.ProseMirror').click();await page.keyboard.insertText('Alpha retained');let setup=await settingsDialog(page);await setup.getByLabel('Page size',{exact:true}).selectOption('folio');await setup.getByRole('button',{name:'OK',exact:true}).click();await save();
  await page.locator('[data-menu-root="file"]').click();await page.locator('[data-menu-action="file.new"]').click();await page.getByRole('dialog',{name:'New Document',exact:true}).getByRole('button',{name:'OK',exact:true}).click();
  await rename('Dialog Beta');await page.locator('.ProseMirror').click();await page.keyboard.insertText('Beta retained');await save();
  let dlg=await library();await dlg.getByRole('option',{name:/Dialog Alpha/}).dblclick();await expect(page.locator('.ProseMirror')).toContainText('Alpha retained');setup=await settingsDialog(page);await expect(setup.getByLabel('Page size',{exact:true})).toHaveValue('folio');await setup.getByRole('button',{name:'Cancel',exact:true}).click();
  dlg=await library();await dlg.getByRole('option',{name:/Dialog Beta/}).focus();await page.keyboard.press('Enter');await expect(page.locator('.ProseMirror')).toContainText('Beta retained');
  dlg=await library();page.once('dialog',dialog=>dialog.accept('Renamed Beta'));await dlg.getByRole('button',{name:'Rename',exact:true}).click();await expect(dlg.getByRole('option',{name:/Renamed Beta/})).toBeVisible();
  await dlg.getByRole('option',{name:/Dialog Alpha/}).click();page.once('dialog',dialog=>dialog.dismiss());await dlg.getByRole('button',{name:'Delete',exact:true}).click();await expect(dlg.getByRole('option',{name:/Dialog Alpha/})).toBeVisible();
  page.once('dialog',dialog=>dialog.accept());await dlg.getByRole('button',{name:'Delete',exact:true}).click();await expect(dlg.getByRole('option',{name:/Dialog Alpha/})).toHaveCount(0);await expect(dlg.getByRole('option',{name:/Renamed Beta/})).toBeVisible();
  const chooser=page.waitForEvent('filechooser');await dlg.getByRole('combobox',{name:'Files of type'}).selectOption('inpage');await dlg.getByRole('button',{name:'Open',exact:true}).click();await(await chooser).setFiles('tests/fixtures/inpage/hadiyat.inp');
  await expect(page.getByRole('dialog',{name:'Additional InPage stories',exact:true})).toBeVisible();await expect(dlg).toHaveCount(0);
});

test('Classic menu dialogs can be moved by title bars without changing selected text', async ({ page }) => {
  await page.locator('.ProseMirror').click();
  await page.keyboard.insertText('This story is unchanged');
  const before = await page.locator('.ProseMirror').innerText();
  const items = [
    { menu: 'format', action: 'file.pageSetup', selector: '[data-studio-page-setup]' },
    { menu: 'file', action: 'file.open', selector: '[data-studio-open-dialog]' },
    { menu: 'file', action: 'file.new', selector: '[data-studio-new-document] form' },
  ];
  for (const item of items) {
    await page.locator('[data-menu-root="' + item.menu + '"]').click();
    await page.locator('[data-menu-action="' + item.action + '"]').click();
    const dlg = page.locator(item.selector), bar = dlg.locator('[data-studio-dialog-drag-handle]');
    await expect(bar).toBeVisible();await expect(bar).toHaveCSS("cursor","default");
    const start = (await dlg.boundingBox())!, handle = (await bar.boundingBox())!;
    await page.mouse.move(handle.x + 35, handle.y + 8);
    await page.mouse.down();
    await page.mouse.move(handle.x + 85, handle.y + 25, { steps: 5 });
    await page.mouse.up();
    const end = (await dlg.boundingBox())!;
    if(page.viewportSize()!.width>600) expect(end.x).toBeGreaterThan(start.x + 15);
    else {expect(end.x).toBeGreaterThanOrEqual(0);expect(end.x+end.width).toBeLessThanOrEqual(page.viewportSize()!.width+1);}
    expect(end.y).toBeGreaterThan(start.y + 5);
    await dlg.getByRole('button', { name: 'Cancel', exact: true }).click();
  }
  expect(await page.locator('.ProseMirror').innerText()).toBe(before);
});

test('File Close saves the active document and removes its window without deleting it', async ({ page }) => {
  await page.locator('.ProseMirror').click();
  await page.keyboard.insertText('Saved before closing 147');
  await page.locator('[data-menu-root="file"]').click();
  await page.locator('[data-menu-action="file.close"]').click();
  const dialog = page.locator('[data-studio-open-dialog]');
  await expect(dialog).toBeVisible();
  const row = dialog.locator('[role="option"]').first();
  await expect(row).toBeVisible();
  await row.dblclick();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('.ProseMirror')).toContainText('Saved before closing 147');
});
