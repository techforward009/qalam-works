import { NextRequest, NextResponse } from "next/server";
import { isFeedbackAdmin, isFeedbackEntry, summarizeFeedback } from "../../../lib/feedbackAdmin";
import type { FeedbackEntry } from "../../../lib/feedback";
import { researchBlobClientFromEnv } from "../../research/vercelResearchBlob";

export const runtime="nodejs";
export async function GET(request:NextRequest) {
 const json=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
 if(!isFeedbackAdmin(request.headers.get("authorization"),process.env.QALAM_FEEDBACK_ADMIN_SECRET))return json({error:"unauthorized"},401);
 try{
   const client=await researchBlobClientFromEnv();
   const paths=(await client.listObjects("user-feedback/v1/")).slice(-500);
   const records:FeedbackEntry[]=[];
   for(const path of paths){
     if(!path.startsWith("user-feedback/v1/")||!path.endsWith(".json"))continue;
     try{
       const raw=await client.getObject(path);
       if(!raw||raw.length>4000)continue;
       const parsed:unknown=JSON.parse(raw);
       if(isFeedbackEntry(parsed))records.push(parsed);
     }catch{/* An unreadable record must not block the report. */}
   }
   records.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
   return json({total:records.length,counts:summarizeFeedback(records),recent:records.slice(0,100),capped:paths.length>=500});
 }catch{return json({error:"unavailable"},503);}
}
