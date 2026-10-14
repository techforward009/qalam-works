import { createHash, timingSafeEqual } from "node:crypto";
import { get, put, del } from "@vercel/blob";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const assets = {
  ur: { count: 7, digest: "f8f0eaef81ba175d9603434a17f17f9b0abc1197859d1f1e31e294c9b782dc5b", final: "qalam/tafsir-namoona/urdu-v10.json.br" },
  en: { count: 5, digest: "6e08e6952e33a452f7f644c6462cdad3d8250741ef7f1445c3ae5d37becaed59", final: "qalam/tafsir-namoona/english-v10.json.br" },
} as const;
type Language = keyof typeof assets;
const prefix = "qalam/tafsir-namoona/v10-private-staging";
function authenticated(req: Request): boolean {
  if (process.env.VERCEL_ENV !== "preview") return false;
  const secret = process.env.TAFSIR_V10_IMPORT_SECRET;
  const provided = req.headers.get("x-tafsir-import-key") ?? "";
  if (!secret || !provided || Buffer.byteLength(secret)!==Buffer.byteLength(provided)) return false;
  return timingSafeEqual(Buffer.from(secret), Buffer.from(provided));
}
async function readPrivate(path: string): Promise<Buffer | null> {
  const blob = await get(path,{access:"private"});
  return blob?.statusCode===200 && blob.stream ? Buffer.from(await new Response(blob.stream).arrayBuffer()):null;
}
export async function POST(req: Request) {
  if (!authenticated(req)) return NextResponse.json({error:"Unauthorized"},{status:401});
  const url = new URL(req.url);
  const language = url.searchParams.get("language");
  if (language!=="ur" && language!=="en") return NextResponse.json({error:"language"},{status:400});
  const asset = assets[language as Language];
  const action = url.searchParams.get("action");
  try {
    if(action==="part") {
      const part = Number(url.searchParams.get("part"));
      if (!Number.isInteger(part)||part<0||part>=asset.count) return NextResponse.json({error:"part"},{status:400});
      const bytes=Buffer.from(await req.arrayBuffer());
      if(bytes.length<100 || bytes.length>1100000) return NextResponse.json({error:"size"},{status:400});
      const path=prefix+"/"+language+"/"+String(part).padStart(2,"0")+".bin";
      await put(path,bytes,{access:"private",addRandomSuffix:false,allowOverwrite:true,contentType:"application/octet-stream"});
      return NextResponse.json({ok:true,part,size:bytes.length});
    }
    if(action==="finalize") {
      const parts:Buffer[]=[];
      for(let i=0;i<asset.count;i++){
        const path=prefix+"/"+language+"/"+String(i).padStart(2,"0")+".bin";
        const bytes=await readPrivate(path);
        if(!bytes) return NextResponse.json({error:"missing-part",part:i},{status:409});
        parts.push(bytes);
      }
      const bytes=Buffer.concat(parts);
      const digest=createHash("sha256").update(bytes).digest("hex");
      if(digest!==asset.digest) return NextResponse.json({error:"checksum",digest,size:bytes.length},{status:409});
      await put(asset.final,bytes,{access:"private",addRandomSuffix:false,allowOverwrite:true,contentType:"application/octet-stream"});
      const confirmed=await readPrivate(asset.final);
      if(!confirmed||createHash("sha256").update(confirmed).digest("hex")!==asset.digest)
        return NextResponse.json({error:"readback-mismatch"},{status:503});
      await Promise.all(Array.from({length:asset.count},(_,i)=>del(prefix+"/"+language+"/"+String(i).padStart(2,"0")+".bin")));
      return NextResponse.json({ok:true,language,digest,size:confirmed.length});
    }
    return NextResponse.json({error:"action"},{status:400});
  } catch(e) {
    return NextResponse.json({error:"Import failed",type:e instanceof Error?e.name:"unknown"},{status:500});
  }
}
