/* PDF Studio Phase 1A — synthetic, read-only comparison of production paths. */
const { chromium } = require("@playwright/test");
const fs = require("node:fs"), path = require("node:path"), cp = require("node:child_process");
const { PDFDocument } = require("pdf-lib");
const out=path.resolve("artifacts/pdf-phase1a");fs.mkdirSync(out,{recursive:true});
const mark=(font,size)=>[{type:"textStyle",attrs:{fontFamily:font,fontSize:size}}];
const paragraph=(text,font,size,attrs={})=>({type:"paragraph",attrs:{dir:"rtl",...attrs},content:[{type:"text",text,marks:mark(font,size)}]});
const heading=(text,font)=>({type:"heading",attrs:{level:2,dir:"rtl"},content:[{type:"text",text,marks:mark(font,"20pt")}]});
const u="یہ صرف آزمائشی اردو عبارت ہے جس میں حروف، نقطوں، الفاظ، جملوں اور نستعلیق سطروں کی درستی دیکھی جاتی ہے۔ ";
const a="هٰذَا نَصٌّ عَرَبِيٌّ تَجْرِيبِيٌّ مَعَ الْحَرَكَاتِ وَالشَّدَّةِ وَالْمَدِّ لِفَحْصِ الطِّبَاعَةِ. ";
const p="این متن نمونه‌ای برای سنجش حروف فارسی، پیوستگی کلمات، نشانه‌ها و صفحه‌آرایی است. ";
const samples=[
 {id:"urdu",font:"Gulzar",doc:{type:"doc",content:[heading("اردو عنوان — اشاعتی آزمائش","Alvi Nastaleeq"),paragraph(u.repeat(24),"Jameel Noori Nastaleeq","16pt",{textAlign:"justify",lineHeight:1.8}),paragraph(u.repeat(32),"Gulzar","16pt",{textAlign:"right",lineHeight:2}),paragraph(u.repeat(20),"Alvi Nastaleeq","15pt",{textAlign:"center",lineHeight:1.6})]}},
 {id:"arabic",font:"Amiri",doc:{type:"doc",content:[heading("اِخْتِبَارُ الْكِتَابَةِ الْعَرَبِيَّةِ","Amiri"),paragraph(a.repeat(35),"Amiri","16pt",{textAlign:"justify",lineHeight:1.8}),paragraph(a.repeat(23),"Digital Khatt Indo-Pak","16pt",{textAlign:"right",lineHeight:2})]}},
 {id:"persian",font:"Vazirmatn",doc:{type:"doc",content:[heading("آزمایش صفحه‌آرایی فارسی","Vazirmatn"),paragraph(p.repeat(45),"Vazirmatn","15pt",{textAlign:"justify",lineHeight:1.7}),paragraph(p.repeat(21),"Vazirmatn","15pt",{textAlign:"right",lineHeight:1.5})]}},
 {id:"mixed",font:"Gulzar",doc:{type:"doc",content:[heading("مخلوط اردو، عربی، فارسی اور English","Gulzar"),{type:"paragraph",attrs:{dir:"rtl",textAlign:"justify",lineHeight:1.8},content:[{type:"text",text:u,marks:mark("Gulzar","16pt")},{type:"text",text:a,marks:mark("Amiri","16pt")},{type:"text",text:"Document Studio 2026, A4, Unicode; ",marks:mark("Inter","12pt")},{type:"text",text:p,marks:mark("Vazirmatn","16pt")}]},paragraph((u+a+p+" English 123. ").repeat(12),"Gulzar","16pt",{textAlign:"justify",lineHeight:1.8})]}}
];
function flatten(n){return typeof n.text==="string"?n.text:(n.content||[]).map(flatten).join("");}
function html(n){if(n.type==="text"){const m=(n.marks||[]).find(x=>x.type==="textStyle")?.attrs||{};return '<span style="font-family:&quot;'+(m.fontFamily||"Amiri")+'&quot;;font-size:'+(m.fontSize||"16pt")+'">'+esc(n.text||"")+"</span>";}
 const tag=n.type==="heading"?"h2":"p",attr=n.attrs||{};return '<'+tag+' dir="'+(attr.dir||"rtl")+'" style="text-align:'+(attr.textAlign||"right")+';line-height:'+(attr.lineHeight||1.8)+';margin-bottom:6pt">'+(n.content||[]).map(html).join("")+'</'+tag+'>'; }
