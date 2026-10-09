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
 try {raw=await req.text();if(raw.length>7000)return json({error:"invalid"},400);}
 catch{return json({error:"invalid"},400);}
 let data:unknown;
 try {data=JSON.parse(raw);}catch{return json({error:"invalid"},400);}
 if(data&&typeof data==="object"&&!Array.isArray(data)&&(data as Record<string,unknown>).type==="contact"){
  const b=data as Record<string,unknown>;
  if(Object.keys(b).some(k=>!["type","name","email","topic","message"].includes(k)))return json({error:"invalid"},400);
  if(typeof b.name!=="string"||b.name.length>80||typeof b.email!=="string"||b.email.length>180||typeof b.message!=="string"||b.message.trim().length<10||b.message.length>2000||typeof b.topic!=="string"||!["general","services","tools","other"].includes(b.topic))return json({error:"invalid"},400);
  if(b.email.trim()&&!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(b.email.trim()))return json({error:"invalid"},400);
  const record={type:"contact",name:b.name.trim(),email:b.email.trim(),topic:b.topic,message:b.message.trim(),createdAt:new Date().toISOString()};
  try{
   const client=await researchBlobClientFromEnv();
   await client.putObject(`contact-inquiries/v1/${Date.now()}-${randomUUID()}.json`,JSON.stringify(record));
   if(process.env.RESEND_API_KEY&&process.env.QALAM_FEEDBACK_FROM_EMAIL){
    try{await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:"Bearer "+process.env.RESEND_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({from:process.env.QALAM_FEEDBACK_FROM_EMAIL,to:["info@qalamworks.com"],subject:"Qalam Works — Contact inquiry ("+record.topic+")",text:["New contact inquiry","Topic: "+record.topic,"Name: "+(record.name||"Not provided"),"Email: "+(record.email||"Not provided"),"Time: "+record.createdAt,"Message:",record.message].join("\\n")}),signal:AbortSignal.timeout(8000)});}catch{console.warn("Contact notification failed");}
   }
   return json({ok:true});
  }catch{return json({error:"unavailable"},503);}
 }
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
