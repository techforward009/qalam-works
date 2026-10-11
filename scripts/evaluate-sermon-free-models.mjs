import { registerHooks } from "node:module";
import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import ts from "typescript";

if (!["--compare","--check-fixture","--openrouter-check","--openrouter-trial"].some(flag=>process.argv.includes(flag))) {
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

const { composeSermon, generateSermonSections, selectSermonEvidence } = await import("../app/lib/knowledge/sermonComposer.ts");
const { createSermonSentenceReviewer } = await import("../app/lib/knowledge/sermonReview.ts");
const { createOpenRouterTrialSession, OPENROUTER_TRIAL_MODELS, estimateOpenRouterTrialCeiling } = await import("../app/lib/knowledge/openRouterTrial.ts");
const { generateStagedSermonSections, planSermonStageEvidence } = await import("../app/lib/knowledge/sermonStagedGeneration.ts");
const staged=process.argv.includes("--staged");
const openrouterCheck=process.argv.includes("--openrouter-check");
const openrouterTrial=process.argv.includes("--openrouter-trial");
if((openrouterCheck||openrouterTrial) && process.argv.includes("--compare"))throw Error("ambiguous-trial-mode");
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
// Additional original book texts are quoted with exact book locators.
// Their translations are marked editorial test drafts, not a published edition.
// Originals checked against al-Kafi 2:87 (#2) and 2:89 (#6).
const bookPatienceHead={
  id:"alkafi:2:87:2",recordId:"alkafi:2:87:2",collection:"alkafi",language:"ar",
  referenceUr:"الکافی، جلد ۲، صفحہ ۸۷، باب الصبر، حدیث ۲",
  referenceEn:"al-Kafi, vol. 2, p. 87, Bab al-Sabr, hadith 2",
  text:"الصبر من الايمان بمنزلة الرأس من الجسد ، فإذا ذهب الرأس ذهب الجسد ، كذلك إذا ذهب الصبر ذهب الايمان",
  suppliedTranslation:{language:"ur",text:"صبر ایمان کے لیے ایسا ہے جیسے سر جسم کے لیے ہے۔ جب سر چلا جائے تو جسم ختم ہو جاتا ہے، اسی طرح جب صبر چلا جائے تو ایمان بھی چلا جاتا ہے۔",translator:"آزمائشی ادارتی ترجمہ"},
  sourceUrl:"https://ablibrary.net/book_content/b/3250/87?lang=ar"
};
const bookFreeInAdversity={
  id:"alkafi:2:89:6",recordId:"alkafi:2:89:6",collection:"alkafi",language:"ar",
  referenceUr:"الکافی، جلد ۲، صفحہ ۸۹، باب الصبر، حدیث ۶",
  referenceEn:"al-Kafi, vol. 2, p. 89, Bab al-Sabr, hadith 6",
  text:"إن الحر حر على جميع أحواله ، إن نابته نائبة صبر لها وإن تداكت عليه المصائب لم تكسره وإن أسر وقهر واستبدل باليسر عسرا كما كان يوسف الصديق الأمين ( صلوات الله عليه ) لم يضرر حريته أن استعبد وقهر واسر ولم تضرره ظلمة الجب ووحشته وما ناله أن من الله عليه فجعل الجبار العاتي له عبدا بعد إذ كان [ له ] مالكا ، فأرسله ورحم به أمة وكذلك الصبر يعقب خيرا ، فاصبروا ووطنوا أنفسكم على الصبر توجروا",
  suppliedTranslation:{language:"ur",text:"آزاد شخص ہر حالت میں آزاد رہتا ہے۔ اگر کوئی مصیبت آ پڑے تو اس پر صبر کرتا ہے، اور اگر مصیبتیں ایک کے بعد ایک آئیں تو اسے توڑ نہیں سکتیں۔ اگر وہ گرفتار اور مغلوب ہو جائے اور آسودگی کے بجائے سختی آ جائے، تب بھی اس کی آزادی باقی رہتی ہے۔ جیسا کہ راست باز اور امین یوسف علیہ السلام کو غلام بنائے جانے، مغلوب ہونے اور قید کیے جانے سے ان کی آزادی کو نقصان نہ پہنچا۔ کنویں کی تاریکی، تنہائی اور انہیں پیش آنے والی تکلیفیں بھی انہیں نقصان نہ پہنچا سکیں، یہاں تک کہ اللہ نے ان پر احسان فرمایا؛ جو سرکش پہلے ان کا مالک تھا، ان کا تابع ہوگیا۔ اللہ نے انہیں بھیجا اور ان کے ذریعے ایک امت پر رحمت فرمائی۔ اسی طرح صبر کے بعد بھلائی آتی ہے؛ لہٰذا صبر کرو اور اپنے آپ کو صبر کے لیے آمادہ کرو تاکہ تمہیں اجر ملے۔",translator:"آزمائشی ادارتی ترجمہ"},
  sourceUrl:"https://ablibrary.net/book_content/b/3250/89?lang=ar"
};
const fixture=[
  verifiedQuran(2,153),verifiedQuran(2,155),bookFixture,
  verifiedQuran(2,156),verifiedQuran(2,157),bookPatienceHead,
  verifiedQuran(3,200),bookFreeInAdversity,
  verifiedQuran(16,127),verifiedQuran(103,3),verifiedQuran(39,10)
];
console.log("SERMON_COMPARISON_FIXTURE",JSON.stringify({
  status:"ready",quranCount:fixture.filter(p=>p.collection==="quran").length,
  nonQuranCount:fixture.filter(p=>p.collection!=="quran").length,
  sourceIds:fixture.map(p=>p.id),privateCorpusRequired:false
}));
// This is the evidence the real composer will actually retain after its caps.
// Counting raw fixture entries alone can conceal discarded hadith sources.
const selectedFor20Minutes=selectSermonEvidence(fixture,20);
const stagePlan=planSermonStageEvidence(selectedFor20Minutes);
const retainedBookIds=selectedFor20Minutes.filter(e=>e.passage.collection!=="quran").map(e=>e.passage.id);
const assignedBooks=new Set(stagePlan.flat().filter(e=>e.passage.collection!=="quran").map(e=>e.passage.id));
if(selectedFor20Minutes.length>8||retainedBookIds.length<3||stagePlan.length!==5
  ||stagePlan.some(part=>!part.length||part.length>3)
  ||retainedBookIds.some(id=>!assignedBooks.has(id)))throw new Error("sermon-fixture-source-coverage-regression");
console.log("SERMON_SOURCE_PLAN",JSON.stringify({
  selected: selectedFor20Minutes.map(e=>e.passage.id),
  retainedBooks:retainedBookIds,
  stages:stagePlan.map((g,i)=>({stage:i+1,ids:g.map(e=>e.passage.id)})),
  verifiedBy:"local-selection-contract",privateCorpusRequired:false
}));
if (process.argv.includes("--check-fixture")) process.exit(0);
if(openrouterCheck){
 const example=5000;
 console.log("OPENROUTER_DRY_CHECK",JSON.stringify({paidCalls:0,configuredModels:OPENROUTER_TRIAL_MODELS,
   exampleUpperBoundUsd:estimateOpenRouterTrialCeiling(["qwen","deepseek","lite"],20_000,example),
   requiresKey:"OPENROUTER_API_KEY",
   manualApproval:"--openrouter-trial --allow-paid-api --only=qwen",
   keyLevelHardLimit:"Set a separate hard USD limit on the OpenRouter key; local reservations are NOT an account spending cap",
   privateCorpusRequired:false
 }));
 process.exit(0);
}
if(openrouterTrial&&(!process.argv.includes("--allow-paid-api")||!process.env.OPENROUTER_API_KEY)){
 console.error("OPENROUTER_TRIAL_BLOCKED: requires explicit --allow-paid-api and OPENROUTER_API_KEY");
 process.exit(2);
}
const input = {title:"صبر",duration:20,locale:"ur"};
const result = {question:input.title,status:"evidence",method:"lexical-bm25-topic-expansion",passages:fixture,availableCollections:["quran","nahj"],expandedTerms:[]};
const outDir = "sermon-model-comparison";
mkdirSync(outDir, {recursive:true});
const stats=[];
const routerConfigurations=[
 {name:"qwen",writer:["qwen","deepseek"],reviewer:["lite"]},
 {name:"deepseek",writer:["deepseek","qwen"],reviewer:["lite"]},
 {name:"lite",writer:["lite","deepseek"],reviewer:["qwen"]}
];
const selectedRouter=openrouterTrial?routerConfigurations.filter(c=>c.name===(only??"qwen")):[];
if(openrouterTrial&&selectedRouter.length!==1)throw new Error("openrouter-select-one-model");
const routerPlans=selectedRouter.map(c=>({
 name:"openrouter-"+c.name,router:true,writerModels:c.writer,reviewerModels:c.reviewer,
 env:{GROQ_API_KEY:"internal-proxy-placeholder",QALAM_SERMON_PROVIDER:"groq"}
}));
const configurations=[
  {name:"gpt-oss-120b",env:{GROQ_API_KEY:process.env.GROQ_API_KEY,CLOUDFLARE_ACCOUNT_ID:process.env.CLOUDFLARE_ACCOUNT_ID,CLOUDFLARE_AUTH_TOKEN:process.env.CLOUDFLARE_AUTH_TOKEN,QALAM_SERMON_PROVIDER:"groq",QALAM_SERMON_REVIEW_PROVIDER:"cloudflare"}},
  {name:"gemma-4-26b-a4b",env:{CLOUDFLARE_ACCOUNT_ID:process.env.CLOUDFLARE_ACCOUNT_ID,CLOUDFLARE_AUTH_TOKEN:process.env.CLOUDFLARE_AUTH_TOKEN,QALAM_SERMON_PROVIDER:"cloudflare",QALAM_SERMON_REVIEW_PROVIDER:"cloudflare"},model:"@cf/google/gemma-4-26b-a4b-it"}
];
for(const config of (openrouterTrial?routerPlans:configurations.filter(c=>!only||c.name===only))){
  const started=Date.now();
  const draftLog=[];
  const routerSession=config.router?createOpenRouterTrialSession({apiKey:process.env.OPENROUTER_API_KEY,maxTrialUsd:Number(process.env.QALAM_OPENROUTER_TRIAL_USD??"0.35")}):null;
  try {
    if(!config.router && (!config.env.CLOUDFLARE_ACCOUNT_ID||!config.env.CLOUDFLARE_AUTH_TOKEN||(config.name==="gpt-oss-120b"&&!config.env.GROQ_API_KEY)))throw Error("not-configured");
    const generate=async (req,evidence,env,fetchImpl,deadline) => {
      const replaceModel = config.router ? routerSession.fetchFor(config.writerModels) : config.model ? async (url,options) => {
        const body=JSON.parse(options.body);
        body.model=config.model;
        // Verify real integration with the identical structured-output contract.
        return fetch(url,{...options,body:JSON.stringify(body)});
      } : fetch;
      const output=await (staged?generateStagedSermonSections:generateSermonSections)(req,evidence,env,replaceModel,deadline);
      draftLog.push(output);
      return output;
    };
    const independentReviewer=config.router?createSermonSentenceReviewer({
     cloudflareAccountId:"offline-openrouter-adapter",cloudflareToken:"offline-openrouter-adapter",
     preferredProvider:"cloudflare",
     fetchImpl:routerSession.fetchFor(config.reviewerModels),
     deadline:Date.now()+450_000
     }):undefined;
    const project=await composeSermon(input,result,{env:config.env,generate,reviewer:independentReviewer,preferSentenceFilter:staged||config.router,evaluationTimeoutMs:staged||config.router?450_000:undefined});
    const text=buildCustomSermonText(project,"ur");
    const timing=assessSermonSpeakingTime(project);
    const {proseWords,arabicWords,translationWords,estimatedMinutes,sectionWords}=timing;
    const ids=[...new Set(project.sections.flatMap(s=>s.evidenceIds))];
    const sourceCount=ids.length,nonQuran=ids.filter(id=>fixture.some(f=>f.id===id&&f.collection!=="quran")).length;
    const nonUrdu=project.sections.some(s=>/[\p{Script=Latin}\p{Script=Devanagari}\p{Script=Bengali}]/u.test(s.headingUr+s.userText.replace(/\n\nحوالہ:[^\n]*/gu,"")));
    const row={model:config.name,...(config.router?{routerUsage:routerSession.status()}:{}),status:"passed-source-review",staged,sections:project.sections.length,sourceCount,nonQuran,proseWords,sectionWords,arabicWords,translationWords,estimatedMinutes,estimatedTimeOnly:true,meetsTimeGoal:estimatedMinutes>=18&&estimatedMinutes<=22,nonUrdu,elapsedMs:Date.now()-started,requests:draftLog.length};
    stats.push(row);
    writeFileSync(outDir+"/"+config.name+".txt","آزمائشی مجلس — حقیقی کتابی ماخذ کی تصدیق کا متبادل نہیں\n\n"+text);
    console.log("SERMON_MODEL_COMPARE",JSON.stringify(row));
  }catch(err){
    const row={model:config.name,...(config.router?{routerUsage:routerSession.status()}:{}),status:"failed",reason:err instanceof Error?err.message:"unknown",elapsedMs:Date.now()-started,requests:draftLog.length};
    stats.push(row);
    console.log("SERMON_MODEL_COMPARE",JSON.stringify(row));
  }
  if(draftLog.length)writeFileSync(outDir+"/"+config.name+"-raw.json",JSON.stringify(draftLog,null,2));
}
writeFileSync(outDir+"/summary.json",JSON.stringify({fixtureOnly:true,openrouterTrial,trialWarning:openrouterTrial?"This local reservation is not a provider account spending cap":undefined,speechRateAssumptions:SERMON_SPEAKING_RATES,results:stats},null,2));
if(stats.some(s=>s.status!=="passed-source-review"||!s.meetsTimeGoal||s.nonUrdu||s.sourceCount<3||s.nonQuran<1))process.exitCode=1;
