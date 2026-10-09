import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { parseFeedback } from "../../lib/feedback";
import { notifyFeedback } from "../../lib/feedbackNotification";
import { researchBlobClientFromEnv } from "../research/vercelResearchBlob";

export const runtime = "nodejs";
const limits = new Map<string,{at:number;count:number}>();
const json = (data:unknown,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"no-store"}});
export async function POST(req:NextRequest) {
 const origin=req.headers.get("origin");
 if(origin&&origin!==req.nextUrl.origin)return json({error:"invalid-origin"},403);
 const identity=req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||"anonymous";
 const now=Date.now(),prior=limits.get(identity);
 if(prior&&now-prior.at<60000&&prior.count>=3)return json({error:"slow-down"},429);
 if(limits.size>512)limits.clear();
 limits.set(identity,{at:prior&&now-prior.at<60000?prior.at:now,count:prior&&now-prior.at<60000?prior.count+1:1});
 let raw:string;
 try {raw=await req.text();if(raw.length>4000)return json({error:"invalid"},400);}
 catch{return json({error:"invalid"},400);}
 let data:unknown;
 try {data=JSON.parse(raw);}catch{return json({error:"invalid"},400);}
 const entry=parseFeedback(data);
 if(!entry)return json({error:"invalid"},400);
 const record={...entry,createdAt:new Date().toISOString()};
 try {
   const client=await researchBlobClientFromEnv();
   // A separate private namespace: never overwrite or enumerate the research corpus.
   await client.putObject(`user-feedback/v1/${record.tool}/${Date.now()}-${randomUUID()}.json`,JSON.stringify(record));
   const delivery=await notifyFeedback(record);
   if(delivery==="failed")console.warn("Feedback notification",{status:"failed",tool:record.tool});
   return json({ok:true});
 }catch{return json({error:"unavailable"},503);}
}
