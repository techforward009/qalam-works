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
  const {composeSermon}=await import('../app/lib/knowledge/sermonComposer.ts');
  const {buildCustomSermonText,parseCustomSermonProject,serializeCustomSermonProject}=await import('../app/tools/khateeb-studio/engine/customSermonProject.ts');
  if(process.argv.includes('--check-imports'))console.log('SERMON_FLOW_EVAL',JSON.stringify({status:'imports-valid'}));
  else{
    let stage='sources';const started=Date.now();
    try{
      // Only a fixed public Quran request; no private corpus prose is logged.
      const input={title:'قرآن سورۃ العصر 103:1–3',duration:20,locale:'ur'};
      const evidence=await collectSermonEvidence(input.title,input.locale,'release-public-sermon-evaluation');
      console.log('SERMON_FLOW_EVAL',JSON.stringify({stage,status:evidence.status,sourceCount:evidence.passages.length,elapsedMs:Date.now()-started}));
      if(evidence.passages.some(p=>p.collection!=='quran'))throw new Error('non-public-fixture');
      stage='composition-and-review';
      const project=await composeSermon(input,evidence,{env:process.env});
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
      const known=['provider-format','provider-rate-limited','provider-unavailable','composition-timeout','generation-unavailable','unverified','no-evidence','missing-translation','insufficient-draft','invalid-project','missing-source-output','non-public-fixture'];
      console.log('SERMON_FLOW_EVAL',JSON.stringify({stage,status:'failed',code:error instanceof Error&&known.includes(error.message)?error.message:'unavailable',elapsedMs:Date.now()-started}));
      process.exitCode=1;
    }
  }
}else console.log('SERMON_FLOW_EVAL',JSON.stringify({status:'skipped',reason:'explicit-live-evaluation-required'}));
