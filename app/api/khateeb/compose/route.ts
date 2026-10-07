import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { collectSermonEvidence } from "../../../lib/knowledge/sermonEvidence";
import { composeSermon, type SermonRequest } from "../../../lib/knowledge/sermonComposer";
export const runtime="nodejs";
export const maxDuration=300;
const windows=new Map<string,{at:number;count:number}>();let active=0;
const json=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"private, no-store"}});
export async function POST(req:NextRequest){
 const origin=req.headers.get("origin");if(origin&&origin!==req.nextUrl.origin)return json({code:"invalid"},400);
 let body:unknown;
 try{if(!req.body)throw new Error();const reader=req.body.getReader();const chunks:Uint8Array[]=[];let size=0;while(true){const c=await reader.read();if(c.done)break;size+=c.value.length;if(size>64000){await reader.cancel();throw new Error();}chunks.push(c.value);}body=JSON.parse(Buffer.concat(chunks).toString("utf8"));}catch{return json({code:"invalid"},400);}
 if(!body||typeof body!=="object"||Array.isArray(body))return json({code:"invalid"},400);
 const b=body as Record<string,unknown>;
 if(Object.keys(b).some(k=>!["title","duration","locale","instruction","previous"].includes(k))||typeof b.title!=="string"||b.title.trim().length<2||b.title.length>200||![20,30,45].includes(b.duration as number)||!["ur","en"].includes(b.locale as string)||b.instruction!==undefined&&(typeof b.instruction!=="string"||b.instruction.length>600)||b.previous!==undefined&&(typeof b.previous!=="string"||b.previous.length>24000))return json({code:"invalid"},400);
 if(!process.env.CLOUDFLARE_ACCOUNT_ID||!process.env.CLOUDFLARE_AUTH_TOKEN)return json({code:"not-configured"},503);
 const caller=req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()??"anonymous";const key=createHash("sha256").update(caller).digest("hex");const now=Date.now();const window=windows.get(key);if(active>=2||window&&now-window.at<60000&&window.count>=3)return json({code:"busy"},429);
 if(windows.size>=256&&!windows.has(key))windows.delete(windows.keys().next().value!);windows.set(key,{at:window&&now-window.at<60000?window.at:now,count:window&&now-window.at<60000?window.count+1:1});active++;
 let stage:"sources"|"composition"="sources";const started=Date.now();
 try{const input={...b,title:b.title.trim()} as SermonRequest;const evidence=await collectSermonEvidence(input.title,input.locale,caller);stage="composition";const project=await composeSermon(input,evidence,{env:{GEMINI_API_KEY:process.env.GEMINI_API_KEY,GROQ_API_KEY:process.env.GROQ_API_KEY,CLOUDFLARE_ACCOUNT_ID:process.env.CLOUDFLARE_ACCOUNT_ID,CLOUDFLARE_AUTH_TOKEN:process.env.CLOUDFLARE_AUTH_TOKEN,QALAM_SERMON_PROVIDER:process.env.QALAM_SERMON_PROVIDER}});return json({project});}
 catch(error){const failure=error instanceof Error&&["provider-rate-limited","provider-format","provider-unavailable","composition-timeout","missing-translation","no-evidence","insufficient-draft","generation-unavailable","unverified","unsupported-fatwa","not-configured"].includes(error.message)?error.message:error instanceof Error&&["AbortError","TimeoutError"].includes(error.name)?"timeout":"unknown";console.warn("Sermon request failed",{stage,code:failure,elapsedMs:Date.now()-started});if(error instanceof Error&&error.message==="provider-rate-limited")return json({code:"busy"},429);const code=error instanceof Error&&["missing-translation","no-evidence","insufficient-draft","generation-unavailable","unverified","unsupported-fatwa","not-configured"].includes(error.message)?error.message:"unavailable";return json({code},503);}
 finally{active--;}
}
