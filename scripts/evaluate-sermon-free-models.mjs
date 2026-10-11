import { registerHooks } from "node:module";
import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import ts from "typescript";

if (!process.argv.includes("--compare")) {
  console.log("Usage: node scripts/evaluate-sermon-free-models.mjs --compare");
  process.exit(1);
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(".") && !/\.[cm]?[jt]s$|\.json$/.test(specifier) && context.parentURL) {
      for (const suffix of [".ts", "/index.ts"]) {
        const candidate = new URL(specifier + suffix, context.parentURL);
        if (existsSync(candidate)) return nextResolve(candidate.href, context);
      }
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith("file:") && !url.includes("/node_modules/") && url.endsWith(".json")) {
      return { format: "module", source: "export default " + JSON.stringify(JSON.parse(readFileSync(new URL(url), "utf8"))) + ";", shortCircuit: true };
    }
    if (url.startsWith("file:") && !url.includes("/node_modules/") && url.endsWith(".ts")) {
      return { format: "module", source: ts.transpileModule(readFileSync(new URL(url), "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});

const { composeSermon, generateSermonSections } = await import("../app/lib/knowledge/sermonComposer.ts");
const { buildCustomSermonText } = await import("../app/tools/khateeb-studio/engine/customSermonProject.ts");
const fixture = [
  {id:"quran:2:153",collection:"quran",language:"ar",referenceUr:"قرآن، البقرہ ۲:۱۵۳",referenceEn:"Quran 2:153",text:"يَا أَيُّهَا الَّذِينَ آمَنُوا اسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ إِنَّ اللَّهَ مَعَ الصَّابِرِينَ",suppliedTranslation:{language:"ur",text:"اے ایمان والو! صبر اور نماز سے مدد چاہو، بے شک اللہ صبر کرنے والوں کے ساتھ ہے۔",translator:"آزمائشی ترجمہ"},quranLocation:{surah:2,ayah:153},sourceSha256:"a".repeat(64)},
  {id:"nahj:fixture:1",recordId:"nahj:fixture:1",collection:"nahj",language:"ar",referenceUr:"نہج البلاغہ، حکمت ۵۵ (آزمائشی متن)",referenceEn:"Nahj al-Balagha, saying 55 (fixture)",text:"الصَّبْرُ صَبْرَانِ: صَبْرٌ عَلَى مَا تَكْرَهُ، وَصَبْرٌ عَمَّا تُحِبُّ",suppliedTranslation:{language:"ur",text:"صبر کی دو قسمیں ہیں: ناپسندیدہ چیز پر صبر اور پسندیدہ چیز سے رکنے پر صبر۔",translator:"آزمائشی ترجمہ"}},
  {id:"quran:103:3",collection:"quran",language:"ar",referenceUr:"قرآن، العصر ۱۰۳:۳",referenceEn:"Quran 103:3",text:"إِلَّا الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ وَتَوَاصَوْا بِالْحَقِّ وَتَوَاصَوْا بِالصَّبْرِ",suppliedTranslation:{language:"ur",text:"سوائے ان لوگوں کے جو ایمان لائے، نیک عمل کیے، اور ایک دوسرے کو حق اور صبر کی تلقین کی۔",translator:"آزمائشی ترجمہ"},quranLocation:{surah:103,ayah:3},sourceSha256:"b".repeat(64)}
];
const input = {title:"صبر",duration:20,locale:"ur"};
const result = {question:input.title,status:"evidence",method:"lexical-bm25-topic-expansion",passages:fixture,availableCollections:["quran","nahj"],expandedTerms:[]};
const outDir = "sermon-model-comparison";
mkdirSync(outDir, {recursive:true});
const stats=[];
const configurations=[
  {name:"gpt-oss-120b",env:{GROQ_API_KEY:process.env.GROQ_API_KEY,CLOUDFLARE_ACCOUNT_ID:process.env.CLOUDFLARE_ACCOUNT_ID,CLOUDFLARE_AUTH_TOKEN:process.env.CLOUDFLARE_AUTH_TOKEN,QALAM_SERMON_PROVIDER:"groq",QALAM_SERMON_REVIEW_PROVIDER:"cloudflare"}},
  {name:"gemma-4-26b-a4b",env:{CLOUDFLARE_ACCOUNT_ID:process.env.CLOUDFLARE_ACCOUNT_ID,CLOUDFLARE_AUTH_TOKEN:process.env.CLOUDFLARE_AUTH_TOKEN,QALAM_SERMON_PROVIDER:"cloudflare",QALAM_SERMON_REVIEW_PROVIDER:"cloudflare"},model:"@cf/google/gemma-4-26b-a4b-it"}
];
for(const config of configurations){
  const started=Date.now();
  const draftLog=[];
  try {
    if(!config.env.CLOUDFLARE_ACCOUNT_ID||!config.env.CLOUDFLARE_AUTH_TOKEN||(config.name==="gpt-oss-120b"&&!config.env.GROQ_API_KEY))throw Error("not-configured");
    const generate=async (req,evidence,env,fetchImpl,deadline) => {
      const replaceModel = config.model ? async (url,options) => {
        const body=JSON.parse(options.body);
        body.model=config.model;
        // Verify real integration with the identical structured-output contract.
        return fetch(url,{...options,body:JSON.stringify(body)});
      } : fetch;
      const output=await generateSermonSections(req,evidence,env,replaceModel,deadline);
      draftLog.push(output);
      return output;
    };
    const project=await composeSermon(input,result,{env:config.env,generate});
    const text=buildCustomSermonText(project,"ur");
    const prose=project.sections.map(s=>s.userText.replace(/\n\nحوالہ:[^\n]*/gu,""));
    const proseWords=prose.reduce((sum,s)=>sum+s.split(/\s+/u).filter(Boolean).length,0);
    const arabicWords=fixture.filter(f=>project.selectedEvidenceIds.some(id=>id===f.id)).reduce((sum,f)=>sum+f.text.split(/\s+/u).filter(Boolean).length,0);
    const translatedWords=fixture.filter(f=>project.selectedEvidenceIds.some(id=>id===f.id)).reduce((sum,f)=>sum+f.suppliedTranslation.text.split(/\s+/u).filter(Boolean).length,0);
    const estimatedMinutes=Number((proseWords/95+arabicWords/65+translatedWords/90+project.selectedEvidenceIds.length*0.15).toFixed(1));
    const ids=[...new Set(project.sections.flatMap(s=>s.evidenceIds))];
    const sourceCount=ids.length,nonQuran=ids.filter(id=>fixture.some(f=>f.id===id&&f.collection!=="quran")).length;
    const nonUrdu=project.sections.some(s=>/[\p{Script=Latin}\p{Script=Devanagari}\p{Script=Bengali}]/u.test(s.headingUr+s.userText.replace(/\n\nحوالہ:[^\n]*/gu,"")));
    const row={model:config.name,status:"passed-source-review",sections:project.sections.length,sourceCount,nonQuran,proseWords,sectionWords:prose.map(s=>s.split(/\s+/u).filter(Boolean).length),estimatedMinutes,meetsTimeGoal:estimatedMinutes>=18&&estimatedMinutes<=22,nonUrdu,elapsedMs:Date.now()-started,requests:draftLog.length};
    stats.push(row);
    writeFileSync(outDir+"/"+config.name+".txt","آزمائشی مجلس — حقیقی کتابی ماخذ کی تصدیق کا متبادل نہیں\n\n"+text);
    console.log("SERMON_MODEL_COMPARE",JSON.stringify(row));
  }catch(err){
    const row={model:config.name,status:"failed",reason:err instanceof Error?err.message:"unknown",elapsedMs:Date.now()-started,requests:draftLog.length};
    stats.push(row);
    console.log("SERMON_MODEL_COMPARE",JSON.stringify(row));
  }
  if(draftLog.length)writeFileSync(outDir+"/"+config.name+"-raw.json",JSON.stringify(draftLog,null,2));
}
writeFileSync(outDir+"/summary.json",JSON.stringify({fixtureOnly:true,speechRateAssumptions:{urduWordsPerMinute:95,arabicWordsPerMinute:65,translationWordsPerMinute:90,pausePerSourceMinutes:0.15},results:stats},null,2));
if(stats.some(s=>s.status!=="passed-source-review"||!s.meetsTimeGoal||s.nonUrdu||s.sourceCount<3||s.nonQuran<1))process.exitCode=1;
