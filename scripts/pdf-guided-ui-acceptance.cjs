/* Synthetic, runner-local browser acceptance for the actual Document Studio repair panel. */
const puppeteer=require("puppeteer-core");
const chromium=require("@sparticuz/chromium").default;
const {PDFDocument}=require("pdf-lib");
const {mkdirSync,writeFileSync}=require("node:fs");
const path=require("node:path");
const output="artifacts/pdf-guided-ui";
const findText=(node,indices=[])=>{
  if(node?.type==="text"&&typeof node.text==="string"&&node.text.length) return {path:indices,text:node.text};
  for(const [i,child] of (node?.content||[]).entries()){
    const found=findText(child,[...indices,i]);if(found)return found;
  }
  return null;
};
(async()=>{
 mkdirSync(output,{recursive:true});
 const pdf=await PDFDocument.create();pdf.addPage([595,842]);const pdfBytes=Buffer.from(await pdf.save());
 const browser=await puppeteer.launch({headless:true,executablePath:await chromium.executablePath(),args:chromium.args});
 const page=await browser.newPage();
 await page.setViewport({width:1365,height:900});
 let attempts=0;
 await page.setRequestInterception(true);
 page.on("request",async request=>{
   if(!request.url().includes("/api/export-pdf"))return request.continue();
   attempts++;
   if(attempts===1){
     const body=JSON.parse(request.postData()||"{}");
     const found=findText(body.doc);
     if(!found)return request.respond({status:500,contentType:"application/json",body:JSON.stringify({error:"Synthetic error",diagnostic:{version:1,code:"UNKNOWN",messageUr:"آزمائشی خرابی",retryable:true,issues:[]}})});
     const cp=found.text.codePointAt(0);
     const diag={version:1,code:"FONT_FALLBACK",messageUr:"منتخب فونٹ کے حروف کی محفوظ جانچ ناکام ہوئی۔",retryable:false,issues:[{
       id:"synthetic-1",kind:"FONT_FALLBACK",reason:"unapproved-painted-font",
       selectedFont:"Digital Khatt Indo-Pak",actualFont:"Liberation Serif",
       codePoint:"U+"+cp.toString(16).toUpperCase().padStart(4,"0"),
       character:String.fromCodePoint(cp),location:{path:found.path,blockPath:found.path.slice(0,-1),
       runIndex:0,textOffset:0,expectedText:found.text}
     }]};
     return request.respond({status:500,contentType:"application/json",body:JSON.stringify({error:"PDF font safety validation export blocked",diagnostic:diag})});
   }
   return request.respond({status:200,contentType:"application/pdf",headers:{
     "X-Pdf-Page-Count":"1","X-Pdf-File-Size-Bytes":String(pdfBytes.length),
     "Content-Disposition":'attachment; filename="qalam-document.pdf"'
   },body:pdfBytes});
 });
 try{
   await page.goto("http://127.0.0.1:3000/tools/document-studio",{waitUntil:"domcontentloaded",timeout:90000});
   await page.waitForSelector('[data-studio-export-pdf="true"]',{timeout:90000});
   // A fresh Document Studio starts empty. Author a public synthetic sentence
   // before requesting a diagnosis so source navigation can actually be proven.
   const editor = await page.$('.ProseMirror[contenteditable="true"]');
   if(!editor)throw Error("Real editable ProseMirror surface missing");
   await editor.click();
   await page.keyboard.insertText("هٰذَا نَصٌّ عَرَبِيٌّ لِاخْتِبَارِ النَّصِّ.");
   await page.waitForFunction(()=>document.querySelector('.ProseMirror')?.textContent?.includes('هٰذَا'),{timeout:10000});
   await page.click('[data-studio-export-pdf="true"]');
   await page.waitForSelector('[aria-label="پی ڈی ایف برآمد کی خرابی"]',{timeout:20000});
   await page.screenshot({path:path.join(output,"urdu-guided-repair.png"),fullPage:true});
   const button=await page.$('[aria-label="پی ڈی ایف برآمد کی خرابی"] button');
   if(!button)throw Error("Navigation button missing");
   await button.click();
   await page.waitForFunction(()=>Boolean(window.getSelection()?.toString()),{timeout:8000});
   const selected=await page.evaluate(()=>window.getSelection()?.toString()||"");
   if(!selected)throw Error("Click did not navigate/select editor text");
   const originalText=await page.$eval('.ProseMirror',el=>el.textContent||"");
   // Explicit synthetic user edit, then undo: no editor changes are automatic.
   await page.keyboard.insertText("ب");
   await page.waitForFunction(before=>document.querySelector('.ProseMirror')?.textContent!==before,{timeout:8000},originalText);
   await page.keyboard.down("Control");
   await page.keyboard.press("z");
   await page.keyboard.up("Control");
   await page.waitForFunction(before=>document.querySelector('.ProseMirror')?.textContent===before,{timeout:8000},originalText);
   const retry=await page.$('[aria-label="پی ڈی ایف برآمد کی خرابی"] button:last-child');
   if(!retry)throw Error("Retry button missing");
   await retry.click();
   await page.waitForFunction(()=>!document.querySelector('[aria-label="پی ڈی ایف برآمد کی خرابی"]'),{timeout:10000});
   writeFileSync(path.join(output,"browser-result.json"),JSON.stringify({passed:true,attempts,selectedCodePoints:Array.from(selected).map(x=>x.codePointAt(0)),manualEditAndUndoVerified:true,note:"Only synthetic authored text was used; no private manuscript stored."},null,2));
   console.log("PDF_GUIDED_UI_PASS",attempts);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
