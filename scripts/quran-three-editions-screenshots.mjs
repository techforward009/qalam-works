import {chromium} from "@playwright/test";
import {mkdir} from "node:fs/promises";
const base="http://127.0.0.1:3000";
await mkdir("artifacts/quran-three-editions",{recursive:true});
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const editions=[["madinah","/quran/madinah"],["digital","/quran/indopak-digital-khatt"],["ahmed","/quran/ahmedgraf"]];
const pages=[["1","1/1"],["2","2/1"],["50","2/253"]];
try{
 for(const [edition,prefix] of editions){
  for(const [pageNumber,ayahPath] of pages){
   for(const [size,width,height] of [["desktop",1366,768],["mobile",390,844]]){
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
    await context.addInitScript(()=>{localStorage.setItem("qalam-site-language","ur");localStorage.setItem("qalam-quran-reader-view","quran");});
    const page=await context.newPage();
    await page.goto(base+prefix+"/"+ayahPath,{waitUntil:"domcontentloaded",timeout:90000});
    await page.locator("[data-quran-edition-picker]").waitFor({state:"visible",timeout:30000});
    await page.waitForTimeout(1800);
    await page.evaluate(async()=>{await document.fonts.ready;scrollTo(0,0)});
    await page.screenshot({path:`artifacts/quran-three-editions/${edition}-page${pageNumber}-${width}x${height}.png`,fullPage:true,animations:"disabled"});
    await context.close();
   }
  }
 }
}finally{await browser.close()}
