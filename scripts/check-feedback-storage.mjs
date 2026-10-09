import { list } from "@vercel/blob";
const storeId=process.env.QALAM_RESEARCH_STORE_ID;
const oidcToken=process.env.VERCEL_OIDC_TOKEN;
const label="FEEDBACK_STORAGE_AUDIT";
if(process.env.VERCEL_ENV!=="preview"){console.log(label,JSON.stringify({status:"skipped",reason:"preview-only"}));process.exit(0);}
if(!storeId||!oidcToken){console.log(label,JSON.stringify({status:"unavailable",reason:!storeId?"store-id-missing":"oidc-token-missing"}));process.exit(0);}
let count=0,cursor;
try{
 for(let page=0;page<20;page++){
  const response=await list({storeId,oidcToken,prefix:"user-feedback/v1/",limit:100,...(cursor?{cursor}:{})});
  count+=response.blobs.filter(b=>b.pathname.startsWith("user-feedback/v1/")).length;
  if(!response.hasMore||!response.cursor){console.log(label,JSON.stringify({status:"verified",count}));process.exit(0);}
  cursor=response.cursor;
 }
 console.log(label,JSON.stringify({status:"partial",count}));
}catch(e){
 console.log(label,JSON.stringify({status:"unavailable",reason:"store-read-rejected",code:typeof e?.status==="number"?e.status:undefined}));
}
