import { generateSermonSections, parseComposedSections, type ComposedSection, type SermonProviderEnv, type SermonRequest } from "./sermonComposer";
import type { AnswerEvidence } from "./researchAnswer";

// Experimental: assemble a long sermon through five bounded model calls.
// The completed draft must still pass composeSermon's independent review.
const TARGET_WORDS = [350, 360, 360, 360, 350] as const;
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
  const nonQuran=evidence.find(p=>p.passage.collection!=="quran");
  for(let index=0;index<5;index++){
    let accepted:ComposedSection|null=null;
    for(let attempt=0;attempt<2;attempt++){
      const previousSections=sections.map(s=>({heading:s.heading,ending:s.text.slice(-420),refs:s.refs}));
      const preferCore=nonQuran&&(index===1||index===2||index===3)
        ?"This section must cite source ref "+nonQuran.ref+" for its substantive meaning; only use assertions directly entailed by it.":"";
      const instruction=[
        input.instruction??"",
        "Stage "+(index+1)+"/5. Produce ONE flowing spoken section of roughly "+TARGET_WORDS[index]+" Urdu words, not a plan or bullet points. Use distinct supported explanations and open questions rather than inventing religious facts.",
        "Connect with earlier sections without repeating arguments, citations or original quotations.",
        preferCore,
        attempt?"Last attempt was too short, lacked a required reference or had invalid format. Expand only source-entailable meaning.":""
      ].filter(Boolean).join("\n");
      const request={...input,instruction,previous:JSON.stringify({previousSections})};
      const raw=await generateSermonSections(request,evidence,env,fetchImpl,deadline,{index:index as 0|1|2|3|4,targetWords:TARGET_WORDS[index]});
      if(!validSection(raw,evidence,TARGET_WORDS[index]-45))continue;
      const next:ComposedSection={
        heading:raw.sections[0].heading.trim(),text:raw.sections[0].text.trim(),refs:[...new Set(raw.sections[0].refs)]
      };
      if(preferCore&&!next.refs.includes(nonQuran!.ref))continue;
      accepted=next;break;
    }
    if(!accepted)throw new Error("staged-insufficient-draft");
    sections.push(accepted);
  }
  const complete=parseComposedSections({sections},evidence);
  if(!complete)throw new Error("staged-invalid-project");
  return {sections:complete};
}
