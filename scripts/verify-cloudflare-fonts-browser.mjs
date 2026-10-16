/**
 * Browser validation for the owner's exact ten Cloudflare R2 font files.
 * Does not rely on browser cache, Vercel Preview sign-in or a public R2 bucket.
 * Requires Google Chrome from the GitHub Ubuntu runner and @playwright/test.
 */
import { chromium } from "@playwright/test";

const fonts = [
  ["muhammadi-quranic-400.woff2","بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ"],
  ["jameel-noori-nastaleeq-400.woff2","قلم ورکس اردو ترجمہ"],
  ["NafeesNastaleeq.woff2","اردو کتاب"],
  ["NafeesNastaleeq-Web.woff2","اردو کتاب"],
  ["Alvi_Nastaleeq.woff2","تفسیر نمونہ"],
  ["Gulzar-Regular.woff2","عنوان گلزار"],
  ["Sahel.woff2","کتاب فارسی"],
  ["ScheherazadeNew-Medium.woff2","الْقُرْآنُ الْكَرِيمُ"],
  ["BNazanin.woff2","فارسی"],
  ["AlFars9Badr.woff2","عربی"],
];
const browser = await chromium.launch({channel:"chrome",headless:true,args:["--no-sandbox"]});
try {
  const page=await browser.newPage();
  await page.goto("about:blank");
  for(const [index,[filename,text]] of fonts.entries()){
    const result=await page.evaluate(async({filename,text,index})=>{
      const family="QalamOriginalFontProof_"+index;
      const source="https://qalam-fonts-private-mirror.techforward009.workers.dev/fonts/"+filename;
      const face=new FontFace(family,`url("${source}") format("woff2")`,{weight:"400",style:"normal"});
      await face.load();
      document.fonts.add(face);
      const matched=await document.fonts.load(`24px "${family}"`,text);
      const ok=face.status==="loaded" && matched.some(item=>item.family===family);
      if(!ok)throw new Error("Font loaded without expected family registration: "+filename);
      return {filename,status:face.status,matched:matched.length};
    },{filename,text,index});
    console.log("PAINT-READY "+result.filename+": "+result.status+" ("+result.matched+" matched)");
  }
  console.log("All ten owner-uploaded original Cloudflare fonts loaded into Chromium FontFaceSet.");
} finally {
  await browser.close();
}
