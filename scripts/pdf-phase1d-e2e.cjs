/* Phase 1D real endpoint acceptance: artificial, noncopyrighted text. */
const fs=require("node:fs"),path=require("node:path"),cp=require("node:child_process");
const {PDFDocument}=require("pdf-lib");
const out=path.resolve("artifacts/pdf-phase1d");fs.mkdirSync(out,{recursive:true});
const a="هٰذَا نَصٌّ عَرَبِيٌّ تَجْرِيبِيٌّ مَعَ الْحَرَكَاتِ وَالشَّدَّةِ وَالْمَدِّ لِفَحْصِ الطِّبَاعَةِ. ";
const u="یہ ایک مکمل مصنوعی اردو عبارت ہے، جس میں نقطے، حروف اور سطروں کا تقابل کیا جاتا ہے۔ ";
const p="این نوشتار فارسی نمونه‌ای برای آزمودن چینش متن و پیوند درست حروف است. ";
const marks=(font,size="16pt")=>[{type:"textStyle",attrs:{fontFamily:font,fontSize:size}}];
const txt=(value,font,size)=>({type:"text",text:value,marks:marks(font,size)});
const para=(value,font,attrs={})=>({type:"paragraph",attrs:{dir:"rtl",...attrs},content:[txt(value,font)]});
const heading=(value,font)=>({type:"heading",attrs:{dir:"rtl",level:2},content:[txt(value,font,"20pt")]});
const doc=(content)=>({type:"doc",content});
const arabic=doc([heading("اِخْتِبَارُ الْكِتَابَةِ الْعَرَبِيَّةِ","Amiri"),para(a.repeat(35),"Amiri",{textAlign:"justify",lineHeight:1.8}),para(a.repeat(23),"Digital Khatt Indo-Pak",{textAlign:"right",lineHeight:2})]);
const fixtures=[
 {id:"original-arabic-23-full-stops",doc:arabic,required:true,production:500,experimental:200,periods:23},
 {id:"arabic-deliberately-substituted",doc:doc([para("هٰذَا نَصٌّ عَرَبِيٌّ. ","Digital Khatt Indo-Pak")]),required:true,experimental:500,fault:"arabic-css"},
 {id:"multiple-digital-paragraphs",doc:doc([para(a,"Digital Khatt Indo-Pak"),para(a,"Digital Khatt Indo-Pak"),para(a,"Digital Khatt Indo-Pak")]),experimental:200,periods:3},
 {id:"unsupported-vowelled-three-paragraph-source",doc:doc([para("اَلْعِلْمُ نُورٌ. ","Digital Khatt Indo-Pak"),para("هٰذَا نَصٌّ عَرَبِيٌّ. ","Digital Khatt Indo-Pak"),para("وَالْحَمْدُ لِلّٰهِ. ","Digital Khatt Indo-Pak")]),experimental:500},
 {id:"multiple-run-last-substitution",doc:doc([para("اَلْعِلْمُ نُورٌ. ","Digital Khatt Indo-Pak"),para("هٰذَا نَصٌّ عَرَبِيٌّ. ","Digital Khatt Indo-Pak")]),experimental:500,fault:"arabic-css-last"},
 {id:"alternating-format-and-language",doc:doc([{type:"paragraph",attrs:{dir:"rtl"},content:[txt("هٰذَا نَصٌّ. ","Digital Khatt Indo-Pak"),txt("اردو مثال ","Gulzar"),({...txt("اَلْعِلْمُ نُورٌ. ","Digital Khatt Indo-Pak"),marks:[...marks("Digital Khatt Indo-Pak"),{type:"bold"}]}),txt("English text ","Inter","12pt"),txt("وَالْحَمْدُ لِلّٰهِ. ","Digital Khatt Indo-Pak")]}]),experimental:200,periods:3},
 {id:"nested-bold-digital-runs",doc:doc([{type:"paragraph",attrs:{dir:"rtl"},content:[{...txt("هٰذَا نَصٌّ. ","Digital Khatt Indo-Pak"),marks:[...marks("Digital Khatt Indo-Pak"),{type:"bold"}]},txt("اَلْحَمْدُ لِلّٰهِ. ","Digital Khatt Indo-Pak"),txt("Test ","Inter","12pt"),{...txt("نُورٌ. ","Digital Khatt Indo-Pak"),marks:[...marks("Digital Khatt Indo-Pak"),{type:"italic"}]}]}]),experimental:200,periods:3},
 {id:"late-joining-control",doc:doc([para("هٰذَا نَصٌّ. ","Digital Khatt Indo-Pak"),para("ا\u200Dب ","Digital Khatt Indo-Pak")]),experimental:500},
 {id:"quranic-combining-multi-page",doc:doc([para(("بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيمِ وَالْحَمْدُ لِلّٰهِ رَبِّ الْعٰلَمِينَ. ").repeat(95),"Digital Khatt Indo-Pak",{lineHeight:1.9})]),experimental:200,periods:95},
 {id:"later-run-missing-quranic-mark",doc:doc([para("اَلْعِلْمُ نُورٌ. ","Digital Khatt Indo-Pak"),para("ا\u06D7 ","Digital Khatt Indo-Pak")]),experimental:500},
 {id:"arabic-missing-quranic-mark",doc:doc([para("ا\u06D7 "+a,"Digital Khatt Indo-Pak")]),required:true,production:500,experimental:500},
 {id:"arabic-period-invalid-context",doc:doc([para("ا.ا "+a,"Digital Khatt Indo-Pak")]),required:true,experimental:500},
 {id:"arabic-unapproved-punctuation",doc:doc([para("ا? "+a,"Digital Khatt Indo-Pak")]),required:true,experimental:500},
 {id:"mixed-digital-and-other-fonts",doc:doc([{type:"paragraph",attrs:{dir:"rtl"},content:[txt("العِلْمُ نُورٌ. ","Digital Khatt Indo-Pak"),txt("یہ اردو عبارت ہے۔ ","Gulzar"),txt("فارسی متن نمونه است. ","Vazirmatn"),txt("English 2026","Inter","12pt")]}]),experimental:200,periods:1},
 {id:"urdu-nastaliq",doc:doc([heading("اردو نمونہ","Alvi Nastaleeq"),para(u.repeat(15),"Jameel Noori Nastaleeq",{lineHeight:1.8}),para(u.repeat(12),"Gulzar")]),experimental:200},
 {id:"persian",doc:doc([heading("آزمون فارسی","Vazirmatn"),para(p.repeat(24),"Vazirmatn",{lineHeight:1.8})]),experimental:200},
 {id:"arabic-amiri",doc:doc([heading("النَّصُّ الْعَرَبِيُّ","Amiri"),para(a.repeat(20),"Amiri")]),experimental:200}
];
const settings={version:1,presetId:"default",page:{size:"a4",orientation:"portrait",margins:{preset:"normal",topMm:25.4,bottomMm:25.4,startMm:25.4,endMm:25.4}},typography:{bodyFontSizePt:12,lineHeight:1.5,paragraphBeforePt:0,paragraphAfterPt:6,firstLineIndentMm:0,defaultRtlFontId:"noto-nastaliq-urdu",defaultLtrFontId:"inter"},headerFooter:{headerEnabled:false,headerMode:"auto-title",headerText:"",footerEnabled:false,footerText:"",pageNumbers:"none"}};
const report={sha:process.env.GITHUB_SHA,settings,fixtures:[],assertions:[],limitations:[]};
const flatten=n=>typeof n.text==="string"?n.text:(n.content||[]).map(flatten).join("");
function check(id,cond,detail){report.assertions.push({id,pass:!!cond,detail});if(!cond)console.error("FAIL",id,detail)}
(async()=>{
 for(const f of fixtures){
  const item={id:f.id,sourceText:flatten(f.doc),sourceCodePoints:[...flatten(f.doc)].length,outputs:{}};
  for(const [route,kind] of [["/api/export-pdf","production"],["/api/pdf-phase1d-test","experimental"]]){
   try{
    const start=Date.now();
    const response=await fetch("http://127.0.0.1:3000"+route,{method:"POST",headers:{"content-type":"application/json",...(kind==="experimental"&&f.fault?{"x-phase1d-fault":f.fault}:{})},body:JSON.stringify({doc:f.doc,dir:"rtl",settings}),signal:AbortSignal.timeout(160000)});
    const bytes=Buffer.from(await response.arrayBuffer());
    const obj={status:response.status,ms:Date.now()-start,bytes:bytes.length,headers:Object.fromEntries([...response.headers.entries()].filter(([k])=>k.startsWith("x-pdf-")||k.startsWith("x-phase1d-"))),error:null,pages:null,sizePt:null};
    if(response.ok){
      const file=path.join(out,f.id+"-"+kind+".pdf");fs.writeFileSync(file,bytes);
      const pdf=await PDFDocument.load(bytes);obj.pages=pdf.getPageCount();obj.sizePt=pdf.getPages().map(p=>({w:p.getWidth(),h:p.getHeight()}));
    }else{obj.error=bytes.toString("utf8").slice(0,1000)}
    item.outputs[kind]=obj;
   }catch(e){item.outputs[kind]={exception:String(e)}}
  }
  report.fixtures.push(item);
  const exp=item.outputs.experimental,prod=item.outputs.production;
  check(f.id+" experimental HTTP",exp.status===f.experimental,{got:exp.status,want:f.experimental,error:exp.error});
  if(f.production!=null)check(f.id+" production HTTP",prod.status===f.production,{got:prod.status,want:f.production,error:prod.error});
  if(f.periods&&exp.status===200)check(f.id+" verified full-stop count",Number(exp.headers?.["x-phase1d-verified-full-stops"])===f.periods,exp.headers?.["x-phase1d-verified-full-stops"]);
  if(exp.status===200){
    check(f.id+" valid pages",exp.pages>0,{pages:exp.pages});
    check(f.id+" A4 dimensions",exp.sizePt.every(v=>Math.abs(v.w-595.92)<0.1&&Math.abs(v.h-841.92)<0.1),exp.sizePt);
  }
 }
 fs.writeFileSync(path.join(out,"phase1d-e2e-report.json"),JSON.stringify(report,null,2));
 console.log("PHASE1D_REPORT",JSON.stringify({results:report.fixtures.map(f=>({id:f.id,production:f.outputs.production.status,experimental:f.outputs.experimental.status,pages:f.outputs.experimental.pages,periods:f.outputs.experimental.headers?.["x-phase1d-verified-full-stops"],error:f.outputs.experimental.error})),failed:report.assertions.filter(a=>!a.pass)},null,2));
 if(report.assertions.some(a=>!a.pass))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
