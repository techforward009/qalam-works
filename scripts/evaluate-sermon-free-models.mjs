import { registerHooks } from "node:module";
import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import ts from "typescript";

if (!process.argv.includes("--compare") && !process.argv.includes("--check-fixture")) {
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
const { generateStagedSermonSections } = await import("../app/lib/knowledge/sermonStagedGeneration.ts");
const staged=process.argv.includes("--staged");
const only=process.argv.find(x=>x.startsWith("--only="))?.slice("--only=".length);
const { buildCustomSermonText } = await import("../app/tools/khateeb-studio/engine/customSermonProject.ts");
const { assessSermonSpeakingTime, SERMON_SPEAKING_RATES } = await import("../app/lib/knowledge/sermonSpeakingTime.ts");
const { ahmedgrafQuranReference } = await import("../app/tools/arabic-diacritics/quran/ahmedgrafProvider.ts");
const { completeQuranTranslationFor } = await import("../app/lib/knowledge/completeQuranTranslations.ts");
const { QURAN_TRANSLATION_SOURCES } = await import("../app/tools/khateeb-studio/engine/quranTranslationProvider.ts");
// Build the public comparison fixture from the same original Indo-Pak Quran
// edition and Sheikh Mohsin Ali Najafi translation used in production.
// No manufactured verse spellings or placeholder translations are accepted.
const referenceAyahs=ahmedgrafQuranReference.listAyahs();
const quranSha=ahmedgrafQuranReference.getMetadata().sourceSha256;
if(!quranSha)throw new Error("missing-quran-sha");
function verifiedQuran(surah,ayah){
  const original=referenceAyahs.find(a=>a.surah===surah&&a.ayah===ayah);
  const translation=completeQuranTranslationFor(surah,ayah,"ur");
  if(!original?.text||!translation?.trim())throw new Error("missing-quran-fixture");
  return {
    id:"quran:"+surah+":"+ayah,collection:"quran",language:"ar",
    referenceUr:"قرآن، "+surah+":"+ayah,referenceEn:"Quran "+surah+":"+ayah,
    text:original.text,suppliedTranslation:{language:"ur",text:translation,translator:QURAN_TRANSLATION_SOURCES.ur.translatorUr},
    quranLocation:{surah,ayah},sourceSha256:quranSha,translator:null
  };
}
const bookFixture={
  id:"nahj:fixture:1",recordId:"nahj:fixture:1",collection:"nahj",language:"ar",
  referenceUr:"نہج البلاغہ، حکمت ۵۵ (آزمائشی اقتباس)",
  referenceEn:"Nahj al-Balagha, saying 55 (test excerpt)",
  text:"الصَّبْرُ صَبْرَانِ: صَبْرٌ عَلَى مَا تَكْرَهُ، وَصَبْرٌ عَمَّا تُحِبُّ",
  suppliedTranslation:{language:"ur",text:"صبر کی دو قسمیں ہیں: ناپسندیدہ چیز پر صبر اور پسندیدہ چیز سے رکنے پر صبر۔",translator:"آزمائشی فراہم کردہ ترجمہ"},
  sourceSha256:"fixture"
};
const fixture=[
  verifiedQuran(2,153),verifiedQuran(2,155),bookFixture,
  verifiedQuran(2,156),verifiedQuran(2,157),verifiedQuran(3,200),
  verifiedQuran(16,127),verifiedQuran(103,3),verifiedQuran(39,10)
];
console.log("SERMON_COMPARISON_FIXTURE",JSON.stringify({
  status:"ready",quranCount:fixture.filter(p=>p.collection==="quran").length,
  nonQuranCount:fixture.filter(p=>p.collection!=="quran").length,
  sourceIds:fixture.map(p=>p.id),privateCorpusRequired:false
}));
if (process.argv.includes("--check-fixture")) process.exit(0);
const input = {title:"صبر",duration:20,locale:"ur"};
const result = {question:input.title,status:"evidence",method:"lexical-bm25-topic-expansion",passages:fixture,availableCollections:["quran","nahj"],expandedTerms:[]};
const outDir = "sermon-model-comparison";
mkdirSync(outDir, {recursive:true});
const stats=[];
const configurations=[
  {name:"gpt-oss-120b",env:{GROQ_API_KEY:process.env.GROQ_API_KEY,CLOUDFLARE_ACCOUNT_ID:process.env.CLOUDFLARE_ACCOUNT_ID,CLOUDFLARE_AUTH_TOKEN:process.env.CLOUDFLARE_AUTH_TOKEN,QALAM_SERMON_PROVIDER:"groq",QALAM_SERMON_REVIEW_PROVIDER:"cloudflare"}},
  {name:"gemma-4-26b-a4b",env:{CLOUDFLARE_ACCOUNT_ID:process.env.CLOUDFLARE_ACCOUNT_ID,CLOUDFLARE_AUTH_TOKEN:process.env.CLOUDFLARE_AUTH_TOKEN,QALAM_SERMON_PROVIDER:"cloudflare",QALAM_SERMON_REVIEW_PROVIDER:"cloudflare"},model:"@cf/google/gemma-4-26b-a4b-it"}
];
for(const config of configurations.filter(c=>!only||c.name===only)){
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
      const output=await (staged?generateStagedSermonSections:generateSermonSections)(req,evidence,env,replaceModel,deadline);
      draftLog.push(output);
      return output;
    };
    const project=await composeSermon(input,result,{env:config.env,generate,preferSentenceFilter:staged,evaluationTimeoutMs:staged?450_000:undefined});
    const text=buildCustomSermonText(project,"ur");
    const timing=assessSermonSpeakingTime(project);
    const {proseWords,arabicWords,translationWords,estimatedMinutes,sectionWords}=timing;
    const ids=[...new Set(project.sections.flatMap(s=>s.evidenceIds))];
    const sourceCount=ids.length,nonQuran=ids.filter(id=>fixture.some(f=>f.id===id&&f.collection!=="quran")).length;
    const nonUrdu=project.sections.some(s=>/[\p{Script=Latin}\p{Script=Devanagari}\p{Script=Bengali}]/u.test(s.headingUr+s.userText.replace(/\n\nحوالہ:[^\n]*/gu,"")));
    const row={model:config.name,status:"passed-source-review",staged,sections:project.sections.length,sourceCount,nonQuran,proseWords,sectionWords,arabicWords,translationWords,estimatedMinutes,estimatedTimeOnly:true,meetsTimeGoal:estimatedMinutes>=18&&estimatedMinutes<=22,nonUrdu,elapsedMs:Date.now()-started,requests:draftLog.length};
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
writeFileSync(outDir+"/summary.json",JSON.stringify({fixtureOnly:true,speechRateAssumptions:SERMON_SPEAKING_RATES,results:stats},null,2));
if(stats.some(s=>s.status!=="passed-source-review"||!s.meetsTimeGoal||s.nonUrdu||s.sourceCount<3||s.nonQuran<1))process.exitCode=1;
