import {expect,test,type Locator} from '@playwright/test';
// Measured from the original ZIP PNGs at 1 image pixel = 1 CSS px, not the resized chat previews.
const pageBoxes:Record<string,number[]>={
 'Page size':[12,45,113,20],Width:[57,70,68,20],Height:[57,92,68,20],
 'left margin':[177,45,60,20],'right margin':[177,68,60,20],'top margin':[177,91,60,20],'bottom margin':[177,114,60,20],
 Columns:[246,45,67,20],Gutter:[246,91,67,20],
};
const paragraphBoxes:Record<string,number[]>={
 Alignment:[62,37,88,20],Beginning:[79,83,68,20],End:[79,105,68,20],'First Line':[79,128,68,20],
 Breaks:[157,49,98,20],Widows:[209,105,53,20],Orphans:[209,128,53,20],
 'Line Height':[79,170,68,20],'Interline Gap':[79,193,68,20],Before:[194,170,68,20],After:[194,193,68,20],'Default Stop':[79,232,68,20],
};
async function measured(dialog:Locator,boxes:Record<string,number[]>,scale:number){
 const d=(await dialog.boundingBox())!;let maximum=0;
 for(const [name,box]of Object.entries(boxes)){
  const r=(await dialog.getByLabel(name,{exact:true}).boundingBox())!;
  const actual=[(r.x-d.x)/scale,(r.y-d.y)/scale,r.width/scale,r.height/scale];
  maximum=Math.max(maximum,...actual.map((v,i)=>Math.abs(v-box[i])));
  actual.forEach((v,i)=>expect(Math.abs(v-box[i]),`${name}[${i}] ${v} vs reference ${box[i]}`).toBeLessThanOrEqual(.55));
 }
 return maximum;
}
async function furniture(dialog:Locator,groups:Record<string,number[]>,buttonX:number,buttonWidth:number,scale:number){
 const d=(await dialog.boundingBox())!;
 for(const[name,expected]of Object.entries(groups)){const r=(await dialog.getByRole('group',{name,exact:true}).boundingBox())!;[(r.x-d.x)/scale,(r.y-d.y)/scale,r.width/scale,r.height/scale].forEach((v,i)=>expect(Math.abs(v-expected[i]),`${name} box`).toBeLessThanOrEqual(.55));}
 for(const [i,name]of ['OK','Cancel','Help'].entries()){const r=(await dialog.getByRole('button',{name,exact:true}).boundingBox())!;const e=[buttonX,36+i*26,buttonWidth,23];[(r.x-d.x)/scale,(r.y-d.y)/scale,r.width/scale,r.height/scale].forEach((v,j)=>expect(Math.abs(v-e[j]),`${name} button`).toBeLessThanOrEqual(.55));}
}
test.beforeEach(async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('qalam-site-language','en'));await page.goto('/tools/document-studio');
 await expect(page.locator('.ProseMirror')).toBeEditable();await expect.poll(()=>page.evaluate(()=>localStorage.getItem('qalam-document-studio-active-document-v1'))).not.toBeNull();
});
test('Page Setup matches native reference geometry, full margin text and disabled checks',async({page},info)=>{
 await page.locator('[data-menu-root="format"]').click();await page.locator('[data-menu-action="file.pageSetup"]').click();const dialog=page.getByRole('dialog',{name:'Page Setup',exact:true});
 const r=(await dialog.boundingBox())!,scale=Math.min(1,(page.viewportSize()!.width-16)/388,(page.viewportSize()!.height-16)/179);
 expect(Math.abs(r.width-388*scale)).toBeLessThan(.6);expect(Math.abs(r.height-179*scale)).toBeLessThan(.6);
 const error=await measured(dialog,pageBoxes,scale);await info.attach('field-geometry',{body:JSON.stringify({maxErrorCssPx:error}),contentType:'application/json'});await furniture(dialog,{Page:[9,34,120,136],Margins:[132,34,107,102],Columns:[242,34,74,81],Orientation:[12,117,114,50]},320,60,scale);await expect(dialog.getByLabel('Gutter',{exact:true})).toHaveValue('4.23mm');
 for(const label of ['Double Sided','Facing Pages'])await expect(dialog.getByLabel(label,{exact:true})).toBeDisabled();
 const fits=await dialog.getByLabel('bottom margin',{exact:true}).evaluate(el=>{const input=el as HTMLInputElement,s=getComputedStyle(input),ctx=document.createElement('canvas').getContext('2d')!;ctx.font=s.font;return ctx.measureText(input.value).width<=input.clientWidth-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight);});expect(fits).toBe(true);
 await dialog.screenshot({path:info.outputPath('page-setup.png'),scale:'css'});
});
test('Paragraph matches reference, retains values while dragged and clamps on screen',async({page},info)=>{
 await page.locator('.ProseMirror').click();await page.locator('[data-menu-root="format"]').click();await page.locator('[data-menu-action="format.paragraph"]').click();
 const dialog=page.getByRole('dialog',{name:'Paragraph Preferences',exact:true}),r=(await dialog.boundingBox())!,scale=Math.min(1,(page.viewportSize()!.width-24)/349,(page.viewportSize()!.height-24)/283);
 expect(Math.abs(r.width-349*scale)).toBeLessThan(.6);expect(Math.abs(r.height-283*scale)).toBeLessThan(.6);const error=await measured(dialog,paragraphBoxes,scale);await info.attach('field-geometry',{body:JSON.stringify({maxErrorCssPx:error}),contentType:'application/json'});await furniture(dialog,{Indents:[8,62,143,89],Breaks:[154,36,113,115],'Line Spacing':[8,156,143,60],'Paragraph Spacing':[154,156,113,60],Tab:[8,221,143,34],'Character Alignment':[154,221,113,34]},269,72,scale);
 await expect(dialog.locator('fieldset[data-classic-group="Indents"] select[name="alignment"]')).toHaveCount(0);
 await dialog.getByLabel('First Line',{exact:true}).fill('5mm');
 const handle=dialog.locator('[data-studio-dialog-drag-handle]');await expect(handle).toHaveCSS('cursor','default');
 for(const [x,y]of [[0,0],[page.viewportSize()!.width,0],[page.viewportSize()!.width,page.viewportSize()!.height],[0,page.viewportSize()!.height]]){
  const grip=(await handle.boundingBox())!;await page.mouse.move(grip.x+35,grip.y+12);await page.mouse.down();await page.mouse.move(x,y,{steps:3});await expect(handle).toHaveCSS('cursor','default');await page.mouse.up();
  const b=(await dialog.boundingBox())!;expect(b.x).toBeGreaterThanOrEqual(0);expect(b.y).toBeGreaterThanOrEqual(0);expect(b.x+b.width).toBeLessThanOrEqual(page.viewportSize()!.width+1);expect(b.y+b.height).toBeLessThanOrEqual(page.viewportSize()!.height+1);
 }
 await expect(dialog.getByLabel('First Line',{exact:true})).toHaveValue('5mm');await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
 await page.locator('[data-menu-root="format"]').click();await page.locator('[data-menu-action="format.paragraph"]').click();await dialog.screenshot({path:info.outputPath('paragraph.png'),scale:'css'});
});
