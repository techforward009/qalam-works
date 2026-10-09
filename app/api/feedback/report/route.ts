import { get, list } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { isFeedbackAdmin, isFeedbackEntry, summarizeFeedback } from "../../../lib/feedbackAdmin";
import type { FeedbackEntry } from "../../../lib/feedback";

export const runtime="nodejs";
export async function GET(request:NextRequest){
 const json=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
 if(!isFeedbackAdmin(request.headers.get("authorization"),process.env.QALAM_FEEDBACK_ADMIN_SECRET))return json({error:"unauthorized"},401);
 const token=process.env.QALAM_FEEDBACK_READ_WRITE_TOKEN;
 if(!token)return json({error:"not-configured"},503);
 try{
   const records:FeedbackEntry[]=[];
   let cursor:string|undefined;
   for(let i=0;i<10;i++){
     const page=await list({token,prefix:"feedback/v1/",limit:100,...(cursor?{cursor}:{})});
     for(const blob of page.blobs){
       if(records.length>=500)break;
       try{
         const result=await get(blob.pathname,{token,access:"private"});
         if(!result?.stream)continue;
         const raw=await new Response(result.stream).text();
         if(raw.length>4000)continue;
         const parsed:unknown=JSON.parse(raw);
         if(isFeedbackEntry(parsed))records.push(parsed);
       }catch{/* An unreadable record must not block the dashboard. */}
     }
     if(records.length>=500||!page.hasMore||!page.cursor)break;
     cursor=page.cursor;
   }
   records.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
   return json({total:records.length,counts:summarizeFeedback(records),recent:records.slice(0,100),capped:records.length>=500});
 }catch{return json({error:"unavailable"},503);}
}
