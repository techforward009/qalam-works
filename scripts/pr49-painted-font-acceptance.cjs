/* Synthetic public font probes, never private document content. */
const { chromium } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const out = path.resolve("artifacts/browser-font-acceptance");
fs.mkdirSync(out,{recursive:true});
const samples = [
  {id:"jameel",family:"Jameel Noori Nastaleeq",text:"اردو تحریر کا خوب صورت نمونہ، پڑھنے میں آسان۔",dir:"rtl"},
  {id:"gulzar",family:"Gulzar",text:"یہ گلزار فونٹ کے حروف اور نقطوں کی جانچ ہے۔",dir:"rtl"},
  {id:"mehr",family:"Mehr Nastaliq Web",text:"آج ہم مہر نستعلیق ویب میں لکھنے کی آزمائش کریں گے۔",dir:"rtl"},
  {id:"amiri",family:"Amiri",text:"بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيمِ وَالْحَمْدُ لِلّٰهِ",dir:"rtl"},
  {id:"digital",family:"Digital Khatt Indo-Pak",text:"اَلْحَمْدُ لِلّٰهِ رَبِّ الْعٰلَمِيْنَ",dir:"rtl"},
];
(async()=>{
 let browser; const report={commit:process.env.GITHUB_SHA,route:"/tools/document-studio",results:[],mixed:null,requests:[],errors:[]};
 try {
  browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
  const page=await browser.newPage({viewport:{width:1440,height:1100},deviceScaleFactor:1});
  page.on("requestfailed",req=>{if(/\.(woff2?|ttf)(?:\?|$)/i.test(req.url()))report.requests.push({url:req.url(),failure:req.failure()?.errorText||"failed"})});
  page.on("response",res=>{if(/\.(woff2?|ttf)(?:\?|$)/i.test(res.url()))report.requests.push({url:res.url(),status:res.status()})});
  page.on("pageerror",e=>report.errors.push(e.message));
  await page.goto("http://127.0.0.1:3000/tools/document-studio",{waitUntil:"domcontentloaded",timeout:90000});
  await page.waitForTimeout(2500);
  const selector=await page.evaluate(({samples})=>{
   const root=document.querySelector(".qalam-editor-content");
   if(!root) return {error:"Document Studio .qalam-editor-content not mounted"};
   const holder=document.createElement("section");holder.id="font-acceptance-fixtures";holder.style.cssText="padding:20px;background:white;color:black;direction:rtl";
   for(const s of samples){
    const p=document.createElement("p");p.dir=s.dir;p.style.cssText="margin:20px 0; font-size:28px;line-height:2.2";
    const span=document.createElement("span");span.id="font-probe-"+s.id;span.style.fontFamily='"'+s.family+'"';span.textContent=s.text;p.appendChild(span);holder.appendChild(p);
   }
   const mixed=document.createElement("p");mixed.dir="rtl";mixed.id="font-probe-mixed";mixed.style.cssText="font-size:28px;line-height:2.2";
   const rtl=document.createElement("span");rtl.id="font-probe-mixed-rtl";rtl.style.fontFamily='"Gulzar"';rtl.textContent="یہ اردو عبارت ہے، ";
   const ar=document.createElement("span");ar.id="font-probe-mixed-arabic";ar.style.fontFamily='"Amiri"';ar.textContent="اَلْعِلْمُ نُورٌ، ";
   const en=document.createElement("span");en.id="font-probe-mixed-latin";en.style.fontFamily='"Inter"';en.dir="ltr";en.textContent="Document Studio 123";
   mixed.append(rtl,ar,en);holder.appendChild(mixed);root.appendChild(holder);
   return {ok:true}
  },{samples});
  if(selector.error)throw Error(selector.error);
  await page.evaluate(async ({samples})=>{
   await Promise.all(samples.map(s=>document.fonts.load('28px "'+s.family+'"',s.text).catch(()=>[])));
   await Promise.all(["Gulzar","Amiri","Inter"].map(s=>document.fonts.load('28px "'+s+'"').catch(()=>[])));
   await document.fonts.ready;
  },{samples});
  await page.screenshot({path:path.join(out,"full-editor-fonts.png"),fullPage:true});
  const cdp=await page.context().newCDPSession(page);await cdp.send("DOM.enable");await cdp.send("CSS.enable");
  const documentNode=await cdp.send("DOM.getDocument",{depth:-1,pierce:true});
  async function inspect(id,family){
   const {nodeId}=await cdp.send("DOM.querySelector",{nodeId:documentNode.root.nodeId,selector:"#"+id});
   if(!nodeId)return {id,family,status:"FAIL",reason:"missing DOM node"};
   const fonts=await cdp.send("CSS.getPlatformFontsForNode",{nodeId});
   const styles=await page.locator("#"+id).evaluate(el=>({css:getComputedStyle(el).fontFamily,text:el.textContent,rect:{w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height}}));
   const rendered=fonts.fonts||[];
   const expectedNames=family==="Digital Khatt Indo-Pak"?["digital khatt indo-pak","digitalkhatt indopak"]: [family.toLowerCase()];
   const expected=rendered.some(f=>expectedNames.some(name=>f.familyName.toLowerCase().includes(name))&&f.glyphCount>0);
   const unwanted=family==="Inter"?[]:rendered.filter(f=>f.glyphCount>0&&/^(inter|noto(?:\s|-))/i.test(f.familyName));
   return {id,family,status:expected&&!unwanted.length?"PASS":"FAIL",reason:!expected?"Expected font not painted":unwanted.length?"Unexpected Inter/Noto glyph fallback":"",rendered,styles};
  }
  for(const s of samples)report.results.push(await inspect("font-probe-"+s.id,s.family));
  report.mixed={rtl:await inspect("font-probe-mixed-rtl","Gulzar"),arabic:await inspect("font-probe-mixed-arabic","Amiri"),latin:await inspect("font-probe-mixed-latin","Inter")};
  const alviRequest=report.requests.find(item=>/alvi/i.test(item.url||""));
  if(alviRequest) report.results.push({id:"alvi",family:"Alvi Nastaleeq",status:"FAIL",reason:"Removed Alvi font was requested: "+alviRequest.url,rendered:[]});
  // Inter is intentional only for the explicitly Latin run.
  const all=[...report.results,report.mixed.rtl,report.mixed.arabic,report.mixed.latin];

  // Verify the Digital Khatt Quran's mobile layout in a real narrow viewport:
  // the original font must paint, RTL lines remain justified, and content fits.
  const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
  mobile.on("pageerror",e=>report.errors.push("mobile: "+e.message));
  await mobile.goto("http://127.0.0.1:3000/quran/indopak-digital-khatt/1/1",{waitUntil:"domcontentloaded",timeout:90000});
  const mobileQuran=mobile.locator("[data-quran-edition=\"digital-khatt\"] .quran-page .quran-content").first();
  await mobileQuran.waitFor({state:"visible",timeout:30000});
  await mobile.evaluate(async()=>{await document.fonts.load('25px "DigitalKhattIndoPak"');await document.fonts.ready});
  await mobile.screenshot({path:path.join(out,"digital-khatt-mobile.png"),fullPage:true});
  const mobileMetrics=await mobileQuran.evaluate(el=>{
   const style=getComputedStyle(el),rect=el.getBoundingClientRect();
   return {align:style.textAlign,direction:style.direction,fontFamily:style.fontFamily,viewportWidth:innerWidth,documentWidth:document.documentElement.scrollWidth,left:rect.left,right:rect.right,width:rect.width};
  });
  const mobileCdp=await mobile.context().newCDPSession(mobile);
  await mobileCdp.send("DOM.enable");
  await mobileCdp.send("CSS.enable");
  const mobileDocument=await mobileCdp.send("DOM.getDocument",{depth:-1,pierce:true});
  const mobileNode=await mobileCdp.send("DOM.querySelector",{nodeId:mobileDocument.root.nodeId,selector:"[data-quran-edition=\"digital-khatt\"] .quran-page .quran-content"});
  const mobileFonts=mobileNode.nodeId?(await mobileCdp.send("CSS.getPlatformFontsForNode",{nodeId:mobileNode.nodeId})).fonts||[]:[];
  const digitalPainted=mobileFonts.some(f=>/digital.?khatt/i.test(f.familyName)&&f.glyphCount>0);
  report.mobileDigitalKhatt={status:mobileMetrics.align==="justify"&&mobileMetrics.direction==="rtl"&&mobileMetrics.documentWidth<=mobileMetrics.viewportWidth&&mobileMetrics.left>=0&&mobileMetrics.right<=mobileMetrics.viewportWidth&&digitalPainted?"PASS":"FAIL",metrics:mobileMetrics,renderedFonts:mobileFonts};
  await mobile.close();
  report.overall=all.every(x=>x.status==="PASS")&&report.mobileDigitalKhatt.status==="PASS"?"PASS":"FAIL";
 }catch(e){report.overall="FAIL";report.errors.push(String(e.stack||e));}
 finally{fs.writeFileSync(path.join(out,"font-rendering-report.json"),JSON.stringify(report,null,2));if(browser)await browser.close();}
 console.log(JSON.stringify({overall:report.overall,results:report.results.map(x=>({font:x.family,status:x.status,rendered:x.rendered,reason:x.reason})),mixed:report.mixed,errors:report.errors},null,2));
 if(report.overall!=="PASS")process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
