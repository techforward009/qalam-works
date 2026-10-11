import { generateSermonSections, parseComposedSections, type ComposedSection, type SermonProviderEnv, type SermonRequest } from "./sermonComposer";
import type { AnswerEvidence } from "./researchAnswer";

// Experimental: assemble a long sermon through five bounded model calls.
// The completed draft must still pass composeSermon's independent review.
const TARGET_WORDS = [350, 360, 360, 360, 350] as const;
export function planSermonStageEvidence(evidence:readonly AnswerEvidence[]):AnswerEvidence[][] {
  // The three-source smoke test remains deliberately unchanged. Longer
  // compositions get distinct primary-source material assigned per section.
  if(evidence.length<5)return Array.from({length:5},()=>[...evidence]);
  const q=evidence.filter(e=>e.passage.collection==="quran");
  const b=evidence.filter(e=>e.passage.collection!=="quran");
  if(q.length<5||b.length===0)return Array.from({length:5},()=>[...evidence]);
  const candidate=[
    [q[0],q[1]],
    [q[2],q[3]],
    [q[4],b[0]],
    [q[5],q[6],b[1]],
    [q[7],q[q.length-1],q[0]]
  ];
  return candidate.map(group=>[...new Map(group.filter((x):x is AnswerEvidence=>Boolean(x)).map(e=>[e.ref,e])).values()].slice(0,3));
}
function validSection(raw:unknown,evidence:readonly AnswerEvidence[],minWords:number):raw is {sections:[ComposedSection]} {
  if(!raw||typeof raw!=="object"||!Array.isArray((raw as {sections?:unknown}).sections))return false;
  const parts=(raw as {sections:unknown[]}).sections;
  if(parts.length!==1)return false;
  const s=parts[0] as ComposedSection|null;
  if(!s||typeof s!=="object")return false;
  return typeof s.heading==="string" && !!s.heading.trim() && s.heading.length<=120
    && typeof s.text==="string" && s.text.length<=6000
    && s.text.split(/\s+/u).filter(Boolean).length>=minWords
    && !/[\p{Script=Latin}\p{Script=Devanagari}\p{Script=Bengali}\p{Script=Cyrillic}]/u.test(s.heading+s.text)
    && Array.isArray(s.refs) && s.refs.length>=1 && s.refs.length<=4
    && s.refs.every(ref=>Number.isInteger(ref)&&evidence.some(e=>e.ref===ref));
}
export async function generateStagedSermonSections(
  input:SermonRequest,evidence:readonly AnswerEvidence[],env:SermonProviderEnv,
  fetchImpl:typeof fetch=fetch,deadline?:number
):Promise<unknown>{
  if(input.duration!==20||input.locale!=="ur")throw new Error("staged-duration-unsupported");
  const sections:ComposedSection[]=[];
  // Only composeSermon can provide this trusted internal repair hint: it
  // clears any user-supplied hint before the first review. The final output is
  // nevertheless reviewed in full, including reused sections.
  const requested=input.repairSectionIndexes;
  const repairSet=Array.isArray(requested)&&requested.length>0
    && requested.every(i=>Number.isInteger(i)&&i>=0&&i<5)
      ? new Set<number>(requested) : null;
  let approvedPrior:ComposedSection[]|null=null;
  if(repairSet&&typeof input.previous==="string"){
    try{approvedPrior=parseComposedSections(JSON.parse(input.previous),evidence);}
    catch{approvedPrior=null;}
  }
  const nonQuran=evidence.find(p=>p.passage.collection!=="quran");
  const stageSources=planSermonStageEvidence(evidence);
  for(let index=0;index<5;index++){
    if(approvedPrior && !repairSet!.has(index)){
      sections.push(approvedPrior[index]);
      console.info("SERMON_STAGED_STAGE",JSON.stringify({stage:index+1,status:"reused-approved",sourceRefs:approvedPrior[index].refs}));
      continue;
    }
    let accepted:ComposedSection|null=null;
    for(let attempt=0;attempt<2;attempt++){
      const previousSections=sections.map(s=>({heading:s.heading,ending:s.text.slice(-420),refs:s.refs}));
      // Global source diversity is checked by composeSermon. Do not demand
      // the same non-Quran reference in every middle section: that produced
      // repetition and spurious stage failures on Gemma.
      const needsCore=Boolean(nonQuran&&index===2&&!sections.some(s=>s.refs.includes(nonQuran.ref)));
      const preferCore=needsCore
        ?"You MUST cite reference "+nonQuran!.ref+" and explain ONLY what its supplied text establishes.":"";
      const instruction=[
        input.instruction??"",
        "Stage "+(index+1)+"/5. Produce ONE flowing spoken section of roughly "+TARGET_WORDS[index]+" Urdu words, not a plan or bullet points. Use distinct supported explanations and open questions rather than inventing religious facts.",
        "Connect with earlier sections without repeating arguments, citations or original quotations.",
        preferCore,
        attempt?"Last attempt was too short, lacked a required reference or had invalid format. Expand only source-entailable meaning.":""
      ].filter(Boolean).join("\n");
      const request={...input,instruction,previous:JSON.stringify({previousSections})};
      // Restrict the model to primary texts assigned to this one stage.
      // The original global reference numbers are never renumbered.
      const scopedEvidence=stageSources[index];
      const raw=await generateSermonSections(request,scopedEvidence,env,fetchImpl,deadline,{index:index as 0|1|2|3|4,targetWords:TARGET_WORDS[index]});
      const candidate=raw&&typeof raw==="object"&&Array.isArray((raw as {sections?:unknown}).sections)
        ? (raw as {sections:unknown[]}).sections[0] as Partial<ComposedSection>|undefined : undefined;
      const words=typeof candidate?.text==="string" ? candidate.text.split(/\s+/u).filter(Boolean).length : 0;
      const refs=Array.isArray(candidate?.refs)?candidate.refs:[];
      const valid=validSection(raw,scopedEvidence,Math.floor(TARGET_WORDS[index]*0.8));
      const meetsCore=!needsCore||refs.includes(nonQuran!.ref);
      console.info("SERMON_STAGED_ATTEMPT",JSON.stringify({
        stage:index+1,attempt:attempt+1,words,minimumWords:Math.floor(TARGET_WORDS[index]*0.8),
        sourceRefs:refs.filter((ref):ref is number=>typeof ref==="number").slice(0,5),
        validShape:valid,requiredCore:needsCore,meetsCore
      }));
      if(!valid||!meetsCore)continue;
      const next:ComposedSection={
        heading:raw.sections[0].heading.trim(),text:raw.sections[0].text.trim(),refs:[...new Set(raw.sections[0].refs)]
      };
      accepted=next;break;
    }
    if(!accepted){console.info("SERMON_STAGED_STAGE",JSON.stringify({stage:index+1,status:"failed",reason:"insufficient-draft"}));throw new Error("staged-insufficient-draft");}
    sections.push(accepted);
    console.info("SERMON_STAGED_STAGE",JSON.stringify({stage:index+1,status:"draft",words:accepted.text.split(/\s+/u).filter(Boolean).length,sourceRefs:accepted.refs,nonQuran:accepted.refs.some(ref=>evidence.some(e=>e.ref===ref&&e.passage.collection!=="quran"))}));
  }
  const complete=parseComposedSections({sections},evidence);
  if(!complete)throw new Error("staged-invalid-project");
  return {sections:complete};
}
