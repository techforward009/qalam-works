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
   // Bounded parallel reads prevent sequential round trips from timing out
   // as feedback volume grows. Ignore malformed records, never research paths.
   for(let offset=0;offset<paths.length;offset+=10){
     const batch=paths.slice(offset,offset+10);
     const results=await Promise.all(batch.map(async path=>{
       if(!path.startsWith("user-feedback/v1/")||!path.endsWith(".json"))return null;
       try{
         const raw=await client.getObject(path);
         if(!raw||raw.length>4000)return null;
         const parsed:unknown=JSON.parse(raw);
         return isFeedbackEntry(parsed)?parsed:null;
       }catch{return null;}
     }));
     for(const entry of results)if(entry)records.push(entry);
   }
   records.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
   return json({total:records.length,counts:summarizeFeedback(records),recent:records.slice(0,100),capped:paths.length>=500});
 }catch{return json({error:"unavailable"},503);}
}
