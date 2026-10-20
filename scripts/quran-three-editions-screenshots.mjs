import {chromium} from "@playwright/test";
import {mkdir} from "node:fs/promises";
const base="http://127.0.0.1:3000";
await mkdir("artifacts/quran-three-editions",{recursive:true});
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const cases=[
 ["madinah-default","/quran",false],
 ["digital-fatiha-translation","/quran/indopak-digital-khatt/1/1",true],
 ["ahmed-ikhlas-credit","/quran/ahmedgraf/112/1",false],
 ["edition-picker","/quran/madinah/1/1",false]
];
try {
 for(const [name,route,translation] of cases){
  for(const [device,width,height] of [["desktop",1366,768],["mobile",390,844]]){
   const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
   await context.addInitScript(()=>{localStorage.setItem("qalam-site-language","ur");localStorage.setItem("qalam-quran-reader-view","quran");});
   const page=await context.newPage();
   await page.goto(base+route,{waitUntil:"domcontentloaded",timeout:90000});
   await page.waitForTimeout(4000);
   if(translation){
    const t=page.getByRole("tab",{name:/ترجمہ|Translation/}).first();
    if(await t.count())await t.click();
    await page.waitForTimeout(1600);
   }
   if(name==="edition-picker"){
    const selector=page.locator("[data-quran-edition-picker] select");
    if(await selector.count())await selector.focus();
   }
   await page.evaluate(async()=>{await document.fonts.ready});
   await page.screenshot({path:`artifacts/quran-three-editions/${name}-${width}x${height}.png`,fullPage:true,animations:"disabled"});
   if(name==="madinah-default" && !(page.url().includes("/quran/madinah/")))throw new Error("Default was not Madinah");
   if(name==="ahmed-ikhlas-credit" && !(await page.getByRole("link",{name:"ahmedgraf.com"}).count()))throw new Error("Ahmed attribution absent");
   await context.close();
  }
 }
} finally {await browser.close();}
