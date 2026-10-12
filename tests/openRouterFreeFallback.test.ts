import {it,expect,vi} from "vitest";
import {selectFreeCandidates,probeFreeFallback,FREE_WRITE_CANDIDATES,FREE_REVIEW_CANDIDATES} from "../scripts/probe-openrouter-free-fallback.mjs";
const all=[...FREE_WRITE_CANDIDATES,...FREE_REVIEW_CANDIDATES];
const catalog={data:all.map(id=>({id,pricing:{prompt:"0",completion:"0"},architecture:{output_modalities:["text"]}}))};
it("selects only zero-cost listed text models and different independent origin",()=>{
 const options=selectFreeCandidates(catalog);
 expect(options.writers).toHaveLength(3);
 expect(options.reviewers).toHaveLength(3);
 const bad={data:catalog.data.map((m,i)=>i===0?{...m,pricing:{prompt:"0.01",completion:"0"}}:m)};
 expect(selectFreeCandidates(bad).writers).not.toContain(FREE_WRITE_CANDIDATES[0]);
 expect(()=>selectFreeCandidates({data:[]})).toThrow("no-independent-free-pair");
});
it("trys a second ZERO priced free model after upstream 429 and performs separate reviewer audit",async()=>{
 const observed:{url:string;body:string|null}[]=[];const log:string[]=[];
 const draft=("قرآن میں صبر اور نماز سے مدد طلب کرنے کی ہدایت موجود ہے [1]۔ "+
 "اس عبارت میں صبر کرنے والوں کے ساتھ اللہ کی معیت بھی بیان ہوئی ہے [1]۔ "+
 "ایک دوسری عبارت میں صبر کو دو قسموں میں تقسیم کیا گیا ہے [2]۔ "+
 "ایک صورت ایسی چیز پر صبر ہے جسے آدمی ناپسند کرتا ہے [2]۔ "+
 "دوسری صورت ایسی چیز سے اپنے آپ کو روکنا ہے جسے آدمی پسند کرتا ہے [2]۔ "+
 "آئیے غور کریں کہ ہم ان دونوں صورتوں کو اپنے رویے میں کیسے سمجھ سکتے ہیں [2]۔ "+
 "ہمارے سامنے یہ دو اصل عبارتیں ہیں، اس لیے انہی کے معنی تک رہنا چاہیے [1] [2]۔ "+
 "یہ سوال آج ہمارے لیے اہم ہے کہ اپنی زندگی میں صبر کی دونوں صورتیں کیسے پہچانیں [2]۔");
 let count=0;
 const fetchImpl=vi.fn(async(url:RequestInfo|URL,init?:RequestInit)=>{
  const body=typeof init?.body==="string"?init.body:null;
  observed.push({url:String(url),body});
  if(String(url).endsWith("/models"))return new Response(JSON.stringify(catalog),{status:200});
  count++;
  if(count===1)return new Response(JSON.stringify({error:{metadata:{error_type:"rate_limit_exceeded",provider_code:429}}}),{status:429});
  const model=JSON.parse(body!).model;
  return new Response(JSON.stringify({model,usage:{prompt_tokens:120,completion_tokens:160,cost:0},choices:[{message:{content:count===2?draft:"یہ تمام دعوے دیے گئے متن کے موافق ہیں۔\\nVERDICT: SUPPORTED"}}]}),{status:200});
 });
 const result=await probeFreeFallback({apiKey:"secret",fetchImpl,log:s=>log.push(s)});
 expect(result.calls).toBe(3);
 expect(result.verdict).toBe("supported");
 expect(result.ok).toBe(true);
 expect(observed.filter(x=>x.body!==null).every(x=>JSON.parse(x.body!).model.endsWith(":free"))).toBe(true);
 expect(log.join(" ")).not.toContain("secret");
});
it("does not send any model request when catalog only contains paid candidates",async()=>{
 const paid={data:catalog.data.map(x=>({...x,pricing:{prompt:"0.02",completion:"0.04"}}))};
 const fetchImpl=vi.fn(async()=>new Response(JSON.stringify(paid),{status:200}));
 await expect(probeFreeFallback({apiKey:"secret",fetchImpl})).rejects.toThrow("no-independent-free-pair");
 expect(fetchImpl).toHaveBeenCalledTimes(1);
});
