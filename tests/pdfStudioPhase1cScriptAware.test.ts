import {describe,it,expect} from "vitest";
import {createRequire} from "node:module";
import {mkdirSync,writeFileSync,readFileSync} from "node:fs";
import {readWoff2Cmap,missingQuranicCodePoints} from "../app/tools/document-studio/utils/digitalKhattCoverage";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import {PDFDocument} from "pdf-lib";
import {fontsForDocument} from "../app/tools/document-studio/utils/pdfDocumentFonts";
import {buildPdfHtml} from "../app/tools/document-studio/utils/buildPdfHtml";
import {defaultDocumentSettings} from "../app/tools/document-studio/utils/documentSettings";
import type {DocNode} from "../app/tools/document-studio/utils/extractPlainText";
const require=createRequire(import.meta.url);
const {decision,cp,kind}=require("../scripts/pdf-phase1c-classifier.cjs");
const out="artifacts/pdf-phase1c";
const a="هٰذَا نَصٌّ عَرَبِيٌّ تَجْرِيبِيٌّ مَعَ الْحَرَكَاتِ وَالشَّدَّةِ وَالْمَدِّ لِفَحْصِ الطِّبَاعَةِ. ";
const text=(s:string,f:string):DocNode=>({type:"paragraph",attrs:{dir:"rtl"},content:[{type:"text",text:s,marks:[{type:"textStyle",attrs:{fontFamily:f,fontSize:"16pt"}}]}]});
const document:DocNode={type:"doc",content:[
 text(a.repeat(23),"Digital Khatt Indo-Pak"),
 text("بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيمِ ۞ ۝١ ۚ","Amiri"),
 {type:"paragraph",attrs:{dir:"rtl"},content:[
 {type:"text",text:"اردو ",marks:[{type:"textStyle",attrs:{fontFamily:"Gulzar",fontSize:"16pt"}}]},
 {type:"text",text:"العِلْمُ نُورٌ ",marks:[{type:"textStyle",attrs:{fontFamily:"Amiri",fontSize:"16pt"}}]},
 {type:"text",text:"English. ",marks:[{type:"textStyle",attrs:{fontFamily:"Inter",fontSize:"12pt"}}]}]}
]};
const face=(familyName:string,glyphCount=1)=>({familyName,postScriptName:familyName,isCustomFont:familyName!=="Liberation Serif",glyphCount});
const digital=face("DigitalKhatt IndoPak"),liberation=face("Liberation Serif"),noto=face("Noto Naskh Arabic");
describe("Phase 1C script-aware validation — isolated synthetic tests",()=>{
 it("fails closed for Quranic script and permits only verified ASCII period",()=>{
  const checks=[
   ["Arabic letter fallback","ا",liberation,"REJECT"],
   ["Arabic mark fallback","\u06D7",liberation,"REJECT"],
   ["Fatha substitution","\u064E",liberation,"REJECT"],
   ["Arabic comma fallback","،",liberation,"REJECT"],
   ["Arabic stop fallback","۔",liberation,"REJECT"],
   ["ZWNJ fallback","\u200C",liberation,"REJECT"],
   ["ZWJ fallback","\u200D",liberation,"REJECT"],
   ["Unexpected Latin fallback","A",liberation,"REJECT"],
   ["Ascii period correct context",".",liberation,"ACCEPT"],
   ["Ascii period wrong context",".",noto,"REJECT"],
   ["Ascii period digital face",".",digital,"ACCEPT"],
   ["Quranic correct face","\u064E",digital,"ACCEPT"],
  ] as const;
  for(const [name,char,font,want] of checks){
   const d=decision({char,faces:[font],context:"inline-literal-full-stop",declared:"Digital Khatt Indo-Pak"});
   expect(d.status,name).toBe(want);
  }
  expect(decision({char:".",faces:[liberation],context:"unknown",declared:"Digital Khatt Indo-Pak"}).status).toBe("REJECT");
  expect(decision({char:".",faces:[liberation,digital],context:"inline-literal-full-stop",declared:"Digital Khatt Indo-Pak"}).status).toBe("REJECT");
  expect(decision({char:"ا",faces:[digital,liberation],context:"inline-literal-full-stop",declared:"Digital Khatt Indo-Pak"}).status).toBe("REJECT");
 });
 it("uses real Chromium painted fonts and retains identical source Unicode",async()=>{
  mkdirSync(out,{recursive:true});
  const report:any={source:a.repeat(23),cases:[],errors:[],runSha:process.env.GITHUB_SHA,classified:{},expectedFailure:null};
  const settings=defaultDocumentSettings();settings.headerFooter.headerEnabled=false;settings.headerFooter.footerEnabled=false;
  const resolved=await fontsForDocument(document,"rtl",settings.typography);
  const result=buildPdfHtml(document,"rtl",resolved.fonts,settings.typography);
  let browser:Awaited<ReturnType<typeof puppeteer.launch>>|undefined;
  try {
   browser=await puppeteer.launch({args:chromium.args,headless:true,executablePath:await chromium.executablePath()});
   const page=await browser.newPage();
   await page.setRequestInterception(true);
   page.on("request",r=>r.url().startsWith("data:")||r.url().startsWith("about:")?r.continue():r.abort());
   await page.setContent(result.html,{waitUntil:"load"});await page.evaluate(()=>document.fonts.ready);
   const nodes=await page.$$('[data-pdf-font="Digital Khatt Indo-Pak"]');
   expect(nodes.length).toBe(1);
   const original=await nodes[0].evaluate(el=>el.textContent||"");
   const cmap=readWoff2Cmap(readFileSync("public/fonts/DigitalKhattIndoPak.woff2"));
   report.unsupportedQuranicMark={codePoint:"U+06D7",missing:missingQuranicCodePoints("ا\u06D7",cmap).includes(0x06d7),strictDecision:decision({char:"\u06D7",faces:[liberation],context:"quranic-script",declared:"Digital Khatt Indo-Pak"})};
   expect(report.unsupportedQuranicMark.missing).toBe(true);
   expect(report.unsupportedQuranicMark.strictDecision.status).toBe("REJECT");
   expect(original).toBe(report.source);
   const session=await page.createCDPSession();await session.send("DOM.enable");await session.send("CSS.enable");
   const getFont=async(selector:string)=>{const tree=(await session.send("DOM.getDocument")).root;const n=await session.send("DOM.querySelector",{nodeId:tree.nodeId,selector});if(!n.nodeId)throw Error("missing "+selector);return (await session.send("CSS.getPlatformFontsForNode",{nodeId:n.nodeId})).fonts;};
   const unsegmented=await getFont('[data-pdf-font="Digital Khatt Indo-Pak"]');
   report.unsegmentedFonts=unsegmented;
   // Create per-script runs under the already-selected original Digital Khatt span.
   // Original Unicode and sequence remain unchanged byte-for-byte.
   await nodes[0].evaluate(el=>{
    const source=el.textContent||"";
    const fragments=source.split(/(\.)/);
    el.replaceChildren();
    let i=0;
    for(const fragment of fragments){if(!fragment)continue;const span=document.createElement("span");span.dataset.phase1cRun=String(i++);span.dataset.classification=fragment==="."?"ascii-period":"quranic-script";span.textContent=fragment;if(fragment===".")span.style.fontFamily='"Liberation Serif"';el.append(span)}
   });
   const finalText=await nodes[0].evaluate(el=>el.textContent||"");
   expect(finalText).toBe(original);
   const runCount=await page.$$eval('[data-phase1c-run]',els=>els.length);
   for(let i=0;i<runCount;i++){
    const selector='[data-phase1c-run="'+i+'"]';
    const run=await page.$eval(selector,el=>({text:el.textContent||"",html:el.outerHTML,css:getComputedStyle(el).fontFamily,parent:el.parentElement?.getAttribute("data-pdf-font")}));
    const painted=await getFont(selector);
    const chars=[...run.text];
    const categories=[...new Set(chars.map((ch:string)=>kind(ch)))];
    const isPeriod=run.text===".";
    let verdict:any;
    if(isPeriod)verdict=decision({char:".",faces:painted,context:"inline-literal-full-stop",declared:run.parent});
    else {
      const unexpected=painted.filter(f=>f.glyphCount>0&&!/digitalkhatt/i.test(f.familyName.replace(/[^a-z0-9]/gi,"")));
      verdict={status:unexpected.length?"REJECT":"ACCEPT",reason:unexpected.length?"prohibited-fallback-in-Arabic-segment":"all-Arabic-segment-glyphs-painted-by-Digital",categories};
    }
    report.cases.push({runIndex:i,domSelector:selector,startCodepoints:chars.slice(0,18).map(cp),textLength:run.text.length,requestedFont:run.parent,computedFont:run.css,painted,verdict,classification:isPeriod?"U+002E verified":categories});
   }
   const rejected=report.cases.filter((c:any)=>c.verdict.status!=="ACCEPT");
   report.classified={totalRuns:runCount,accepted:runCount-rejected.length,rejected:rejected.length,periodRuns:report.cases.filter((c:any)=>c.textLength===1&&c.classification==="U+002E verified").length,unchangedText:finalText===original};
   expect(rejected).toEqual([]);
   expect(report.classified.periodRuns).toBe(23);
   // Distinct negative control: deliberately force an Arabic glyph into Liberation Serif.
   const arabicRun=await page.$('[data-classification="quranic-script"]');
   if(!arabicRun)throw Error("missing Arabic script run");
   await arabicRun.evaluate(el=>(el as HTMLElement).style.fontFamily='"Liberation Serif"');
   const negativeFaces=await getFont('[data-classification="quranic-script"]');
   const fallback=negativeFaces.some(f=>!/digitalkhatt/i.test(f.familyName.replace(/[^a-z0-9]/gi,""))&&f.glyphCount>0);
   report.expectedFailure={source:"Arabic-run CSS deliberately changed to Liberation Serif",painted:negativeFaces,rejected:fallback};
   expect(fallback).toBe(true);
   await arabicRun.evaluate(el=>(el as HTMLElement).style.fontFamily="");
   await page.evaluate(()=>document.fonts.ready);
   const bytes=await page.pdf({width:"210mm",height:"297mm",printBackground:true,preferCSSPageSize:false,margin:{top:"25.4mm",bottom:"25.4mm",left:"25.4mm",right:"25.4mm"}});
   const pdf=await PDFDocument.load(bytes);
   report.pdf={bytes:bytes.length,pages:pdf.getPageCount(),widthPt:pdf.getPage(0).getWidth()};
   writeFileSync(out+"/phase1c-segmented-experiment.pdf",Buffer.from(bytes));
   await page.screenshot({path:out+"/phase1c-segmented-experiment.png",fullPage:true});
   await session.detach();
  } catch(e){report.errors.push(String((e as Error).stack||e))}
  finally {writeFileSync(out+"/phase1c-diagnostics.json",JSON.stringify(report,null,2));if(browser)await browser.close()}
  console.log("PHASE1C_SUMMARY "+JSON.stringify({classified:report.classified,unsegmented:report.unsegmentedFonts,negative:report.expectedFailure,unsupportedMark:report.unsupportedQuranicMark,pdf:report.pdf,errors:report.errors}));
  expect(report.errors).toEqual([]);
 },180000)
});
