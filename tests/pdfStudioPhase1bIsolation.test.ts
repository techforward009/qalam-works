import {describe,it,expect} from "vitest";
import {mkdirSync,writeFileSync} from "node:fs";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import {PDFDocument} from "pdf-lib";
import {fontsForDocument} from "../app/tools/document-studio/utils/pdfDocumentFonts";
import {buildPdfHtml} from "../app/tools/document-studio/utils/buildPdfHtml";
import {defaultDocumentSettings} from "../app/tools/document-studio/utils/documentSettings";
import {documentPrintCss} from "../app/tools/document-studio/utils/documentView";
import type {DocNode} from "../app/tools/document-studio/utils/extractPlainText";

const out="artifacts/pdf-phase1b";
const a="هٰذَا نَصٌّ عَرَبِيٌّ تَجْرِيبِيٌّ مَعَ الْحَرَكَاتِ وَالشَّدَّةِ وَالْمَدِّ لِفَحْصِ الطِّبَاعَةِ. ";
const mk=(text:string,font:string,attr:Record<string,unknown>={}):DocNode=>({type:"paragraph",attrs:{dir:"rtl",...attr},content:[{type:"text",text,marks:[{type:"textStyle",attrs:{fontFamily:font,fontSize:"16pt"}}]}]});
const doc:DocNode={type:"doc",content:[
 {type:"heading",attrs:{level:2,dir:"rtl"},content:[{type:"text",text:"اِخْتِبَارُ الْكِتَابَةِ الْعَرَبِيَّةِ",marks:[{type:"textStyle",attrs:{fontFamily:"Amiri",fontSize:"20pt"}}]}]},
 mk(a.repeat(35),"Amiri",{textAlign:"justify",lineHeight:1.8}),mk(a.repeat(23),"Digital Khatt Indo-Pak",{textAlign:"right",lineHeight:2})
]};
const settings=defaultDocumentSettings();settings.headerFooter.headerEnabled=false;settings.headerFooter.footerEnabled=false;
function codePoints(s:string){return Array.from(new Set([...s])).map(char=>({char,cp:"U+"+char.codePointAt(0)!.toString(16).toUpperCase().padStart(4,"0")}));}
describe("PDF Studio Phase 1B evidence only",()=>{
 it("isolates exact font fallback and equal-HTML print prototype",async()=>{
  mkdirSync(out,{recursive:true});
  const report:any={sampleText:a,settings,runSha:process.env.GITHUB_SHA,domRuns:[],characters:[],shared:{},geometry:{},errors:[]};
  const resolved=await fontsForDocument(doc,"rtl",settings.typography);
  const {html,fontsUsed}=buildPdfHtml(doc,"rtl",resolved.fonts,settings.typography);
  report.requestedFonts=fontsUsed;
  let browser:Awaited<ReturnType<typeof puppeteer.launch>>|undefined;
  try{
   browser=await puppeteer.launch({args:chromium.args,executablePath:await chromium.executablePath(),headless:true});
   const page=await browser.newPage();
   await page.setRequestInterception(true);page.on("request",r=>{if(["data:","about:"].some(prefix=>r.url().startsWith(prefix)))r.continue();else r.abort()});
   await page.setContent(html,{waitUntil:"load"});
   await page.evaluate(()=>document.fonts.ready);
   const ses=await page.createCDPSession();await ses.send("DOM.enable");await ses.send("CSS.enable");
   const root=(await ses.send("DOM.getDocument")).root;
   const {nodeIds}=await ses.send("DOM.querySelectorAll",{nodeId:root.nodeId,selector:'[data-pdf-font]'});
   for(let i=0;i<nodeIds.length;i++){
    const nodeId=nodeIds[i],attrs=(await ses.send("DOM.getAttributes",{nodeId})).attributes;
    const attr=(k:string)=>{for(let j=0;j<attrs.length;j+=2)if(attrs[j]===k)return attrs[j+1];return ""};
    const info=await page.evaluate((index)=>{let el=[...document.querySelectorAll<HTMLElement>("[data-pdf-font]")][index];return {tag:el.tagName,html:el.outerHTML.slice(0,500),text:el.textContent,css:getComputedStyle(el).fontFamily}},i);
    const painted=(await ses.send("CSS.getPlatformFontsForNode",{nodeId})).fonts;
    report.domRuns.push({index:i,requested:attr("data-pdf-font"),selector:'[data-pdf-font]:nth-match('+i+')',...info,painted});
   }
   const targeted=report.domRuns.filter((r:any)=>/digital/i.test(r.requested));
   report.targetedRuns=targeted.map((r:any)=>({index:r.index,requested:r.requested,textLength:r.text?.length,html:r.html,painted:r.painted}));
   const text=targeted.map((r:any)=>r.text||"").join("");
   // Exact source code point audit. Browser reads the loaded font as a web font;
   // per-character paint performed in a sibling of each original run.
   report.uniqueCodePoints=codePoints(text);
   const probeTarget=targeted[0]?.index;
   if(probeTarget!==undefined){
    await page.evaluate((index)=>{const original=[...document.querySelectorAll<HTMLElement>("[data-pdf-font]")][index];const parent=original.parentElement!;const fixture=document.createElement("section");fixture.id="phase1b-character-probes";parent.append(fixture)},probeTarget);
    for(const cp of report.uniqueCodePoints){
      const selector=await page.evaluate(({index,chr,code})=>{
       let original=[...document.querySelectorAll<HTMLElement>("[data-pdf-font]")][index];
       let probe=original.cloneNode(false) as HTMLElement;probe.removeAttribute("data-pdf-font");probe.id="glyph-"+code.slice(2);probe.textContent=chr;probe.style.display="inline-block";probe.style.margin="0";document.querySelector("#phase1b-character-probes")!.append(probe);return "#"+probe.id;
      },{index:probeTarget,chr:cp.char,code:cp.cp});
      const tree=(await ses.send("DOM.getDocument")).root;const {nodeId}=await ses.send("DOM.querySelector",{nodeId:tree.nodeId,selector});
      const faces=(await ses.send("CSS.getPlatformFontsForNode",{nodeId})).fonts;
      const styles=await page.$eval(selector,el=>({font:getComputedStyle(el).fontFamily,text:el.textContent}));
      report.characters.push({...cp,faces,styles});
    }
   }
   report.geometry={cssPrint:documentPrintCss(210,297,25.4,25.4).slice(0,180),browserPaper:"A4 (210 mm)",serverPaper:"210mm x 297mm",serverPreferCssPageSize:false,serverScale:1,sharedPreferCssPageSize:true};
   const commonOptions={width:"210mm",height:"297mm",margin:{top:"25.4mm",bottom:"25.4mm",left:"25.4mm",right:"25.4mm"},scale:1,preferCSSPageSize:false,printBackground:true} as const;
   await page.evaluate(()=>document.querySelector("#phase1b-character-probes")?.remove());
   await page.evaluate(()=>document.fonts.ready);
   const before=Date.now();const bytes1=await page.pdf(commonOptions);const time1=Date.now()-before;
   const page2=await browser.newPage();await page2.setRequestInterception(true);page2.on("request",r=>{if(["data:","about:"].some(prefix=>r.url().startsWith(prefix)))r.continue();else r.abort()});
   await page2.setContent(html,{waitUntil:"load"});await page2.evaluate(()=>document.fonts.ready);
   const t2=Date.now();const bytes2=await page2.pdf(commonOptions);const time2=Date.now()-t2;
   const pdf1=await PDFDocument.load(bytes1),pdf2=await PDFDocument.load(bytes2);
   writeFileSync(out+"/shared-html-a.pdf",Buffer.from(bytes1));writeFileSync(out+"/shared-html-b.pdf",Buffer.from(bytes2));
   report.shared={htmlIdentical:true,settingsIdentical:true,pageCounts:[pdf1.getPageCount(),pdf2.getPageCount()],dimensions:[pdf1.getPages().map(p=>[p.getWidth(),p.getHeight()]),pdf2.getPages().map(p=>[p.getWidth(),p.getHeight()])],bytes:[bytes1.length,bytes2.length],generationMs:[time1,time2]};
   const page3=await browser.newPage();await page3.setRequestInterception(true);page3.on("request",r=>{if(["data:","about:"].some(prefix=>r.url().startsWith(prefix)))r.continue();else r.abort()});
   await page3.setContent(html,{waitUntil:"load"});await page3.addStyleTag({content:"@page{size:210mm 297mm;margin:25.4mm;}"});await page3.evaluate(()=>document.fonts.ready);
   const cssBytes=await page3.pdf({format:"A4",preferCSSPageSize:true,printBackground:true,margin:{top:"0",bottom:"0",left:"0",right:"0"}});
   const cssPdf=await PDFDocument.load(cssBytes);writeFileSync(out+"/css-page-size.pdf",Buffer.from(cssBytes));
   report.geometry.controlledComparison={explicitMmPreferCssFalse:{widthPt:pdf1.getPage(0).getWidth(),heightPt:pdf1.getPage(0).getHeight()},cssAtPagePreferCssTrue:{widthPt:cssPdf.getPage(0).getWidth(),heightPt:cssPdf.getPage(0).getHeight()},differencePt:pdf1.getPage(0).getWidth()-cssPdf.getPage(0).getWidth(),cssPageCount:cssPdf.getPageCount()};
   await page3.close();
   await page2.close();await ses.detach();
  }catch(err){report.errors.push(String((err as Error).stack||err))}
  finally{if(browser)await browser.close();writeFileSync(out+"/diagnostics.json",JSON.stringify(report,null,2))}
  console.log("PHASE1B_SUMMARY",JSON.stringify({runs:report.targetedRuns?.map((r:any)=>({index:r.index,painted:r.painted,textLength:r.textLength})),nonDigital:report.characters.filter((c:any)=>c.faces.some((f:any)=>!/digitalkhatt/i.test(f.familyName))),shared:report.shared,geometry:report.geometry.controlledComparison,errors:report.errors}));
  expect(report.errors).toEqual([]);expect(report.shared.pageCounts?.[0]).toBe(report.shared.pageCounts?.[1]);
 },180000)
});
