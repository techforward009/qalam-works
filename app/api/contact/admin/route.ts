import {timingSafeEqual} from "node:crypto";
import {NextRequest,NextResponse} from "next/server";
import {researchBlobClientFromEnv} from "../../research/vercelResearchBlob";
export const runtime="nodejs";
export async function POST(req:NextRequest){
 const origin=req.headers.get("origin");
 if(origin&&origin!==req.nextUrl.origin)return NextResponse.json({error:"forbidden"},{status:403});
 const secret=process.env.QALAM_FEEDBACK_ADMIN_SECRET;
 const provided=req.headers.get("x-qalam-admin-key")??"";
 if(!secret||!provided||Buffer.byteLength(secret)!==Buffer.byteLength(provided)||!timingSafeEqual(Buffer.from(secret),Buffer.from(provided)))return NextResponse.json({error:"unauthorized"},{status:401});
 let limit=30;
 try{const body=await req.json() as {limit?:number};if(Number.isInteger(body?.limit))limit=Math.max(1,Math.min(100,body.limit!));}catch{}
 try{
  const client=await researchBlobClientFromEnv();
  const paths=(await client.listObjects("contact-inquiries/v1/")).sort().reverse().slice(0,limit);
  const items=await Promise.all(paths.map(async path=>{
   const value=await client.getObject(path);if(!value)return null;
   const data=JSON.parse(value) as Record<string,unknown>;
   return {id:path,createdAt:data.createdAt,topic:data.topic,name:data.name,email:data.email,message:data.message};
  }));
  return NextResponse.json({items:items.filter(Boolean)},{headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({error:"unavailable"},{status:503});}
}
