import { timingSafeEqual } from "node:crypto";
import type { FeedbackEntry, FeedbackRating, FeedbackTool } from "./feedback";

export function isFeedbackAdmin(requestAuth:string|null,secret:string|undefined){
 if(!secret||secret.length<24||!requestAuth?.startsWith("Bearer "))return false;
 const received=Buffer.from(requestAuth.slice(7),"utf8"),expected=Buffer.from(secret,"utf8");
 return received.length===expected.length&&timingSafeEqual(received,expected);
}
export function summarizeFeedback(entries:FeedbackEntry[]){
 const tools:Record<string,{total:number;helpful:number;partial:number;notHelpful:number}>={};
 const ratings:FeedbackRating[]=["helpful","partial","not-helpful"];
 for(const entry of entries){
  const tool=tools[entry.tool]??={total:0,helpful:0,partial:0,notHelpful:0};
  tool.total++;
  if(entry.rating===ratings[0])tool.helpful++;
  else if(entry.rating===ratings[1])tool.partial++;
  else tool.notHelpful++;
 }
 return tools;
}
export function isFeedbackEntry(value:unknown):value is FeedbackEntry{
 if(!value||typeof value!=="object")return false;
 const v=value as Record<string,unknown>;
 return typeof v.createdAt==="string" && !Number.isNaN(Date.parse(v.createdAt)) && typeof v.tool==="string" && typeof v.rating==="string" &&
 ["helpful","partial","not-helpful"].includes(v.rating) && typeof v.comment==="string" && typeof v.page==="string";
}
