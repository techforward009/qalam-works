import {it,expect,vi} from "vitest";
import {assertActuallyFreeCatalog,inspectWriterReply,runFreeProbe,FREE_WRITER,FREE_REVIEWER} from "../scripts/probe-openrouter-free-sermon.mjs";
const catalog={data:[FREE_WRITER,FREE_REVIEWER].map(id=>({id,pricing:{prompt:"0",completion:"0"},architecture:{output_modalities:["text"]}}))};
it("blocks models with paid slugs or nonzero listed pricing",()=>{
 expect(assertActuallyFreeCatalog(catalog)).toHaveLength(2);
 expect(()=>assertActuallyFreeCatalog({data:[{...catalog.data[0],pricing:{prompt:"0.001",completion:"0"}},catalog.data[1]]})).toThrow("non-zero-free-pricing-blocked");
 expect(()=>assertActuallyFreeCatalog(catalog,[FREE_WRITER,"openai/gpt-6"])).toThrow("non-free-model-blocked");
 expect(()=>assertActuallyFreeCatalog(catalog,[FREE_WRITER,FREE_WRITER])).toThrow("free-model-independence-required");
});
it("rejects unsupported references, insufficient length and Latin prose",()=>{
 expect(inspectWriterReply("یہ صبر ہے [3]")).toMatchObject({usable:false,validReferences:false});
 expect(inspectWriterReply("یہ صبر ہے [1]")).toMatchObject({usable:false,mentionsBoth:false});
});
it("runs exactly two free requests with different models and audits outputs",async()=>{
 const publicDraft=("صبر اور نماز کے ذریعے مدد طلب کرنے کی بات قرآن کے فراہم کردہ متن میں موجود ہے [1]۔ "
 +"مومن سے کہا گیا ہے کہ وہ صبر اختیار کرے اور نماز سے مدد طلب کرے [1]۔ "
 +"ایک دوسری عبارت صبر کی دو قسموں کو الگ کرتی ہے [2]۔ "
 +"اس میں ایک صورت ناپسندیدہ چیز پر صبر کرنا بتائی گئی ہے [2]۔ "
 +"دوسری صورت پسندیدہ چیز سے اپنے آپ کو روکنا بتائی گئی ہے [2]۔ "
 +"ہم اس فرق پر غور کر سکتے ہیں اور اپنے عمل میں اسے سمجھنے کی کوشش کر سکتے ہیں [2]۔ "
 +"یہ دونوں فراہم کردہ عبارتیں صبر کی مختلف جہتوں کی طرف ہماری توجہ دلاتی ہیں [1] [2]۔ "
 +"اللہ نے صبر کرنے والوں کے ساتھ ہونے کی بات فرمائی ہے [1]۔");
 const observed:{url:RequestInfo|URL;init:RequestInit}[]=[];
 const fetchImpl=vi.fn(async(url,init)=>{
  observed.push({url,init});
  if(String(url).endsWith("/models"))return new Response(JSON.stringify(catalog),{status:200});
  const p=JSON.parse(init.body);
  const text=p.model===FREE_WRITER?publicDraft:"تمام جملے فراہم کردہ عبارتوں تک محدود ہیں۔\nVERDICT: SUPPORTED";
  return new Response(JSON.stringify({model:p.model,choices:[{message:{content:text}}],usage:{prompt_tokens:110,completion_tokens:120,cost:0}}),{status:200});
 });
 const events:string[]=[];
 const result=await runFreeProbe({apiKey:"test-secret",fetchImpl,log:s=>events.push(s)});
 expect(result.freeCalls).toBe(2);
 expect(fetchImpl).toHaveBeenCalledTimes(3);
 const models=observed.slice(1).map(x=>JSON.parse(x.init.body as string).model);
 expect(models).toEqual([FREE_WRITER,FREE_REVIEWER]);
 expect(events.some(x=>x.includes("test-secret"))).toBe(false);
 expect(JSON.stringify(observed[1].init)).toContain("Bearer test-secret");
});
it("rejects paid catalog without ANY completion request",async()=>{
 const fetchImpl=vi.fn(async()=>new Response(JSON.stringify({data:catalog.data.map((m,i)=>i===0?{...m,pricing:{prompt:"0",completion:"0.00005"}}:m)}),{status:200}));
 await expect(runFreeProbe({apiKey:"test-secret",fetchImpl})).rejects.toThrow("non-zero-free-pricing-blocked");
 expect(fetchImpl).toHaveBeenCalledTimes(1);
});
