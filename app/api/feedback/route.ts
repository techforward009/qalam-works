import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { parseFeedback } from "../../lib/feedback";

export const runtime = "nodejs";
const limits = new Map<string,{at:number;count:number}>();
const send = (data:unknown,status=200) => NextResponse.json(data,{status,headers:{"Cache-Control":"no-store"}});
export async function POST(req:NextRequest) {
 const origin=req.headers.get("origin");
 if(origin&&origin!==req.nextUrl.origin)return send({error:"invalid-origin"},403);
 const token=process.env.QALAM_FEEDBACK_READ_WRITE_TOKEN;
 if(!token)return send({error:"not-configured"},503);
 const identity=req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||"anonymous";
 const now=Date.now(), prior=limits.get(identity);
 if(prior&&now-prior.at<60000&&prior.count>=3)return send({error:"slow-down"},429);
 if(limits.size>512)limits.clear();
 limits.set(identity,{at:prior&&now-prior.at<60000?prior.at:now,count:prior&&now-prior.at<60000?prior.count+1:1});
 let raw:string;
 try {
   raw=await req.text();
   if(raw.length>4000)return send({error:"invalid"},400);
 }catch{return send({error:"invalid"},400);}
 let data:unknown;
 try{data=JSON.parse(raw);}catch{return send({error:"invalid"},400);}
 const entry=parseFeedback(data);
 if(!entry)return send({error:"invalid"},400);
 // Store only volunteered feedback. No cookies, account IDs, IP, or submitted source texts.
 const record={...entry,createdAt:new Date().toISOString()};
 try {
   await put(`feedback/v1/${record.tool}/${Date.now()}-${randomUUID()}.json`,JSON.stringify(record),{
     token,access:"private",contentType:"application/json",addRandomSuffix:false,
   });
   return send({ok:true});
 }catch{return send({error:"unavailable"},503);}
}