function esc(s){return s.replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}
function exec(command,args){try{return cp.execFileSync(command,args,{encoding:"utf8",maxBuffer:5e6})}catch(e){return "ERROR: "+(e.stderr||e.message)}}
(async()=>{
let browser;const report={baseSha:"",branchSha:process.env.GITHUB_SHA,samples:[],errors:[],environment:{},note:"Print uses real application's print portal; print document content inserted as synthetic editor HTML, not user interaction."};
try{
report.baseSha=exec("git",["rev-parse","HEAD"]).trim();
browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const page=await browser.newPage({viewport:{width:1280,height:960}});
await page.goto("http://127.0.0.1:3000/tools/document-studio",{waitUntil:"domcontentloaded",timeout:60000});await page.waitForTimeout(1500);
for(const s of samples){const row={id:s.id,status:"NOT VERIFIED",fonts:{},warnings:[],timingsMs:{},pdfs:{}}, settings={version:1,presetId:"default",page:{size:"a4",orientation:"portrait",margins:{preset:"normal",topMm:25.4,bottomMm:25.4,startMm:25.4,endMm:25.4}},typography:{bodyFontSizePt:12,lineHeight:1.5,paragraphBeforePt:0,paragraphAfterPt:6,firstLineIndentMm:0,defaultRtlFontId:"noto-nastaliq-urdu",defaultLtrFontId:"inter"},headerFooter:{headerEnabled:false,headerMode:"auto-title",headerText:"",footerEnabled:false,footerText:"",pageNumbers:"none"}};
try{
const setup=await page.evaluate(({markup})=>{const root=document.querySelector("[data-studio-print-root]"),surface=document.querySelector("[data-studio-print-surface]");if(!root||!surface)return {root:!!root,surface:!!surface};const editor=surface.querySelector(".qalam-editor-content");if(!editor)return {root:true,surface:true,editor:false};editor.innerHTML='<div class="ProseMirror" dir="rtl">'+markup+"</div>";root.setAttribute("data-print-page-width-mm","210");root.setAttribute("data-print-page-height-mm","297");root.setAttribute("data-print-margin-top-mm","25.4");root.setAttribute("data-print-margin-bottom-mm","25.4");root.setAttribute("data-print-margin-left-mm","25.4");root.setAttribute("data-print-margin-right-mm","25.4");root.setAttribute("data-print-dir","rtl");return {root:true,surface:true,editor:true}}, {markup:s.doc.content.map(html).join("")});
if(!setup.editor)throw Error("Browser print source not mounted "+JSON.stringify(setup));
await page.evaluate(()=>{document.querySelectorAll("[data-studio-print-portal]").forEach(n=>n.remove())});
await page.evaluate(async()=>{for(const f of ["Jameel Noori Nastaleeq","Gulzar","Alvi Nastaleeq","Amiri","Digital Khatt Indo-Pak","Vazirmatn"])try{await document.fonts.load('16px "'+f+'"')}catch{};await document.fonts.ready;});
const sourceFonts=await page.evaluate(()=>{const spans=[...document.querySelectorAll("[data-studio-print-surface] .ProseMirror span")].slice(0,20);return spans.map(x=>({font:x.style.fontFamily,text:x.textContent?.slice(0,16)}))});row.fonts.selection=sourceFonts;
const t0=Date.now();
const printSetup=await page.evaluate(()=>{const source=document.querySelector("[data-studio-print-surface] .qalam-editor-content"),root=document.querySelector("[data-studio-print-root]");if(!source||!root)return "MISSING";const w=210,h=297,top=25.4,bottom=25.4,left=25.4,right=25.4;const portal=document.createElement("div");portal.setAttribute("data-studio-print-portal","true");const div=document.createElement("div");div.setAttribute("data-studio-print-page","true");div.setAttribute("dir","rtl");div.className=source.className;div.innerHTML=source.innerHTML;div.style.cssText='width:'+w+'mm;box-sizing:border-box;padding:0 '+right+'mm 0 '+left+'mm;background:#fff;min-height:0';const style=document.createElement("style");style.textContent='@page{size:210mm 297mm;margin:25.4mm 0 25.4mm 0}@media print{body>*:not([data-studio-print-portal]){display:none!important}[data-studio-print-portal]{position:static!important;display:block!important;width:210mm!important;transform:none!important}[data-studio-print-page]{width:210mm!important;box-sizing:border-box!important;border:0!important;box-shadow:none!important}}';portal.append(style,div);document.body.appendChild(portal);return "mounted";});
if(printSetup!=="mounted")throw Error(printSetup);
await page.evaluate(()=>document.fonts.ready);
const cdp=await page.context().newCDPSession(page);await cdp.send("DOM.enable");await cdp.send("CSS.enable");const tree=await cdp.send("DOM.getDocument",{depth:-1});const nodes=await cdp.send("DOM.querySelectorAll",{nodeId:tree.root.nodeId,selector:"[data-studio-print-page] span"});row.fonts.print=[];for(const nodeId of nodes.nodeIds.slice(0,12)){const fonts=await cdp.send("CSS.getPlatformFontsForNode",{nodeId});row.fonts.print.push(fonts.fonts);}
const printBytes=await page.pdf({format:"A4",preferCSSPageSize:true,printBackground:true,margin:{top:0,bottom:0,left:0,right:0}});row.timingsMs.browserPrint=Date.now()-t0;const pp=path.join(out,s.id+"-browser-print.pdf");fs.writeFileSync(pp,printBytes);
await page.evaluate(()=>document.querySelectorAll("[data-studio-print-portal]").forEach(n=>n.remove()));
const t1=Date.now();const response=await page.request.post("http://127.0.0.1:3000/api/export-pdf",{data:{doc:s.doc,dir:"rtl",settings},timeout:180000});row.timingsMs.downloadPdf=Date.now()-t1;row.downloadHttpStatus=response.status();row.downloadHeaders=response.headers();
if(response.ok()){const raw=await response.body();fs.writeFileSync(path.join(out,s.id+"-server-download.pdf"),raw)}
else row.warnings.push("Server exporter HTTP "+response.status()+": "+(await response.text()).slice(0,1000));
for(const [key,file] of [["browser",pp],["server",path.join(out,s.id+"-server-download.pdf")]])if(fs.existsSync(file)){const bytes=fs.readFileSync(file),pdf=await PDFDocument.load(bytes);const info=exec("pdfinfo",[file]);const fonts=exec("pdffonts",[file]);const xml=exec("pdftotext",["-bbox-layout",file,"-"]);const text=exec("pdftotext",["-layout",file,"-"]);fs.writeFileSync(file+".bbox.html",xml);fs.writeFileSync(file+".txt",text);row.pdfs[key]={bytes:bytes.length,pageCount:pdf.getPageCount(),pageSizesPt:pdf.getPages().map(pg=>({w:pg.getWidth(),h:pg.getHeight()})),fonts:fonts.slice(0,2500),info:info.split("\n").filter(x=>/Page size|Pages:|File size/.test(x)),textLen:text.length,sourceLen:flatten(s.doc).length,bboxWords:(xml.match(/<word /g)||[]).length};}
row.status=row.pdfs.browser&&row.pdfs.server?"MEASURED":"PARTIAL";
}catch(e){row.warnings.push(String(e.stack||e))}
report.samples.push(row);
}
}catch(e){report.errors.push(String(e.stack||e))}
finally{fs.writeFileSync(path.join(out,"baseline.json"),JSON.stringify(report,null,2));if(browser)await browser.close();}
console.log(JSON.stringify({samples:report.samples.map(x=>({id:x.id,status:x.status,errors:x.warnings,print:x.pdfs.browser,download:x.pdfs.server})),errors:report.errors},null,2));if(report.errors.length||report.samples.some(x=>x.status!=="MEASURED"))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
