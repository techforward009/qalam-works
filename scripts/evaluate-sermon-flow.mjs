import { registerHooks } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import ts from 'typescript';

const marker='Validate complete sermon composition and source review';
if(process.argv.includes('--live-full')||process.argv.includes('--check-imports')||process.env.VERCEL_GIT_COMMIT_MESSAGE?.trim()===marker){
  registerHooks({
    resolve(specifier,context,nextResolve){
      if(specifier.startsWith('.')&&!/\.[cm]?[jt]s$|\.json$/.test(specifier)&&context.parentURL){
        for(const suffix of ['.ts','/index.ts']){const candidate=new URL(specifier+suffix,context.parentURL);if(existsSync(candidate))return nextResolve(candidate.href,context);}
      }
      return nextResolve(specifier,context);
    },
    load(url,context,nextLoad){
      if(url.startsWith('file:')&&!url.includes('/node_modules/')&&url.endsWith('.json'))return {format:'module',source:`export default ${JSON.stringify(JSON.parse(readFileSync(new URL(url),'utf8')))};`,shortCircuit:true};
      if(url.startsWith('file:')&&!url.includes('/node_modules/')&&url.endsWith('.ts'))return {format:'module',source:ts.transpileModule(readFileSync(new URL(url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText,shortCircuit:true};
      return nextLoad(url,context);
    },
  });
  const {collectSermonEvidence}=await import('../app/lib/knowledge/sermonEvidence.ts');
  const {composeSermon,generateSermonSections}=await import('../app/lib/knowledge/sermonComposer.ts');
  const {createSermonSentenceReviewer,sermonRejectedSentences}=await import('../app/lib/knowledge/sermonReview.ts');
  const {reviewedResearchClaims}=await import('../app/lib/knowledge/researchAnswer.ts');
  const {buildCustomSermonText,parseCustomSermonProject,serializeCustomSermonProject}=await import('../app/tools/khateeb-studio/engine/customSermonProject.ts');
  if(process.argv.includes('--check-imports'))console.log('SERMON_FLOW_EVAL',JSON.stringify({status:'imports-valid'}));
  else if(process.exitCode)console.log('SERMON_FLOW_EVAL',JSON.stringify({status:'blocked',reason:'source-review-fixtures-failed'}));
  else{
    let stage='sources';const started=Date.now();let publicDraft;
    try{
      // Only a fixed public Quran request; no private corpus prose is logged.
      const input={title:'قرآن سورۃ العصر 103:1–3',duration:20,locale:'ur'};
      const evidence=await collectSermonEvidence(input.title,input.locale,'release-public-sermon-evaluation');
      console.log('SERMON_FLOW_EVAL',JSON.stringify({stage,status:evidence.status,sourceCount:evidence.passages.length,elapsedMs:Date.now()-started}));
      if(evidence.passages.some(p=>p.collection!=='quran'))throw new Error('non-public-fixture');
      stage='public-source-conditions';
      const third=evidence.passages.find(p=>p.quranLocation?.surah===103&&p.quranLocation.ayah===3);
      const first=evidence.passages.find(p=>p.quranLocation?.surah===103&&p.quranLocation.ayah===1);
      if(!third||!first)throw new Error('no-evidence');
      const fixtures=[
        {id:'four-conditions',text:'خسارے سے مستثنیٰ لوگوں کے لیے یہاں ایمان، نیک عمل، حق کی نصیحت اور صبر کی نصیحت چاروں باتیں بیان ہوئی ہیں۔',passage:third,expected:true},
        {id:'faith-without-action',text:'اس سورت کے مطابق ایمان کافی ہے، عمل اور نصیحت کی ضرورت نہیں۔',passage:third,expected:false},
        {id:'reversed-asr-exception',text:'اس سورت کے مطابق ایمان والے، نیک عمل کرنے والے اور حق و صبر کی نصیحت کرنے والے خسارے میں ہیں۔',passage:third,expected:false},
        {id:'invented-asr-wealth',text:'اس سورت میں مال بڑھنے کا وعدہ کیا گیا ہے۔',passage:third,expected:false},
        {id:'correct-asr-oath',text:'پہلی آیت میں عصر کی قسم ہے۔',passage:first,expected:true},
        {id:'wrong-asr-attached-verse',text:'پہلی آیت میں تمام انسانوں کے خسارے کا بیان ہے۔',passage:first,expected:false},
      ];
      const reviewer=createSermonSentenceReviewer({preferredProvider:process.env.QALAM_SERMON_PROVIDER||undefined,geminiKey:process.env.GEMINI_API_KEY,apiKey:process.env.GROQ_API_KEY,cloudflareAccountId:process.env.CLOUDFLARE_ACCOUNT_ID,cloudflareToken:process.env.CLOUDFLARE_AUTH_TOKEN});
      if(!reviewer)throw new Error('provider-unavailable');
      const claims=fixtures.map(f=>({id:f.id,text:f.text,citations:[{passageId:f.passage.id,quote:f.passage.text}]}));
      const publicReviewInput={question:input.title,locale:'ur',evidence:evidence.passages.map((passage,i)=>({ref:i+1,passage}))};
      const reviewPublicOnce=async(reviewInput,reviewClaims)=>{try{return await reviewer.review(reviewInput,reviewClaims);}catch(error){if(!(error instanceof Error)||!['provider-unavailable','provider-rate-limited'].includes(error.message))throw error;console.log('SERMON_FLOW_EVAL',JSON.stringify({stage:'public-review-retry',reason:error.message}));if(error.message==='provider-rate-limited')await new Promise(resolve=>setTimeout(resolve,60000));return reviewer.review(reviewInput,reviewClaims);}};
      const checked=reviewedResearchClaims(await reviewPublicOnce(publicReviewInput,claims),claims);
      if(checked===null)throw new Error('provider-format');
      for(const fixture of fixtures){const accepted=checked.some(c=>c.id===fixture.id);console.log('SERMON_CONDITIONS_EVAL',JSON.stringify({fixture:fixture.id,expected:fixture.expected,accepted,passed:accepted===fixture.expected}));if(accepted!==fixture.expected)throw new Error('unverified');}
      stage='composition-and-review';
      // Groq's free output-token window is shared by the previous compact audit.
      await new Promise(resolve=>setTimeout(resolve,60000));
      const fullReviewer=createSermonSentenceReviewer({preferredProvider:process.env.QALAM_SERMON_PROVIDER||undefined,geminiKey:process.env.GEMINI_API_KEY,apiKey:process.env.GROQ_API_KEY,cloudflareAccountId:process.env.CLOUDFLARE_ACCOUNT_ID,cloudflareToken:process.env.CLOUDFLARE_AUTH_TOKEN,deadline:Date.now()+285000});
      if(!fullReviewer)throw new Error('provider-unavailable');
      let reviewAttempt=0;
      const project=await composeSermon(input,evidence,{env:process.env,generate:async(...args)=>{publicDraft=await generateSermonSections(...args);await new Promise(resolve=>setTimeout(resolve,60000));return publicDraft;},reviewer:{...fullReviewer,async review(reviewInput,claims){
        let audit;
        try{audit=await fullReviewer.review(reviewInput,claims);}catch(error){if(!(error instanceof Error)||!['provider-unavailable','provider-rate-limited'].includes(error.message))throw error;console.log('SERMON_FLOW_EVAL',JSON.stringify({stage:'sermon-review-retry',reason:error.message}));if(error.message==='provider-rate-limited')await new Promise(resolve=>setTimeout(resolve,60000));audit=await fullReviewer.review(reviewInput,claims);}
        // This evaluator is restricted above to a fixed public Quran fixture.
        for(const rejection of sermonRejectedSentences(audit,reviewInput,claims)??[])console.log('SERMON_FLOW_PUBLIC_REJECTION',JSON.stringify({attempt:reviewAttempt,...rejection}));
        reviewAttempt++;return audit;
      }}});
      stage='portable-output';
      const serialized=serializeCustomSermonProject(project);
      const restored=parseCustomSermonProject(serialized);
      const text=buildCustomSermonText(project,'ur');
      if(!restored||restored.sections.length!==5||!text||project.sections.reduce((n,s)=>n+s.minutes,0)!==20)throw new Error('invalid-project');
      for(const source of project.evidence)if(!text.includes(source.arabic)||!text.includes(source.detailUr))throw new Error('missing-source-output');
      console.log('SERMON_FLOW_EVAL',JSON.stringify({status:'passed',sections:project.sections.length,sourceCount:project.evidence.length,words:project.sections.reduce((n,s)=>n+s.userText.split(/\s+/u).length,0),elapsedMs:Date.now()-started}));
      // Generated public-fixture prose supports human review of the actual result.
      for(const section of project.sections)console.log('SERMON_FLOW_PUBLIC_SECTION',JSON.stringify({heading:section.headingUr,text:section.userText}));
    }catch(error){
      if(publicDraft)console.log('SERMON_FLOW_PUBLIC_DRAFT',JSON.stringify(publicDraft));
      const known=['provider-format','provider-rate-limited','provider-unavailable','composition-timeout','generation-unavailable','unverified','no-evidence','missing-translation','insufficient-draft','invalid-project','missing-source-output','non-public-fixture'];
      console.log('SERMON_FLOW_EVAL',JSON.stringify({stage,status:'failed',code:error instanceof Error&&known.includes(error.message)?error.message:error instanceof Error&&['TimeoutError','AbortError'].includes(error.name)?'timeout':'unavailable',elapsedMs:Date.now()-started}));
      process.exitCode=1;
    }
  }
}else console.log('SERMON_FLOW_EVAL',JSON.stringify({status:'skipped',reason:'explicit-live-evaluation-required'}));
